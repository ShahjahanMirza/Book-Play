// Special occasions service for managing date-specific venue availability overrides
import { supabase } from './supabase';

export interface SpecialOccasion {
  id: string;
  venue_id: string;
  field_id?: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  override_type: 'closed' | 'custom_hours' | 'custom_pricing';
  custom_opening_time?: string;
  custom_closing_time?: string;
  custom_day_charges?: number;
  custom_night_charges?: number;
  is_recurring: boolean;
  recurrence_pattern?: 'weekly' | 'monthly' | 'yearly';
  created_at: string;
  updated_at: string;
}

export class SpecialOccasionsService {
  /**
   * Create a new special occasion override
   */
  static async createSpecialOccasion(
    venueId: string,
    occasionData: Omit<SpecialOccasion, 'id' | 'venue_id' | 'created_at' | 'updated_at'>
  ): Promise<SpecialOccasion> {
    try {
      const { data, error } = await supabase
        .from('venue_special_occasions')
        .insert({
          venue_id: venueId,
          ...occasionData,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating special occasion:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating special occasion:', error);
      throw error;
    }
  }

  /**
   * Get all special occasions for a venue
   */
  static async getVenueSpecialOccasions(
    venueId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SpecialOccasion[]> {
    try {
      let query = supabase
        .from('venue_special_occasions')
        .select('*')
        .eq('venue_id', venueId)
        .order('start_date', { ascending: true });

      if (startDate && endDate) {
        query = query
          .gte('end_date', startDate)
          .lte('start_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading special occasions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error loading special occasions:', error);
      throw error;
    }
  }

  /**
   * Update a special occasion
   */
  static async updateSpecialOccasion(
    occasionId: string,
    updates: Partial<Omit<SpecialOccasion, 'id' | 'venue_id' | 'created_at' | 'updated_at'>>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('venue_special_occasions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', occasionId);

      if (error) {
        console.error('Error updating special occasion:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating special occasion:', error);
      throw error;
    }
  }

  /**
   * Delete a special occasion
   */
  static async deleteSpecialOccasion(occasionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('venue_special_occasions')
        .delete()
        .eq('id', occasionId);

      if (error) {
        console.error('Error deleting special occasion:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting special occasion:', error);
      throw error;
    }
  }

  /**
   * Check if a date has any special occasion overrides
   */
  static async getDateOverrides(
    venueId: string,
    date: string,
    fieldId?: string
  ): Promise<SpecialOccasion[]> {
    try {
      let query = supabase
        .from('venue_special_occasions')
        .select('*')
        .eq('venue_id', venueId)
        .lte('start_date', date)
        .gte('end_date', date);

      if (fieldId) {
        query = query.or(`field_id.eq.${fieldId},field_id.is.null`);
      } else {
        query = query.is('field_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking date overrides:', error);
        // Return empty array instead of throwing to prevent blocking booking
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error checking date overrides:', error);
      // Return empty array instead of throwing to prevent blocking booking
      return [];
    }
  }

  /**
   * Check if venue/field is available on a specific date considering special occasions
   */
  static async isDateAvailable(
    venueId: string,
    date: string,
    fieldId?: string
  ): Promise<{
    isAvailable: boolean;
    reason?: string;
    customHours?: { opening: string; closing: string };
    customPricing?: { day: number; night: number };
  }> {
    try {
      const overrides = await this.getDateOverrides(venueId, date, fieldId);

      if (overrides.length === 0) {
        return { isAvailable: true };
      }

      // Check for closure overrides first
      const closureOverride = overrides.find(o => o.override_type === 'closed');
      if (closureOverride) {
        return {
          isAvailable: false,
          reason: closureOverride.title,
        };
      }

      // Check for custom hours
      const customHoursOverride = overrides.find(o => o.override_type === 'custom_hours');
      if (customHoursOverride) {
        return {
          isAvailable: true,
          customHours: {
            opening: customHoursOverride.custom_opening_time || '06:00',
            closing: customHoursOverride.custom_closing_time || '23:00',
          },
        };
      }

      // Check for custom pricing
      const customPricingOverride = overrides.find(o => o.override_type === 'custom_pricing');
      if (customPricingOverride) {
        return {
          isAvailable: true,
          customPricing: {
            day: customPricingOverride.custom_day_charges || 0,
            night: customPricingOverride.custom_night_charges || 0,
          },
        };
      }

      return { isAvailable: true };
    } catch (error) {
      console.error('Error checking date availability:', error);
      return { isAvailable: true }; // Default to available on error
    }
  }

  /**
   * Get upcoming special occasions for a venue
   */
  static async getUpcomingOccasions(
    venueId: string,
    limit: number = 10
  ): Promise<SpecialOccasion[]> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('venue_special_occasions')
        .select('*')
        .eq('venue_id', venueId)
        .gte('start_date', today)
        .order('start_date', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error loading upcoming occasions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error loading upcoming occasions:', error);
      throw error;
    }
  }

  /**
   * Create common holiday templates
   */
  static getHolidayTemplates(): Array<{
    title: string;
    description: string;
    override_type: 'closed' | 'custom_hours';
    dates: string[];
  }> {
    const currentYear = new Date().getFullYear();
    
    return [
      {
        title: 'New Year\'s Day',
        description: 'Venue closed for New Year celebration',
        override_type: 'closed',
        dates: [`${currentYear}-01-01`],
      },
      {
        title: 'Independence Day',
        description: 'Venue closed for Independence Day',
        override_type: 'closed',
        dates: [`${currentYear}-08-14`],
      },
      {
        title: 'Eid ul-Fitr',
        description: 'Venue closed for Eid celebration',
        override_type: 'closed',
        dates: [`${currentYear}-04-21`, `${currentYear}-04-22`], // Approximate dates
      },
      {
        title: 'Eid ul-Adha',
        description: 'Venue closed for Eid celebration',
        override_type: 'closed',
        dates: [`${currentYear}-06-28`, `${currentYear}-06-29`], // Approximate dates
      },
      {
        title: 'Christmas Day',
        description: 'Venue closed for Christmas',
        override_type: 'closed',
        dates: [`${currentYear}-12-25`],
      },
    ];
  }
}
