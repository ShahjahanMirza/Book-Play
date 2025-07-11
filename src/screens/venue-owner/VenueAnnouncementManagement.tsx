import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { VenueOwnerHeader } from '../../components/VenueOwnerHeader';
import { COLORS } from '../../utils/constants';
import { NotificationService } from '../../services/notificationService';

interface Announcement {
  id: string;
  venue_id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  venues: {
    name: string;
  };
}

interface Venue {
  id: string;
  name: string;
}

export const VenueAnnouncementManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    venue_id: '',
    title: '',
    content: '',
    is_active: true,
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    await Promise.all([loadAnnouncements(), loadVenues()]);
  };

  const loadAnnouncements = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get all venues owned by this user first
      const { data: venueData, error: venueError } = await supabase
        .from('venues')
        .select('id')
        .eq('owner_id', user.id);

      if (venueError) {
        console.error('Error loading venues:', venueError);
        return;
      }

      if (!venueData || venueData.length === 0) {
        setAnnouncements([]);
        return;
      }

      const venueIds = venueData.map(v => v.id);

      // Load announcements for all venues
      const { data, error } = await supabase
        .from('venue_announcements')
        .select(`
          *,
          venues (
            name
          )
        `)
        .in('venue_id', venueIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading announcements:', error);
        Alert.alert('Error', 'Failed to load announcements');
        return;
      }

      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
      Alert.alert('Error', 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const loadVenues = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('venues')
        .select('id, name')
        .eq('owner_id', user.id)
        .eq('approval_status', 'approved')
        .order('name');

      if (error) {
        console.error('Error loading venues:', error);
        return;
      }

      setVenues(data || []);
      if (data && data.length > 0 && !formData.venue_id) {
        setFormData(prev => ({ ...prev, venue_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error loading venues:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const sendAnnouncementNotifications = async (venueId: string, title: string, content: string) => {
    try {
      // Get venue name
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('name')
        .eq('id', venueId)
        .single();

      if (venueError || !venue) {
        console.error('Error fetching venue:', venueError);
        return;
      }

      // Get all players with confirmed bookings at this venue (current and future)
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          player_id,
          users!bookings_player_id_fkey (
            id,
            name
          )
        `)
        .eq('venue_id', venueId)
        .eq('status', 'confirmed')
        .gte('booking_date', new Date().toISOString().split('T')[0]);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        return;
      }

      // Get unique player IDs
      const uniquePlayerIds = [...new Set(bookings?.map(b => b.player_id) || [])];

      // Send notifications to each player
      for (const playerId of uniquePlayerIds) {
        await NotificationService.createNotification(
          playerId,
          `New Announcement from ${venue.name}`,
          `${title}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
          'venue',
          'venue',
          venueId
        );
      }

      console.log(`Sent announcement notifications to ${uniquePlayerIds.length} players`);
    } catch (error) {
      console.error('Error sending announcement notifications:', error);
      // Don't throw error - announcement was created successfully
    }
  };

  const handleCreateAnnouncement = () => {
    if (venues.length === 0) {
      Alert.alert('No Venues', 'You need to have at least one approved venue to create announcements.');
      return;
    }
    
    setFormData({
      venue_id: venues[0]?.id || '',
      title: '',
      content: '',
      is_active: true,
    });
    setEditingAnnouncement(null);
    setShowCreateModal(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setFormData({
      venue_id: announcement.venue_id,
      title: announcement.title,
      content: announcement.content,
      is_active: announcement.is_active,
    });
    setEditingAnnouncement(announcement);
    setShowCreateModal(true);
  };

  const handleSaveAnnouncement = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      if (editingAnnouncement) {
        // Update existing announcement
        const { error } = await supabase
          .from('venue_announcements')
          .update({
            title: formData.title.trim(),
            content: formData.content.trim(),
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAnnouncement.id);

        if (error) {
          console.error('Error updating announcement:', error);
          Alert.alert('Error', 'Failed to update announcement');
          return;
        }

        Alert.alert('Success', 'Announcement updated successfully');
      } else {
        // Create new announcement
        const { data: newAnnouncement, error } = await supabase
          .from('venue_announcements')
          .insert({
            venue_id: formData.venue_id,
            title: formData.title.trim(),
            content: formData.content.trim(),
            is_active: formData.is_active,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating announcement:', error);
          Alert.alert('Error', 'Failed to create announcement');
          return;
        }

        // Send notifications to players with bookings at this venue
        if (formData.is_active && newAnnouncement) {
          await sendAnnouncementNotifications(formData.venue_id, formData.title.trim(), formData.content.trim());
        }

        Alert.alert('Success', 'Announcement created successfully');
      }

      setShowCreateModal(false);
      await loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      Alert.alert('Error', 'Failed to save announcement');
    }
  };

  const handleDeleteAnnouncement = (announcement: Announcement) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('venue_announcements')
                .delete()
                .eq('id', announcement.id);

              if (error) {
                console.error('Error deleting announcement:', error);
                Alert.alert('Error', 'Failed to delete announcement');
                return;
              }

              Alert.alert('Success', 'Announcement deleted successfully');
              await loadAnnouncements();
            } catch (error) {
              console.error('Error deleting announcement:', error);
              Alert.alert('Error', 'Failed to delete announcement');
            }
          },
        },
      ]
    );
  };

  const toggleAnnouncementStatus = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('venue_announcements')
        .update({
          is_active: !announcement.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', announcement.id);

      if (error) {
        console.error('Error updating announcement status:', error);
        Alert.alert('Error', 'Failed to update announcement status');
        return;
      }

      await loadAnnouncements();
    } catch (error) {
      console.error('Error updating announcement status:', error);
      Alert.alert('Error', 'Failed to update announcement status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading announcements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VenueOwnerHeader title="Venue Announcements" />

      {/* Add Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateAnnouncement}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Create Announcement</Text>
        </TouchableOpacity>
      </View>

      {/* Announcements List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Announcements</Text>
            <Text style={styles.emptyStateText}>
              Create your first announcement to communicate with your customers
            </Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={handleCreateAnnouncement}
            >
              <Text style={styles.createFirstButtonText}>Create Announcement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          announcements.map((announcement) => (
            <View key={announcement.id} style={styles.announcementCard}>
              <View style={styles.announcementHeader}>
                <View style={styles.announcementInfo}>
                  <Text style={styles.announcementTitle}>{announcement.title}</Text>
                  <Text style={styles.venueInfo}>
                    {announcement.venues.name} • {formatDate(announcement.created_at)}
                  </Text>
                </View>
                <View style={styles.announcementActions}>
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      announcement.is_active ? styles.activeStatus : styles.inactiveStatus
                    ]}
                    onPress={() => toggleAnnouncementStatus(announcement)}
                  >
                    <Text style={styles.statusButtonText}>
                      {announcement.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.announcementContent} numberOfLines={3}>
                {announcement.content}
              </Text>

              <View style={styles.announcementFooter}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditAnnouncement(announcement)}
                >
                  <Ionicons name="pencil" size={16} color={COLORS.primary} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteAnnouncement(announcement)}
                >
                  <Ionicons name="trash" size={16} color="#FF3B30" />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCreateModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
            </Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveAnnouncement}
            >
              <Text style={styles.modalSaveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Venue Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Venue *</Text>
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    // For now, we'll use a simple alert to show venue options
                    // In a real app, you might want to use a proper picker component
                    Alert.alert(
                      'Select Venue',
                      'Choose a venue for this announcement',
                      venues.map(venue => ({
                        text: venue.name,
                        onPress: () => setFormData(prev => ({ ...prev, venue_id: venue.id }))
                      })).concat([{ text: 'Cancel', style: 'cancel' }])
                    );
                  }}
                >
                  <Text style={styles.pickerButtonText}>
                    {venues.find(v => v.id === formData.venue_id)?.name || 'Select Venue'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.title}
                onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
                placeholder="Enter announcement title"
                maxLength={255}
              />
            </View>

            {/* Content */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Content *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.content}
                onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
                placeholder="Enter announcement content"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            {/* Status Toggle */}
            <View style={styles.formGroup}>
              <View style={styles.toggleRow}>
                <Text style={styles.formLabel}>Active</Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    formData.is_active ? styles.toggleActive : styles.toggleInactive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, is_active: !prev.is_active }))}
                >
                  <View style={[
                    styles.toggleThumb,
                    formData.is_active ? styles.toggleThumbActive : styles.toggleThumbInactive
                  ]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.formHint}>
                Active announcements will be visible to venue viewers and players with bookings
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  createFirstButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  announcementCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  announcementInfo: {
    flex: 1,
    marginRight: 12,
  },
  announcementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  venueInfo: {
    fontSize: 14,
    color: '#666',
  },
  announcementActions: {
    alignItems: 'flex-end',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeStatus: {
    backgroundColor: '#E8F5E8',
  },
  inactiveStatus: {
    backgroundColor: '#FFF3E0',
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  announcementContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 16,
  },
  announcementFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    backgroundColor: '#FFE5E5',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: 4,
  },
  deleteButtonText: {
    color: '#FF3B30',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSaveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleInactive: {
    backgroundColor: '#ccc',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleThumbInactive: {
    alignSelf: 'flex-start',
  },
  formHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
