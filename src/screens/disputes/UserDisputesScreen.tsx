// User disputes screen for players and venue owners to view and create disputes
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { router } from 'expo-router';

interface Dispute {
  id: string;
  booking_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  resolved_at?: string;
  resolution?: string;
  complainant_id: string;
  defendant_id: string;
  booking: {
    venue_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    total_amount: number;
  };
  other_party: {
    id: string;
    name: string;
    user_type: string;
  };
  message_count: number;
}

interface Booking {
  id: string;
  venue_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: string;
  venue_owner_id?: string;
  player_id?: string;
}

export default function UserDisputesScreen() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userBookings, setUserBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [disputeTitle, setDisputeTitle] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputePriority, setDisputePriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) {
      loadDisputes();
      loadUserBookings();
    }
  }, [user]);

  const loadDisputes = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: disputeData, error: disputeError } = await supabase
        .from('disputes')
        .select(`
          id,
          booking_id,
          title,
          description,
          status,
          priority,
          created_at,
          resolved_at,
          resolution,
          complainant_id,
          defendant_id,
          bookings!disputes_booking_id_fkey (
            booking_date,
            start_time,
            end_time,
            total_amount,
            venues!bookings_venue_id_fkey (
              name
            )
          )
        `)
        .or(`complainant_id.eq.${user.id},defendant_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (disputeError) throw disputeError;

      // Get other party details and message counts
      const disputeIds = disputeData?.map(d => d.id) || [];
      const { data: messageCounts, error: messageError } = await supabase
        .from('dispute_messages')
        .select('dispute_id')
        .in('dispute_id', disputeIds);

      if (messageError) throw messageError;

      // Get other party details
      const otherPartyIds = disputeData?.map(d => 
        d.complainant_id === user.id ? d.defendant_id : d.complainant_id
      ) || [];

      const { data: otherParties, error: partiesError } = await supabase
        .from('users')
        .select('id, name, user_type')
        .in('id', otherPartyIds);

      if (partiesError) throw partiesError;

      const formattedDisputes: Dispute[] = disputeData?.map(dispute => {
        const messageCount = messageCounts?.filter(m => m.dispute_id === dispute.id).length || 0;
        const otherPartyId = dispute.complainant_id === user.id ? dispute.defendant_id : dispute.complainant_id;
        const otherParty = otherParties?.find(p => p.id === otherPartyId);

        return {
          id: dispute.id,
          booking_id: dispute.booking_id,
          title: dispute.title,
          description: dispute.description,
          status: dispute.status,
          priority: dispute.priority,
          created_at: dispute.created_at,
          resolved_at: dispute.resolved_at,
          resolution: dispute.resolution,
          complainant_id: dispute.complainant_id,
          defendant_id: dispute.defendant_id,
          booking: {
            venue_name: dispute.bookings?.venues?.name || 'Unknown Venue',
            booking_date: dispute.bookings?.booking_date || '',
            start_time: dispute.bookings?.start_time || '',
            end_time: dispute.bookings?.end_time || '',
            total_amount: dispute.bookings?.total_amount || 0,
          },
          other_party: {
            id: otherParty?.id || '',
            name: otherParty?.name || 'Unknown User',
            user_type: otherParty?.user_type || '',
          },
          message_count: messageCount,
        };
      }) || [];

      setDisputes(formattedDisputes);
    } catch (error) {
      console.error('Error loading disputes:', error);
      Alert.alert('Error', 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const loadUserBookings = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          total_amount,
          status,
          player_id,
          venues!bookings_venue_id_fkey (
            id,
            name,
            owner_id
          )
        `)
        .eq('status', 'confirmed')
        .order('booking_date', { ascending: false });

      if (user.user_type === 'player') {
        query = query.eq('player_id', user.id);
      } else if (user.user_type === 'venue_owner') {
        // Get bookings for venues owned by this user
        const { data: venueIds, error: venueError } = await supabase
          .from('venues')
          .select('id')
          .eq('owner_id', user.id);

        if (venueError) throw venueError;

        const ids = venueIds?.map(v => v.id) || [];
        if (ids.length > 0) {
          query = query.in('venue_id', ids);
        } else {
          setUserBookings([]);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedBookings: Booking[] = data?.map(booking => ({
        id: booking.id,
        venue_name: booking.venues?.name || 'Unknown Venue',
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        total_amount: booking.total_amount,
        status: booking.status,
        venue_owner_id: booking.venues?.owner_id,
        player_id: booking.player_id,
      })) || [];

      setUserBookings(formattedBookings);
    } catch (error) {
      console.error('Error loading user bookings:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDisputes(), loadUserBookings()]);
    setRefreshing(false);
  };

  const createDispute = async () => {
    if (!user || !selectedBooking || !disputeTitle.trim() || !disputeDescription.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);

      // Determine defendant based on user type
      let defendantId: string;
      if (user.user_type === 'player') {
        defendantId = selectedBooking.venue_owner_id || '';
      } else {
        defendantId = selectedBooking.player_id || '';
      }

      if (!defendantId) {
        Alert.alert('Error', 'Unable to determine the other party for this dispute');
        return;
      }

      const { error } = await supabase
        .from('disputes')
        .insert({
          booking_id: selectedBooking.id,
          complainant_id: user.id,
          defendant_id: defendantId,
          title: disputeTitle.trim(),
          description: disputeDescription.trim(),
          priority: disputePriority,
          status: 'open',
        });

      if (error) throw error;

      Alert.alert('Success', 'Dispute created successfully. An admin will review it shortly.');
      setShowCreateModal(false);
      resetCreateForm();
      loadDisputes();
    } catch (error) {
      console.error('Error creating dispute:', error);
      Alert.alert('Error', 'Failed to create dispute. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedBooking(null);
    setDisputeTitle('');
    setDisputeDescription('');
    setDisputePriority('medium');
  };

  const getFilteredDisputes = () => {
    if (filter === 'all') return disputes;
    return disputes.filter(d => d.status === filter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#FF9800';
      case 'in_progress': return '#2196F3';
      case 'resolved': return '#4CAF50';
      case 'closed': return '#757575';
      default: return '#757575';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Disputes</Text>
        <TouchableOpacity 
          onPress={() => setShowCreateModal(true)} 
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="#228B22" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {[
          { key: 'all', label: 'All', count: disputes.length },
          { key: 'open', label: 'Open', count: disputes.filter(d => d.status === 'open').length },
          { key: 'in_progress', label: 'In Progress', count: disputes.filter(d => d.status === 'in_progress').length },
          { key: 'resolved', label: 'Resolved', count: disputes.filter(d => d.status === 'resolved').length },
        ].map((filterOption) => (
          <TouchableOpacity
            key={filterOption.key}
            style={[
              styles.filterButton,
              filter === filterOption.key && styles.activeFilterButton
            ]}
            onPress={() => setFilter(filterOption.key as any)}
          >
            <Text style={[
              styles.filterText,
              filter === filterOption.key && styles.activeFilterText
            ]}>
              {filterOption.label} ({filterOption.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Disputes List */}
      <ScrollView
        style={styles.disputesList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading disputes...</Text>
          </View>
        ) : getFilteredDisputes().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Disputes Found</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all'
                ? "You haven't created any disputes yet"
                : `No ${filter.replace('_', ' ')} disputes found`}
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Text style={styles.createButtonText}>Create Dispute</Text>
            </TouchableOpacity>
          </View>
        ) : (
          getFilteredDisputes().map((dispute) => (
            <TouchableOpacity
              key={dispute.id}
              style={styles.disputeCard}
              onPress={() => router.push(`/dispute-details?disputeId=${dispute.id}`)}
            >
              <View style={styles.disputeHeader}>
                <Text style={styles.disputeTitle} numberOfLines={1}>
                  {dispute.title}
                </Text>
                <View style={styles.badgeContainer}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(dispute.priority) }]}>
                    <Text style={styles.badgeText}>{dispute.priority.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) }]}>
                    <Text style={styles.badgeText}>{dispute.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.disputeDescription} numberOfLines={2}>
                {dispute.description}
              </Text>

              <View style={styles.bookingInfo}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.bookingText}>
                  {dispute.booking.venue_name} • {formatDate(dispute.booking.booking_date)}
                </Text>
              </View>

              <View style={styles.bookingInfo}>
                <Ionicons name="time" size={16} color="#666" />
                <Text style={styles.bookingText}>
                  {formatTime(dispute.booking.start_time)} - {formatTime(dispute.booking.end_time)}
                </Text>
              </View>

              <View style={styles.disputeFooter}>
                <View style={styles.otherPartyInfo}>
                  <Ionicons name="person" size={16} color="#666" />
                  <Text style={styles.otherPartyText}>
                    vs {dispute.other_party.name} ({dispute.other_party.user_type.replace('_', ' ')})
                  </Text>
                </View>

                <View style={styles.disputeStats}>
                  {dispute.message_count > 0 && (
                    <View style={styles.messageCount}>
                      <Ionicons name="chatbubble" size={14} color="#666" />
                      <Text style={styles.messageCountText}>{dispute.message_count}</Text>
                    </View>
                  )}
                  <Text style={styles.dateText}>
                    {formatDate(dispute.created_at)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Dispute Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Dispute</Text>
            <TouchableOpacity
              onPress={createDispute}
              disabled={creating || !selectedBooking || !disputeTitle.trim() || !disputeDescription.trim()}
            >
              <Text style={[
                styles.modalSaveText,
                (!selectedBooking || !disputeTitle.trim() || !disputeDescription.trim()) && styles.modalSaveTextDisabled
              ]}>
                {creating ? 'Creating...' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Booking Selection */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Select Booking *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookingSelector}>
                {userBookings.map((booking) => (
                  <TouchableOpacity
                    key={booking.id}
                    style={[
                      styles.bookingOption,
                      selectedBooking?.id === booking.id && styles.selectedBookingOption
                    ]}
                    onPress={() => setSelectedBooking(booking)}
                  >
                    <Text style={[
                      styles.bookingOptionTitle,
                      selectedBooking?.id === booking.id && styles.selectedBookingOptionTitle
                    ]}>
                      {booking.venue_name}
                    </Text>
                    <Text style={[
                      styles.bookingOptionDate,
                      selectedBooking?.id === booking.id && styles.selectedBookingOptionDate
                    ]}>
                      {formatDate(booking.booking_date)}
                    </Text>
                    <Text style={[
                      styles.bookingOptionTime,
                      selectedBooking?.id === booking.id && styles.selectedBookingOptionTime
                    ]}>
                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {userBookings.length === 0 && (
                <Text style={styles.noBookingsText}>
                  No confirmed bookings available for disputes
                </Text>
              )}
            </View>

            {/* Title */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Dispute Title *</Text>
              <TextInput
                style={styles.textInput}
                value={disputeTitle}
                onChangeText={setDisputeTitle}
                placeholder="Brief description of the issue"
                maxLength={100}
              />
            </View>

            {/* Description */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={disputeDescription}
                onChangeText={setDisputeDescription}
                placeholder="Detailed description of the dispute..."
                multiline
                numberOfLines={4}
                maxLength={500}
              />
            </View>

            {/* Priority */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Priority</Text>
              <View style={styles.prioritySelector}>
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      disputePriority === priority && styles.selectedPriorityOption,
                      { borderColor: getPriorityColor(priority) }
                    ]}
                    onPress={() => setDisputePriority(priority)}
                  >
                    <Text style={[
                      styles.priorityOptionText,
                      disputePriority === priority && { color: getPriorityColor(priority) }
                    ]}>
                      {priority.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterButton: {
    backgroundColor: '#228B22',
    borderColor: '#228B22',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  disputesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#228B22',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disputeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  disputeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  disputeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bookingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  otherPartyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  otherPartyText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  disputeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  messageCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageCountText: {
    fontSize: 12,
    color: '#666',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#228B22',
    fontWeight: '600',
  },
  modalSaveTextDisabled: {
    color: '#ccc',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  formSection: {
    marginVertical: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  bookingSelector: {
    maxHeight: 120,
  },
  bookingOption: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 160,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedBookingOption: {
    backgroundColor: '#e8f5e8',
    borderColor: '#228B22',
  },
  bookingOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedBookingOptionTitle: {
    color: '#228B22',
  },
  bookingOptionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  selectedBookingOptionDate: {
    color: '#228B22',
  },
  bookingOptionTime: {
    fontSize: 12,
    color: '#666',
  },
  selectedBookingOptionTime: {
    color: '#228B22',
  },
  noBookingsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  selectedPriorityOption: {
    backgroundColor: '#fff',
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});
