// Venue owner analytics screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { VenueOwnerWelcomeHeader } from '../../src/components/VenueOwnerWelcomeHeader';

interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    growth: number;
  };
  bookings: {
    current: number;
    previous: number;
    growth: number;
  };
  venues: {
    total: number;
    active: number;
  };
  topVenues: Array<{
    id: string;
    name: string;
    revenue: number;
    bookings: number;
  }>;
  recentBookings: Array<{
    id: string;
    venue_name: string;
    player_name: string;
    amount: number;
    date: string;
    status: string;
  }>;
  monthlyRevenue: Array<{
    month: string;
    revenue: number;
  }>;
}

export default function VenueOwnerAnalytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    revenue: { current: 0, previous: 0, growth: 0 },
    bookings: { current: 0, previous: 0, growth: 0 },
    venues: { total: 0, active: 0 },
    topVenues: [],
    recentBookings: [],
    monthlyRevenue: [],
  });

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user, selectedPeriod]);

  const loadAnalyticsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('Loading analytics data for user:', user.id, 'period:', selectedPeriod);

      // Get date ranges based on selected period
      const now = new Date();
      let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

      switch (selectedPeriod) {
        case 'week':
          currentEnd = new Date(now);
          currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousEnd = new Date(currentStart);
          previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          currentEnd = new Date(now);
          currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
          previousEnd = new Date(currentStart);
          previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'year':
          currentEnd = new Date(now);
          currentStart = new Date(now.getFullYear(), 0, 1);
          previousEnd = new Date(currentStart);
          previousStart = new Date(now.getFullYear() - 1, 0, 1);
          break;
      }

      // Load venues data
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, status, approval_status')
        .eq('owner_id', user.id);

      if (venuesError) {
        console.error('Error loading venues:', venuesError);
        Alert.alert('Error', 'Failed to load venues data');
        return;
      }

      const venueIds = venues?.map(v => v.id) || [];
      const activeVenues = venues?.filter(v => v.status === 'open' && v.approval_status === 'approved') || [];

      console.log('Venues loaded:', venues?.length, 'Active venues:', activeVenues.length, 'Venue IDs:', venueIds);

      // Load current period bookings
      const { data: currentBookings, error: currentBookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_amount,
          status,
          booking_date,
          venues!bookings_venue_id_fkey (name),
          users!bookings_player_id_fkey (name)
        `)
        .in('venue_id', venueIds)
        .gte('booking_date', currentStart.toISOString().split('T')[0])
        .lte('booking_date', currentEnd.toISOString().split('T')[0]);

      // Load previous period bookings
      const { data: previousBookings, error: previousBookingsError } = await supabase
        .from('bookings')
        .select('id, total_amount, status')
        .in('venue_id', venueIds)
        .gte('booking_date', previousStart.toISOString().split('T')[0])
        .lte('booking_date', previousEnd.toISOString().split('T')[0]);

      if (currentBookingsError || previousBookingsError) {
        console.error('Error loading bookings:', currentBookingsError || previousBookingsError);
        Alert.alert('Error', 'Failed to load bookings data');
        return;
      }

      console.log('Current bookings loaded:', currentBookings?.length, 'Previous bookings:', previousBookings?.length);
      console.log('Date ranges - Current:', currentStart.toISOString().split('T')[0], 'to', currentEnd.toISOString().split('T')[0]);
      console.log('Date ranges - Previous:', previousStart.toISOString().split('T')[0], 'to', previousEnd.toISOString().split('T')[0]);

      // Calculate metrics
      const currentConfirmedBookings = currentBookings?.filter(b => b.status === 'confirmed') || [];
      const previousConfirmedBookings = previousBookings?.filter(b => b.status === 'confirmed') || [];

      console.log('Confirmed bookings - Current:', currentConfirmedBookings.length, 'Previous:', previousConfirmedBookings.length);

      const currentRevenue = currentConfirmedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const previousRevenue = previousConfirmedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const revenueGrowth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue * 100) : 0;

      const currentBookingCount = currentConfirmedBookings.length;
      const previousBookingCount = previousConfirmedBookings.length;
      const bookingGrowth = previousBookingCount > 0 ? ((currentBookingCount - previousBookingCount) / previousBookingCount * 100) : 0;

      // Calculate top venues
      const venueStats = venueIds.map(venueId => {
        const venueBookings = currentConfirmedBookings.filter(b => b.venue_id === venueId);
        const venue = venues?.find(v => v.id === venueId);
        return {
          id: venueId,
          name: venue?.name || 'Unknown Venue',
          revenue: venueBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
          bookings: venueBookings.length,
        };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

      // Recent bookings
      const recentBookings = currentBookings
        ?.slice(0, 10)
        .map(booking => ({
          id: booking.id,
          venue_name: (booking.venues as any)?.name || 'Unknown Venue',
          player_name: (booking.users as any)?.name || 'Unknown Player',
          amount: booking.total_amount || 0,
          date: booking.booking_date,
          status: booking.status,
        })) || [];

      // Monthly revenue for chart (last 6 months)
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

        const monthBookings = currentBookings?.filter(b => {
          const bookingDate = new Date(b.booking_date);
          return bookingDate >= monthStart && bookingDate <= monthEnd && b.status === 'confirmed';
        }) || [];

        const monthRevenue = monthBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

        monthlyRevenue.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          revenue: monthRevenue,
        });
      }

      setAnalyticsData({
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          growth: Math.round(revenueGrowth * 100) / 100,
        },
        bookings: {
          current: currentBookingCount,
          previous: previousBookingCount,
          growth: Math.round(bookingGrowth * 100) / 100,
        },
        venues: {
          total: venues?.length || 0,
          active: activeVenues.length,
        },
        topVenues: venueStats,
        recentBookings,
        monthlyRevenue,
      });

    } catch (error) {
      console.error('Error loading analytics data:', error);
      Alert.alert('Error', 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const periods = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#228B22" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <VenueOwnerWelcomeHeader
        title="Revenue & Analytics"
        subtitle="Track your business performance"
      />

      {/* Refresh Button */}
      <View style={styles.refreshContainer}>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons name="refresh" size={20} color="#228B22" />
          <Text style={styles.refreshText}>
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selectedPeriod === period.key && styles.activePeriodButton
            ]}
            onPress={() => setSelectedPeriod(period.key as any)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period.key && styles.activePeriodButtonText
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Key Metrics */}
      <View style={styles.metricsSection}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#228B22" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="cash" size={24} color="#4CAF50" />
                <Text style={styles.metricTitle}>Revenue</Text>
              </View>
              <Text style={styles.metricValue}>Rs. {analyticsData.revenue.current.toLocaleString()}</Text>
          <View style={styles.metricChange}>
            <Ionicons 
              name={analyticsData.revenue.growth >= 0 ? "trending-up" : "trending-down"} 
              size={16} 
              color={analyticsData.revenue.growth >= 0 ? "#4CAF50" : "#F44336"} 
            />
            <Text style={[
              styles.metricChangeText,
              { color: analyticsData.revenue.growth >= 0 ? "#4CAF50" : "#F44336" }
            ]}>
              {analyticsData.revenue.growth}% vs last {selectedPeriod}
            </Text>
          </View>
        </View>

        <View style={styles.metricCard}>
          <View style={styles.metricHeader}>
            <Ionicons name="calendar" size={24} color="#228B22" />
            <Text style={styles.metricTitle}>Bookings</Text>
          </View>
          <Text style={styles.metricValue}>{analyticsData.bookings.current}</Text>
          <View style={styles.metricChange}>
            <Ionicons 
              name={analyticsData.bookings.growth >= 0 ? "trending-up" : "trending-down"} 
              size={16} 
              color={analyticsData.bookings.growth >= 0 ? "#4CAF50" : "#F44336"} 
            />
            <Text style={[
              styles.metricChangeText,
              { color: analyticsData.bookings.growth >= 0 ? "#4CAF50" : "#F44336" }
            ]}>
              {analyticsData.bookings.growth}% vs last {selectedPeriod}
            </Text>
          </View>
        </View>

            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Ionicons name="business" size={24} color="#FF9800" />
                <Text style={styles.metricTitle}>Venues</Text>
              </View>
              <Text style={styles.metricValue}>{analyticsData.venues.active}/{analyticsData.venues.total}</Text>
              <Text style={styles.metricSubtext}>Active/Total</Text>
            </View>
          </>
        )}
      </View>

      {/* Top Performing Venues */}
      {analyticsData.topVenues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Performing Venues</Text>
          {analyticsData.topVenues.map((venue, index) => (
            <View key={venue.id} style={styles.venueCard}>
              <View style={styles.venueRank}>
                <Text style={styles.rankNumber}>#{index + 1}</Text>
              </View>
              <View style={styles.venueInfo}>
                <Text style={styles.venueName}>{venue.name}</Text>
                <Text style={styles.venueStats}>
                  Rs. {venue.revenue.toLocaleString()} • {venue.bookings} bookings
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recent Bookings */}
      {analyticsData.recentBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          {analyticsData.recentBookings.slice(0, 5).map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingVenue}>{booking.venue_name}</Text>
                <Text style={styles.bookingPlayer}>{booking.player_name}</Text>
                <Text style={styles.bookingDate}>{new Date(booking.date).toLocaleDateString()}</Text>
              </View>
              <View style={styles.bookingAmount}>
                <Text style={styles.amountText}>Rs. {booking.amount.toLocaleString()}</Text>
                <View style={[
                  styles.statusBadge,
                  booking.status === 'confirmed' ? styles.confirmedBadge :
                  booking.status === 'pending' ? styles.pendingBadge : styles.cancelledBadge
                ]}>
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Monthly Revenue Chart */}
      {analyticsData.monthlyRevenue.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Trend (Last 6 Months)</Text>
          <View style={styles.chartContainer}>
            {analyticsData.monthlyRevenue.map((month, index) => {
              const maxRevenue = Math.max(...analyticsData.monthlyRevenue.map(m => m.revenue));
              const height = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0;

              return (
                <View key={index} style={styles.chartBar}>
                  <View style={[styles.bar, { height: `${height}%` }]} />
                  <Text style={styles.chartLabel}>{month.month}</Text>
                  <Text style={styles.chartValue}>Rs. {month.revenue.toLocaleString()}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
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

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -20,
    borderRadius: 15,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activePeriodButton: {
    backgroundColor: '#228B22',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activePeriodButtonText: {
    color: '#fff',
  },
  metricsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    marginTop: 15,
    gap: 10,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '48%',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricChangeText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  comingSoonSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  featuresList: {
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  insightsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  insightContent: {
    flex: 1,
    marginLeft: 15,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  metricSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  venueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  venueRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#228B22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankNumber: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  venueStats: {
    fontSize: 14,
    color: '#666',
  },
  bookingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingVenue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  bookingPlayer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  bookingDate: {
    fontSize: 12,
    color: '#999',
  },
  bookingAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#228B22',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confirmedBadge: {
    backgroundColor: '#E8F5E8',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  cancelledBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
    marginTop: 15,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    backgroundColor: '#228B22',
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  chartValue: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  refreshContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#228B22',
  },
  refreshText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#228B22',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
