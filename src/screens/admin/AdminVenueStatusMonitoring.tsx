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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';

interface VenueStatusInfo {
  id: string;
  name: string;
  location: string;
  status: 'open' | 'closed';
  approval_status: 'pending' | 'approved' | 'rejected';
  owner_name: string;
  owner_email: string;
  last_status_change?: string;
  total_fields: number;
  active_fields: number;
  recent_bookings: number;
  updated_at: string;
}

export default function AdminVenueStatusMonitoring() {
  const router = useRouter();
  const [venues, setVenues] = useState<VenueStatusInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'issues'>('all');

  useEffect(() => {
    loadVenueStatuses();
    
    // Set up real-time subscription for venue status changes
    const subscription = supabase
      .channel('venue_status_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'venues',
          filter: 'approval_status=eq.approved'
        },
        (payload) => {
          console.log('Venue status changed:', payload);
          loadVenueStatuses();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadVenueStatuses = async () => {
    try {
      setLoading(true);

      // Get venue information with owner details
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select(`
          id, name, location, status, approval_status, updated_at,
          users!venues_owner_id_fkey (
            name,
            email
          ),
          venue_fields (
            id,
            status
          )
        `)
        .eq('approval_status', 'approved')
        .order('updated_at', { ascending: false });

      if (venueError) throw venueError;

      // Get recent booking counts for each venue
      const venueIds = venueData?.map(v => v.id) || [];
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('venue_id')
        .in('venue_id', venueIds)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

      if (bookingError) throw bookingError;

      // Process venue status information
      const venueStatuses: VenueStatusInfo[] = venueData?.map(venue => {
        const recentBookings = bookingData?.filter(b => b.venue_id === venue.id).length || 0;
        const totalFields = venue.venue_fields?.length || 0;
        const activeFields = venue.venue_fields?.filter(f => f.status === 'open').length || 0;

        return {
          id: venue.id,
          name: venue.name,
          location: venue.location,
          status: venue.status,
          approval_status: venue.approval_status,
          owner_name: venue.users?.name || 'Unknown',
          owner_email: venue.users?.email || '',
          updated_at: venue.updated_at,
          total_fields: totalFields,
          active_fields: activeFields,
          recent_bookings: recentBookings,
        };
      }) || [];

      setVenues(venueStatuses);
    } catch (error) {
      console.error('Error loading venue statuses:', error);
      Alert.alert('Error', 'Failed to load venue status information');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVenueStatuses();
    setRefreshing(false);
  };

  const getFilteredVenues = () => {
    switch (filter) {
      case 'open':
        return venues.filter(v => v.status === 'open');
      case 'closed':
        return venues.filter(v => v.status === 'closed');
      case 'issues':
        return venues.filter(v => 
          v.status === 'closed' || 
          v.active_fields === 0 || 
          v.recent_bookings === 0
        );
      default:
        return venues;
    }
  };

  const getStatusColor = (status: 'open' | 'closed') => {
    return status === 'open' ? '#4CAF50' : '#F44336';
  };

  const getIssueIndicator = (venue: VenueStatusInfo) => {
    if (venue.status === 'closed') return { icon: 'close-circle', color: '#F44336', text: 'Closed' };
    if (venue.active_fields === 0) return { icon: 'warning', color: '#FF9800', text: 'No Active Fields' };
    if (venue.recent_bookings === 0) return { icon: 'trending-down', color: '#FF5722', text: 'No Recent Bookings' };
    return null;
  };

  const filteredVenues = getFilteredVenues();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#228B22" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Venue Status Monitor</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#228B22" />
        </TouchableOpacity>
      </View>

      {/* Status Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{venues.length}</Text>
          <Text style={styles.summaryLabel}>Total Venues</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: '#4CAF50' }]}>
            {venues.filter(v => v.status === 'open').length}
          </Text>
          <Text style={styles.summaryLabel}>Open</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: '#F44336' }]}>
            {venues.filter(v => v.status === 'closed').length}
          </Text>
          <Text style={styles.summaryLabel}>Closed</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: '#FF9800' }]}>
            {venues.filter(v => getIssueIndicator(v) !== null).length}
          </Text>
          <Text style={styles.summaryLabel}>Issues</Text>
        </View>
      </View>

      {/* Compact Filter Row */}
      <View style={styles.compactFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'All', count: venues.length },
            { key: 'open', label: 'Open', count: venues.filter(v => v.status === 'open').length },
            { key: 'closed', label: 'Closed', count: venues.filter(v => v.status === 'closed').length },
            { key: 'issues', label: 'Issues', count: venues.filter(v => getIssueIndicator(v) !== null).length },
          ].map((filterOption) => (
            <TouchableOpacity
              key={filterOption.key}
              style={[
                styles.compactFilterButton,
                filter === filterOption.key && styles.activeCompactFilterButton
              ]}
              onPress={() => setFilter(filterOption.key as any)}
            >
              <Text style={[
                styles.compactFilterText,
                filter === filterOption.key && styles.activeCompactFilterText
              ]}>
                {filterOption.label} ({filterOption.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Venues List */}
      <ScrollView
        style={styles.venuesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#228B22" />
            <Text style={styles.loadingText}>Loading venue statuses...</Text>
          </View>
        ) : filteredVenues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Venues Found</Text>
            <Text style={styles.emptyText}>
              No venues match the selected filter
            </Text>
          </View>
        ) : (
          filteredVenues.map((venue) => {
            const issue = getIssueIndicator(venue);
            
            return (
              <View key={venue.id} style={styles.venueCard}>
                <View style={styles.venueHeader}>
                  <View style={styles.venueInfo}>
                    <Text style={styles.venueName}>{venue.name}</Text>
                    <Text style={styles.venueOwner}>by {venue.owner_name}</Text>
                    <Text style={styles.venueLocation}>
                      <Ionicons name="location-outline" size={14} color="#666" /> {venue.location}
                    </Text>
                  </View>
                  
                  <View style={styles.statusContainer}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(venue.status) }
                    ]}>
                      <Text style={styles.statusText}>
                        {venue.status === 'open' ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                    
                    {issue && (
                      <View style={[styles.issueBadge, { backgroundColor: issue.color }]}>
                        <Ionicons name={issue.icon as any} size={12} color="#fff" />
                        <Text style={styles.issueText}>{issue.text}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.venueStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="business-outline" size={16} color="#666" />
                    <Text style={styles.statText}>
                      {venue.active_fields}/{venue.total_fields} Fields Active
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.statText}>
                      {venue.recent_bookings} bookings (7 days)
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.statText}>
                      Updated {new Date(venue.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#90EE90',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f0f0f',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  filterContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  filterButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#228B22',
  },
  activeFilterButton: {
    backgroundColor: '#228B22',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: '600',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  venuesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  venueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  venueOwner: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  venueLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 4,
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
  issueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  issueText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  venueStats: {
    flexDirection: 'column',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  compactFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  compactFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeCompactFilterButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  compactFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeCompactFilterText: {
    color: '#fff',
  },
});
