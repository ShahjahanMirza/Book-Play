import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';

interface DisputeMessage {
  id: string;
  message: string;
  is_admin_message: boolean;
  created_at: string;
  sender: {
    name: string;
    user_type: string;
  };
}

interface DisputeDetails {
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
    phone_number?: string;
  };
  defendant: {
    id: string;
    name: string;
    email: string;
    user_type: string;
    phone_number?: string;
  };
  booking: {
    venue_name: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    total_amount: number;
    status: string;
  };
  messages: DisputeMessage[];
}

export default function AdminDisputeDetailsScreen() {
  const router = useRouter();
  const { disputeId } = useLocalSearchParams();
  const [dispute, setDispute] = useState<DisputeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionText, setResolutionText] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (disputeId) {
      loadDisputeDetails();
    }
  }, [disputeId]);

  const loadDisputeDetails = async () => {
    try {
      setLoading(true);

      // Get dispute details
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
          complainant:users!disputes_complainant_id_fkey (
            id,
            name,
            email,
            user_type,
            phone_number
          ),
          defendant:users!disputes_defendant_id_fkey (
            id,
            name,
            email,
            user_type,
            phone_number
          ),
          bookings!disputes_booking_id_fkey (
            booking_date,
            start_time,
            end_time,
            total_amount,
            status,
            venues!bookings_venue_id_fkey (
              name
            )
          )
        `)
        .eq('id', disputeId)
        .single();

      if (disputeError) throw disputeError;

      // Get dispute messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('dispute_messages')
        .select(`
          id,
          message,
          is_admin_message,
          created_at,
          users!dispute_messages_sender_id_fkey (
            name,
            user_type
          )
        `)
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const formattedDispute: DisputeDetails = {
        id: disputeData.id,
        booking_id: disputeData.booking_id,
        title: disputeData.title,
        description: disputeData.description,
        status: disputeData.status,
        priority: disputeData.priority,
        created_at: disputeData.created_at,
        resolved_at: disputeData.resolved_at,
        resolution: disputeData.resolution,
        complainant: disputeData.complainant,
        defendant: disputeData.defendant,
        booking: {
          venue_name: disputeData.bookings?.venues?.name || 'Unknown Venue',
          booking_date: disputeData.bookings?.booking_date || '',
          start_time: disputeData.bookings?.start_time || '',
          end_time: disputeData.bookings?.end_time || '',
          total_amount: disputeData.bookings?.total_amount || 0,
          status: disputeData.bookings?.status || '',
        },
        messages: messagesData?.map(msg => ({
          id: msg.id,
          message: msg.message,
          is_admin_message: msg.is_admin_message,
          created_at: msg.created_at,
          sender: {
            name: msg.users?.name || 'Unknown',
            user_type: msg.users?.user_type || 'unknown',
          },
        })) || [],
      };

      setDispute(formattedDispute);
    } catch (error) {
      console.error('Error loading dispute details:', error);
      Alert.alert('Error', 'Failed to load dispute details');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !dispute) return;

    try {
      setSendingMessage(true);

      const { error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: dispute.id,
          sender_id: 'a87a1832-475d-46fd-b0d4-1eb1a8f1c737', // Admin ID
          message: newMessage.trim(),
          is_admin_message: true,
        });

      if (error) throw error;

      setNewMessage('');
      loadDisputeDetails(); // Reload to get new message
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const updateDisputeStatus = async (newStatus: 'in_progress' | 'resolved' | 'closed') => {
    if (!dispute) return;

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
        .eq('id', dispute.id);

      if (error) throw error;

      Alert.alert('Success', `Dispute ${newStatus} successfully`);
      setShowResolutionModal(false);
      setShowStatusModal(false);
      setResolutionText('');
      loadDisputeDetails();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#228B22" />
        <Text style={styles.loadingText}>Loading dispute details...</Text>
      </View>
    );
  }

  if (!dispute) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
        <Text style={styles.errorTitle}>Dispute Not Found</Text>
        <Text style={styles.errorText}>The requested dispute could not be found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#228B22" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Details</Text>
        <TouchableOpacity onPress={() => setShowStatusModal(true)}>
          <Ionicons name="settings-outline" size={24} color="#228B22" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dispute Info */}
        <View style={styles.disputeInfoCard}>
          <View style={styles.disputeHeader}>
            <Text style={styles.disputeTitle}>{dispute.title}</Text>
            <View style={styles.badgeContainer}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(dispute.priority) }]}>
                <Text style={styles.badgeText}>{dispute.priority.toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) }]}>
                <Text style={styles.badgeText}>{dispute.status.replace('_', ' ').toUpperCase()}</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.disputeDescription}>{dispute.description}</Text>
          
          <View style={styles.disputeMeta}>
            <Text style={styles.metaText}>
              Created: {new Date(dispute.created_at).toLocaleString()}
            </Text>
            {dispute.resolved_at && (
              <Text style={styles.metaText}>
                Resolved: {new Date(dispute.resolved_at).toLocaleString()}
              </Text>
            )}
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.bookingCard}>
          <Text style={styles.cardTitle}>Booking Details</Text>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingVenue}>{dispute.booking.venue_name}</Text>
            <Text style={styles.bookingDate}>
              {new Date(dispute.booking.booking_date).toLocaleDateString()} • 
              {dispute.booking.start_time} - {dispute.booking.end_time}
            </Text>
            <Text style={styles.bookingAmount}>
              Amount: Rs. {dispute.booking.total_amount}
            </Text>
            <Text style={styles.bookingStatus}>
              Status: {dispute.booking.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Parties Involved */}
        <View style={styles.partiesCard}>
          <Text style={styles.cardTitle}>Parties Involved</Text>
          
          <View style={styles.party}>
            <View style={styles.partyHeader}>
              <Ionicons 
                name={getUserTypeIcon(dispute.complainant.user_type) as any} 
                size={20} 
                color="#F44336" 
              />
              <Text style={styles.partyRole}>Complainant</Text>
            </View>
            <Text style={styles.partyName}>{dispute.complainant.name}</Text>
            <Text style={styles.partyEmail}>{dispute.complainant.email}</Text>
            {dispute.complainant.phone_number && (
              <Text style={styles.partyPhone}>{dispute.complainant.phone_number}</Text>
            )}
          </View>

          <View style={styles.party}>
            <View style={styles.partyHeader}>
              <Ionicons 
                name={getUserTypeIcon(dispute.defendant.user_type) as any} 
                size={20} 
                color="#2196F3" 
              />
              <Text style={styles.partyRole}>Defendant</Text>
            </View>
            <Text style={styles.partyName}>{dispute.defendant.name}</Text>
            <Text style={styles.partyEmail}>{dispute.defendant.email}</Text>
            {dispute.defendant.phone_number && (
              <Text style={styles.partyPhone}>{dispute.defendant.phone_number}</Text>
            )}
          </View>
        </View>

        {/* Resolution */}
        {dispute.resolution && (
          <View style={styles.resolutionCard}>
            <Text style={styles.cardTitle}>Resolution</Text>
            <Text style={styles.resolutionText}>{dispute.resolution}</Text>
          </View>
        )}

        {/* Messages */}
        <View style={styles.messagesCard}>
          <Text style={styles.cardTitle}>Communication ({dispute.messages.length})</Text>
          
          {dispute.messages.length === 0 ? (
            <Text style={styles.noMessages}>No messages yet</Text>
          ) : (
            dispute.messages.map((message) => (
              <View 
                key={message.id} 
                style={[
                  styles.messageItem,
                  message.is_admin_message && styles.adminMessage
                ]}
              >
                <View style={styles.messageHeader}>
                  <View style={styles.messageSender}>
                    <Ionicons 
                      name={getUserTypeIcon(message.sender.user_type) as any} 
                      size={16} 
                      color={message.is_admin_message ? '#4CAF50' : '#666'} 
                    />
                    <Text style={[
                      styles.senderName,
                      message.is_admin_message && styles.adminSenderName
                    ]}>
                      {message.sender.name}
                      {message.is_admin_message && ' (Admin)'}
                    </Text>
                  </View>
                  <Text style={styles.messageTime}>
                    {new Date(message.created_at).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.messageText}>{message.message}</Text>
              </View>
            ))
          )}
        </View>

        {/* Message Input */}
        {dispute.status !== 'closed' && dispute.status !== 'resolved' && (
          <View style={styles.messageInputCard}>
            <Text style={styles.cardTitle}>Send Message</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.sendButtonText}>Send Message</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Action Buttons */}
        {dispute.status !== 'closed' && dispute.status !== 'resolved' && (
          <View style={styles.actionButtons}>
            {dispute.status === 'open' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                onPress={() => updateDisputeStatus('in_progress')}
              >
                <Text style={styles.actionButtonText}>Take Action</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => setShowResolutionModal(true)}
            >
              <Text style={styles.actionButtonText}>Resolve Dispute</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#666' }]}
              onPress={() => updateDisputeStatus('closed')}
            >
              <Text style={styles.actionButtonText}>Close Dispute</Text>
            </TouchableOpacity>
          </View>
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
              Provide resolution details for this dispute
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
                onPress={() => updateDisputeStatus('resolved')}
              >
                <Text style={styles.modalConfirmText}>Resolve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal
        visible={showStatusModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Update Status</Text>
            <Text style={styles.modalSubtitle}>
              Change the dispute status
            </Text>
            
            <View style={styles.statusOptions}>
              {['in_progress', 'resolved', 'closed'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.statusOption, { backgroundColor: getStatusColor(status) }]}
                  onPress={() => {
                    if (status === 'resolved') {
                      setShowStatusModal(false);
                      setShowResolutionModal(true);
                    } else {
                      updateDisputeStatus(status as any);
                    }
                  }}
                >
                  <Text style={styles.statusOptionText}>
                    {status.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#228B22',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  content: {
    flex: 1,
    padding: 15,
  },
  disputeInfoCard: {
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
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  disputeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  badgeContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  disputeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  disputeMeta: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  bookingCard: {
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
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  bookingInfo: {
    gap: 4,
  },
  bookingVenue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bookingDate: {
    fontSize: 14,
    color: '#666',
  },
  bookingAmount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  bookingStatus: {
    fontSize: 14,
    color: '#666',
  },
  partiesCard: {
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
  party: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  partyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  partyRole: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  partyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  partyEmail: {
    fontSize: 14,
    color: '#666',
  },
  partyPhone: {
    fontSize: 14,
    color: '#666',
  },
  resolutionCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  resolutionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  messagesCard: {
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
  noMessages: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  messageItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  adminMessage: {
    backgroundColor: '#e8f5e8',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  messageSender: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  adminSenderName: {
    color: '#4CAF50',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  messageInputCard: {
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
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    marginBottom: 10,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#228B22',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
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
  statusOptions: {
    gap: 10,
    marginBottom: 20,
  },
  statusOption: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
