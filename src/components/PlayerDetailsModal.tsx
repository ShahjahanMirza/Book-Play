import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { PlayerContactButton } from './PlayerContactButton';

interface PlayerDetails {
  id: string;
  name: string;
  email: string;
  phone_number?: string;
  profile_image_url?: string;
  created_at: string;
  total_bookings?: number;
  completed_bookings?: number;
  cancelled_bookings?: number;
  average_rating?: number;
  last_booking_date?: string;
}

interface PlayerDetailsModalProps {
  visible: boolean;
  playerId: string;
  onClose: () => void;
  onContactPlayer?: () => void;
  bookingContext?: {
    bookingId: string;
    venueName: string;
    bookingDate: string;
  };
}

export const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  visible,
  playerId,
  onClose,
  onContactPlayer,
  bookingContext,
}) => {
  const [player, setPlayer] = useState<PlayerDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && playerId) {
      loadPlayerDetails();
    }
  }, [visible, playerId]);

  const loadPlayerDetails = async () => {
    try {
      setLoading(true);

      // Get player basic information
      const { data: playerData, error: playerError } = await supabase
        .from('users')
        .select('id, name, email, phone_number, profile_image_url, created_at')
        .eq('id', playerId)
        .single();

      if (playerError) {
        console.error('Error loading player:', playerError);
        Alert.alert('Error', 'Failed to load player details');
        return;
      }

      // Get booking statistics
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, booking_date, created_at')
        .eq('player_id', playerId);

      if (bookingsError) {
        console.error('Error loading booking stats:', bookingsError);
      }

      const bookingStats = bookings || [];
      const totalBookings = bookingStats.length;
      const completedBookings = bookingStats.filter(b => b.status === 'completed').length;
      const cancelledBookings = bookingStats.filter(b => b.status === 'cancelled').length;
      const lastBookingDate = bookingStats.length > 0 
        ? bookingStats.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].booking_date
        : undefined;

      // Get average rating (if reviews exist)
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('player_id', playerId);

      let averageRating = undefined;
      if (!reviewsError && reviews && reviews.length > 0) {
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        averageRating = totalRating / reviews.length;
      }

      setPlayer({
        ...playerData,
        total_bookings: totalBookings,
        completed_bookings: completedBookings,
        cancelled_bookings: cancelledBookings,
        average_rating: averageRating,
        last_booking_date: lastBookingDate,
      });
    } catch (error) {
      console.error('Error loading player details:', error);
      Alert.alert('Error', 'Failed to load player details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlayerReliability = () => {
    if (!player || !player.total_bookings || player.total_bookings === 0) {
      return { label: 'New Player', color: '#999', icon: 'person-add' };
    }

    const completionRate = (player.completed_bookings || 0) / player.total_bookings;
    const cancellationRate = (player.cancelled_bookings || 0) / player.total_bookings;

    if (completionRate >= 0.9 && cancellationRate <= 0.1) {
      return { label: 'Excellent', color: '#4CAF50', icon: 'star' };
    } else if (completionRate >= 0.7 && cancellationRate <= 0.2) {
      return { label: 'Good', color: '#8BC34A', icon: 'thumbs-up' };
    } else if (completionRate >= 0.5 && cancellationRate <= 0.3) {
      return { label: 'Average', color: '#FF9800', icon: 'remove-circle' };
    } else {
      return { label: 'Poor', color: '#F44336', icon: 'warning' };
    }
  };

  const reliability = getPlayerReliability();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Player Details</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading player details...</Text>
          </View>
        ) : player ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Player Profile */}
            <View style={styles.profileSection}>
              <View style={styles.profileImageContainer}>
                {player.profile_image_url ? (
                  <Image
                    source={{ uri: player.profile_image_url }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.defaultProfileImage}>
                    <Ionicons name="person" size={40} color="#666" />
                  </View>
                )}
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.playerName}>{player.name}</Text>
                <Text style={styles.playerEmail}>{player.email}</Text>
                {player.phone_number && (
                  <Text style={styles.playerPhone}>{player.phone_number}</Text>
                )}
                <Text style={styles.memberSince}>
                  Member since {formatDate(player.created_at)}
                </Text>
              </View>
            </View>

            {/* Reliability Score */}
            <View style={styles.reliabilitySection}>
              <Text style={styles.sectionTitle}>Player Reliability</Text>
              <View style={styles.reliabilityCard}>
                <Ionicons
                  name={reliability.icon as any}
                  size={24}
                  color={reliability.color}
                />
                <Text style={[styles.reliabilityLabel, { color: reliability.color }]}>
                  {reliability.label}
                </Text>
              </View>
            </View>

            {/* Booking Statistics */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Booking History</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{player.total_bookings || 0}</Text>
                  <Text style={styles.statLabel}>Total Bookings</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{player.completed_bookings || 0}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statNumber}>{player.cancelled_bookings || 0}</Text>
                  <Text style={styles.statLabel}>Cancelled</Text>
                </View>
                
                {player.average_rating && (
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{player.average_rating.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Avg Rating</Text>
                  </View>
                )}
              </View>

              {player.last_booking_date && (
                <View style={styles.lastBookingInfo}>
                  <Ionicons name="calendar" size={16} color="#666" />
                  <Text style={styles.lastBookingText}>
                    Last booking: {formatDate(player.last_booking_date)}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionSection}>
              <PlayerContactButton
                playerId={playerId}
                playerName={player.name}
                bookingId={bookingContext?.bookingId}
                venueName={bookingContext?.venueName}
                bookingDate={bookingContext?.bookingDate}
                size="large"
                variant="primary"
                onPress={onContactPlayer}
              />
            </View>
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#F44336" />
            <Text style={styles.errorText}>Failed to load player details</Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  defaultProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  playerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  playerPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  memberSince: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  reliabilitySection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  reliabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  reliabilityLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statsSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  lastBookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  lastBookingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actionSection: {
    marginBottom: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    marginTop: 10,
  },
});
