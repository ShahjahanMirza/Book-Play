// Venue owner dashboard for managing venues and bookings
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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';
import { COLORS } from '../../utils/constants';
import { VenueOwnerWelcomeHeader } from '../../components/VenueOwnerWelcomeHeader';

interface DashboardStats {
  totalVenues: number;
  activeVenues: number;
  pendingApproval: number;
  totalBookings: number;
  todayBookings: number;
  monthlyRevenue: number;
  pendingBookings: number;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: string;
  created_at: string;
  users: {
    name: string;
    phone_number: string;
  };
  venues: {
    name: string;
  };
  venue_fields: {
    field_name: string;
  };
}

interface Venue {
  id: string;
  name: string;
  approval_status: string;
  is_active: boolean;
  totalBookings: number;
  monthlyRevenue: number;
  todayBookings: number;
}

export const VenueOwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalVenues: 0,
    activeVenues: 0,
    pendingApproval: 0,
    totalBookings: 0,
    todayBookings: 0,
    monthlyRevenue: 0,
    pendingBookings: 0,
  });
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        loadDashboardStats(),
        loadPendingBookings(),
        loadVenueStats(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      // Get all venues owned by this user
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, approval_status, is_active')
        .eq('owner_id', user.id);

      if (venuesError) throw venuesError;

      const totalVenues = venuesData?.length || 0;
      const activeVenues = venuesData?.filter(v => v.approval_status === 'approved' && v.is_active).length || 0;
      const pendingApproval = venuesData?.filter(v => v.approval_status === 'pending').length || 0;

      if (totalVenues === 0) {
        setDashboardStats({
          totalVenues: 0,
          activeVenues: 0,
          pendingApproval: 0,
          totalBookings: 0,
          todayBookings: 0,
          monthlyRevenue: 0,
          pendingBookings: 0,
        });
        return;
      }

      const venueIds = venuesData.map(v => v.id);
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      // Get booking statistics
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_date, status, total_amount, created_at')
        .in('venue_id', venueIds);

      if (bookingsError) throw bookingsError;

      const totalBookings = bookingsData?.length || 0;
      const todayBookings = bookingsData?.filter(b => b.booking_date === today).length || 0;
      const pendingBookingsCount = bookingsData?.filter(b => b.status === 'pending').length || 0;

      const monthlyRevenue = bookingsData
        ?.filter(b => b.booking_date >= monthStartStr && (b.status === 'confirmed' || b.status === 'completed'))
        ?.reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0) || 0;

      setDashboardStats({
        totalVenues,
        activeVenues,
        pendingApproval,
        totalBookings,
        todayBookings,
        monthlyRevenue,
        pendingBookings: pendingBookingsCount,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadPendingBookings = async () => {
    try {
      // Get all venues owned by this user
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', user.id);

      if (venuesError || !venuesData || venuesData.length === 0) return;

      const venueIds = venuesData.map(v => v.id);

      // Get pending bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          total_amount,
          status,
          created_at,
          users!bookings_player_id_fkey (
            name,
            phone_number
          ),
          venues (
            name
          ),
          venue_fields (
            field_name
          )
        `)
        .in('venue_id', venueIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (bookingsError) throw bookingsError;

      setPendingBookings(bookingsData || []);
    } catch (error) {
      console.error('Error loading pending bookings:', error);
    }
  };

  const loadVenueStats = async () => {
    try {
      // Get all venues owned by this user
      const { data: venuesData, error: venuesError } = await supabase
        .from('venues')
        .select('id, name, approval_status, is_active')
        .eq('owner_id', user.id);

      if (venuesError || !venuesData) return;

      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      // Get booking stats for each venue
      const venueStatsPromises = venuesData.map(async (venue) => {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('booking_date, status, total_amount')
          .eq('venue_id', venue.id);

        if (bookingsError) {
          console.error('Error loading bookings for venue:', venue.id, bookingsError);
          return {
            ...venue,
            totalBookings: 0,
            monthlyRevenue: 0,
            todayBookings: 0,
          };
        }

        const totalBookings = bookingsData?.length || 0;
        const todayBookings = bookingsData?.filter(b => b.booking_date === today).length || 0;
        const monthlyRevenue = bookingsData
          ?.filter(b => b.booking_date >= monthStartStr && (b.status === 'confirmed' || b.status === 'completed'))
          ?.reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0) || 0;

        return {
          ...venue,
          totalBookings,
          monthlyRevenue,
          todayBookings,
        };
      });

      const venueStats = await Promise.all(venueStatsPromises);
      setVenues(venueStats);
    } catch (error) {
      console.error('Error loading venue stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const navigateToBookings = () => {
    router.push('/(venue-owner-tabs)/bookings');
  };

  const navigateToBookingDetails = (bookingId: string) => {
    router.push(`/booking-details/${bookingId}`);
  };

  const navigateToVenueStats = (venueId: string) => {
    router.push(`/venue-stats/${venueId}`);
  };

  const renderPendingBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => navigateToBookingDetails(item.id)}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingVenue}>{item.venues.name}</Text>
        <Text style={styles.bookingAmount}>Rs. {parseFloat(item.total_amount).toLocaleString()}</Text>
      </View>
      <Text style={styles.bookingPlayer}>Player: {item.users.name}</Text>
      <Text style={styles.bookingField}>Field: {item.venue_fields?.field_name || 'Main Field'}</Text>
      <View style={styles.bookingTimeInfo}>
        <Text style={styles.bookingDate}>{new Date(item.booking_date).toLocaleDateString()}</Text>
        <Text style={styles.bookingTime}>{item.start_time} - {item.end_time}</Text>
      </View>
      <View style={styles.bookingStatus}>
        <View style={[styles.statusBadge, { backgroundColor: '#FF9800' }]}>
          <Text style={styles.statusText}>Pending</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderVenueStats = ({ item }: { item: Venue }) => (
    <TouchableOpacity
      style={styles.venueStatsCard}
      onPress={() => navigateToVenueStats(item.id)}
    >
      <View style={styles.venueHeader}>
        <Text style={styles.venueName}>{item.name}</Text>
        <View style={[
          styles.venueStatusBadge,
          { backgroundColor: item.approval_status === 'approved' ? '#4CAF50' : item.approval_status === 'pending' ? '#FF9800' : '#f44336' }
        ]}>
          <Text style={styles.venueStatusText}>{item.approval_status}</Text>
        </View>
      </View>
      <View style={styles.venueStatsGrid}>
        <View style={styles.venueStatItem}>
          <Text style={styles.venueStatNumber}>{item.totalBookings}</Text>
          <Text style={styles.venueStatLabel}>Total Bookings</Text>
        </View>
        <View style={styles.venueStatItem}>
          <Text style={styles.venueStatNumber}>{item.todayBookings}</Text>
          <Text style={styles.venueStatLabel}>Today</Text>
        </View>
        <View style={styles.venueStatItem}>
          <Text style={styles.venueStatNumber}>Rs. {item.monthlyRevenue.toFixed(0)}</Text>
          <Text style={styles.venueStatLabel}>Monthly Revenue</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
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
      {/* Welcome Header */}
      <VenueOwnerWelcomeHeader
        title={`Welcome, ${user?.name}!`}
        subtitle="Manage your venues and bookings"
      />

      {/* Statistics Cards */}
      <View style={styles.statsSection}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="business" size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{dashboardStats.totalVenues}</Text>
            <Text style={styles.statLabel}>Total Venues</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{dashboardStats.activeVenues}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{dashboardStats.pendingApproval}</Text>
            <Text style={styles.statLabel}>Pending Approval</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#9C27B0" />
            <Text style={styles.statNumber}>{dashboardStats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
        </View>
      </View>

      {/* Today's Overview */}
      <View style={styles.todaySection}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>

        <View style={styles.todayGrid}>
          <View style={styles.todayCard}>
            <Text style={styles.todayNumber}>{dashboardStats.todayBookings}</Text>
            <Text style={styles.todayLabel}>Today's Bookings</Text>
          </View>

          <View style={styles.todayCard}>
            <Text style={styles.todayNumber}>Rs. {dashboardStats.monthlyRevenue.toLocaleString()}</Text>
            <Text style={styles.todayLabel}>Monthly Revenue</Text>
          </View>

          <View style={styles.todayCard}>
            <Text style={styles.todayNumber}>{dashboardStats.pendingBookings}</Text>
            <Text style={styles.todayLabel}>Pending Bookings</Text>
          </View>
        </View>
      </View>

      {/* Pending Bookings */}
      <View style={styles.bookingsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Bookings</Text>
          <TouchableOpacity onPress={navigateToBookings}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {pendingBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No pending bookings</Text>
            <Text style={styles.emptyStateSubtext}>
              All bookings are up to date
            </Text>
          </View>
        ) : (
          <FlatList
            data={pendingBookings}
            renderItem={renderPendingBooking}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bookingsList}
          />
        )}
      </View>

      {/* Venue Statistics */}
      <View style={styles.venueStatsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Venues</Text>
          <TouchableOpacity onPress={() => router.push('/(venue-owner-tabs)/venues')}>
            <Text style={styles.seeAllText}>Manage All</Text>
          </TouchableOpacity>
        </View>

        {venues.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No venues added yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first venue to start receiving bookings
            </Text>
            <TouchableOpacity
              style={styles.addVenueButton}
              onPress={() => router.push('/(venue-owner-tabs)/venues')}
            >
              <Text style={styles.addVenueButtonText}>Add Your First Venue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={venues}
            renderItem={renderVenueStats}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.venueStatsList}
          />
        )}
      </View>
    </ScrollView>
  );
};

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

  statsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  todaySection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
  },
  todayGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  todayCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  todayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  todayLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  bookingsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
  addVenueButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addVenueButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bookingsList: {
    paddingRight: 15,
  },
  bookingCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginRight: 15,
    width: 280,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingVenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bookingPlayer: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  bookingField: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  bookingTimeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bookingDate: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  bookingTime: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  bookingStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  venueStatsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 15,
    padding: 20,
  },
  venueStatsList: {
    paddingRight: 15,
  },
  venueStatsCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginRight: 15,
    width: 280,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  venueName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  venueStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  venueStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  venueStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  venueStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  venueStatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  venueStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});
