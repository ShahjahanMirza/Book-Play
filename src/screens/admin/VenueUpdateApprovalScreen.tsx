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
import { VenueUpdateRequestService, VenueUpdateRequest } from '../../services/venueUpdateRequestService';
import { NotificationService } from '../../services/notificationService';

export default function VenueUpdateApprovalScreen() {
  const { user } = useAuth();
  const [updateRequests, setUpdateRequests] = useState<VenueUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VenueUpdateRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadUpdateRequests(), loadStats()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUpdateRequests = async () => {
    try {
      const requests = await VenueUpdateRequestService.getPendingUpdateRequests();
      setUpdateRequests(requests);
    } catch (error) {
      console.error('Error loading update requests:', error);
      Alert.alert('Error', 'Failed to load update requests');
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await VenueUpdateRequestService.getRequestStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleReviewRequest = (request: VenueUpdateRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setAdminNotes('');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedRequest || !user) return;

    try {
      await VenueUpdateRequestService.updateRequestStatus(
        selectedRequest.id,
        reviewAction,
        user.id,
        adminNotes.trim() || undefined
      );

      // Send notification to venue owner
      try {
        const notificationTitle = reviewAction === 'approve' 
          ? 'Update Request Approved' 
          : 'Update Request Rejected';
        
        const notificationMessage = reviewAction === 'approve'
          ? `Your update request for ${selectedRequest.venue?.name} has been approved and applied.`
          : `Your update request for ${selectedRequest.venue?.name} has been rejected. ${adminNotes ? `Reason: ${adminNotes}` : ''}`;

        await NotificationService.createNotification(
          selectedRequest.owner_id,
          notificationTitle,
          notificationMessage,
          'general'
        );
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the review if notification fails
      }

      Alert.alert(
        'Success',
        `Update request ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully`
      );

      setShowReviewModal(false);
      setSelectedRequest(null);
      loadData();
    } catch (error) {
      console.error('Error reviewing request:', error);
      Alert.alert('Error', `Failed to ${reviewAction} update request`);
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

  const renderChangeComparison = (request: VenueUpdateRequest) => {
    const current = request.current_data;
    const requested = request.requested_data;

    if (!current || !requested) return null;

    const changes: Array<{ field: string; current: any; requested: any }> = [];

    Object.keys(requested).forEach(key => {
      if (JSON.stringify(current[key]) !== JSON.stringify(requested[key])) {
        changes.push({
          field: key,
          current: current[key],
          requested: requested[key],
        });
      }
    });

    return (
      <View style={styles.changesContainer}>
        <Text style={styles.changesTitle}>Proposed Changes:</Text>
        {changes.map((change, index) => (
          <View key={index} style={styles.changeItem}>
            <Text style={styles.changeField}>{change.field.replace(/_/g, ' ').toUpperCase()}:</Text>
            <View style={styles.changeValues}>
              <View style={styles.currentValue}>
                <Text style={styles.valueLabel}>Current:</Text>
                <Text style={styles.valueText}>
                  {Array.isArray(change.current) 
                    ? change.current.join(', ') 
                    : String(change.current || 'Not set')}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color="#666" />
              <View style={styles.requestedValue}>
                <Text style={styles.valueLabel}>Requested:</Text>
                <Text style={styles.valueText}>
                  {Array.isArray(change.requested) 
                    ? change.requested.join(', ') 
                    : String(change.requested || 'Not set')}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Venue Update Approvals</Text>
        <Text style={styles.subtitle}>
          Review and approve venue update requests
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Requests List */}
      <ScrollView
        style={styles.requestsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {updateRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#4CAF50" />
            <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
            <Text style={styles.emptyStateText}>
              No pending venue update requests to review.
            </Text>
          </View>
        ) : (
          updateRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestInfo}>
                  <Text style={styles.venueName}>{request.venue?.name}</Text>
                  <Text style={styles.ownerName}>by {request.owner?.name}</Text>
                  <Text style={styles.requestType}>
                    {getRequestTypeLabel(request.request_type)}
                  </Text>
                  <Text style={styles.requestDate}>
                    {formatDate(request.created_at)}
                  </Text>
                </View>
                
                <View style={styles.urgencyIndicator}>
                  <Ionicons name="time" size={16} color="#FF9800" />
                  <Text style={styles.urgencyText}>Pending</Text>
                </View>
              </View>

              <View style={styles.requestDetails}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <Text style={styles.reasonText}>{request.reason}</Text>
                
                {renderChangeComparison(request)}
              </View>

              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleReviewRequest(request, 'reject')}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleReviewRequest(request, 'approve')}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Update Request
            </Text>
            <TouchableOpacity onPress={() => setShowReviewModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedRequest && (
              <View>
                <View style={styles.modalRequestInfo}>
                  <Text style={styles.modalVenueName}>{selectedRequest.venue?.name}</Text>
                  <Text style={styles.modalRequestType}>
                    {getRequestTypeLabel(selectedRequest.request_type)}
                  </Text>
                  <Text style={styles.modalOwnerName}>
                    Requested by: {selectedRequest.owner?.name}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Reason for Update:</Text>
                  <Text style={styles.modalReasonText}>{selectedRequest.reason}</Text>
                </View>

                {renderChangeComparison(selectedRequest)}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>
                    Admin Notes {reviewAction === 'reject' ? '(Required)' : '(Optional)'}:
                  </Text>
                  <TextInput
                    style={styles.adminNotesInput}
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    placeholder={
                      reviewAction === 'approve' 
                        ? 'Add any notes about this approval...'
                        : 'Explain why this request is being rejected...'
                    }
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowReviewModal(false)}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.modalSubmitButton,
                      reviewAction === 'approve' ? styles.approveButton : styles.rejectButton,
                      (reviewAction === 'reject' && !adminNotes.trim()) && styles.disabledButton
                    ]}
                    onPress={submitReview}
                    disabled={reviewAction === 'reject' && !adminNotes.trim()}
                  >
                    <Text style={styles.modalSubmitButtonText}>
                      {reviewAction === 'approve' ? 'Approve' : 'Reject'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
  statsSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
    marginBottom: 15,
  },
  requestInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: '#666',
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
  urgencyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 4,
  },
  requestDetails: {
    marginBottom: 15,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 10,
  },
  changesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  changesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  changeItem: {
    marginBottom: 10,
  },
  changeField: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  changeValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  currentValue: {
    flex: 1,
  },
  requestedValue: {
    flex: 1,
  },
  valueLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  valueText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },
  requestActions: {
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
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
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
    flex: 1,
    padding: 20,
  },
  modalRequestInfo: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  modalVenueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalRequestType: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  modalOwnerName: {
    fontSize: 14,
    color: '#666',
  },
  modalSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  modalReasonText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  adminNotesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    height: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});
