// Create forum post screen for finding players to join games
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';
import { ForumService, CreateForumPostData } from '../../services/forumService';

interface ConfirmedBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  venue: {
    id: string;
    name: string;
    location: string;
  };
  field?: {
    id: string;
    field_name: string;
  };
}

export default function CreateForumPostScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // Only booking-based creation allowed
  const [confirmedBookings, setConfirmedBookings] = useState<ConfirmedBooking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<string>('');

  // Common
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadConfirmedBookings();
    }
  }, [user]);

  const loadConfirmedBookings = async () => {
    try {
      setLoading(true);

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          total_amount,
          venues (
            id,
            name,
            location
          ),
          venue_fields (
            id,
            field_name
          )
        `)
        .eq('player_id', user?.id)
        .eq('status', 'confirmed')
        .gte('booking_date', new Date().toISOString().split('T')[0])
        .order('booking_date', { ascending: true });

      if (error) {
        console.error('Error loading bookings:', error);
        throw error;
      }

      // Filter out bookings that already have forum posts
      const bookingsWithoutPosts = [];
      for (const booking of bookings || []) {
        const { data: existingPost } = await supabase
          .from('forum_posts')
          .select('id')
          .eq('venue_id', booking.venues.id)
          .eq('game_date', booking.booking_date)
          .eq('start_time', booking.start_time)
          .eq('player_id', user?.id)
          .single();

        if (!existingPost) {
          bookingsWithoutPosts.push({
            id: booking.id,
            booking_date: booking.booking_date,
            start_time: booking.start_time,
            end_time: booking.end_time,
            total_amount: booking.total_amount,
            venue: {
              id: booking.venues.id,
              name: booking.venues.name,
              location: booking.venues.location,
            },
            field: booking.venue_fields ? {
              id: booking.venue_fields.id,
              field_name: booking.venue_fields.field_name,
            } : undefined,
          });
        }
      }

      setConfirmedBookings(bookingsWithoutPosts);
    } catch (error) {
      console.error('Error loading confirmed bookings:', error);
      Alert.alert('Error', 'Failed to load your confirmed bookings');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!selectedBooking) {
      Alert.alert('Error', 'Please select a booking');
      return false;
    }

    if (!note.trim()) {
      Alert.alert('Error', 'Please add a note about your game');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    try {
      setSubmitting(true);

      // Create from confirmed booking
      const booking = confirmedBookings.find(b => b.id === selectedBooking);
      if (!booking) {
        Alert.alert('Error', 'Selected booking not found');
        return;
      }

      const postData: CreateForumPostData = {
        venue_id: booking.venue.id,
        field_id: booking.field?.id,
        venue_name: booking.venue.name,
        venue_location: booking.venue.location,
        field_name: booking.field?.field_name,
        game_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        note: note.trim(),
      };

      await ForumService.createForumPost(user.id, postData);

      Alert.alert(
        'Success!',
        'Your forum post has been created. Other players can now offer to join your game!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      console.error('Error creating forum post:', error);
      Alert.alert('Error', error.message || 'Failed to create forum post');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeString = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateString = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#228B22" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Your Game</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {confirmedBookings.length === 0 ? (
          /* No confirmed bookings - show empty state */
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Confirmed Bookings</Text>
            <Text style={styles.emptyText}>
              You need confirmed bookings to create forum posts. Book a venue first to share your game with other players.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/(player-tabs)/browse')}
            >
              <Text style={styles.browseButtonText}>Browse Venues</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Show confirmed bookings */
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Your Confirmed Booking</Text>
              <Text style={styles.sectionSubtitle}>
                Choose which booking you want to share with other players
              </Text>

              {confirmedBookings.map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  style={[
                    styles.bookingCard,
                    selectedBooking === booking.id && styles.selectedBookingCard
                  ]}
                  onPress={() => setSelectedBooking(booking.id)}
                >
                  <View style={styles.bookingHeader}>
                    <Text style={styles.venueName}>{booking.venue.name}</Text>
                    <View style={[
                      styles.selectionIndicator,
                      selectedBooking === booking.id && styles.selectedIndicator
                    ]}>
                      {selectedBooking === booking.id && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                  </View>

                  <Text style={styles.venueLocation}>{booking.venue.location}</Text>

                  <View style={styles.bookingDetails}>
                    <Text style={styles.bookingDate}>
                      {formatDateString(booking.booking_date)}
                    </Text>
                    <Text style={styles.bookingTime}>
                      {formatTimeString(booking.start_time)} - {formatTimeString(booking.end_time)}
                    </Text>
                  </View>

                  {booking.field && (
                    <Text style={styles.fieldInfo}>
                      Field: {booking.field.field_name}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Tell other players about your game, skill level, what you're looking for..."
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Create Post</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  venueList: {
    flexDirection: 'row',
  },
  venueCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#eee',
    minWidth: 150,
  },
  selectedVenueCard: {
    borderColor: '#228B22',
    backgroundColor: '#E8F5E8',
  },
  venueName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  selectedVenueName: {
    color: '#228B22',
  },
  venueLocation: {
    fontSize: 12,
    color: '#666',
  },
  selectedVenueLocation: {
    color: '#228B22',
  },
  fieldList: {
    flexDirection: 'row',
  },
  fieldCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#eee',
  },
  selectedFieldCard: {
    borderColor: '#228B22',
    backgroundColor: '#E8F5E8',
  },
  fieldName: {
    fontSize: 14,
    color: '#333',
  },
  selectedFieldName: {
    color: '#228B22',
    fontWeight: 'bold',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateTimeText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeButton: {
    flex: 0.48,
  },
  noteInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
    fontSize: 16,
    minHeight: 100,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#228B22',
    borderRadius: 10,
    padding: 15,
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#228B22',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  selectedBookingCard: {
    borderColor: '#228B22',
    backgroundColor: '#f8fff8',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    backgroundColor: '#228B22',
    borderColor: '#228B22',
  },
  bookingDetails: {
    marginTop: 8,
  },
  bookingDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  bookingTime: {
    fontSize: 14,
    color: '#666',
  },
  fieldInfo: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
