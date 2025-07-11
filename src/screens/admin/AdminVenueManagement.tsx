import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';
// Removed standalone imports - using embedded components instead
import { NotificationService } from '../../services/notificationService';

interface Venue {
  id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  owner_id: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  users: {
    name: string;
    email: string;
  };
  venue_images: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
  venue_fields: Array<{
    field_name: string;
  }>;
}

interface VenueStats {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  lastBookingDate?: string;
}

// Embedded Venue Status Monitor Component (without header)
function VenueStatusMonitorContent() {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'issues'>('all');

  useEffect(() => {
    loadVenueStatuses();
  }, []);

  const loadVenueStatuses = async () => {
    try {
      setLoading(true);
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select(`
          id, name, location, status, approval_status, updated_at,
          users!venues_owner_id_fkey (name, email),
          venue_fields (id, status)
        `)
        .eq('approval_status', 'approved')
        .order('updated_at', { ascending: false });

      if (venueError) throw venueError;

      const venueIds = venueData?.map(v => v.id) || [];
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('venue_id')
        .in('venue_id', venueIds)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (bookingError) throw bookingError;

      const venueStatuses = venueData?.map(venue => {
        const recentBookings = bookingData?.filter(b => b.venue_id === venue.id).length || 0;
        const totalFields = venue.venue_fields?.length || 0;
        const activeFields = venue.venue_fields?.filter(f => f.status === 'open').length || 0;

        return {
          id: venue.id,
          name: venue.name,
          location: venue.location,
          status: venue.status,
          approval_status: venue.approval_status,
          owner_name: venue.users?.[0]?.name || 'Unknown',
          owner_email: venue.users?.[0]?.email || '',
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
      case 'open': return venues.filter(v => v.status === 'open');
      case 'closed': return venues.filter(v => v.status === 'closed');
      case 'issues': return venues.filter(v => v.status === 'closed' || v.active_fields === 0 || v.recent_bookings === 0);
      default: return venues;
    }
  };

  const getStatusColor = (status: 'open' | 'closed') => status === 'open' ? '#4CAF50' : '#F44336';

  const getIssueIndicator = (venue: any) => {
    if (venue.status === 'closed') return { text: 'Closed', color: '#F44336', icon: 'close-circle' };
    if (venue.active_fields === 0) return { text: 'No Fields', color: '#FF9800', icon: 'warning' };
    if (venue.recent_bookings === 0) return { text: 'No Bookings', color: '#FF9800', icon: 'calendar' };
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading venue statuses...</Text>
      </View>
    );
  }

  const filteredVenues = getFilteredVenues();

  return (
    <View style={styles.embeddedContainer}>
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

      <ScrollView
        style={styles.embeddedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredVenues.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Venues Found</Text>
            <Text style={styles.emptyStateText}>No venues match the current filter</Text>
          </View>
        ) : (
          filteredVenues.map((venue) => {
            const issue = getIssueIndicator(venue);
            return (
              <View key={venue.id} style={styles.venueCard}>
                <View style={styles.venueHeader}>
                  <View style={styles.venueInfo}>
                    <Text style={styles.venueName}>{venue.name}</Text>
                    <Text style={styles.venueOwner}>Owner: {venue.owner_name}</Text>
                    <Text style={styles.venueLocation}>{venue.location}</Text>
                  </View>

                  <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(venue.status) }]}>
                      <Text style={styles.statusText}>{venue.status === 'open' ? 'Open' : 'Closed'}</Text>
                    </View>
                    {issue && (
                      <View style={[styles.issueBadge, { backgroundColor: issue.color }]}>
                        <Ionicons name={issue.icon as any} size={12} color="#fff" />
                        <Text style={styles.issueText}>{issue.text}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.embeddedVenueStats}>
                  <View style={styles.embeddedStatItem}>
                    <Ionicons name="business-outline" size={16} color="#666" />
                    <Text style={styles.embeddedStatText}>{venue.active_fields}/{venue.total_fields} Fields Active</Text>
                  </View>
                  <View style={styles.embeddedStatItem}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.embeddedStatText}>{venue.recent_bookings} bookings (7 days)</Text>
                  </View>
                  <View style={styles.embeddedStatItem}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.embeddedStatText}>Updated {new Date(venue.updated_at).toLocaleDateString()}</Text>
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

// Embedded Venue Updates Component (without header)
function VenueUpdatesContent() {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    loadVenueUpdates();
  }, [filter]);

  const loadVenueUpdates = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('venue_updates')
        .select(`
          id, venue_id, update_type, status, old_values, new_values, requested_at, admin_notes,
          venues!venue_updates_venue_id_fkey (
            name,
            users!venues_owner_id_fkey (name, email)
          )
        `)
        .order('requested_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error loading venue updates:', error);
        throw error;
      }

      console.log('Venue updates loaded:', data?.length || 0, 'updates');
      console.log('Venue update data sample:', data?.[0]);
      if (data?.[0]) {
        const venue = Array.isArray(data[0].venues) ? data[0].venues[0] : data[0].venues;
        console.log('Venue structure:', venue);
        console.log('User structure:', venue?.users);
      }

      const formattedUpdates = data?.map(update => {
        const venue = Array.isArray(update.venues) ? update.venues[0] : update.venues;
        const owner = Array.isArray(venue?.users) ? venue?.users[0] : venue?.users;

        return {
          id: update.id,
          venue_id: update.venue_id,
          venue_name: venue?.name || 'Unknown Venue',
          owner_name: owner?.name || 'Unknown Owner',
          owner_email: owner?.email || '',
          update_type: update.update_type,
          status: update.status,
          old_values: update.old_values,
          new_values: update.new_values,
          requested_at: update.requested_at,
          admin_notes: update.admin_notes,
        };
      }) || [];

      console.log('Formatted venue updates:', formattedUpdates.length);
      setUpdates(formattedUpdates);
    } catch (error) {
      console.error('Error loading venue updates:', error);
      Alert.alert('Error', 'Failed to load venue updates');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVenueUpdates();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading venue updates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.embeddedContainer}>
      {/* Compact Filter Row */}
      <View style={styles.compactFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'pending', label: 'Pending', count: updates.filter(u => u.status === 'pending').length },
            { key: 'approved', label: 'Approved', count: updates.filter(u => u.status === 'approved').length },
            { key: 'rejected', label: 'Rejected', count: updates.filter(u => u.status === 'rejected').length },
            { key: 'all', label: 'All', count: updates.length },
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

      <ScrollView
        style={styles.embeddedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {updates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Updates Found</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'pending' ? 'No pending updates' : `No ${filter} updates`}
            </Text>
          </View>
        ) : (
          updates.map((update) => (
            <View key={update.id} style={styles.venueCard}>
              <View style={styles.venueHeader}>
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName}>{update.venue_name}</Text>
                  <Text style={styles.venueOwner}>by {update.owner_name}</Text>
                  <Text style={styles.venueLocation}>
                    {update.update_type.replace('_', ' ').toUpperCase()} Update
                  </Text>
                </View>

                <View style={[styles.statusBadge, {
                  backgroundColor: update.status === 'pending' ? '#FF9800' :
                                 update.status === 'approved' ? '#4CAF50' : '#F44336'
                }]}>
                  <Text style={styles.statusText}>{update.status.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.venueLocation}>
                Requested {new Date(update.requested_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default function AdminVenueManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueStats, setVenueStats] = useState<Record<string, VenueStats>>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showVenueDetails, setShowVenueDetails] = useState<Venue | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [activeSection, setActiveSection] = useState<'approval' | 'status' | 'updates'>('approval');
  const [disputeCount, setDisputeCount] = useState(0);

  const loadVenues = async () => {
    console.log('Admin loading venues with filter:', filter);

    try {
      let query = supabase
        .from('venues')
        .select(`
          *,
          users!venues_owner_id_fkey (
            name,
            email
          ),
          venue_images (
            image_url,
            is_primary
          ),
          venue_fields (
            field_name
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('approval_status', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Admin venues query error:', error);
        throw error;
      }

      console.log('Admin venues loaded:', data?.length || 0, 'venues');
      console.log('Admin venue data:', data);
      setVenues(data || []);
    } catch (error) {
      console.error('Error loading venues:', error);
      Alert.alert('Error', 'Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const loadVenueStats = async (venueIds: string[]) => {
    if (venueIds.length === 0) return;

    try {
      setLoadingStats(true);

      // Get booking statistics for all venues
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('venue_id, status, total_amount, created_at')
        .in('venue_id', venueIds);

      if (bookingsError) throw bookingsError;

      // Get review statistics for all venues
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('venue_id, rating')
        .in('venue_id', venueIds);

      if (reviewsError) throw reviewsError;

      // Calculate stats for each venue
      const stats: Record<string, VenueStats> = {};

      venueIds.forEach(venueId => {
        const venueBookings = bookings?.filter(b => b.venue_id === venueId) || [];
        const venueReviews = reviews?.filter(r => r.venue_id === venueId) || [];

        const totalBookings = venueBookings.length;
        const confirmedBookings = venueBookings.filter(b => b.status === 'confirmed').length;
        const pendingBookings = venueBookings.filter(b => b.status === 'pending').length;
        const cancelledBookings = venueBookings.filter(b => b.status === 'cancelled').length;

        const totalRevenue = venueBookings
          .filter(b => b.status === 'confirmed')
          .reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);

        const averageRating = venueReviews.length > 0
          ? venueReviews.reduce((sum, r) => sum + r.rating, 0) / venueReviews.length
          : 0;

        const lastBooking = venueBookings
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        stats[venueId] = {
          totalBookings,
          confirmedBookings,
          pendingBookings,
          cancelledBookings,
          totalRevenue,
          averageRating,
          totalReviews: venueReviews.length,
          lastBookingDate: lastBooking?.created_at,
        };
      });

      setVenueStats(stats);
    } catch (error) {
      console.error('Error loading venue stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVenues();
    setRefreshing(false);
  };

  const loadDisputeCount = async () => {
    try {
      const { count, error } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      if (error) throw error;
      setDisputeCount(count || 0);
    } catch (error) {
      console.error('Error loading dispute count:', error);
    }
  };

  useEffect(() => {
    loadVenues();
    loadDisputeCount();
  }, [filter]);

  useEffect(() => {
    if (venues.length > 0) {
      const approvedVenueIds = venues
        .filter(v => v.approval_status === 'approved')
        .map(v => v.id);
      loadVenueStats(approvedVenueIds);
    }
  }, [venues]);

  const approveVenue = async (venueId: string) => {
    try {
      // Get venue details for notification
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('name, owner_id')
        .eq('id', venueId)
        .single();

      if (venueError || !venue) {
        Alert.alert('Error', 'Failed to fetch venue details');
        return;
      }

      const { error } = await supabase
        .from('venues')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'a87a1832-475d-46fd-b0d4-1eb1a8f1c737',
        })
        .eq('id', venueId);

      if (error) throw error;

      // Send notification to venue owner
      try {
        await NotificationService.notifyVenueApproved(venue.owner_id, venue.name);
      } catch (notificationError) {
        console.error('Error sending approval notification:', notificationError);
        // Don't fail the approval if notification fails
      }

      Alert.alert('Success', 'Venue approved successfully');
      loadVenues();
    } catch (error) {
      console.error('Error approving venue:', error);
      Alert.alert('Error', 'Failed to approve venue');
    }
  };

  const rejectVenue = async () => {
    if (!selectedVenue || !rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      const { error } = await supabase
        .from('venues')
        .update({
          approval_status: 'rejected',
          rejection_reason: rejectionReason,
          approved_at: new Date().toISOString(),
          approved_by: 'a87a1832-475d-46fd-b0d4-1eb1a8f1c737',
        })
        .eq('id', selectedVenue.id);

      if (error) throw error;

      // Send notification to venue owner
      try {
        await NotificationService.notifyVenueRejected(
          selectedVenue.owner_id,
          selectedVenue.name,
          rejectionReason.trim()
        );
      } catch (notificationError) {
        console.error('Error sending rejection notification:', notificationError);
        // Don't fail the rejection if notification fails
      }

      Alert.alert('Success', 'Venue rejected successfully');
      setShowRejectModal(false);
      setSelectedVenue(null);
      setRejectionReason('');
      loadVenues();
    } catch (error) {
      console.error('Error rejecting venue:', error);
      Alert.alert('Error', 'Failed to reject venue');
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

  const renderVenueCard = (venue: Venue) => {
    const primaryImage = venue.venue_images?.find(img => img.is_primary)?.image_url ||
                        venue.venue_images?.[0]?.image_url;
    const stats = venueStats[venue.id];

    return (
      <TouchableOpacity
        key={venue.id}
        style={styles.venueCard}
        onPress={() => setShowVenueDetails(venue)}
      >
        <View style={styles.venueHeader}>
          <View style={styles.venueInfo}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <Text style={styles.venueOwner}>by {venue.users?.name}</Text>
            <Text style={styles.venueLocation}>
              <Ionicons name="location-outline" size={14} color="#666" /> {venue.location}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(venue.approval_status) }]}>
            <Text style={styles.statusText}>{getStatusText(venue.approval_status)}</Text>
          </View>
        </View>

        {primaryImage && (
          <Image source={{ uri: primaryImage }} style={styles.venueImage} />
        )}

        <Text style={styles.venueDescription} numberOfLines={2}>
          {venue.description}
        </Text>

        <View style={styles.venueStats}>
          <View style={styles.statItem}>
            <Ionicons name="business-outline" size={16} color="#666" />
            <Text style={styles.statText}>{venue.venue_fields?.length || 0} Fields</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.statText}>
              {new Date(venue.created_at).toLocaleDateString()}
            </Text>
          </View>
          {stats && venue.approval_status === 'approved' && (
            <>
              <View style={styles.statItem}>
                <Ionicons name="calendar-number-outline" size={16} color="#4CAF50" />
                <Text style={styles.statText}>{stats.totalBookings} Bookings</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cash-outline" size={16} color="#FF9800" />
                <Text style={styles.statText}>Rs. {stats.totalRevenue.toFixed(0)}</Text>
              </View>
              {stats.averageRating > 0 && (
                <View style={styles.statItem}>
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.statText}>{stats.averageRating.toFixed(1)}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {venue.approval_status === 'pending' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => approveVenue(venue.id)}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => {
                setSelectedVenue(venue);
                setShowRejectModal(true);
              }}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {venue.approval_status === 'rejected' && venue.rejection_reason && (
          <View style={styles.rejectionReason}>
            <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
            <Text style={styles.rejectionText}>{venue.rejection_reason}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filterButtons = [
    { key: 'pending', label: 'Pending', count: venues.filter(v => v.approval_status === 'pending').length },
    { key: 'approved', label: 'Approved', count: venues.filter(v => v.approval_status === 'approved').length },
    { key: 'rejected', label: 'Rejected', count: venues.filter(v => v.approval_status === 'rejected').length },
    { key: 'all', label: 'All', count: venues.length },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#228B22" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Venue Management</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.disputeButton}
            onPress={() => router.push('/(admin-tabs)/disputes')}
          >
            <Ionicons name="shield-outline" size={20} color="#fff" />
            {disputeCount > 0 && (
              <View style={styles.disputeBadge}>
                <Text style={styles.disputeBadgeText}>{disputeCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#228B22" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        {[
          { key: 'approval', label: 'Approval', icon: 'checkmark-circle-outline' },
          { key: 'status', label: 'Status Monitor', icon: 'pulse-outline' },
          { key: 'updates', label: 'Updates', icon: 'sync-outline' },
        ].map((section) => (
          <TouchableOpacity
            key={section.key}
            style={[
              styles.sectionTab,
              activeSection === section.key && styles.activeSectionTab
            ]}
            onPress={() => setActiveSection(section.key as any)}
          >
            <Ionicons
              name={section.icon as any}
              size={16}
              color={activeSection === section.key ? '#fff' : '#228B22'}
            />
            <Text style={[
              styles.sectionTabText,
              activeSection === section.key && styles.activeSectionTabText
            ]}>
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content based on active section */}
      {activeSection === 'approval' && (
        <>
          {/* Compact Filter Row */}
          <View style={styles.compactFilterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {filterButtons.map((button) => (
                <TouchableOpacity
                  key={button.key}
                  style={[
                    styles.compactFilterButton,
                    filter === button.key && styles.activeCompactFilterButton
                  ]}
                  onPress={() => setFilter(button.key as any)}
                >
                  <Text style={[
                    styles.compactFilterText,
                    filter === button.key && styles.activeCompactFilterText
                  ]}>
                    {button.label} ({button.count})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Venues List */}
          <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
        {venues.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Venues Found</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'pending' ? 'No venues pending approval' : `No ${filter} venues`}
            </Text>
          </View>
        ) : (
          venues.map(renderVenueCard)
        )}
          </ScrollView>
        </>
      )}

      {/* Status Monitor Section */}
      {activeSection === 'status' && (
        <VenueStatusMonitorContent />
      )}

      {/* Updates Section */}
      {activeSection === 'updates' && (
        <VenueUpdatesContent />
      )}

      {/* Rejection Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Venue</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting "{selectedVenue?.name}"
            </Text>
            
            <TextInput
              style={styles.textInput}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setSelectedVenue(null);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={rejectVenue}
              >
                <Text style={styles.confirmButtonText}>Reject Venue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Venue Details Modal */}
      <Modal
        visible={showVenueDetails !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {showVenueDetails && (
          <View style={styles.detailsModalContainer}>
            <View style={styles.detailsModalHeader}>
              <Text style={styles.detailsModalTitle}>Venue Analytics</Text>
              <TouchableOpacity onPress={() => setShowVenueDetails(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailsModalContent}>
              {/* Venue Basic Info */}
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Venue Information</Text>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Name:</Text>
                  <Text style={styles.detailsValue}>{showVenueDetails.name}</Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Owner:</Text>
                  <Text style={styles.detailsValue}>{showVenueDetails.users?.name}</Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Location:</Text>
                  <Text style={styles.detailsValue}>{showVenueDetails.location}</Text>
                </View>
                <View style={styles.detailsRow}>
                  <Text style={styles.detailsLabel}>Status:</Text>
                  <Text style={[
                    styles.detailsValue,
                    { color: getStatusColor(showVenueDetails.approval_status) }
                  ]}>
                    {getStatusText(showVenueDetails.approval_status)}
                  </Text>
                </View>
              </View>

              {/* Performance Statistics */}
              {venueStats[showVenueDetails.id] && showVenueDetails.approval_status === 'approved' && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Performance Statistics</Text>

                  <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                      <Ionicons name="calendar-number-outline" size={24} color="#4CAF50" />
                      <Text style={styles.statCardNumber}>
                        {venueStats[showVenueDetails.id].totalBookings}
                      </Text>
                      <Text style={styles.statCardLabel}>Total Bookings</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Ionicons name="checkmark-circle-outline" size={24} color="#2196F3" />
                      <Text style={styles.statCardNumber}>
                        {venueStats[showVenueDetails.id].confirmedBookings}
                      </Text>
                      <Text style={styles.statCardLabel}>Confirmed</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Ionicons name="time-outline" size={24} color="#FF9800" />
                      <Text style={styles.statCardNumber}>
                        {venueStats[showVenueDetails.id].pendingBookings}
                      </Text>
                      <Text style={styles.statCardLabel}>Pending</Text>
                    </View>

                    <View style={styles.statCard}>
                      <Ionicons name="close-circle-outline" size={24} color="#F44336" />
                      <Text style={styles.statCardNumber}>
                        {venueStats[showVenueDetails.id].cancelledBookings}
                      </Text>
                      <Text style={styles.statCardLabel}>Cancelled</Text>
                    </View>
                  </View>

                  <View style={styles.revenueSection}>
                    <View style={styles.revenueCard}>
                      <Ionicons name="cash-outline" size={32} color="#4CAF50" />
                      <View style={styles.revenueInfo}>
                        <Text style={styles.revenueAmount}>
                          Rs. {venueStats[showVenueDetails.id].totalRevenue.toFixed(0)}
                        </Text>
                        <Text style={styles.revenueLabel}>Total Revenue</Text>
                      </View>
                    </View>
                  </View>

                  {venueStats[showVenueDetails.id].averageRating > 0 && (
                    <View style={styles.ratingSection}>
                      <View style={styles.ratingCard}>
                        <Ionicons name="star" size={32} color="#FFD700" />
                        <View style={styles.ratingInfo}>
                          <Text style={styles.ratingValue}>
                            {venueStats[showVenueDetails.id].averageRating.toFixed(1)}
                          </Text>
                          <Text style={styles.ratingLabel}>
                            Average Rating ({venueStats[showVenueDetails.id].totalReviews} reviews)
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {venueStats[showVenueDetails.id].lastBookingDate && (
                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsLabel}>Last Booking:</Text>
                      <Text style={styles.detailsValue}>
                        {new Date(venueStats[showVenueDetails.id].lastBookingDate!).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Fields Information */}
              {showVenueDetails.venue_fields && showVenueDetails.venue_fields.length > 0 && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsSectionTitle}>Fields</Text>
                  {showVenueDetails.venue_fields.map((field, index) => (
                    <View key={index} style={styles.fieldItem}>
                      <Ionicons name="business-outline" size={16} color="#666" />
                      <Text style={styles.fieldName}>{field.field_name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#90EE90',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  disputeButton: {
    backgroundColor: '#F44336',
    borderRadius: 20,
    padding: 8,
    position: 'relative',
  },
  disputeBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disputeBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F44336',
  },
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 10,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    gap: 6,
  },
  activeSectionTab: {
    backgroundColor: '#228B22',
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#228B22',
  },
  activeSectionTabText: {
    color: '#fff',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#228B22',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  venueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  venueOwner: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  venueLocation: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  venueImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  venueDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
  },
  venueStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 15,
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
    gap: 5,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectionReason: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 5,
  },
  rejectionText: {
    fontSize: 14,
    color: '#d32f2f',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: '#f44336',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Venue Details Modal Styles
  detailsModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#90EE90',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsModalContent: {
    flex: 1,
    padding: 20,
  },
  detailsSection: {
    marginBottom: 25,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  detailsValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  statCardNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  revenueSection: {
    marginBottom: 15,
  },
  revenueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 15,
  },
  revenueInfo: {
    marginLeft: 15,
  },
  revenueAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  ratingSection: {
    marginBottom: 15,
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff9e6',
    borderRadius: 8,
    padding: 15,
  },
  ratingInfo: {
    marginLeft: 15,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  ratingLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  // Embedded component styles
  embeddedContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  embeddedContent: {
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
    fontSize: 16,
    color: '#666',
    marginTop: 10,
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
  statusContainer: {
    alignItems: 'flex-end',
    gap: 4,
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
  embeddedVenueStats: {
    flexDirection: 'column',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  embeddedStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  embeddedStatText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
});
