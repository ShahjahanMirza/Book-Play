// User dispute details screen for viewing and messaging in disputes
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { router, useLocalSearchParams } from 'expo-router';

interface DisputeMessage {
  id: string;
  sender_id: string;
  message: string;
  is_admin_message: boolean;
  created_at: string;
  sender_name: string;
  sender_type: string;
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
    status: string;
  };
  messages: DisputeMessage[];
}

export default function UserDisputeDetailsScreen() {
  const { user } = useAuth();
  const { disputeId } = useLocalSearchParams();
  const [dispute, setDispute] = useState<DisputeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (disputeId && user) {
      loadDisputeDetails();
    }
  }, [disputeId, user]);

  const loadDisputeDetails = async () => {
    if (!disputeId || !user) return;

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
            status,
            venues!bookings_venue_id_fkey (
              name
            )
          )
        `)
        .eq('id', disputeId)
        .or(`complainant_id.eq.${user.id},defendant_id.eq.${user.id}`)
        .single();

      if (disputeError) throw disputeError;

      if (!disputeData) {
        Alert.alert('Error', 'Dispute not found or you do not have access to it');
        router.back();
        return;
      }

      // Get dispute messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('dispute_messages')
        .select(`
          id,
          sender_id,
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

      const formattedMessages: DisputeMessage[] = messagesData?.map(msg => ({
        id: msg.id,
        sender_id: msg.sender_id,
        message: msg.message,
        is_admin_message: msg.is_admin_message,
        created_at: msg.created_at,
        sender_name: msg.users?.name || 'Unknown',
        sender_type: msg.users?.user_type || 'unknown',
      })) || [];

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
        messages: formattedMessages,
      };

      setDispute(formattedDispute);
    } catch (error) {
      console.error('Error loading dispute details:', error);
      Alert.alert('Error', 'Failed to load dispute details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !dispute || !user) return;

    try {
      setSendingMessage(true);

      const { error } = await supabase
        .from('dispute_messages')
        .insert({
          dispute_id: dispute.id,
          sender_id: user.id,
          message: newMessage.trim(),
          is_admin_message: false,
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dispute details...</Text>
      </View>
    );
  }

  if (!dispute) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Dispute not found</Text>
      </View>
    );
  }

  const otherParty = dispute.complainant.id === user?.id ? dispute.defendant : dispute.complainant;
  const isComplainant = dispute.complainant.id === user?.id;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dispute Details</Text>
        <View style={styles.headerRight} />
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

          {/* Booking Details */}
          <View style={styles.bookingDetails}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            <View style={styles.bookingInfo}>
              <Ionicons name="location" size={16} color="#666" />
              <Text style={styles.bookingText}>{dispute.booking.venue_name}</Text>
            </View>
            <View style={styles.bookingInfo}>
              <Ionicons name="calendar" size={16} color="#666" />
              <Text style={styles.bookingText}>{formatDate(dispute.booking.booking_date)}</Text>
            </View>
            <View style={styles.bookingInfo}>
              <Ionicons name="time" size={16} color="#666" />
              <Text style={styles.bookingText}>
                {formatTime(dispute.booking.start_time)} - {formatTime(dispute.booking.end_time)}
              </Text>
            </View>
            <View style={styles.bookingInfo}>
              <Ionicons name="cash" size={16} color="#666" />
              <Text style={styles.bookingText}>Rs. {dispute.booking.total_amount}</Text>
            </View>
          </View>

          {/* Parties */}
          <View style={styles.partiesSection}>
            <Text style={styles.sectionTitle}>Dispute Parties</Text>
            <View style={styles.partyInfo}>
              <Text style={styles.partyLabel}>Complainant:</Text>
              <Text style={[styles.partyName, isComplainant && styles.currentUser]}>
                {dispute.complainant.name} {isComplainant && '(You)'}
              </Text>
            </View>
            <View style={styles.partyInfo}>
              <Text style={styles.partyLabel}>Defendant:</Text>
              <Text style={[styles.partyName, !isComplainant && styles.currentUser]}>
                {dispute.defendant.name} {!isComplainant && '(You)'}
              </Text>
            </View>
          </View>

          {/* Resolution */}
          {dispute.status === 'resolved' && dispute.resolution && (
            <View style={styles.resolutionSection}>
              <Text style={styles.sectionTitle}>Resolution</Text>
              <Text style={styles.resolutionText}>{dispute.resolution}</Text>
              <Text style={styles.resolutionDate}>
                Resolved on {formatDate(dispute.resolved_at || '')}
              </Text>
            </View>
          )}
        </View>

        {/* Messages */}
        <View style={styles.messagesSection}>
          <Text style={styles.sectionTitle}>Messages</Text>
          {dispute.messages.length === 0 ? (
            <Text style={styles.noMessagesText}>No messages yet</Text>
          ) : (
            dispute.messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageCard,
                  message.sender_id === user?.id && styles.ownMessage,
                  message.is_admin_message && styles.adminMessage,
                ]}
              >
                <View style={styles.messageHeader}>
                  <Text style={[
                    styles.messageSender,
                    message.is_admin_message && styles.adminSender,
                    message.sender_id === user?.id && styles.ownSender,
                  ]}>
                    {message.is_admin_message
                      ? 'Admin'
                      : message.sender_id === user?.id
                        ? 'You'
                        : message.sender_name}
                  </Text>
                  <Text style={styles.messageTime}>
                    {formatDateTime(message.created_at)}
                  </Text>
                </View>
                <Text style={[
                  styles.messageText,
                  message.is_admin_message && styles.adminMessageText,
                  message.sender_id === user?.id && styles.ownMessageText,
                ]}>
                  {message.message}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Message Input */}
      {dispute.status !== 'closed' && dispute.status !== 'resolved' && (
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sendingMessage}
          >
            <Ionicons
              name={sendingMessage ? "hourglass" : "send"}
              size={20}
              color={(!newMessage.trim() || sendingMessage) ? "#ccc" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
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
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
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
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  disputeInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
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
    marginBottom: 12,
  },
  disputeTitle: {
    fontSize: 18,
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
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  bookingDetails: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  partiesSection: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  partyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  partyLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  partyName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  currentUser: {
    color: '#228B22',
    fontWeight: '600',
  },
  resolutionSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  resolutionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  resolutionDate: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  messagesSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noMessagesText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  messageCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e0e0e0',
  },
  ownMessage: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#228B22',
  },
  adminMessage: {
    backgroundColor: '#fff3e0',
    borderLeftColor: '#FF9800',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  ownSender: {
    color: '#228B22',
  },
  adminSender: {
    color: '#FF9800',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#333',
  },
  adminMessageText: {
    color: '#333',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#228B22',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
});
