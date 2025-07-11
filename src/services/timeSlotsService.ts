// Time slots service for managing venue availability
import { supabase } from './supabase';
import { SpecialOccasionsService } from './specialOccasionsService';

export interface TimeSlot {
  id: string;
  venue_id: string;
  field_id?: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  is_active: boolean;
}

export class TimeSlotsService {
  /**
   * Generate time slots for a venue
   */
  static async generateTimeSlotsForVenue(
    venueId: string,
    openingTime: string,
    closingTime: string,
    daysAvailable: number[],
    fields?: Array<{ id: string; field_name: string; field_number: string }>
  ): Promise<void> {
    try {
      console.log('Generating time slots for venue:', venueId);
      
      // Delete existing time slots for this venue
      await supabase
        .from('time_slots')
        .delete()
        .eq('venue_id', venueId);

      const timeSlots: any[] = [];

      // Parse opening and closing times
      const openingHour = parseInt(openingTime.split(':')[0]);
      const closingHour = parseInt(closingTime.split(':')[0]);

      console.log('Time range:', { openingHour, closingHour, daysAvailable });

      // Generate hourly slots for each day
      for (const dayOfWeek of daysAvailable) {
        for (let hour = openingHour; hour < closingHour; hour++) {
          const startTime = `${hour.toString().padStart(2, '0')}:00`;
          const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

          // Create general venue slots (when no specific field is selected)
          timeSlots.push({
            venue_id: venueId,
            field_id: null,
            start_time: startTime,
            end_time: endTime,
            day_of_week: dayOfWeek,
            is_active: true,
          });

          // Create field-specific slots if fields are provided
          if (fields && fields.length > 0) {
            for (const field of fields) {
              timeSlots.push({
                venue_id: venueId,
                field_id: field.id,
                start_time: startTime,
                end_time: endTime,
                day_of_week: dayOfWeek,
                is_active: true,
              });
            }
          }
        }
      }

      console.log('Generated time slots count:', timeSlots.length);

      // Insert time slots in batches to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < timeSlots.length; i += batchSize) {
        const batch = timeSlots.slice(i, i + batchSize);
        const { error } = await supabase
          .from('time_slots')
          .insert(batch);

        if (error) {
          console.error('Error inserting time slots batch:', error);
          throw error;
        }
      }

      console.log('Time slots generated successfully for venue:', venueId);
    } catch (error) {
      console.error('Error generating time slots:', error);
      throw error;
    }
  }

  /**
   * Fix time slots for all venues that don't have them
   */
  static async fixMissingTimeSlots(): Promise<void> {
    try {
      console.log('Checking for venues without time slots...');

      // Get all approved venues
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          opening_time,
          closing_time,
          days_available,
          venue_fields (
            id,
            field_name,
            field_number
          )
        `)
        .eq('approval_status', 'approved');

      if (venuesError) {
        console.error('Error loading venues:', venuesError);
        throw venuesError;
      }

      console.log('Found venues:', venues?.length || 0);

      for (const venue of venues || []) {
        // Check if venue has time slots
        const { data: existingSlots, error: slotsError } = await supabase
          .from('time_slots')
          .select('id')
          .eq('venue_id', venue.id)
          .limit(1);

        if (slotsError) {
          console.error('Error checking time slots for venue:', venue.id, slotsError);
          continue;
        }

        if (!existingSlots || existingSlots.length === 0) {
          console.log('Generating time slots for venue:', venue.name);
          
          await this.generateTimeSlotsForVenue(
            venue.id,
            venue.opening_time || '06:00',
            venue.closing_time || '23:00',
            venue.days_available || [0, 1, 2, 3, 4, 5, 6],
            venue.venue_fields || []
          );
        }
      }

      console.log('Time slots fix completed');
    } catch (error) {
      console.error('Error fixing time slots:', error);
      throw error;
    }
  }

  /**
   * Ensure time slots exist for a venue, generate if missing
   */
  static async ensureTimeSlotsExist(venueId: string): Promise<void> {
    try {
      // Check if venue has time slots
      const { data: existingSlots, error: slotsError } = await supabase
        .from('time_slots')
        .select('id')
        .eq('venue_id', venueId)
        .limit(1);

      if (slotsError) {
        console.error('Error checking time slots:', slotsError);
        return;
      }

      if (!existingSlots || existingSlots.length === 0) {
        console.log('No time slots found, generating for venue:', venueId);

        // Get venue details
        const { data: venue, error: venueError } = await supabase
          .from('venues')
          .select(`
            opening_time,
            closing_time,
            days_available,
            venue_fields (
              id,
              field_name,
              field_number
            )
          `)
          .eq('id', venueId)
          .single();

        if (venueError || !venue) {
          console.error('Error loading venue details:', venueError);
          return;
        }

        // Generate time slots
        await this.generateTimeSlotsForVenue(
          venueId,
          venue.opening_time || '06:00',
          venue.closing_time || '23:00',
          venue.days_available || [0, 1, 2, 3, 4, 5, 6],
          venue.venue_fields || []
        );

        console.log('Time slots generated successfully for venue:', venueId);
      }
    } catch (error) {
      console.error('Error ensuring time slots exist:', error);
    }
  }

  /**
   * Get available time slots for a venue on a specific date (optimized)
   */
  static async getAvailableSlots(
    venueId: string,
    date: string,
    fieldId?: string
  ): Promise<TimeSlot[]> {
    try {
      console.log('Getting available slots for:', { venueId, date, fieldId });

      // Check for special occasion overrides first
      const dateAvailability = await SpecialOccasionsService.isDateAvailable(venueId, date, fieldId);

      if (!dateAvailability.isAvailable) {
        console.log('Date unavailable due to special occasion:', dateAvailability.reason);
        return [];
      }

      const dayOfWeek = new Date(date).getDay();
      const now = new Date();
      const isToday = date === now.toISOString().split('T')[0];

      console.log('Date filtering info:', {
        selectedDate: date,
        currentDate: now.toISOString().split('T')[0],
        isToday,
        currentTime: now.toISOString(),
        dayOfWeek,
        specialOccasion: dateAvailability
      });



      // First, ensure time slots exist for this venue
      await this.ensureTimeSlotsExist(venueId);

      // Use a single optimized query to get available slots with field status check
      let query = supabase
        .from('time_slots')
        .select(`
          id,
          venue_id,
          field_id,
          start_time,
          end_time,
          day_of_week,
          is_active,
          venue_fields (
            id,
            status
          )
        `)
        .eq('venue_id', venueId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      // Handle field filtering properly
      if (fieldId) {
        query = query.eq('field_id', fieldId);
      } else {
        query = query.is('field_id', null);
      }

      const { data: slots, error } = await query;

      if (error) {
        console.error('Error loading time slots:', error);
        return [];
      }

      if (!slots || slots.length === 0) {
        console.log('No time slots found for this day');
        return [];
      }

      // Filter out slots for closed fields
      const openFieldSlots = slots.filter(slot => {
        // If slot has no field_id (venue-level slots), it's available
        if (!slot.field_id) return true;

        // Check if the associated field is open
        const field = slot.venue_fields?.[0];
        return field && field.status === 'open';
      });

      if (openFieldSlots.length === 0) {
        console.log('No open fields found for this day');
        return [];
      }

      // Get all confirmed bookings for this date and venue in a single query
      const { data: confirmedBookings } = await supabase
        .from('bookings')
        .select(`
          start_time,
          end_time,
          field_id,
          booking_slots (
            slot_start_time,
            slot_end_time
          )
        `)
        .eq('venue_id', venueId)
        .eq('booking_date', date)
        .eq('status', 'confirmed');

      // Create a Set of booked time slots for fast lookup
      const bookedTimeSlots = new Set<string>();

      if (confirmedBookings) {
        for (const booking of confirmedBookings) {
          // Only consider bookings for the same field (or no field specified)
          if (fieldId && booking.field_id && booking.field_id !== fieldId) {
            continue;
          }

          // Handle both booking_slots and direct booking times
          if (booking.booking_slots && booking.booking_slots.length > 0) {
            for (const slot of booking.booking_slots) {
              bookedTimeSlots.add(`${slot.slot_start_time}-${slot.slot_end_time}`);
            }
          } else {
            // Fallback to direct booking times
            bookedTimeSlots.add(`${booking.start_time}-${booking.end_time}`);
          }
        }
      }

      console.log('Booked time slots:', Array.from(bookedTimeSlots));
      console.log('Open field slots before filtering:', openFieldSlots.length);

      // Filter out booked slots and past slots (if today) in a single pass
      const availableSlots = openFieldSlots.filter(slot => {
        // Filter out confirmed booked slots
        if (bookedTimeSlots.has(`${slot.start_time}-${slot.end_time}`)) {
          return false;
        }

        // Filter out past time slots if the selected date is today
        if (isToday) {
          try {
            // Create a proper date object for the slot time
            const slotDateTime = new Date(date + 'T' + slot.start_time);

            // Check if the date is valid
            if (isNaN(slotDateTime.getTime())) {
              console.warn('Invalid slot time:', slot.start_time);
              return true; // Keep the slot if we can't parse the time
            }

            // Add a 30-minute buffer to account for booking preparation time
            const currentTimeWithBuffer = new Date(now.getTime() + (30 * 60 * 1000));

            const isPastSlot = slotDateTime <= currentTimeWithBuffer;

            if (isPastSlot) {
              console.log('Filtering out past slot:', {
                slotTime: slot.start_time,
                slotDateTime: slotDateTime.toISOString(),
                currentTimeWithBuffer: currentTimeWithBuffer.toISOString(),
                isPast: isPastSlot
              });
              return false;
            }
          } catch (error) {
            console.error('Error parsing slot time:', slot.start_time, error);
            return true; // Keep the slot if there's an error
          }
        }

        return true;
      });

      console.log('Available time slots after filtering:', availableSlots.length);
      return availableSlots;
    } catch (error) {
      console.error('Error getting available slots:', error);
      return [];
    }
  }

  /**
   * Check if a venue has time slots
   */
  static async venueHasTimeSlots(venueId: string): Promise<boolean> {
    try {
      const { data: slots, error } = await supabase
        .from('time_slots')
        .select('id')
        .eq('venue_id', venueId)
        .limit(1);

      if (error) {
        console.error('Error checking time slots:', error);
        return false;
      }

      return (slots?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking time slots:', error);
      return false;
    }
  }

  /**
   * Update time slots for a venue when its schedule changes
   */
  static async updateVenueTimeSlots(
    venueId: string,
    openingTime: string,
    closingTime: string,
    daysAvailable: number[]
  ): Promise<void> {
    try {
      // Get venue fields
      const { data: fields, error: fieldsError } = await supabase
        .from('venue_fields')
        .select('id, field_name, field_number')
        .eq('venue_id', venueId);

      if (fieldsError) {
        console.error('Error loading venue fields:', fieldsError);
        throw fieldsError;
      }

      // Regenerate time slots
      await this.generateTimeSlotsForVenue(
        venueId,
        openingTime,
        closingTime,
        daysAvailable,
        fields || []
      );
    } catch (error) {
      console.error('Error updating venue time slots:', error);
      throw error;
    }
  }

  /**
   * Get venue availability summary for calendar
   */
  static async getVenueAvailability(
    venueId: string,
    startDate: string,
    endDate: string,
    fieldId?: string
  ): Promise<{ [key: string]: 'available' | 'limited' | 'unavailable' }> {
    try {
      const availability: { [key: string]: 'available' | 'limited' | 'unavailable' } = {};
      
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const dayOfWeek = d.getDay();

        // Check for special occasion overrides first
        const dateAvailability = await SpecialOccasionsService.isDateAvailable(venueId, dateStr, fieldId);

        if (!dateAvailability.isAvailable) {
          availability[dateStr] = 'unavailable';
          continue;
        }

        // Get time slots for this day with field status check
        let query = supabase
          .from('time_slots')
          .select(`
            id,
            field_id,
            venue_fields (
              id,
              status
            )
          `)
          .eq('venue_id', venueId)
          .eq('day_of_week', dayOfWeek)
          .eq('is_active', true);

        if (fieldId) {
          query = query.eq('field_id', fieldId);
        } else {
          query = query.is('field_id', null);
        }

        const { data: slots } = await query;

        // Filter out slots for closed fields
        const openFieldSlots = (slots || []).filter(slot => {
          // If slot has no field_id (venue-level slots), it's available
          if (!slot.field_id) return true;

          // Check if the associated field is open
          const field = slot.venue_fields?.[0];
          return field && field.status === 'open';
        });

        const totalSlots = openFieldSlots.length;

        if (totalSlots === 0) {
          availability[dateStr] = 'unavailable';
          continue;
        }

        // Check how many slots are booked by looking at confirmed bookings only
        const { data: bookedBookings } = await supabase
          .from('bookings')
          .select(`
            id,
            start_time,
            end_time,
            booking_slots (
              slot_start_time,
              slot_end_time
            )
          `)
          .eq('booking_date', dateStr)
          .eq('venue_id', venueId)
          .eq('status', 'confirmed');

        // Count unique booked time slots
        const bookedTimeSlots = new Set<string>();
        (bookedBookings || []).forEach(booking => {
          booking.booking_slots?.forEach(slot => {
            bookedTimeSlots.add(`${slot.slot_start_time}-${slot.slot_end_time}`);
          });
        });

        const bookedCount = bookedTimeSlots.size;
        const availableCount = totalSlots - bookedCount;

        if (availableCount === 0) {
          availability[dateStr] = 'unavailable';
        } else if (availableCount <= totalSlots * 0.3) { // Less than 30% available
          availability[dateStr] = 'limited';
        } else {
          availability[dateStr] = 'available';
        }
      }

      return availability;
    } catch (error) {
      console.error('Error getting venue availability:', error);
      return {};
    }
  }
}
