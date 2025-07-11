// Player statistics service for tracking player activity and performance
import { supabase } from './supabase';

export interface PlayerStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalSpent: number;
  averageBookingValue: number;
  favoriteVenues: Array<{
    venue_id: string;
    venue_name: string;
    booking_count: number;
  }>;
  monthlyStats: Array<{
    month: string;
    bookings: number;
    spent: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'booking' | 'cancellation' | 'completion';
    venue_name: string;
    date: string;
    amount?: number;
  }>;
}

export class PlayerStatsService {
  /**
   * Get comprehensive player statistics
   */
  static async getPlayerStats(playerId: string): Promise<PlayerStats> {
    try {
      // Get all bookings for the player
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          total_amount,
          status,
          created_at,
          confirmed_at,
          cancelled_at,
          completed_at,
          venues (
            id,
            name
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading player bookings:', error);
        throw error;
      }

      const allBookings = bookings || [];

      // Calculate basic stats
      const totalBookings = allBookings.length;
      const completedBookings = allBookings.filter(b => b.status === 'completed').length;
      const cancelledBookings = allBookings.filter(b => b.status === 'cancelled').length;
      const pendingBookings = allBookings.filter(b => b.status === 'pending').length;
      const confirmedBookings = allBookings.filter(b => b.status === 'confirmed').length;
      
      const totalSpent = allBookings
        .filter(b => b.status === 'completed' || b.status === 'confirmed')
        .reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
      
      const averageBookingValue = totalBookings > 0 ? totalSpent / totalBookings : 0;

      // Calculate favorite venues
      const venueBookingCounts = new Map<string, { name: string; count: number }>();
      allBookings.forEach(booking => {
        if (booking.venues) {
          const venueId = booking.venues.id;
          const venueName = booking.venues.name;
          const current = venueBookingCounts.get(venueId) || { name: venueName, count: 0 };
          venueBookingCounts.set(venueId, { name: venueName, count: current.count + 1 });
        }
      });

      const favoriteVenues = Array.from(venueBookingCounts.entries())
        .map(([venue_id, data]) => ({
          venue_id,
          venue_name: data.name,
          booking_count: data.count,
        }))
        .sort((a, b) => b.booking_count - a.booking_count)
        .slice(0, 5);

      // Calculate monthly stats for the last 6 months
      const monthlyStats = this.calculateMonthlyStats(allBookings);

      // Get recent activity
      const recentActivity = this.getRecentActivity(allBookings);

      return {
        totalBookings,
        completedBookings,
        cancelledBookings,
        pendingBookings,
        confirmedBookings,
        totalSpent,
        averageBookingValue,
        favoriteVenues,
        monthlyStats,
        recentActivity,
      };
    } catch (error) {
      console.error('Error getting player stats:', error);
      throw error;
    }
  }

  /**
   * Calculate monthly statistics for the last 6 months
   */
  private static calculateMonthlyStats(bookings: any[]): Array<{
    month: string;
    bookings: number;
    spent: number;
  }> {
    const monthlyData = new Map<string, { bookings: number; spent: number }>();
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      monthlyData.set(monthKey, { bookings: 0, spent: 0 });
    }

    // Aggregate booking data by month
    bookings.forEach(booking => {
      const bookingDate = new Date(booking.created_at);
      const monthKey = bookingDate.toISOString().slice(0, 7);
      
      if (monthlyData.has(monthKey)) {
        const current = monthlyData.get(monthKey)!;
        current.bookings += 1;
        if (booking.status === 'completed' || booking.status === 'confirmed') {
          current.spent += booking.total_amount || 0;
        }
      }
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      }),
      bookings: data.bookings,
      spent: data.spent,
    }));
  }

  /**
   * Get recent activity for the player
   */
  private static getRecentActivity(bookings: any[]): Array<{
    id: string;
    type: 'booking' | 'cancellation' | 'completion';
    venue_name: string;
    date: string;
    amount?: number;
  }> {
    const activities: Array<{
      id: string;
      type: 'booking' | 'cancellation' | 'completion';
      venue_name: string;
      date: string;
      amount?: number;
    }> = [];

    bookings.forEach(booking => {
      if (!booking.venues) return;

      // Add booking creation
      activities.push({
        id: `${booking.id}-created`,
        type: 'booking',
        venue_name: booking.venues.name,
        date: booking.created_at,
        amount: booking.total_amount,
      });

      // Add completion if applicable
      if (booking.completed_at) {
        activities.push({
          id: `${booking.id}-completed`,
          type: 'completion',
          venue_name: booking.venues.name,
          date: booking.completed_at,
          amount: booking.total_amount,
        });
      }

      // Add cancellation if applicable
      if (booking.cancelled_at) {
        activities.push({
          id: `${booking.id}-cancelled`,
          type: 'cancellation',
          venue_name: booking.venues.name,
          date: booking.cancelled_at,
        });
      }
    });

    // Sort by date (most recent first) and return top 10
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }

  /**
   * Get player booking trends
   */
  static async getBookingTrends(playerId: string): Promise<{
    weeklyTrend: number; // percentage change from last week
    monthlyTrend: number; // percentage change from last month
    preferredTimeSlots: Array<{ time: string; count: number }>;
    preferredDays: Array<{ day: string; count: number }>;
  }> {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('booking_date, start_time, created_at')
        .eq('player_id', playerId)
        .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()); // Last 60 days

      if (error) throw error;

      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const thisWeekBookings = bookings?.filter(b => 
        new Date(b.created_at) >= oneWeekAgo
      ).length || 0;
      
      const lastWeekBookings = bookings?.filter(b => 
        new Date(b.created_at) >= twoWeeksAgo && new Date(b.created_at) < oneWeekAgo
      ).length || 0;

      const thisMonthBookings = bookings?.filter(b => 
        new Date(b.created_at) >= oneMonthAgo
      ).length || 0;
      
      const lastMonthBookings = bookings?.filter(b => 
        new Date(b.created_at) >= twoMonthsAgo && new Date(b.created_at) < oneMonthAgo
      ).length || 0;

      const weeklyTrend = lastWeekBookings > 0 
        ? ((thisWeekBookings - lastWeekBookings) / lastWeekBookings) * 100 
        : 0;
      
      const monthlyTrend = lastMonthBookings > 0 
        ? ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100 
        : 0;

      // Calculate preferred time slots and days
      const timeSlotCounts = new Map<string, number>();
      const dayCounts = new Map<string, number>();

      bookings?.forEach(booking => {
        if (booking.start_time) {
          const hour = booking.start_time.split(':')[0];
          const timeSlot = `${hour}:00`;
          timeSlotCounts.set(timeSlot, (timeSlotCounts.get(timeSlot) || 0) + 1);
        }

        if (booking.booking_date) {
          const dayOfWeek = new Date(booking.booking_date).toLocaleDateString('en-US', { weekday: 'long' });
          dayCounts.set(dayOfWeek, (dayCounts.get(dayOfWeek) || 0) + 1);
        }
      });

      const preferredTimeSlots = Array.from(timeSlotCounts.entries())
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const preferredDays = Array.from(dayCounts.entries())
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count);

      return {
        weeklyTrend,
        monthlyTrend,
        preferredTimeSlots,
        preferredDays,
      };
    } catch (error) {
      console.error('Error getting booking trends:', error);
      throw error;
    }
  }
}
