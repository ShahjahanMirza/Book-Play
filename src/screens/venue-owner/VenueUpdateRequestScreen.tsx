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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { VenueUpdateRequestService, VenueUpdateRequest } from '../../services/venueUpdateRequestService';

interface Venue {
  id: string;
  name: string;
  location: string;
  status: string;
}

export default function VenueUpdateRequestScreen() {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [updateRequests, setUpdateRequests] = useState<VenueUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadVenues(), loadUpdateRequests()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVenues = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name, location, approval_status')
        .eq('owner_id', user.id)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading venues:', error);
        return;
      }

      setVenues(data || []);
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  const loadUpdateRequests = async () => {
    if (!user) return;

    try {
      const requests = await VenueUpdateRequestService.getOwnerUpdateRequests(user.id);
      setUpdateRequests(requests);
    } catch (error) {
      console.error('Error loading update requests:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredRequests = () => {
    if (activeTab === 'all') {
      return updateRequests;
    }
    return updateRequests.filter(request => request.status === activeTab);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'approved': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'venue_info': return 'Venue Information';
      case 'pricing': return 'Pricing';
      case 'availability': return 'Availability';
      case 'services': return 'Services';
      case 'images': return 'Images';
      case 'fields': return 'Fields';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cancelRequest = async (requestId: string) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this update request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await VenueUpdateRequestService.cancelUpdateRequest(requestId, user!.id);
              Alert.alert('Success', 'Update request cancelled successfully');
              loadUpdateRequests();
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel update request');
            }
          }
        }
      ]
    );
  };

  const filteredRequests = getFilteredRequests();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Update Requests</Text>
        <Text style={styles.subtitle}>
          Submit venue update requests for admin approval
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowRequestModal(true)}
          disabled={venues.length === 0}
        >
          <Ionicons name="add-circle-outline" size={20} color={venues.length > 0 ? "#007AFF" : "#ccc"} />
          <Text style={[styles.actionButtonText, venues.length === 0 && styles.disabledText]}>
            New Request
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh-outline" size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {venues.length === 0 && (
        <View style={styles.noVenuesContainer}>
          <Ionicons name="business-outline" size={48} color="#ccc" />
          <Text style={styles.noVenuesTitle}>No Approved Venues</Text>
          <Text style={styles.noVenuesText}>
            You need to have approved venues before you can submit update requests.
          </Text>
        </View>
      )}

      {/* Tab Selector */}
      {venues.length > 0 && (
        <View style={styles.tabContainer}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab !== 'all' && ` (${updateRequests.filter(r => r.status === tab).length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Requests List */}
      <ScrollView
        style={styles.requestsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Update Requests</Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'all' 
                ? 'You haven\'t submitted any update requests yet.'
                : `No ${activeTab} update requests found.`}
            </Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestVenue}>{request.venue?.name}</Text>
                  <Text style={styles.requestType}>
                    {getRequestTypeLabel(request.request_type)}
                  </Text>
                  <Text style={styles.requestDate}>
                    {formatDate(request.created_at)}
                  </Text>
                </View>
                
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(request.status) }
                ]}>
                  <Ionicons
                    name={getStatusIcon(request.status) as any}
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.statusText}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.requestDetails}>
                <Text style={styles.requestReason}>{request.reason}</Text>
                
                {request.admin_notes && (
                  <View style={styles.adminNotesContainer}>
                    <Text style={styles.adminNotesLabel}>Admin Notes:</Text>
                    <Text style={styles.adminNotes}>{request.admin_notes}</Text>
                  </View>
                )}

                {request.reviewed_at && (
                  <Text style={styles.reviewedDate}>
                    Reviewed: {formatDate(request.reviewed_at)}
                  </Text>
                )}
              </View>

              {request.status === 'pending' && (
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => cancelRequest(request.id)}
                  >
                    <Ionicons name="close" size={16} color="#F44336" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* New Request Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Update Request</Text>
            <TouchableOpacity onPress={() => setShowRequestModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              Select the type of update you want to request and provide details about the changes needed.
            </Text>
            
            <Text style={styles.modalNote}>
              Note: All venue updates require admin approval before going live.
            </Text>
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  disabledText: {
    color: '#ccc',
  },
  noVenuesContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noVenuesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  noVenuesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 5,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  requestsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  requestInfo: {
    flex: 1,
  },
  requestVenue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  requestType: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  requestDetails: {
    marginBottom: 10,
  },
  requestReason: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    marginBottom: 8,
  },
  adminNotesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  adminNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  adminNotes: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  reviewedDate: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F44336',
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 15,
  },
  modalNote: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
});
