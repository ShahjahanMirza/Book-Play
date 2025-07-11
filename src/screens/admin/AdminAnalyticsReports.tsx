// Admin analytics and reports screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  activeVenues: number;
  totalUsers: number;
  revenueGrowth: number;
  bookingGrowth: number;
  userGrowth: number;
}

export const AdminAnalyticsReports: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalBookings: 0,
    activeVenues: 0,
    totalUsers: 0,
    revenueGrowth: 0,
    bookingGrowth: 0,
    userGrowth: 0,
  });

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Get current period dates
      const now = new Date();
      let startDate: Date;
      let previousStartDate: Date;

      switch (selectedPeriod) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
          break;
      }

      // Fetch current period data
      const [usersResponse, venuesResponse, bookingsResponse] = await Promise.all([
        supabase
          .from('users')
          .select('id, created_at, user_type')
          .gte('created_at', startDate.toISOString()),
        supabase
          .from('venues')
          .select('id, created_at, approval_status, status')
          .eq('approval_status', 'approved'),
        supabase
          .from('bookings')
          .select('id, created_at, total_amount, status')
          .gte('created_at', startDate.toISOString())
      ]);

      // Fetch previous period data for growth calculation
      const [prevUsersResponse, prevBookingsResponse] = await Promise.all([
        supabase
          .from('users')
          .select('id, created_at')
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString()),
        supabase
          .from('bookings')
          .select('id, created_at, total_amount')
          .gte('created_at', previousStartDate.toISOString())
          .lt('created_at', startDate.toISOString())
      ]);

      if (usersResponse.error || venuesResponse.error || bookingsResponse.error) {
        throw new Error('Failed to fetch analytics data');
      }

      const currentUsers = usersResponse.data || [];
      const venues = venuesResponse.data || [];
      const currentBookings = bookingsResponse.data || [];
      const previousUsers = prevUsersResponse.data || [];
      const previousBookings = prevBookingsResponse.data || [];

      // Calculate metrics
      const totalUsers = currentUsers.length;
      const activeVenues = venues.filter(v => v.status === 'open').length;
      const totalBookings = currentBookings.length;
      const totalRevenue = currentBookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_amount || 0), 0);

      // Calculate growth rates
      const userGrowth = previousUsers.length > 0
        ? ((totalUsers - previousUsers.length) / previousUsers.length) * 100
        : 0;

      const bookingGrowth = previousBookings.length > 0
        ? ((totalBookings - previousBookings.length) / previousBookings.length) * 100
        : 0;

      const previousRevenue = previousBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const revenueGrowth = previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

      setAnalyticsData({
        totalRevenue,
        totalBookings,
        activeVenues,
        totalUsers,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        bookingGrowth: Math.round(bookingGrowth * 10) / 10,
        userGrowth: Math.round(userGrowth * 10) / 10,
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

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['week', 'month', 'year'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text
            style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive,
            ]}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMetricCard = (
    title: string,
    value: string,
    growth: number,
    icon: string,
    color: string
  ) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <View style={[styles.growthBadge, { backgroundColor: growth >= 0 ? '#E8F5E8' : '#FFF0F0' }]}>
          <Ionicons
            name={growth >= 0 ? 'trending-up' : 'trending-down'}
            size={12}
            color={growth >= 0 ? '#4CAF50' : '#F44336'}
          />
          <Text style={[styles.growthText, { color: growth >= 0 ? '#4CAF50' : '#F44336' }]}>
            {Math.abs(growth)}%
          </Text>
        </View>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics & Reports</Text>
        <Text style={styles.headerSubtitle}>Platform performance insights</Text>
      </View>

      {/* Period Selector */}
      {renderPeriodSelector()}

      {/* Key Metrics */}
      <View style={styles.metricsSection}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          {renderMetricCard(
            'Total Revenue',
            `Rs. ${analyticsData.totalRevenue.toLocaleString()}`,
            analyticsData.revenueGrowth,
            'cash-outline',
            COLORS.primary
          )}
          {renderMetricCard(
            'Total Bookings',
            analyticsData.totalBookings.toString(),
            analyticsData.bookingGrowth,
            'calendar-outline',
            '#FF9800'
          )}
          {renderMetricCard(
            'Active Venues',
            analyticsData.activeVenues.toString(),
            0,
            'business-outline',
            '#2196F3'
          )}
          {renderMetricCard(
            'Total Users',
            analyticsData.totalUsers.toString(),
            analyticsData.userGrowth,
            'people-outline',
            '#9C27B0'
          )}
        </View>
      </View>

      {/* Coming Soon */}
      <View style={styles.comingSoonSection}>
        <Ionicons name="analytics-outline" size={64} color="#ccc" />
        <Text style={styles.comingSoonTitle}>Advanced Analytics Coming Soon!</Text>
        <Text style={styles.comingSoonText}>
          We're building comprehensive analytics including revenue charts, 
          booking trends, user engagement metrics, and detailed reports.
        </Text>
        
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <Ionicons name="bar-chart-outline" size={20} color={COLORS.primary} />
            <Text style={styles.featureText}>Revenue & Booking Charts</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="trending-up-outline" size={20} color={COLORS.primary} />
            <Text style={styles.featureText}>Growth Trend Analysis</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            <Text style={styles.featureText}>Detailed Reports Export</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
            <Text style={styles.featureText}>Real-time Dashboard</Text>
          </View>
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
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
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
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  metricsSection: {
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  growthText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  metricTitle: {
    fontSize: 12,
    color: '#666',
  },
  comingSoonSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  featuresList: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
