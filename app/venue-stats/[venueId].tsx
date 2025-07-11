import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { COLORS } from '../../src/utils/constants';

interface VenueStats {
  id: string;
  name: string;
  totalBookings: number;
  todayBookings: number;
  weeklyBookings: number;
  monthlyBookings: number;
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  pendingBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageBookingValue: number;
  fieldsCount: number;
  approval_status: string;
  is_active: boolean;
  status: string;
}

export default function VenueStatsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<VenueStats | null>(null);

  useEffect(() => {
    if (venueId && user) {
      loadVenueStats();
    }
  }, [venueId, user]);

  const loadVenueStats = async () => {
    if (!venueId || !user) return;

    try {
      setLoading(true);

      // Get venue basic info
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          approval_status,
          is_active,
          status,
          venue_fields (id)
        `)
        .eq('id', venueId)
        .eq('owner_id', user.id)
        .single();

      if (venueError) {
        console.error('Error loading venue:', venueError);
        Alert.alert('Error', 'Venue not found or you do not have permission to view it');
        router.back();
        return;
      }

      // Get booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('booking_date, status, total_amount, created_at')
        .eq('venue_id', venueId);

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
        throw bookingsError;
      }

      // Calculate date ranges
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      // Calculate statistics
      const totalBookings = bookings?.length || 0;
      const todayBookings = bookings?.filter(b => b.booking_date === today).length || 0;
      const weeklyBookings = bookings?.filter(b => b.booking_date >= weekStartStr).length || 0;
      const monthlyBookings = bookings?.filter(b => b.booking_date >= monthStartStr).length || 0;

      const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
      const confirmedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;
      const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
      const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;

      const totalRevenue = bookings
        ?.filter(b => b.status === 'confirmed' || b.status === 'completed')
        ?.reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0) || 0;

      const monthlyRevenue = bookings
        ?.filter(b => b.booking_date >= monthStartStr && (b.status === 'confirmed' || b.status === 'completed'))
        ?.reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0) || 0;

      const weeklyRevenue = bookings
        ?.filter(b => b.booking_date >= weekStartStr && (b.status === 'confirmed' || b.status === 'completed'))
        ?.reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0) || 0;

      const averageBookingValue = totalRevenue > 0 && (confirmedBookings + completedBookings) > 0 
        ? totalRevenue / (confirmedBookings + completedBookings) 
        : 0;

      const venueStats: VenueStats = {
        id: venue.id,
        name: venue.name,
        totalBookings,
        todayBookings,
        weeklyBookings,
        monthlyBookings,
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        averageBookingValue,
        fieldsCount: venue.venue_fields?.length || 0,
        approval_status: venue.approval_status,
        is_active: venue.is_active,
        status: venue.status,
      };

      setStats(venueStats);
    } catch (error) {
      console.error('Error loading venue stats:', error);
      Alert.alert('Error', 'Failed to load venue statistics');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'rejected': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending Review';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading venue statistics...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
        <Text style={styles.errorText}>Failed to load venue statistics</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVenueStats}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Venue Statistics</Text>
        <TouchableOpacity onPress={() => router.push(`/venue-edit?venueId=${stats.id}`)}>
          <Ionicons name="create-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Venue Info */}
      <View style={styles.venueInfo}>
        <Text style={styles.venueName}>{stats.name}</Text>
        <View style={styles.venueStatus}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(stats.approval_status) }]}>
            <Text style={styles.statusText}>{getStatusText(stats.approval_status)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: stats.status === 'open' ? '#4CAF50' : '#f44336' }]}>
            <Text style={styles.statusText}>{stats.status === 'open' ? 'Open' : 'Closed'}</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.fieldsCount}</Text>
          <Text style={styles.statLabel}>Fields</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalBookings}</Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>Rs. {stats.totalRevenue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total Revenue</Text>
        </View>
      </View>

      {/* Booking Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridNumber}>{stats.todayBookings}</Text>
            <Text style={styles.gridLabel}>Today</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridNumber}>{stats.weeklyBookings}</Text>
            <Text style={styles.gridLabel}>This Week</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridNumber}>{stats.monthlyBookings}</Text>
            <Text style={styles.gridLabel}>This Month</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridNumber}>{stats.pendingBookings}</Text>
            <Text style={styles.gridLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Revenue Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridNumber}>Rs. {stats.weeklyRevenue.toFixed(0)}</Text>
            <Text style={styles.gridLabel}>Weekly Revenue</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridNumber}>Rs. {stats.monthlyRevenue.toFixed(0)}</Text>
            <Text style={styles.gridLabel}>Monthly Revenue</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridNumber}>Rs. {stats.averageBookingValue.toFixed(0)}</Text>
            <Text style={styles.gridLabel}>Avg. Booking</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridNumber}>{stats.confirmedBookings}</Text>
            <Text style={styles.gridLabel}>Confirmed</Text>
          </View>
        </View>
      </View>

      {/* Booking Status Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Status Breakdown</Text>
        
        <View style={styles.statusBreakdown}>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.statusLabel}>Confirmed: {stats.confirmedBookings}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.statusLabel}>Completed: {stats.completedBookings}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.statusLabel}>Pending: {stats.pendingBookings}</Text>
          </View>
          <View style={styles.statusItem}>
            <View style={[styles.statusIndicator, { backgroundColor: '#f44336' }]} />
            <Text style={styles.statusLabel}>Cancelled: {stats.cancelledBookings}</Text>
          </View>
        </View>
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
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    backgroundColor: COLORS.lightGreen,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  venueInfo: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -10,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  venueName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  venueStatus: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  gridNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  gridLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  statusBreakdown: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusLabel: {
    fontSize: 14,
    color: '#333',
  },
});
