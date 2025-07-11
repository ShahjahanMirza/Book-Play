import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PlayerWelcomeHeader } from '../../../components/PlayerWelcomeHeader';
import { useFocusEffect } from '@react-navigation/native';
import { appEvents, EVENT_TYPES } from '@/utils/eventEmitter';

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  total_slots: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  venue: {
    id: string;
    name: string;
    location: string;
  };
  field?: {
    id: string;
    field_name: string;
    field_number: string;
  };
}

export default function BookingHistoryScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  // Refresh bookings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadBookings();
    }, [user])
  );

  // Listen for booking transfer events
  useEffect(() => {
    const handleBookingTransferred = (data: any) => {
      console.log('Booking transferred event received:', data);
      // Refresh bookings if this user is involved
      if (user && (data.fromPlayerId === user.id || data.toPlayerId === user.id)) {
        loadBookings();
      }
    };

    const handleOfferAccepted = () => {
      // Refresh bookings when any offer is accepted
      loadBookings();
    };

    appEvents.on(EVENT_TYPES.BOOKING_TRANSFERRED, handleBookingTransferred);
    appEvents.on(EVENT_TYPES.OFFER_ACCEPTED, handleOfferAccepted);

    return () => {
      appEvents.off(EVENT_TYPES.BOOKING_TRANSFERRED, handleBookingTransferred);
      appEvents.off(EVENT_TYPES.OFFER_ACCEPTED, handleOfferAccepted);
    };
  }, [user]);

  const loadBookings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          total_amount,
          total_slots,
          status,
          created_at,
          field_id,
          venues (
            id,
            name,
            location
          )
        `)
        .eq('player_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading bookings:', error);
        return;
      }

      // Get field information for bookings that have field_id
      const bookingsWithFields = await Promise.all((data || []).map(async (booking) => {
        let field = null;

        if (booking.field_id) {
          try {
            const { data: fieldData } = await supabase
              .from('venue_fields')
              .select('id, field_name, field_number')
              .eq('id', booking.field_id)
              .single();

            field = fieldData;
          } catch (fieldError) {
            console.error('Error loading field for booking:', booking.id, fieldError);
          }
        }

        return {
          id: booking.id,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          total_amount: booking.total_amount,
          total_slots: booking.total_slots,
          status: booking.status,
          created_at: booking.created_at,
          venue: {
            id: booking.venues.id,
            name: booking.venues.name,
            location: booking.venues.location,
          },
          field,
        };
      }));

      setBookings(bookingsWithFields);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const getFilteredBookings = () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    let filtered = bookings;

    // Filter by tab
    switch (activeTab) {
      case 'upcoming':
        filtered = bookings.filter(b => {
          const bookingDate = b.booking_date;
          const bookingEndDateTime = new Date(`${bookingDate}T${b.end_time}`);

          return bookingEndDateTime > now && (b.status === 'pending' || b.status === 'confirmed');
        });
        break;
      case 'past':
        filtered = bookings.filter(b => {
          const bookingDate = b.booking_date;
          const bookingEndDateTime = new Date(`${bookingDate}T${b.end_time}`);

          return bookingEndDateTime <= now || b.status === 'completed';
        }).map(b => {
          // Update status to completed for past bookings that are still marked as confirmed
          const bookingDate = b.booking_date;
          const bookingEndDateTime = new Date(`${bookingDate}T${b.end_time}`);

          if (bookingEndDateTime <= now && b.status === 'confirmed') {
            return { ...b, status: 'completed' };
          }
          return b;
        });
        break;
      case 'cancelled':
        filtered = bookings.filter(b => b.status === 'cancelled');
        break;
      default:
        filtered = bookings;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(b =>
        b.venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.venue.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.field?.field_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'confirmed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      case 'completed': return '#2196F3';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'confirmed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      case 'completed': return 'checkmark-done-circle';
      default: return 'help-circle';
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCancelBooking = async (bookingId: string, venueName: string) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking at ${venueName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('bookings')
                .update({
                  status: 'cancelled',
                  cancelled_at: new Date().toISOString(),
                  cancelled_by: user?.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', bookingId);

              if (error) {
                console.error('Error cancelling booking:', error);
                Alert.alert('Error', 'Failed to cancel booking');
                return;
              }

              Alert.alert('Success', 'Booking cancelled successfully');
              loadBookings(); // Refresh the list
            } catch (error) {
              console.error('Error cancelling booking:', error);
              Alert.alert('Error', 'Failed to cancel booking');
            }
          }
        }
      ]
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleAddReview = (booking: Booking) => {
    setSelectedBooking(booking);
    setRating(0);
    setReviewText('');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedBooking || !user || rating === 0) {
      Alert.alert('Error', 'Please provide a rating');
      return;
    }

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          booking_id: selectedBooking.id,
          player_id: user.id,
          venue_id: selectedBooking.venue.id,
          rating: rating,
          review_text: reviewText.trim() || null,
        });

      if (error) {
        console.error('Error submitting review:', error);
        Alert.alert('Error', 'Failed to submit review');
        return;
      }

      Alert.alert('Success', 'Thank you for your review!');
      setShowReviewModal(false);
      setSelectedBooking(null);
      setRating(0);
      setReviewText('');
      loadBookings(); // Refresh to update any review status
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const renderStars = (currentRating: number, onPress?: (rating: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => onPress && onPress(i)}
          disabled={!onPress}
        >
          <Ionicons
            name={i <= currentRating ? "star" : "star-outline"}
            size={24}
            color="#FFD700"
            style={{ marginHorizontal: 2 }}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#228B22" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  const filteredBookings = getFilteredBookings();

  return (
    <View style={styles.container}>
      {/* Header */}
      <PlayerWelcomeHeader
        title="My Bookings"
        subtitle="Track your venue reservations"
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

      {/* Search and Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by venue name, location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cancelled' && styles.activeTab]}
          onPress={() => setActiveTab('cancelled')}
        >
          <Text style={[styles.tabText, activeTab === 'cancelled' && styles.activeTabText]}>
            Cancelled
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings Content */}
      <View style={styles.content}>
        {filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons 
              name={activeTab === 'upcoming' ? "calendar-outline" : 
                   activeTab === 'past' ? "checkmark-circle-outline" : "close-circle-outline"} 
              size={64} 
              color="#ccc" 
            />
            <Text style={styles.emptyStateTitle}>
              {activeTab === 'upcoming' ? 'No Upcoming Bookings' : 
               activeTab === 'past' ? 'No Past Bookings' : 
               'No Cancelled Bookings'}
            </Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'upcoming' ? 'You don\'t have any upcoming bookings. Start exploring venues!' :
               activeTab === 'past' ? 'Your booking history will appear here.' :
               'No cancelled bookings found.'}
            </Text>
          </View>
        ) : (
          filteredBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.venueName}>{booking.venue.name}</Text>
                  {booking.field && (
                    <Text style={styles.fieldInfo}>
                      {booking.field.field_name || `Field ${booking.field.field_number}`}
                    </Text>
                  )}
                  <Text style={styles.venueLocation}>{booking.venue.location}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(booking.status) }
                ]}>
                  <Ionicons 
                    name={getStatusIcon(booking.status) as any} 
                    size={16} 
                    color="#fff" 
                  />
                  <Text style={styles.statusText}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.bookingDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {formatDate(booking.booking_date)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cash" size={16} color="#666" />
                  <Text style={styles.detailText}>
                    Rs. {booking.total_amount} ({booking.total_slots} slots)
                  </Text>
                </View>
              </View>

              {/* Cancel Button for Pending Bookings */}
              {booking.status === 'pending' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelBooking(booking.id, booking.venues.name)}
                >
                  <Ionicons name="close-circle" size={16} color="#fff" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}

              {/* Review Button for Completed Bookings */}
              {booking.status === 'completed' && (
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={() => handleAddReview(booking)}
                >
                  <Ionicons name="star" size={16} color="#fff" />
                  <Text style={styles.reviewButtonText}>Add Review</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Your Experience</Text>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <View style={styles.venueInfo}>
                <Text style={styles.venueName}>{selectedBooking.venue.name}</Text>
                <Text style={styles.venueLocation}>{selectedBooking.venue.location}</Text>
              </View>
            )}

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>How was your experience?</Text>
              <View style={styles.starsContainer}>
                {renderStars(rating, setRating)}
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewLabel}>Share your thoughts (optional)</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Tell others about your experience..."
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, rating === 0 && styles.disabledButton]}
                onPress={submitReview}
                disabled={rating === 0}
              >
                <Text style={styles.submitButtonText}>Submit Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flex: 1,
  },
  searchSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -20,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 15,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#228B22',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    marginTop: 15,
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
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
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  bookingInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  fieldInfo: {
    fontSize: 14,
    color: '#228B22',
    marginBottom: 4,
  },
  venueLocation: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  bookingDetails: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#228B22',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  reviewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  venueInfo: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ratingSection: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  reviewSection: {
    marginBottom: 20,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#228B22',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});
