import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { MessagingService, Conversation } from '../../services/messagingService';

export default function VenueOwnerMessagingScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'booking' | 'general'>('all');

  useEffect(() => {
    if (user) {
      loadConversations();
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
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };



  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push(`/chat?partnerId=${conversation.participant_id}&partnerName=${encodeURIComponent(conversation.participant_name)}`);
  };

  const getFilteredConversations = () => {
    if (activeTab === 'all') {
      return conversations;
    }
    return conversations.filter(conv => conv.context_type === activeTab);
  };

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getContextIcon = (contextType?: string) => {
    switch (contextType) {
      case 'booking':
        return 'calendar';
      case 'forum':
        return 'people';
      default:
        return 'chatbubble';
    }
  };

  const getContextColor = (contextType?: string) => {
    switch (contextType) {
      case 'booking':
        return '#4CAF50';
      case 'forum':
        return '#FF9800';
      default:
        return '#007AFF';
    }
  };

  const filteredConversations = getFilteredConversations();

  return (
    <View style={styles.container}>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        {(['all', 'booking', 'general'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'all' ? 'All' : tab === 'booking' ? 'Bookings' : 'General'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conversations List */}
      <ScrollView
        style={styles.conversationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Messages Yet</Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'all' 
                ? 'You haven\'t started any conversations yet. Players will be able to contact you about bookings and venue inquiries.'
                : `No ${activeTab} conversations found.`}
            </Text>
            
            <View style={styles.quickStartActions}>
              <TouchableOpacity
                style={styles.quickStartButton}
                onPress={() => router.push('/(venue-owner-tabs)/bookings')}
              >
                <Ionicons name="calendar" size={20} color="#228B22" />
                <Text style={styles.quickStartButtonText}>View Bookings</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          filteredConversations.map((conversation) => (
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
                    <Ionicons name="person" size={24} color="#666" />
                  </View>
                )}
                
                {/* Context indicator */}
                <View style={[
                  styles.contextIndicator,
                  { backgroundColor: getContextColor(conversation.context_type) }
                ]}>
                  <Ionicons 
                    name={getContextIcon(conversation.context_type) as any} 
                    size={12} 
                    color="#fff" 
                  />
                </View>
              </View>

              <View style={styles.conversationInfo}>
                <View style={styles.conversationHeader}>
                  <Text style={styles.participantName}>
                    {conversation.participant_name}
                  </Text>
                  <Text style={styles.lastMessageTime}>
                    {formatLastMessageTime(conversation.last_message_time)}
                  </Text>
                </View>
                
                <Text style={styles.lastMessage} numberOfLines={2}>
                  {conversation.last_message}
                </Text>
                
                <View style={styles.conversationMeta}>
                  <Text style={styles.contextLabel}>
                    {conversation.context_type === 'booking' ? 'Booking' : 
                     conversation.context_type === 'forum' ? 'Forum' : 'General'}
                  </Text>
                  {conversation.unread_count > 0 && (
                    <View style={styles.unreadIndicator}>
                      <Text style={styles.unreadCount}>
                        {conversation.unread_count}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 15,
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
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  conversationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
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
    marginBottom: 20,
  },
  quickStartActions: {
    flexDirection: 'row',
    gap: 15,
  },
  quickStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  quickStartButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
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
  contextIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
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
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  lastMessageTime: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 6,
  },
  conversationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  unreadIndicator: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
