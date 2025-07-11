import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import BookingCalendar from '@/components/BookingCalendar';
import { TimeSlotsService } from '@/services/timeSlotsService';
import { NotificationService } from '@/services/notificationService';

interface Venue {
  id: string;
  name: string;
  location: string;
  day_charges: number;
  night_charges: number;
  weekday_charges: number;
  weekend_charges: number;
  opening_time: string;
  closing_time: string;
  fields: VenueField[];
}

interface VenueField {
  id: string;
  field_name: string;
  field_number: string;
}

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export default function BookingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedField, setSelectedField] = useState<string>('');
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [availabilityData, setAvailabilityData] = useState<{ [key: string]: 'available' | 'limited' | 'unavailable' }>({});

  useEffect(() => {
    if (venueId) {
      loadVenueDetails();
    }
  }, [venueId]);

  useEffect(() => {
    if (venue) {
      checkAndFixTimeSlots();
    }
  }, [venue]); // Remove selectedField dependency to avoid unnecessary checks

  useEffect(() => {
    if (selectedDate && venue) {
      loadAvailableSlots();
    }
  }, [selectedDate, selectedField, venue]);

  const loadVenueDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          location,
          day_charges,
          night_charges,
          weekday_charges,
          weekend_charges,
          opening_time,
          closing_time,
          venue_fields (
            id,
            field_name,
            field_number
          )
        `)
        .eq('id', venueId)
        .single();

      if (error) {
        console.error('Error loading venue:', error);
        Alert.alert('Error', 'Failed to load venue details');
        return;
      }

      setVenue({
        id: data.id,
        name: data.name,
        location: data.location,
        day_charges: data.day_charges,
        night_charges: data.night_charges,
        weekday_charges: data.weekday_charges,
        weekend_charges: data.weekend_charges,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        fields: data.venue_fields || [],
      });
    } catch (error) {
      console.error('Error loading venue:', error);
      Alert.alert('Error', 'Failed to load venue details');
    } finally {
      setLoading(false);
    }
  };

  const checkAndFixTimeSlots = async () => {
    if (!venue) return;

    try {
      console.log('Checking time slots for venue:', venue.id);

      // Use the optimized ensureTimeSlotsExist method which is faster
      await TimeSlotsService.ensureTimeSlotsExist(venue.id);

      console.log('Time slots check completed');

      // Load calendar availability after ensuring time slots exist
      await loadCalendarAvailability();
    } catch (error) {
      console.error('Error checking/fixing time slots:', error);
      // Still load calendar even if time slot check fails
      await loadCalendarAvailability();
    }
  };

  const loadCalendarAvailability = async () => {
    if (!venue) return;

    try {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + 30);

      const availability = await TimeSlotsService.getVenueAvailability(
        venue.id,
        today.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        selectedField || undefined
      );

      setAvailabilityData(availability);
    } catch (error) {
      console.error('Error loading calendar availability:', error);
    }
  };

  const loadAvailableSlots = async () => {
    if (!venue || !selectedDate) return;

    try {
      console.log('Loading available slots for:', { venueId: venue.id, date: selectedDate, fieldId: selectedField });

      const slots = await TimeSlotsService.getAvailableSlots(
        venue.id,
        selectedDate,
        selectedField || undefined
      );

      console.log('Available slots loaded:', slots.length);

      const availableSlots: TimeSlot[] = slots.map(slot => ({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: true, // These are already filtered to be available
      }));

      setAvailableSlots(availableSlots);
    } catch (error) {
      console.error('Error loading available slots:', error);
      setAvailableSlots([]);
    }
  };

  const handleSlotToggle = (slotId: string) => {
    setSelectedSlots(prev => {
      if (prev.includes(slotId)) {
        // If deselecting, remove the slot and any non-consecutive slots
        const newSelection = prev.filter(id => id !== slotId);
        return getConsecutiveSlots(newSelection);
      } else {
        // If selecting, check if it can form a consecutive sequence
        const newSelection = [...prev, slotId];
        const consecutiveSlots = getConsecutiveSlots(newSelection);

        // If the new slot doesn't form a consecutive sequence, start fresh with just this slot
        if (consecutiveSlots.length !== newSelection.length) {
          return [slotId];
        }

        return consecutiveSlots;
      }
    });
  };

  const getConsecutiveSlots = (slotIds: string[]): string[] => {
    if (slotIds.length <= 1) return slotIds;

    // Get slot details and sort by start time
    const slotDetails = slotIds
      .map(id => availableSlots.find(slot => slot.id === id))
      .filter(Boolean)
      .sort((a, b) => a!.start_time.localeCompare(b!.start_time));

    if (slotDetails.length === 0) return [];

    // Check if slots are consecutive
    const consecutiveSlots = [slotDetails[0]];

    for (let i = 1; i < slotDetails.length; i++) {
      const prevSlot = consecutiveSlots[consecutiveSlots.length - 1];
      const currentSlot = slotDetails[i];

      // Check if current slot starts when previous slot ends
      if (prevSlot!.end_time === currentSlot!.start_time) {
        consecutiveSlots.push(currentSlot);
      } else {
        // If not consecutive, only keep the consecutive part up to this point
        break;
      }
    }

    return consecutiveSlots.map(slot => slot!.id);
  };

  const calculateTotal = () => {
    if (!venue || !selectedDate || selectedSlots.length === 0) return 0;

    const selectedSlotDetails = availableSlots.filter(slot =>
      selectedSlots.includes(slot.id)
    );

    if (selectedSlotDetails.length === 0) return 0;

    const bookingDate = new Date(selectedDate);
    const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6; // Sunday = 0, Saturday = 6

    let totalAmount = 0;

    selectedSlotDetails.forEach(slot => {
      const startHour = parseInt(slot.start_time.split(':')[0]);
      const endHour = parseInt(slot.end_time.split(':')[0]);
      const duration = endHour - startHour; // Duration in hours

      // Determine if it's day or night time
      // Assuming day time is 6 AM to 6 PM (18:00), night time is 6 PM to 6 AM
      const isDayTime = startHour >= 6 && startHour < 18;

      let hourlyRate = 0;

      if (isWeekend) {
        // Weekend pricing
        hourlyRate = isDayTime ? venue.day_charges : venue.night_charges;
        // If venue has specific weekend charges, use those instead
        if (venue.weekend_charges > 0) {
          hourlyRate = venue.weekend_charges;
        }
      } else {
        // Weekday pricing
        if (venue.weekday_charges > 0) {
          hourlyRate = venue.weekday_charges;
        } else {
          hourlyRate = isDayTime ? venue.day_charges : venue.night_charges;
        }
      }

      totalAmount += hourlyRate * duration;
    });

    return totalAmount;
  };

  const handleBooking = async () => {
    if (!user || !venue || !selectedDate || selectedSlots.length === 0) {
      Alert.alert('Error', 'Please select date and time slots');
      return;
    }

    try {
      setSubmitting(true);

      // Double-check availability before booking
      const selectedSlotDetails = availableSlots.filter(slot =>
        selectedSlots.includes(slot.id)
      );

      const { data: existingBookings, error: checkError } = await supabase
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
        .eq('booking_date', selectedDate)
        .eq('venue_id', venue.id)
        .eq('status', 'confirmed');

      if (checkError) {
        console.error('Error checking availability:', checkError);
        Alert.alert('Error', 'Failed to verify slot availability');
        return;
      }

      // Check if any of our selected slots conflict with existing bookings
      const bookedTimeSlots = new Set<string>();
      (existingBookings || []).forEach(booking => {
        booking.booking_slots?.forEach(slot => {
          bookedTimeSlots.add(`${slot.slot_start_time}-${slot.slot_end_time}`);
        });
      });

      const hasConflict = selectedSlotDetails.some(slot =>
        bookedTimeSlots.has(`${slot.start_time}-${slot.end_time}`)
      );

      if (hasConflict) {
        Alert.alert('Error', 'Some selected slots are no longer available. Please refresh and try again.');
        await loadAvailableSlots(); // Refresh the slots
        return;
      }

      // selectedSlotDetails already calculated above

      const startTime = selectedSlotDetails[0]?.start_time;
      const endTime = selectedSlotDetails[selectedSlotDetails.length - 1]?.end_time;

      // Create the booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          player_id: user.id,
          venue_id: venue.id,
          field_id: selectedField || null,
          booking_date: selectedDate,
          start_time: startTime,
          end_time: endTime,
          total_slots: selectedSlots.length,
          total_amount: calculateTotal(),
          status: 'pending',
        })
        .select()
        .single();

      if (bookingError) {
        console.error('Error creating booking:', bookingError);
        Alert.alert('Error', 'Failed to create booking');
        return;
      }

      // Create booking slots using the actual schema
      const bookingSlots = selectedSlotDetails.map((slot, index) => ({
        booking_id: booking.id,
        slot_start_time: slot.start_time,
        slot_end_time: slot.end_time,
        slot_order: index + 1,
      }));

      const { error: slotsError } = await supabase
        .from('booking_slots')
        .insert(bookingSlots);

      if (slotsError) {
        console.error('Error creating booking slots:', slotsError);
        Alert.alert('Error', 'Failed to complete booking');
        return;
      }

      // Send notification to venue owner about new booking request
      try {
        // Get venue owner ID
        const { data: venueData, error: venueError } = await supabase
          .from('venues')
          .select('owner_id')
          .eq('id', venue.id)
          .single();

        if (!venueError && venueData?.owner_id) {
          const bookingDateFormatted = new Date(selectedDate).toLocaleDateString();
          await NotificationService.notifyBookingPending(
            venueData.owner_id,
            user.name || 'A player',
            venue.name,
            bookingDateFormatted
          );
        }
      } catch (notificationError) {
        console.error('Error sending booking notification:', notificationError);
        // Don't fail the booking if notification fails
      }

      Alert.alert(
        'Booking Submitted!',
        'Your booking request has been submitted and is pending venue owner approval.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#228B22" />
        <Text style={styles.loadingText}>Loading venue details...</Text>
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>Venue not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Book {venue.name}</Text>
          <Text style={styles.headerSubtitle}>{venue.location}</Text>
        </View>
      </View>

      {/* Venue Info */}
      <View style={styles.venueInfo}>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Day charges</Text>
          <Text style={styles.priceValue}>${venue.day_charges}</Text>
        </View>
        <View style={styles.hoursInfo}>
          <Text style={styles.hoursLabel}>Operating Hours</Text>
          <Text style={styles.hoursValue}>
            {formatTime(venue.opening_time)} - {formatTime(venue.closing_time)}
          </Text>
        </View>
      </View>

      {/* Field Selection */}
      {venue.fields.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Field (Optional)</Text>
          <View style={styles.fieldContainer}>
            <TouchableOpacity
              style={[styles.fieldOption, !selectedField && styles.selectedField]}
              onPress={() => setSelectedField('')}
            >
              <Text style={[styles.fieldText, !selectedField && styles.selectedFieldText]}>
                Any Available Field
              </Text>
            </TouchableOpacity>
            {venue.fields.map((field) => (
              <TouchableOpacity
                key={field.id}
                style={[styles.fieldOption, selectedField === field.id && styles.selectedField]}
                onPress={() => setSelectedField(field.id)}
              >
                <Text style={[styles.fieldText, selectedField === field.id && styles.selectedFieldText]}>
                  {field.field_name || `Field ${field.field_number}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Date Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <BookingCalendar
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
          venueId={venue.id}
          availabilityData={availabilityData}
        />
      </View>

      {/* Time Slots */}
      {selectedDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time Slots</Text>
          {availableSlots.length === 0 ? (
            <View style={styles.noSlotsContainer}>
              <Text style={styles.noSlotsText}>No available slots for this date</Text>
            </View>
          ) : (
            <View style={styles.slotsContainer}>
              {availableSlots.map((slot) => (
                <TouchableOpacity
                  key={slot.id}
                  style={[
                    styles.slotOption,
                    !slot.is_available && styles.unavailableSlot,
                    selectedSlots.includes(slot.id) && styles.selectedSlot,
                  ]}
                  onPress={() => slot.is_available && handleSlotToggle(slot.id)}
                  disabled={!slot.is_available}
                >
                  <Text style={[
                    styles.slotText,
                    !slot.is_available && styles.unavailableSlotText,
                    selectedSlots.includes(slot.id) && styles.selectedSlotText,
                  ]}>
                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  </Text>
                  {!slot.is_available && (
                    <Text style={styles.bookedText}>Booked</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Booking Summary */}
      {selectedSlots.length > 0 && (
        <View style={styles.summarySection}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>

          {/* Time Period */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time Period:</Text>
            <Text style={styles.summaryValue}>
              {availableSlots.find(s => s.id === selectedSlots[0])?.start_time} - {' '}
              {availableSlots.find(s => s.id === selectedSlots[selectedSlots.length - 1])?.end_time}
            </Text>
          </View>

          {/* Duration */}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>{selectedSlots.length} hour{selectedSlots.length > 1 ? 's' : ''}</Text>
          </View>

          {/* Pricing Type */}
          {selectedDate && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pricing:</Text>
              <Text style={styles.summaryValue}>
                {(() => {
                  const bookingDate = new Date(selectedDate);
                  const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6;
                  const firstSlot = availableSlots.find(s => s.id === selectedSlots[0]);
                  const isDayTime = firstSlot ? parseInt(firstSlot.start_time.split(':')[0]) >= 6 && parseInt(firstSlot.start_time.split(':')[0]) < 18 : true;

                  if (isWeekend) {
                    return venue?.weekend_charges > 0 ? 'Weekend Rate' : (isDayTime ? 'Weekend Day' : 'Weekend Night');
                  } else {
                    return venue?.weekday_charges > 0 ? 'Weekday Rate' : (isDayTime ? 'Weekday Day' : 'Weekday Night');
                  }
                })()}
              </Text>
            </View>
          )}

          {/* Total Amount */}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>Rs. {calculateTotal()}</Text>
          </View>
        </View>
      )}

      {/* Book Button */}
      <View style={styles.bookingActions}>
        <TouchableOpacity
          style={[
            styles.bookButton,
            (selectedSlots.length === 0 || submitting) && styles.disabledButton
          ]}
          onPress={handleBooking}
          disabled={selectedSlots.length === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.bookButtonText}>
              Book Now - Rs. {calculateTotal()}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginTop: 20,
    marginBottom: 30,
  },
  header: {
    backgroundColor: '#90EE90',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f0f0f',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#0f0f0f',
  },
  venueInfo: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -10,
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceInfo: {
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#228B22',
  },
  hoursInfo: {
    alignItems: 'center',
  },
  hoursLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  fieldContainer: {
    gap: 10,
  },
  fieldOption: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#f8f9fa',
  },
  selectedField: {
    borderColor: '#228B22',
    backgroundColor: '#E3F2FD',
  },
  fieldText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedFieldText: {
    color: '#228B22',
    fontWeight: '600',
  },

  noSlotsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noSlotsText: {
    fontSize: 16,
    color: '#666',
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#f8f9fa',
    minWidth: '45%',
    alignItems: 'center',
  },
  selectedSlot: {
    borderColor: '#228B22',
    backgroundColor: '#E3F2FD',
  },
  unavailableSlot: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  slotText: {
    fontSize: 14,
    color: '#333',
  },
  selectedSlotText: {
    color: '#228B22',
    fontWeight: '600',
  },
  unavailableSlotText: {
    color: '#999',
  },
  bookedText: {
    fontSize: 10,
    color: '#F44336',
    marginTop: 2,
  },
  summarySection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#228B22',
  },
  bookingActions: {
    padding: 20,
  },
  bookButton: {
    backgroundColor: '#228B22',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
