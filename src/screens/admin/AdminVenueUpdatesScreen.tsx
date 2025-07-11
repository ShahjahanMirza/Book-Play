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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';

interface VenueUpdate {
  id: string;
  venue_id: string;
  venue_name: string;
  owner_name: string;
  owner_email: string;
  update_type: 'details' | 'pricing' | 'schedule' | 'services';
  status: 'pending' | 'approved' | 'rejected';
  old_values: any;
  new_values: any;
  requested_at: string;
  admin_notes?: string;
}

export default function AdminVenueUpdatesScreen() {
  const router = useRouter();
  const [updates, setUpdates] = useState<VenueUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedUpdate, setSelectedUpdate] = useState<VenueUpdate | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadVenueUpdates();
  }, [filter]);

  const loadVenueUpdates = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('venue_updates')
        .select(`
          id,
          venue_id,
          update_type,
          status,
          old_values,
          new_values,
          requested_at,
          admin_notes,
          venues!venue_updates_venue_id_fkey (
            name,
            users!venues_owner_id_fkey (
              name,
              email
            )
          )
        `)
        .order('requested_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedUpdates: VenueUpdate[] = data?.map(update => ({
        id: update.id,
        venue_id: update.venue_id,
        venue_name: update.venues?.name || 'Unknown Venue',
        owner_name: update.venues?.users?.[0]?.name || 'Unknown Owner',
        owner_email: update.venues?.users?.[0]?.email || '',
        update_type: update.update_type,
        status: update.status,
        old_values: update.old_values,
        new_values: update.new_values,
        requested_at: update.requested_at,
        admin_notes: update.admin_notes,
      })) || [];

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

  const handleUpdateAction = async (updateId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const update = updates.find(u => u.id === updateId);
      if (!update) return;

      if (action === 'approve') {
        // Apply the updates to the venue
        const { error: venueError } = await supabase
          .from('venues')
          .update({
            ...update.new_values,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.venue_id);

        if (venueError) throw venueError;
      }

      // Update the venue_updates record
      const { error: updateError } = await supabase
        .from('venue_updates')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_notes: notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'a87a1832-475d-46fd-b0d4-1eb1a8f1c737' // Admin ID
        })
        .eq('id', updateId);

      if (updateError) throw updateError;

      Alert.alert('Success', `Update ${action}d successfully`);
      loadVenueUpdates();
    } catch (error) {
      console.error(`Error ${action}ing update:`, error);
      Alert.alert('Error', `Failed to ${action} update`);
    }
  };

  const getUpdateTypeIcon = (type: string) => {
    switch (type) {
      case 'details': return 'information-circle-outline';
      case 'pricing': return 'cash-outline';
      case 'schedule': return 'time-outline';
      case 'services': return 'list-outline';
      default: return 'document-outline';
    }
  };

  const getUpdateTypeColor = (type: string) => {
    switch (type) {
      case 'details': return '#2196F3';
      case 'pricing': return '#4CAF50';
      case 'schedule': return '#FF9800';
      case 'services': return '#9C27B0';
      default: return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      case 'pending': return '#FF9800';
      default: return '#666';
    }
  };

  const renderChangeComparison = (oldValues: any, newValues: any) => {
    const changes: JSX.Element[] = [];
    
    Object.keys(newValues).forEach(key => {
      if (oldValues[key] !== newValues[key]) {
        changes.push(
          <View key={key} style={styles.changeItem}>
            <Text style={styles.changeField}>{key.replace('_', ' ').toUpperCase()}:</Text>
            <View style={styles.changeValues}>
              <Text style={styles.oldValue}>From: {String(oldValues[key] || 'Not set')}</Text>
              <Text style={styles.newValue}>To: {String(newValues[key])}</Text>
            </View>
          </View>
        );
      }
    });

    return changes;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#228B22" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Venue Updates</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#228B22" />
        </TouchableOpacity>
      </View>

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

      {/* Updates List */}
      <ScrollView
        style={styles.updatesContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#228B22" />
            <Text style={styles.loadingText}>Loading updates...</Text>
          </View>
        ) : updates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Updates Found</Text>
            <Text style={styles.emptyText}>
              No venue updates match the selected filter
            </Text>
          </View>
        ) : (
          updates.map((update) => (
            <TouchableOpacity
              key={update.id}
              style={styles.updateCard}
              onPress={() => {
                setSelectedUpdate(update);
                setShowDetailsModal(true);
              }}
            >
              <View style={styles.updateHeader}>
                <View style={styles.updateInfo}>
                  <View style={styles.updateTitleRow}>
                    <Ionicons
                      name={getUpdateTypeIcon(update.update_type) as any}
                      size={20}
                      color={getUpdateTypeColor(update.update_type)}
                    />
                    <Text style={styles.updateTitle}>
                      {update.update_type.replace('_', ' ').toUpperCase()} Update
                    </Text>
                  </View>
                  <Text style={styles.venueName}>{update.venue_name}</Text>
                  <Text style={styles.ownerName}>by {update.owner_name}</Text>
                </View>
                
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(update.status) }
                ]}>
                  <Text style={styles.statusText}>
                    {update.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.requestDate}>
                Requested {new Date(update.requested_at).toLocaleDateString()}
              </Text>

              {update.status === 'pending' && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleUpdateAction(update.id, 'approve');
                    }}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleUpdateAction(update.id, 'reject');
                    }}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Update Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedUpdate && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Update Information</Text>
                <Text style={styles.detailText}>Venue: {selectedUpdate.venue_name}</Text>
                <Text style={styles.detailText}>Owner: {selectedUpdate.owner_name}</Text>
                <Text style={styles.detailText}>Type: {selectedUpdate.update_type.replace('_', ' ').toUpperCase()}</Text>
                <Text style={styles.detailText}>Status: {selectedUpdate.status.toUpperCase()}</Text>
                <Text style={styles.detailText}>
                  Requested: {new Date(selectedUpdate.requested_at).toLocaleString()}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Proposed Changes</Text>
                {renderChangeComparison(selectedUpdate.old_values, selectedUpdate.new_values)}
              </View>

              {selectedUpdate.admin_notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Admin Notes</Text>
                  <Text style={styles.detailText}>{selectedUpdate.admin_notes}</Text>
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
  filterContainer: {
    paddingHorizontal: 15,
    marginVertical: 15,
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
  updatesContainer: {
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
  updateCard: {
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
  updateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  updateInfo: {
    flex: 1,
  },
  updateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  venueName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ownerName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
  requestDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
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
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#90EE90',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  changeItem: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  changeField: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  changeValues: {
    paddingLeft: 10,
  },
  oldValue: {
    fontSize: 13,
    color: '#F44336',
    marginBottom: 2,
  },
  newValue: {
    fontSize: 13,
    color: '#4CAF50',
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
