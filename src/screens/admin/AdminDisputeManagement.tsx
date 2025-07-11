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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';

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
  complainant: {
    id: string;
    name: string;
    email: string;
    user_type: string;
  };
  defendant: {
    id: string;
    name: string;
    email: string;
    user_type: string;
  };
  booking: {
    venue_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    total_amount: number;
  };
  message_count: number;
}

export default function AdminDisputeManagement() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('open');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionText, setResolutionText] = useState('');

  useEffect(() => {
    loadDisputes();
  }, [filter, priorityFilter]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      console.log('Loading disputes with filter:', filter, 'priority:', priorityFilter);

      // First, try a simple query to see if we can access disputes at all
      const { data: simpleData, error: simpleError } = await supabase
        .from('disputes')
        .select('*')
        .limit(1);

      console.log('Simple disputes query result:', simpleData, 'error:', simpleError);

      let query = supabase
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
          complainant:users!disputes_complainant_id_fkey (
            id,
            name,
            email,
            user_type
          ),
          defendant:users!disputes_defendant_id_fkey (
            id,
            name,
            email,
            user_type
          ),
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
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter);
      }

      let disputeData = null;
      let disputeError = null;

      // Try the complex query first
      const complexResult = await query;
      disputeData = complexResult.data;
      disputeError = complexResult.error;

      // If complex query fails, try a simpler approach
      if (disputeError) {
        console.warn('Complex query failed, trying simple query:', disputeError);

        const { data: simpleDisputes, error: simpleError } = await supabase
          .from('disputes')
          .select('*')
          .order('created_at', { ascending: false });

        if (simpleError) {
          console.error('Simple query also failed:', simpleError);
          throw simpleError;
        }

        disputeData = simpleDisputes;
        disputeError = null;
      }

      if (disputeError) {
        console.error('Error loading disputes:', disputeError);
        console.error('Dispute error details:', JSON.stringify(disputeError, null, 2));
        throw disputeError;
      }

      console.log('Admin disputes loaded:', disputeData?.length || 0, 'disputes');
      console.log('Admin dispute data sample:', disputeData?.[0]);

      // Get message counts for each dispute
      const disputeIds = disputeData?.map(d => d.id) || [];
      let messageCounts: any[] = [];

      if (disputeIds.length > 0) {
        const { data: messageData, error: messageError } = await supabase
          .from('dispute_messages')
          .select('dispute_id')
          .in('dispute_id', disputeIds);

        if (messageError) {
          console.error('Error loading message counts:', messageError);
        } else {
          messageCounts = messageData || [];
        }
      }

      // Process disputes with message counts
      const formattedDisputes: Dispute[] = disputeData?.map(dispute => {
        const messageCount = messageCounts?.filter(m => m.dispute_id === dispute.id).length || 0;

        // Handle both complex query result (with joins) and simple query result
        const complainant = dispute.complainant || { id: dispute.complainant_id, name: 'Unknown User', email: '', user_type: 'player' };
        const defendant = dispute.defendant || { id: dispute.defendant_id, name: 'Unknown User', email: '', user_type: 'player' };
        const booking = dispute.bookings || { venue_name: 'Unknown Venue', booking_date: '', start_time: '', end_time: '', total_amount: 0 };

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
          complainant: complainant,
          defendant: defendant,
          booking: {
            venue_name: booking.venues?.name || booking.venue_name || 'Unknown Venue',
            booking_date: booking.booking_date || '',
            start_time: booking.start_time || '',
            end_time: booking.end_time || '',
            total_amount: booking.total_amount || 0,
          },
          message_count: messageCount,
        };
      }) || [];

      console.log('Formatted disputes:', formattedDisputes.length);
      setDisputes(formattedDisputes);
    } catch (error) {
      console.error('Error loading disputes:', error);
      Alert.alert('Error', 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDisputes();
    setRefreshing(false);
  };

  const updateDisputeStatus = async (disputeId: string, newStatus: 'in_progress' | 'resolved' | 'closed') => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'resolved' && resolutionText.trim()) {
        updateData.resolution = resolutionText.trim();
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('disputes')
        .update(updateData)
        .eq('id', disputeId);

      if (error) throw error;

      Alert.alert('Success', `Dispute ${newStatus} successfully`);
      setShowResolutionModal(false);
      setResolutionText('');
      setSelectedDispute(null);
      loadDisputes();
    } catch (error) {
      console.error('Error updating dispute status:', error);
      Alert.alert('Error', 'Failed to update dispute status');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#FF9800';
      case 'in_progress': return '#2196F3';
      case 'resolved': return '#4CAF50';
      case 'closed': return '#666';
      default: return '#666';
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'player': return 'person';
      case 'venue_owner': return 'business';
      case 'admin': return 'shield-checkmark';
      default: return 'help';
    }
  };

  const filteredDisputes = disputes;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#228B22" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Management</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#228B22" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: '#FF9800' }]}>
            {disputes.filter(d => d.status === 'open').length}
          </Text>
          <Text style={styles.summaryLabel}>Open</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: '#2196F3' }]}>
            {disputes.filter(d => d.status === 'in_progress').length}
          </Text>
          <Text style={styles.summaryLabel}>In Progress</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: '#4CAF50' }]}>
            {disputes.filter(d => d.status === 'resolved').length}
          </Text>
          <Text style={styles.summaryLabel}>Resolved</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryNumber, { color: '#F44336' }]}>
            {disputes.filter(d => d.priority === 'high').length}
          </Text>
          <Text style={styles.summaryLabel}>High Priority</Text>
        </View>
      </View>

      {/* Compact Filter Row */}
      <View style={styles.compactFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {[
            { key: 'open', label: 'Open', count: disputes.filter(d => d.status === 'open').length },
            { key: 'in_progress', label: 'Progress', count: disputes.filter(d => d.status === 'in_progress').length },
            { key: 'resolved', label: 'Resolved', count: disputes.filter(d => d.status === 'resolved').length },
            { key: 'all', label: 'All', count: disputes.length },
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

          {/* Priority Filter in same row */}
          <View style={styles.priorityFilterSeparator} />
          {[
            { key: 'all', label: 'All', color: '#666' },
            { key: 'high', label: 'High', color: '#F44336' },
            { key: 'medium', label: 'Med', color: '#FF9800' },
            { key: 'low', label: 'Low', color: '#4CAF50' },
          ].map((priorityOption) => (
            <TouchableOpacity
              key={priorityOption.key}
              style={[
                styles.compactPriorityButton,
                priorityFilter === priorityOption.key && { backgroundColor: priorityOption.color }
              ]}
              onPress={() => setPriorityFilter(priorityOption.key as any)}
            >
              <Text style={[
                styles.compactPriorityText,
                priorityFilter === priorityOption.key && styles.activeCompactPriorityText
              ]}>
                {priorityOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Disputes List */}
      <ScrollView
        style={styles.disputesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#228B22" />
            <Text style={styles.loadingText}>Loading disputes...</Text>
          </View>
        ) : filteredDisputes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Disputes Found</Text>
            <Text style={styles.emptyText}>
              No disputes match the selected filters
            </Text>
          </View>
        ) : (
          filteredDisputes.map((dispute) => (
            <TouchableOpacity
              key={dispute.id}
              style={styles.disputeCard}
              onPress={() => setSelectedDispute(dispute)}
            >
              <View style={styles.disputeHeader}>
                <View style={styles.disputeInfo}>
                  <Text style={styles.disputeTitle}>{dispute.title}</Text>
                  <Text style={styles.disputeVenue}>{dispute.booking.venue_name}</Text>
                  <Text style={styles.disputeDate}>
                    {new Date(dispute.booking.booking_date).toLocaleDateString()} • 
                    {dispute.booking.start_time} - {dispute.booking.end_time}
                  </Text>
                </View>
                
                <View style={styles.statusContainer}>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(dispute.priority) }
                  ]}>
                    <Text style={styles.priorityText}>{dispute.priority.toUpperCase()}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(dispute.status) }
                  ]}>
                    <Text style={styles.statusText}>{dispute.status.replace('_', ' ').toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.disputeParties}>
                <View style={styles.party}>
                  <Ionicons 
                    name={getUserTypeIcon(dispute.complainant.user_type) as any} 
                    size={16} 
                    color="#666" 
                  />
                  <Text style={styles.partyText}>
                    Complainant: {dispute.complainant.name}
                  </Text>
                </View>
                <View style={styles.party}>
                  <Ionicons 
                    name={getUserTypeIcon(dispute.defendant.user_type) as any} 
                    size={16} 
                    color="#666" 
                  />
                  <Text style={styles.partyText}>
                    Defendant: {dispute.defendant.name}
                  </Text>
                </View>
              </View>

              <View style={styles.disputeFooter}>
                <Text style={styles.disputeCreated}>
                  Created {new Date(dispute.created_at).toLocaleDateString()}
                </Text>
                {dispute.message_count > 0 && (
                  <View style={styles.messageCount}>
                    <Ionicons name="chatbubbles-outline" size={14} color="#666" />
                    <Text style={styles.messageCountText}>{dispute.message_count} messages</Text>
                  </View>
                )}
              </View>

              {dispute.status === 'open' && (
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={[styles.quickActionButton, { backgroundColor: '#2196F3' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      updateDisputeStatus(dispute.id, 'in_progress');
                    }}
                  >
                    <Text style={styles.quickActionText}>Take Action</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickActionButton, { backgroundColor: '#4CAF50' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedDispute(dispute);
                      setShowResolutionModal(true);
                    }}
                  >
                    <Text style={styles.quickActionText}>Resolve</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Resolution Modal */}
      <Modal
        visible={showResolutionModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Resolve Dispute</Text>
            <Text style={styles.modalSubtitle}>
              {selectedDispute?.title}
            </Text>
            
            <TextInput
              style={styles.resolutionInput}
              placeholder="Enter resolution details..."
              value={resolutionText}
              onChangeText={setResolutionText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowResolutionModal(false);
                  setResolutionText('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={() => {
                  if (selectedDispute) {
                    updateDisputeStatus(selectedDispute.id, 'resolved');
                  }
                }}
              >
                <Text style={styles.modalConfirmText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    marginBottom: 10,
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
  priorityFilterContainer: {
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  priorityButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  priorityButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  disputesContainer: {
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
  disputeCard: {
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
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  disputeInfo: {
    flex: 1,
  },
  disputeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  disputeVenue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  disputeDate: {
    fontSize: 12,
    color: '#999',
  },
  statusContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
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
  disputeParties: {
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  party: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  partyText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  disputeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  disputeCreated: {
    fontSize: 12,
    color: '#999',
  },
  messageCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageCountText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  resolutionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  compactFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterScrollView: {
    flexGrow: 0,
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
  priorityFilterSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#ddd',
    marginHorizontal: 10,
    alignSelf: 'center',
  },
  compactPriorityButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  compactPriorityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  activeCompactPriorityText: {
    color: '#fff',
  },
});
