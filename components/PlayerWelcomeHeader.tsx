// Welcome header component for player screens with notification/message icons
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/services/supabase';
import { PlayerNotifications } from './PlayerNotifications';
import ConversationsScreen from '../src/screens/messaging/ConversationsScreen';
import { COLORS } from '../src/utils/constants';

interface PlayerWelcomeHeaderProps {
  title: string;
  subtitle: string;
}

export const PlayerWelcomeHeader: React.FC<PlayerWelcomeHeaderProps> = ({
  title,
  subtitle,
}) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadCounts();
      // Set up real-time subscriptions for unread counts
      const notificationsSubscription = supabase
        .channel('notifications-count')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => loadUnreadCounts()
        )
        .subscribe();

      const messagesSubscription = supabase
        .channel('messages-count')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
          () => loadUnreadCounts()
        )
        .subscribe();

      return () => {
        notificationsSubscription.unsubscribe();
        messagesSubscription.unsubscribe();
      };
    }
  }, [user]);

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

  const closeNotifications = () => {
    setShowNotifications(false);
    loadUnreadCounts(); // Refresh counts after viewing
  };

  const closeMessages = () => {
    setShowMessages(false);
    loadUnreadCounts(); // Refresh counts after viewing
  };

  return (
    <>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.textSection}>
            <Text style={styles.welcomeText}>{title}</Text>
            <Text style={styles.subText}>{subtitle}</Text>
          </View>
          
          <View style={styles.iconsSection}>
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
          <PlayerNotifications />
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
          <ConversationsScreen />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.lightGreen,
    paddingHorizontal: 20,
    paddingVertical: 30,
    paddingTop: 50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subText: {
    fontSize: 16,
    color: '#666',
  },
  iconsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
});
