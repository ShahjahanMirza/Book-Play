// Header icons for notifications and messages
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { VenueOwnerNotifications } from './VenueOwnerNotifications';
import VenueOwnerMessagingScreen from '../screens/venue-owner/VenueOwnerMessagingScreen';

export const HeaderIcons: React.FC = () => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const subscriptionsRef = useRef<any[]>([]);

  // Memoize the loadUnreadCounts function to prevent infinite loops
  const loadUnreadCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Load unread notifications count
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      // Load unread messages count
      const { count: msgCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      setUnreadNotifications(notifCount || 0);
      setUnreadMessages(msgCount || 0);
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    // Load initial counts
    loadUnreadCounts();

    // Clean up previous subscriptions
    subscriptionsRef.current.forEach(sub => sub?.unsubscribe?.());
    subscriptionsRef.current = [];

    // Set up real-time subscriptions for unread counts
    const notificationsSubscription = supabase
      .channel(`notifications-count-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          // Use a timeout to debounce rapid updates
          setTimeout(loadUnreadCounts, 100);
        }
      )
      .subscribe();

    const messagesSubscription = supabase
      .channel(`messages-count-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => {
          // Use a timeout to debounce rapid updates
          setTimeout(loadUnreadCounts, 100);
        }
      )
      .subscribe();

    subscriptionsRef.current = [notificationsSubscription, messagesSubscription];

    return () => {
      subscriptionsRef.current.forEach(sub => sub?.unsubscribe?.());
      subscriptionsRef.current = [];
    };
  }, [user?.id, loadUnreadCounts]);

  const handleNotificationsPress = () => {
    setShowNotifications(true);
  };

  const handleMessagesPress = () => {
    setShowMessages(true);
  };

  const closeNotifications = useCallback(() => {
    setShowNotifications(false);
    // Refresh counts after a short delay to avoid rapid updates
    setTimeout(loadUnreadCounts, 200);
  }, [loadUnreadCounts]);

  const closeMessages = useCallback(() => {
    setShowMessages(false);
    // Refresh counts after a short delay to avoid rapid updates
    setTimeout(loadUnreadCounts, 200);
  }, [loadUnreadCounts]);

  return (
    <>
      <View style={styles.container}>
        {/* Messages Icon */}
        <TouchableOpacity onPress={handleMessagesPress} style={styles.iconButton}>
          <Ionicons name="chatbubbles-outline" size={24} color="#333" />
          {unreadMessages > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadMessages > 99 ? '99+' : unreadMessages.toString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Notifications Icon */}
        <TouchableOpacity onPress={handleNotificationsPress} style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
          {unreadNotifications > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadNotifications > 99 ? '99+' : unreadNotifications.toString()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications Modal */}
      <Modal
        visible={showNotifications}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeNotifications}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity onPress={closeNotifications} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <VenueOwnerNotifications />
        </SafeAreaView>
      </Modal>

      {/* Messages Modal */}
      <Modal
        visible={showMessages}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeMessages}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Messages</Text>
            <TouchableOpacity onPress={closeMessages} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <VenueOwnerMessagingScreen />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  iconButton: {
    marginLeft: 15,
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#90EE90',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
});
