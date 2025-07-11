import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationService } from '../../services/notificationService';
import { PlayerDetailsModal } from '@/components/PlayerDetailsModal';
import { COLORS } from '../../utils/constants';
import { VenueOwnerWelcomeHeader } from '../../components/VenueOwnerWelcomeHeader';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  total_slots: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  confirmed_at?: string;
  cancelled_at?: string;
  completed_at?: string;
  player: {
    id: string;
    name: string;
    email: string;
    phone_number: string;
  };
  venue: {
    id: string;
    name: string;
  };
  field?: {
    id: string;
    field_name: string;
    field_number: string;
  };
}

interface BookingStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
  monthlyRevenue: number;
  upcomingBookings: number;
  averageBookingValue: number;
  totalBookings: number;
  cancellationRate: number;
  completionRate: number;
}

export default function VenueOwnerBookingManagement() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'today' | 'upcoming' | 'past'>('pending');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  const [selectedBookingContext, setSelectedBookingContext] = useState<{
    bookingId: string;
    venueName: string;
    bookingDate: string;
  } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: 'all',
    venue: 'all',
    field: 'all',
    minAmount: '',
    maxAmount: '',
  });
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    upcomingBookings: 0,
    averageBookingValue: 0,
    totalBookings: 0,
    cancellationRate: 0,
    completionRate: 0,
  });

  useEffect(() => {
    loadBookings();
    loadStats();
  }, []);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get all venues owned by this user
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', user.id);

      if (venuesError) {
        console.error('Error loading venues:', venuesError);
        return;
      }

      if (!venues || venues.length === 0) {
        setBookings([]);
        return;
      }

      const venueIds = venues.map(v => v.id);

      // Load bookings for all venues
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          total_amount,
          total_slots,
          status,
          created_at,
          confirmed_at,
          cancelled_at,
          completed_at,
          users!bookings_player_id_fkey (
            id,
            name,
            email,
            phone_number
          ),
          venues (
            id,
            name
          ),
          venue_fields (
            id,
            field_name,
            field_number
          )
        `)
        .in('venue_id', venueIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        Alert.alert('Error', 'Failed to load bookings');
        return;
      }

      const formattedBookings: Booking[] = (data || []).map(booking => ({
        id: booking.id,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        total_amount: booking.total_amount,
        total_slots: booking.total_slots,
        status: booking.status,
        created_at: booking.created_at,
        confirmed_at: booking.confirmed_at,
        cancelled_at: booking.cancelled_at,
        completed_at: booking.completed_at,
        player: {
          id: booking.users.id,
          name: booking.users.name,
          email: booking.users.email,
          phone_number: booking.users.phone_number,
        },
        venue: {
          id: booking.venues.id,
          name: booking.venues.name,
        },
        field: booking.venue_fields ? {
          id: booking.venue_fields.id,
          field_name: booking.venue_fields.field_name,
          field_number: booking.venue_fields.field_number,
        } : undefined,
      }));

      setBookings(formattedBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      // Get all venues owned by this user
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', user.id);

      if (venuesError || !venues || venues.length === 0) {
        return;
      }

      const venueIds = venues.map(v => v.id);
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const monthStart = new Date();
      monthStart.setDate(1);

      // Load booking statistics
      const { data: allBookings, error } = await supabase
        .from('bookings')
        .select('booking_date, status, total_amount, confirmed_at')
        .in('venue_id', venueIds);

      if (error) {
        console.error('Error loading stats:', error);
        return;
      }

      const bookingStats = allBookings || [];
      
      const todayCount = bookingStats.filter(b => 
        b.booking_date === today && b.status !== 'cancelled'
      ).length;

      const thisWeekCount = bookingStats.filter(b => 
        new Date(b.booking_date) >= weekStart && b.status !== 'cancelled'
      ).length;

      const thisMonthCount = bookingStats.filter(b => 
        new Date(b.booking_date) >= monthStart && b.status !== 'cancelled'
      ).length;

      const pendingCount = bookingStats.filter(b => b.status === 'pending').length;
      const confirmedCount = bookingStats.filter(b => b.status === 'confirmed').length;
      const completedCount = bookingStats.filter(b => b.status === 'completed').length;
      const cancelledCount = bookingStats.filter(b => b.status === 'cancelled').length;

      const totalRevenue = bookingStats
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      const monthlyRevenue = bookingStats
        .filter(b => {
          const bookingDate = new Date(b.booking_date);
          return (b.status === 'confirmed' || b.status === 'completed') &&
                 bookingDate >= monthStart;
        })
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      const upcomingBookings = bookingStats.filter(b => {
        const bookingDate = new Date(b.booking_date);
        return bookingDate > new Date() && (b.status === 'confirmed' || b.status === 'pending');
      }).length;

      const totalBookings = bookingStats.length;
      const averageBookingValue = totalRevenue > 0 && (confirmedCount + completedCount) > 0
        ? totalRevenue / (confirmedCount + completedCount)
        : 0;

      const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;
      const completionRate = totalBookings > 0 ? (completedCount / totalBookings) * 100 : 0;

      setStats({
        today: todayCount,
        thisWeek: thisWeekCount,
        thisMonth: thisMonthCount,
        pending: pendingCount,
        confirmed: confirmedCount,
        completed: completedCount,
        cancelled: cancelledCount,
        totalRevenue,
        monthlyRevenue,
        upcomingBookings,
        averageBookingValue,
        totalBookings,
        cancellationRate,
        completionRate,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBookings(), loadStats()]);
    setRefreshing(false);
  };

  const handleBookingAction = async (bookingId: string, action: 'confirm' | 'cancel') => {
    if (action === 'confirm') {
      // Show confirmation dialog for confirming
      Alert.alert(
        'Confirm Booking',
        'Are you sure you want to confirm this booking? The player will be notified.',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: () => performBookingAction(bookingId, action)
          }
        ]
      );
    } else {
      // Show cancellation reason prompt
      Alert.prompt(
        'Cancel Booking',
        'Please provide a reason for cancelling this booking (optional):',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Cancel Booking',
            style: 'destructive',
            onPress: (reason) => performBookingAction(bookingId, action, reason)
          }
        ],
        'plain-text',
        '',
        'default'
      );
    }
  };

  const performBookingAction = async (bookingId: string, action: 'confirm' | 'cancel', cancellationReason?: string) => {
    try {
      // First get the booking details for notification
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          venues (
            name
          ),
          users (
            id,
            name
          )
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
        console.error('Error fetching booking details:', fetchError);
        Alert.alert('Error', 'Failed to fetch booking details');
        return;
      }

      const updateData: any = {
        status: action === 'confirm' ? 'confirmed' : 'cancelled',
        updated_at: new Date().toISOString(),
      };

      if (action === 'confirm') {
        updateData.confirmed_at = new Date().toISOString();
      } else {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = user?.id;
        if (cancellationReason && cancellationReason.trim()) {
          updateData.cancellation_reason = cancellationReason.trim();
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) {
        console.error('Error updating booking:', error);
        Alert.alert('Error', `Failed to ${action} booking`);
        return;
      }

      // Send notification to player
      try {
        const venueName = booking.venues?.name || 'Unknown Venue';
        const bookingDate = new Date(booking.booking_date).toLocaleDateString();

        if (action === 'confirm') {
          await NotificationService.notifyBookingConfirmed(
            booking.player_id,
            venueName,
            bookingDate
          );
        } else {
          await NotificationService.notifyBookingCancelled(
            booking.player_id,
            venueName,
            bookingDate,
            cancellationReason
          );
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the booking action if notification fails
      }

      Alert.alert(
        'Success',
        `Booking ${action === 'confirm' ? 'confirmed' : 'cancelled'} successfully. Player has been notified.`,
        [{ text: 'OK', onPress: () => loadBookings() }]
      );
    } catch (error) {
      console.error('Error updating booking:', error);
      Alert.alert('Error', `Failed to ${action} booking`);
    }
  };

  const handleViewPlayerDetails = (playerId: string, booking?: any) => {
    setSelectedPlayerId(playerId);

    if (booking) {
      setSelectedBookingContext({
        bookingId: booking.id,
        venueName: booking.venue?.name || 'Unknown Venue',
        bookingDate: booking.booking_date,
      });
    } else {
      setSelectedBookingContext(null);
    }

    setShowPlayerDetails(true);
  };

  const handleContactPlayer = () => {
    // TODO: Navigate to messaging screen with selected player
    Alert.alert('Contact Player', 'Messaging functionality will be implemented in the next phase.');
    setShowPlayerDetails(false);
  };

  const getFilteredBookings = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let filtered = bookings;

    // Apply tab filter first
    switch (activeTab) {
      case 'pending':
        filtered = filtered.filter(b => b.status === 'pending');
        break;
      case 'today':
        filtered = filtered.filter(b =>
          b.booking_date === today && b.status !== 'cancelled'
        );
        break;
      case 'upcoming':
        filtered = filtered.filter(b =>
          b.booking_date >= tomorrowStr && b.status !== 'cancelled'
        );
        break;
      case 'past':
        filtered = filtered.filter(b =>
          b.booking_date < today || b.status === 'completed'
        );
        break;
    }

    // Apply additional filters
    if (filters.dateFrom) {
      filtered = filtered.filter(b => b.booking_date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(b => b.booking_date <= filters.dateTo);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(b => b.status === filters.status);
    }

    if (filters.venue !== 'all') {
      filtered = filtered.filter(b => b.venue.id === filters.venue);
    }

    if (filters.field !== 'all') {
      filtered = filtered.filter(b => b.field?.id === filters.field);
    }

    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      if (!isNaN(minAmount)) {
        filtered = filtered.filter(b => b.total_amount >= minAmount);
      }
    }

    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      if (!isNaN(maxAmount)) {
        filtered = filtered.filter(b => b.total_amount <= maxAmount);
      }
    }

    return filtered;
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      status: 'all',
      venue: 'all',
      field: 'all',
      minAmount: '',
      maxAmount: '',
    });
  };

  const hasActiveFilters = () => {
    return filters.dateFrom || filters.dateTo || filters.status !== 'all' ||
           filters.venue !== 'all' || filters.field !== 'all' ||
           filters.minAmount || filters.maxAmount;
  };

  const toggleBookingSelection = (bookingId: string) => {
    setSelectedBookings(prev =>
      prev.includes(bookingId)
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };

  const selectAllBookings = () => {
    const filteredBookings = getFilteredBookings();
    const pendingBookings = filteredBookings.filter(b => b.status === 'pending');
    setSelectedBookings(pendingBookings.map(b => b.id));
  };

  const clearSelection = () => {
    setSelectedBookings([]);
    setBulkActionMode(false);
  };

  const handleBulkAction = async (action: 'confirm' | 'cancel') => {
    if (selectedBookings.length === 0) return;

    Alert.alert(
      `Bulk ${action === 'confirm' ? 'Confirm' : 'Cancel'} Bookings`,
      `Are you sure you want to ${action} ${selectedBookings.length} booking(s)?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: action === 'cancel' ? 'destructive' : 'default',
          onPress: () => performBulkAction(action)
        }
      ]
    );
  };

  const performBulkAction = async (action: 'confirm' | 'cancel') => {
    try {
      const promises = selectedBookings.map(bookingId =>
        performBookingAction(bookingId, action)
      );

      await Promise.all(promises);

      Alert.alert(
        'Success',
        `${selectedBookings.length} booking(s) ${action === 'confirm' ? 'confirmed' : 'cancelled'} successfully`
      );

      clearSelection();
      loadBookings();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      Alert.alert('Error', `Failed to ${action} some bookings`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'confirmed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      case 'completed': return COLORS.primary;
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      case 'completed': return 'checkmark-done-circle';
      default: return 'help-circle';
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <VenueOwnerWelcomeHeader
        title="Venue Bookings"
        subtitle="Manage your venue reservations"
      />

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.today}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.upcomingBookings}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>Rs.{stats.monthlyRevenue.toFixed(0)}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
      </View>

      {/* Detailed Analytics */}
      <View style={styles.analyticsSection}>
        <Text style={styles.analyticsTitle}>Performance Analytics</Text>

        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <View style={styles.analyticsHeader}>
              <Ionicons name="trending-up" size={20} color="#4CAF50" />
              <Text style={styles.analyticsCardTitle}>Revenue</Text>
            </View>
            <Text style={styles.analyticsMainNumber}>Rs.{stats.totalRevenue.toFixed(0)}</Text>
            <Text style={styles.analyticsSubText}>Total Revenue</Text>
            <Text style={styles.analyticsSecondary}>
              Avg: Rs.{stats.averageBookingValue.toFixed(0)} per booking
            </Text>
          </View>

          <View style={styles.analyticsCard}>
            <View style={styles.analyticsHeader}>
              <Ionicons name="calendar" size={20} color="#2196F3" />
              <Text style={styles.analyticsCardTitle}>Bookings</Text>
            </View>
            <Text style={styles.analyticsMainNumber}>{stats.totalBookings}</Text>
            <Text style={styles.analyticsSubText}>Total Bookings</Text>
            <Text style={styles.analyticsSecondary}>
              {stats.confirmed} confirmed, {stats.completed} completed
            </Text>
          </View>

          <View style={styles.analyticsCard}>
            <View style={styles.analyticsHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.analyticsCardTitle}>Success Rate</Text>
            </View>
            <Text style={styles.analyticsMainNumber}>{stats.completionRate.toFixed(1)}%</Text>
            <Text style={styles.analyticsSubText}>Completion Rate</Text>
            <Text style={styles.analyticsSecondary}>
              {stats.cancellationRate.toFixed(1)}% cancellation rate
            </Text>
          </View>

          <View style={styles.analyticsCard}>
            <View style={styles.analyticsHeader}>
              <Ionicons name="time" size={20} color="#FF9800" />
              <Text style={styles.analyticsCardTitle}>This Week</Text>
            </View>
            <Text style={styles.analyticsMainNumber}>{stats.thisWeek}</Text>
            <Text style={styles.analyticsSubText}>Weekly Bookings</Text>
            <Text style={styles.analyticsSecondary}>
              {stats.thisMonth} this month
            </Text>
          </View>
        </View>
      </View>

      {/* Filters Section */}
      <View style={styles.filtersSection}>
        <View style={styles.filtersHeader}>
          <TouchableOpacity
            style={styles.filtersToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons name="filter" size={20} color="#007AFF" />
            <Text style={styles.filtersToggleText}>Filters</Text>
            {hasActiveFilters() && <View style={styles.activeFilterDot} />}
            <Ionicons
              name={showFilters ? "chevron-up" : "chevron-down"}
              size={16}
              color="#007AFF"
            />
          </TouchableOpacity>

          {hasActiveFilters() && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {showFilters && (
          <View style={styles.compactFiltersContent}>
            {/* First Row: Date Range */}
            <View style={styles.compactFilterRow}>
              <View style={styles.compactFilterGroup}>
                <Text style={styles.compactFilterLabel}>From</Text>
                <TextInput
                  style={styles.compactFilterInput}
                  value={filters.dateFrom}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, dateFrom: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
              <View style={styles.compactFilterGroup}>
                <Text style={styles.compactFilterLabel}>To</Text>
                <TextInput
                  style={styles.compactFilterInput}
                  value={filters.dateTo}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, dateTo: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* Second Row: Amount Range and Status */}
            <View style={styles.compactFilterRow}>
              <View style={styles.compactFilterGroup}>
                <Text style={styles.compactFilterLabel}>Min Rs.</Text>
                <TextInput
                  style={styles.compactFilterInput}
                  value={filters.minAmount}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, minAmount: text }))}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.compactFilterGroup}>
                <Text style={styles.compactFilterLabel}>Max Rs.</Text>
                <TextInput
                  style={styles.compactFilterInput}
                  value={filters.maxAmount}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, maxAmount: text }))}
                  placeholder="1000"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.compactFilterGroup}>
                <Text style={styles.compactFilterLabel}>Status</Text>
                <View style={styles.compactFilterPickerContainer}>
                  <Picker
                    selectedValue={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    style={styles.compactFilterPicker}
                  >
                    <Picker.Item label="All" value="all" />
                    <Picker.Item label="Pending" value="pending" />
                    <Picker.Item label="Confirmed" value="confirmed" />
                    <Picker.Item label="Completed" value="completed" />
                    <Picker.Item label="Cancelled" value="cancelled" />
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending ({stats.pending})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.activeTab]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.activeTabText]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bulk Actions */}
      {activeTab === 'pending' && (
        <View style={styles.bulkActionsSection}>
          {!bulkActionMode ? (
            <TouchableOpacity
              style={styles.bulkActionToggle}
              onPress={() => setBulkActionMode(true)}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#007AFF" />
              <Text style={styles.bulkActionToggleText}>Select Multiple</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.bulkActionsBar}>
              <View style={styles.bulkActionsLeft}>
                <TouchableOpacity
                  style={styles.bulkActionButton}
                  onPress={selectAllBookings}
                >
                  <Text style={styles.bulkActionButtonText}>Select All</Text>
                </TouchableOpacity>
                <Text style={styles.selectedCount}>
                  {selectedBookings.length} selected
                </Text>
              </View>

              <View style={styles.bulkActionsRight}>
                {selectedBookings.length > 0 && (
                  <>
                    <TouchableOpacity
                      style={[styles.bulkActionButton, styles.confirmBulkButton]}
                      onPress={() => handleBulkAction('confirm')}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.bulkActionButtonTextWhite}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bulkActionButton, styles.cancelBulkButton]}
                      onPress={() => handleBulkAction('cancel')}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.bulkActionButtonTextWhite}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  style={styles.bulkActionButton}
                  onPress={clearSelection}
                >
                  <Text style={styles.bulkActionButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Bookings Content */}
      <View style={styles.content}>
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={activeTab === 'pending' ? "time-outline" :
                   activeTab === 'today' ? "calendar-outline" :
                   activeTab === 'upcoming' ? "calendar" : "checkmark-circle-outline"}
              size={64}
              color="#ccc"
            />
            <Text style={styles.emptyStateTitle}>
              {activeTab === 'pending' ? 'No Pending Bookings' :
               activeTab === 'today' ? 'No Bookings Today' :
               activeTab === 'upcoming' ? 'No Upcoming Bookings' :
               'No Past Bookings'}
            </Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'pending' ? 'No booking requests waiting for your approval.' :
               activeTab === 'today' ? 'You don\'t have any bookings scheduled for today.' :
               activeTab === 'upcoming' ? 'No upcoming bookings found.' :
               'Your booking history will appear here.'}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              {bulkActionMode && booking.status === 'pending' && (
                <TouchableOpacity
                  style={styles.selectionCheckbox}
                  onPress={() => toggleBookingSelection(booking.id)}
                >
                  <Ionicons
                    name={selectedBookings.includes(booking.id) ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={selectedBookings.includes(booking.id) ? "#007AFF" : "#ccc"}
                  />
                </TouchableOpacity>
              )}
              <View style={[styles.bookingHeader, bulkActionMode && booking.status === 'pending' && styles.bookingHeaderWithSelection]}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.venueName}>{booking.venue.name}</Text>
                  {booking.field && (
                    <Text style={styles.fieldInfo}>
                      {booking.field.field_name || `Field ${booking.field.field_number}`}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.playerNameContainer}
                    onPress={() => handleViewPlayerDetails(booking.player.id, booking)}
                  >
                    <Text style={styles.playerName}>{booking.player.name}</Text>
                    <Ionicons name="person-circle" size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(booking.status) }
                ]}>
                  <Ionicons
                    name={getStatusIcon(booking.status) as any}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.statusText}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {formatDate(booking.booking_date)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    ${booking.total_amount} ({booking.total_slots} slots)
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="call" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {booking.player.phone_number}
                  </Text>
                </View>
              </View>

              {booking.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.viewPlayerButton]}
                    onPress={() => handleViewPlayerDetails(booking.player.id, booking)}
                  >
                    <Ionicons name="person" size={18} color="#007AFF" />
                    <Text style={styles.viewPlayerButtonText}>View Player</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => handleBookingAction(booking.id, 'confirm')}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleBookingAction(booking.id, 'cancel')}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* Player Details Modal */}
      <PlayerDetailsModal
        visible={showPlayerDetails}
        playerId={selectedPlayerId}
        onClose={() => setShowPlayerDetails(false)}
        onContactPlayer={handleContactPlayer}
        bookingContext={selectedBookingContext || undefined}
      />
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

  statsSection: {
    flexDirection: 'row',
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
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    marginTop: 15,
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  bookingInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  fieldInfo: {
    fontSize: 14,
    color: COLORS.primary,
    marginBottom: 4,
  },
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bookingDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  viewPlayerButton: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  viewPlayerButtonText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  analyticsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    padding: 20,
  },
  analyticsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  analyticsCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  analyticsMainNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  analyticsSubText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  analyticsSecondary: {
    fontSize: 10,
    color: '#999',
    lineHeight: 14,
  },
  filtersSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filtersToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
    marginRight: 8,
  },
  activeFilterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filtersContent: {
    padding: 15,
  },
  compactFiltersContent: {
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 15,
  },
  compactFilterRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
    alignItems: 'flex-end',
  },
  filterGroup: {
    flex: 1,
  },
  compactFilterGroup: {
    flex: 1,
    minWidth: 80,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  compactFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  compactFilterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: '#fff',
    height: 32,
  },
  filterPickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  compactFilterPickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#fff',
    height: 32,
  },
  filterPicker: {
    height: 40,
  },
  compactFilterPicker: {
    height: 30,
    fontSize: 12,
  },
  bulkActionsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 10,
    padding: 15,
  },
  bulkActionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkActionToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  bulkActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bulkActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 10,
  },
  bulkActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  bulkActionButtonTextWhite: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  confirmBulkButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBulkButton: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  bookingHeaderWithSelection: {
    paddingRight: 40,
  },
});
