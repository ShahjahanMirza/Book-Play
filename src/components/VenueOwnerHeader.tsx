// Custom header for venue owner screens with notifications and messages
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

// Import the notification, messaging, and announcement components
import { VenueOwnerNotifications } from './VenueOwnerNotifications';
import VenueOwnerMessagingScreen from '../screens/venue-owner/VenueOwnerMessagingScreen';
import { VenueAnnouncementManagement } from '../screens/venue-owner/VenueAnnouncementManagement';

interface VenueOwnerHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

export const VenueOwnerHeader: React.FC<VenueOwnerHeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
}) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

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

    loadUnreadCounts();

    // Set up real-time subscriptions for unread counts
    const notificationsSubscription = supabase
      .channel(`venue-owner-notifications-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setTimeout(loadUnreadCounts, 100)
      )
      .subscribe();

    const messagesSubscription = supabase
      .channel(`venue-owner-messages-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
        () => setTimeout(loadUnreadCounts, 100)
      )
      .subscribe();

    return () => {
      notificationsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  }, [user?.id, loadUnreadCounts]);

  const loadUnreadCounts = async () => {
    if (!user) return;

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
  };

  const handleNotificationsPress = () => {
    setShowNotifications(true);
  };

  const handleMessagesPress = () => {
    setShowMessages(true);
  };

  const handleAnnouncementsPress = () => {
    setShowAnnouncements(true);
  };

  const closeNotifications = () => {
    setShowNotifications(false);
    loadUnreadCounts(); // Refresh counts after viewing
  };

  const closeMessages = () => {
    setShowMessages(false);
    loadUnreadCounts(); // Refresh counts after viewing
  };

  const closeAnnouncements = () => {
    setShowAnnouncements(false);
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#90EE90" />
        <View style={styles.header}>
          <View style={styles.leftSection}>
            {showBackButton && (
              <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
            )}
            <Text style={styles.title}>{title}</Text>
          </View>
          
          <View style={styles.rightSection}>
            {/* Announcements Icon */}
            <TouchableOpacity onPress={handleAnnouncementsPress} style={styles.iconButton}>
              <Ionicons name="megaphone-outline" size={24} color="#333" />
            </TouchableOpacity>

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
        </View>
      </SafeAreaView>

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

      {/* Announcements Modal */}
      <Modal
        visible={showAnnouncements}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAnnouncements}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Announcements</Text>
            <TouchableOpacity onPress={closeAnnouncements} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <VenueAnnouncementManagement />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#90EE90',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#90EE90',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
