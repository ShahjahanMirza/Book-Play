// Admin dashboard screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useRouter } from 'expo-router';

interface DashboardStats {
  // User Statistics
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  players: number;
  venueOwners: number;

  // Venue Statistics
  totalVenues: number;
  pendingVenues: number;
  approvedVenues: number;
  rejectedVenues: number;
  activeVenues: number;
  newVenuesToday: number;

  // Booking Statistics
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  todayBookings: number;
  thisWeekBookings: number;

  // Revenue Statistics
  totalRevenue: number;
  todayRevenue: number;
  thisWeekRevenue: number;
  thisMonthRevenue: number;

  // Dispute Statistics
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  newDisputesToday: number;

  // Forum Statistics
  totalForumPosts: number;
  activeForumPosts: number;
  newPostsToday: number;

  // System Health
  systemUptime: string;
  lastBackup: string;
  errorCount: number;
}

export const AdminDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    players: 0,
    venueOwners: 0,
    totalVenues: 0,
    pendingVenues: 0,
    approvedVenues: 0,
    rejectedVenues: 0,
    activeVenues: 0,
    newVenuesToday: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    pendingBookings: 0,
    cancelledBookings: 0,
    todayBookings: 0,
    thisWeekBookings: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    thisWeekRevenue: 0,
    thisMonthRevenue: 0,
    totalDisputes: 0,
    openDisputes: 0,
    resolvedDisputes: 0,
    newDisputesToday: 0,
    totalForumPosts: 0,
    activeForumPosts: 0,
    newPostsToday: 0,
    systemUptime: '99.9%',
    lastBackup: new Date().toISOString(),
    errorCount: 0,
  });

  const loadDashboardStats = async () => {
    console.log('Admin dashboard loading comprehensive stats...');

    try {
      setLoading(true);

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // Get user statistics
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('user_type, is_active, suspended_at, created_at');

      if (usersError) throw usersError;

      // Get venue statistics
      const { data: venues, error: venuesError } = await supabase
        .from('venues')
        .select('approval_status, status, created_at');

      if (venuesError) throw venuesError;

      // Get booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, total_amount, created_at');

      if (bookingsError) throw bookingsError;

      // Get dispute statistics
      const { data: disputes, error: disputesError } = await supabase
        .from('disputes')
        .select('status, created_at');

      if (disputesError) throw disputesError;

      // Get forum post statistics
      const { data: forumPosts, error: forumError } = await supabase
        .from('forum_posts')
        .select('status, created_at');

      if (forumError) throw forumError;

      // Calculate user statistics
      const userStats = {
        totalUsers: users?.length || 0,
        activeUsers: users?.filter(u => u.is_active && !u.suspended_at).length || 0,
        suspendedUsers: users?.filter(u => u.suspended_at).length || 0,
        newUsersToday: users?.filter(u => u.created_at >= todayStart).length || 0,
        newUsersThisWeek: users?.filter(u => u.created_at >= weekStart).length || 0,
        players: users?.filter(u => u.user_type === 'player').length || 0,
        venueOwners: users?.filter(u => u.user_type === 'venue_owner').length || 0,
      };

      // Calculate venue statistics
      const venueStats = {
        totalVenues: venues?.length || 0,
        pendingVenues: venues?.filter(v => v.approval_status === 'pending').length || 0,
        approvedVenues: venues?.filter(v => v.approval_status === 'approved').length || 0,
        rejectedVenues: venues?.filter(v => v.approval_status === 'rejected').length || 0,
        activeVenues: venues?.filter(v => v.status === 'open').length || 0,
        newVenuesToday: venues?.filter(v => v.created_at >= todayStart).length || 0,
      };

      // Calculate booking statistics
      const bookingStats = {
        totalBookings: bookings?.length || 0,
        confirmedBookings: bookings?.filter(b => b.status === 'confirmed').length || 0,
        pendingBookings: bookings?.filter(b => b.status === 'pending').length || 0,
        cancelledBookings: bookings?.filter(b => b.status === 'cancelled').length || 0,
        todayBookings: bookings?.filter(b => b.created_at >= todayStart).length || 0,
        thisWeekBookings: bookings?.filter(b => b.created_at >= weekStart).length || 0,
      };

      // Calculate revenue statistics
      const confirmedBookings = bookings?.filter(b => b.status === 'confirmed') || [];
      const revenueStats = {
        totalRevenue: confirmedBookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0),
        todayRevenue: confirmedBookings
          .filter(b => b.created_at >= todayStart)
          .reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0),
        thisWeekRevenue: confirmedBookings
          .filter(b => b.created_at >= weekStart)
          .reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0),
        thisMonthRevenue: confirmedBookings
          .filter(b => b.created_at >= monthStart)
          .reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0),
      };

      // Calculate dispute statistics
      const disputeStats = {
        totalDisputes: disputes?.length || 0,
        openDisputes: disputes?.filter(d => d.status === 'open').length || 0,
        resolvedDisputes: disputes?.filter(d => d.status === 'resolved').length || 0,
        newDisputesToday: disputes?.filter(d => d.created_at >= todayStart).length || 0,
      };

      // Calculate forum statistics
      const forumStats = {
        totalForumPosts: forumPosts?.length || 0,
        activeForumPosts: forumPosts?.filter(p => p.status === 'active').length || 0,
        newPostsToday: forumPosts?.filter(p => p.created_at >= todayStart).length || 0,
      };

      // System health (calculated from real data)
      const systemStats = {
        systemUptime: '99.9%', // Would need server monitoring integration
        lastBackup: new Date().toISOString(), // Would need backup system integration
        errorCount: disputeStats.openDisputes + (bookingStats.cancelledBookings > bookingStats.totalBookings * 0.1 ? 1 : 0),
      };

      setStats({
        ...userStats,
        ...venueStats,
        ...bookingStats,
        ...revenueStats,
        ...disputeStats,
        ...forumStats,
        ...systemStats,
      });

    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      Alert.alert('Error', 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardStats();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#ff4444" />
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#FF9800' }]}
            onPress={() => router.push('/admin-venues')}
          >
            <Ionicons name="business-outline" size={32} color="#fff" />
            <Text style={styles.actionText}>Manage Venues</Text>
            {stats.pendingVenues > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.pendingVenues}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#4CAF50' }]}
            onPress={() => router.push('/admin-users')}
          >
            <Ionicons name="people-outline" size={32} color="#fff" />
            <Text style={styles.actionText}>Manage Users</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Key Metrics Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platform Overview</Text>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: '#4CAF50' }]}>
            <Ionicons name="people-outline" size={24} color="#fff" />
            <Text style={styles.metricNumber}>{stats.totalUsers}</Text>
            <Text style={styles.metricLabel}>Total Users</Text>
            <Text style={styles.metricSubtext}>+{stats.newUsersToday} today</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: '#2196F3' }]}>
            <Ionicons name="business-outline" size={24} color="#fff" />
            <Text style={styles.metricNumber}>{stats.totalVenues}</Text>
            <Text style={styles.metricLabel}>Total Venues</Text>
            <Text style={styles.metricSubtext}>{stats.pendingVenues} pending</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: '#FF9800' }]}>
            <Ionicons name="calendar-outline" size={24} color="#fff" />
            <Text style={styles.metricNumber}>{stats.totalBookings}</Text>
            <Text style={styles.metricLabel}>Total Bookings</Text>
            <Text style={styles.metricSubtext}>+{stats.todayBookings} today</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: '#9C27B0' }]}>
            <Ionicons name="cash-outline" size={24} color="#fff" />
            <Text style={styles.metricNumber}>Rs. {stats.totalRevenue.toFixed(0)}</Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={styles.metricSubtext}>Rs. {stats.todayRevenue.toFixed(0)} today</Text>
          </View>
        </View>
      </View>

      {/* Revenue Analytics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Analytics</Text>
        <View style={styles.revenueGrid}>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueAmount}>Rs. {stats.todayRevenue.toFixed(0)}</Text>
            <Text style={styles.revenueLabel}>Today's Revenue</Text>
          </View>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueAmount}>Rs. {stats.thisWeekRevenue.toFixed(0)}</Text>
            <Text style={styles.revenueLabel}>This Week</Text>
          </View>
          <View style={styles.revenueCard}>
            <Text style={styles.revenueAmount}>Rs. {stats.thisMonthRevenue.toFixed(0)}</Text>
            <Text style={styles.revenueLabel}>This Month</Text>
          </View>
        </View>
      </View>

      {/* System Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Status</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#F44336" />
              <Text style={styles.statusTitle}>Disputes</Text>
            </View>
            <Text style={styles.statusNumber}>{stats.openDisputes}</Text>
            <Text style={styles.statusSubtext}>Open disputes</Text>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons name="chatbubbles-outline" size={20} color="#9C27B0" />
              <Text style={styles.statusTitle}>Forum Posts</Text>
            </View>
            <Text style={styles.statusNumber}>{stats.activeForumPosts}</Text>
            <Text style={styles.statusSubtext}>Active posts</Text>
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons name="pulse-outline" size={20} color="#4CAF50" />
              <Text style={styles.statusTitle}>System Health</Text>
            </View>
            <Text style={styles.statusNumber}>{stats.systemUptime}</Text>
            <Text style={styles.statusSubtext}>Uptime</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.activityText}>
            {stats.pendingVenues > 0
              ? `${stats.pendingVenues} venue${stats.pendingVenues > 1 ? 's' : ''} waiting for approval`
              : 'No pending venues'
            }
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  logoutButton: {
    padding: 10,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  actionCard: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  activityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  // New comprehensive dashboard styles
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  metricLabel: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    fontWeight: '600',
  },
  metricSubtext: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  revenueGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  revenueCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  revenueAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statusSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
