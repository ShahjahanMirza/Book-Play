// Conversations list screen for messaging
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { PlayerWelcomeHeader } from '../../../components/PlayerWelcomeHeader';
import { useRouter } from 'expo-router';
import { MessagingService, Conversation } from '../../services/messagingService';

export default function ConversationsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadConversations();
      loadUnreadCount();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const conversationsList = await MessagingService.getConversations(user.id);
      setConversations(conversationsList);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!user) return;

    try {
      const count = await MessagingService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    await loadUnreadCount();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push(`/chat?partnerId=${conversation.participant_id}&partnerName=${encodeURIComponent(conversation.participant_name)}`);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'venue_owner':
        return 'business';
      case 'admin':
        return 'shield-checkmark';
      default:
        return 'person';
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'venue_owner':
        return '#FF9800';
      case 'admin':
        return '#F44336';
      default:
        return '#228B22';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#228B22" />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <PlayerWelcomeHeader
        title="Messages"
        subtitle={unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

      {/* Conversations List */}
      <View style={styles.content}>
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Messages Yet</Text>
            <Text style={styles.emptyStateText}>
              Start conversations with venue owners to ask questions about their facilities, 
              or connect with other players to organize games.
            </Text>
            
            <View style={styles.quickStartActions}>
              <TouchableOpacity 
                style={styles.quickStartButton}
                onPress={() => router.push('/(player-tabs)/browse')}
              >
                <Ionicons name="search" size={20} color="#228B22" />
                <Text style={styles.quickStartButtonText}>Find Venues</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickStartButton}
                onPress={() => router.push('/(player-tabs)/forum')}
              >
                <Ionicons name="people" size={20} color="#228B22" />
                <Text style={styles.quickStartButtonText}>Join Forum</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={styles.conversationCard}
              onPress={() => handleConversationPress(conversation)}
            >
              <View style={styles.avatarContainer}>
                {conversation.participant_image ? (
                  <Image 
                    source={{ uri: conversation.participant_image }} 
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.defaultAvatar}>
                    <Ionicons 
                      name={getUserTypeIcon(conversation.participant_type)} 
                      size={24} 
                      color="#666" 
                    />
                  </View>
                )}
                <View style={[
                  styles.userTypeBadge,
                  { backgroundColor: getUserTypeColor(conversation.participant_type) }
                ]}>
                  <Ionicons 
                    name={getUserTypeIcon(conversation.participant_type)} 
                    size={10} 
                    color="#fff" 
                  />
                </View>
              </View>

              <View style={styles.conversationInfo}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.participantName}>{conversation.participant_name}</Text>
                  <Text style={styles.messageTime}>
                    {formatTime(conversation.last_message_time)}
                  </Text>
                </View>
                
                <View style={styles.messagePreview}>
                  <Text 
                    style={[
                      styles.lastMessage,
                      conversation.unread_count > 0 && styles.unreadMessage
                    ]}
                    numberOfLines={1}
                  >
                    {conversation.last_message}
                  </Text>
                  {conversation.unread_count > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>
                        {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                      </Text>
                    </View>
                  )}
                </View>

                {conversation.context_type && conversation.context_type !== 'general' && (
                  <View style={styles.contextBadge}>
                    <Ionicons 
                      name={conversation.context_type === 'booking' ? 'calendar' : 'chatbubbles'} 
                      size={12} 
                      color="#666" 
                    />
                    <Text style={styles.contextText}>
                      {conversation.context_type === 'booking' ? 'Booking' : 'Forum'}
                    </Text>
                  </View>
                )}
              </View>

              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))
        )}
      </View>
      </ScrollView>
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

  content: {
    marginTop: -20,
    paddingHorizontal: 15,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  quickStartActions: {
    flexDirection: 'row',
    gap: 15,
  },
  quickStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  quickStartButtonText: {
    color: '#228B22',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  defaultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#228B22',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  contextText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
});
