// Player profile screen for viewing and managing player information
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { PlayerWelcomeHeader } from '../../../components/PlayerWelcomeHeader';
import { PlayerStatsService, PlayerStats } from '../../services/playerStats';
import { router } from 'expo-router';

interface PlayerProfileProps {
  onNavigateToEdit?: () => void;
}

export const PlayerProfile: React.FC<PlayerProfileProps> = ({
  onNavigateToEdit,
}) => {
  const { user, signOut, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPlayerStats();
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      await loadPlayerStats();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const loadPlayerStats = async () => {
    if (!user) return;

    try {
      setStatsLoading(true);
      const stats = await PlayerStatsService.getPlayerStats(user.id);
      setPlayerStats(stats);
    } catch (error) {
      console.error('Error loading player stats:', error);
      // Set default stats on error
      setPlayerStats({
        totalBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        totalSpent: 0,
        averageBookingValue: 0,
        favoriteVenues: [],
        monthlyStats: [],
        recentActivity: [],
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No user data available</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {user.profile_image_url ? (
            <Image 
              source={{ uri: user.profile_image_url }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.defaultProfileImage}>
              <Ionicons name="person" size={60} color="#666" />
            </View>
          )}
          <TouchableOpacity 
            style={styles.editImageButton}
            onPress={onNavigateToEdit}
          >
            <Ionicons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userType}>Player</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* Profile Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="call" size={20} color="#228B22" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{user.phone_number}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={20} color="#228B22" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{user.age} years old</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location" size={20} color="#228B22" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{user.city}</Text>
          </View>
        </View>

        {user.address && (
          <View style={styles.infoRow}>
            <Ionicons name="home" size={20} color="#228B22" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{user.address}</Text>
            </View>
          </View>
        )}

        {user.cnic_passport && (
          <View style={styles.infoRow}>
            <Ionicons name="card" size={20} color="#228B22" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>CNIC/Passport</Text>
              <Text style={styles.infoValue}>{user.cnic_passport}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Account Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Status</Text>
        
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Email Verified</Text>
          <View style={[styles.statusBadge, user.is_verified ? styles.verifiedBadge : styles.unverifiedBadge]}>
            <Text style={[styles.statusText, user.is_verified ? styles.verifiedText : styles.unverifiedText]}>
              {user.is_verified ? 'Verified' : 'Not Verified'}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Account Status</Text>
          <View style={[styles.statusBadge, user.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, user.is_active ? styles.activeText : styles.inactiveText]}>
              {user.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      {/* Player Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Statistics</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#228B22" />
            <Text style={styles.statNumber}>{playerStats?.totalBookings || 0}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{playerStats?.completedBookings || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{playerStats?.pendingBookings || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>Rs. {playerStats?.totalSpent || 0}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>
      </View>

      {/* Favorite Venues */}
      {playerStats?.favoriteVenues && playerStats.favoriteVenues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Favorite Venues</Text>
          {playerStats.favoriteVenues.slice(0, 3).map((venue, index) => (
            <View key={venue.venue_id} style={styles.favoriteVenueItem}>
              <View style={styles.favoriteVenueRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.favoriteVenueInfo}>
                <Text style={styles.favoriteVenueName}>{venue.venue_name}</Text>
                <Text style={styles.favoriteVenueCount}>
                  {venue.booking_count} booking{venue.booking_count !== 1 ? 's' : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          ))}
        </View>
      )}

      {/* Recent Activity */}
      {playerStats?.recentActivity && playerStats.recentActivity.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {playerStats.recentActivity.slice(0, 5).map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons
                  name={
                    activity.type === 'booking' ? 'add-circle' :
                    activity.type === 'completion' ? 'checkmark-circle' :
                    'close-circle'
                  }
                  size={20}
                  color={
                    activity.type === 'booking' ? '#228B22' :
                    activity.type === 'completion' ? '#4CAF50' :
                    '#F44336'
                  }
                />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityText}>
                  {activity.type === 'booking' && 'Booked '}
                  {activity.type === 'completion' && 'Completed booking at '}
                  {activity.type === 'cancellation' && 'Cancelled booking at '}
                  {activity.venue_name}
                </Text>
                <Text style={styles.activityDate}>
                  {new Date(activity.date).toLocaleDateString()}
                </Text>
              </View>
              {activity.amount && (
                <Text style={styles.activityAmount}>Rs. {activity.amount}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={onNavigateToEdit}
        >
          <Ionicons name="create" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.disputesButton}
          onPress={() => router.push('/user-disputes')}
        >
          <Ionicons name="document-text" size={20} color="#228B22" />
          <Text style={styles.disputesButtonText}>My Disputes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out" size={20} color="#FF3B30" />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Member Since */}
      <View style={styles.footer}>
        <Text style={styles.memberSince}>
          Member since {new Date(user.created_at).toLocaleDateString()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  defaultProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#228B22',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userType: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E8',
  },
  unverifiedBadge: {
    backgroundColor: '#FFF3E0',
  },
  activeBadge: {
    backgroundColor: '#E8F5E8',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedText: {
    color: '#4CAF50',
  },
  unverifiedText: {
    color: '#FF9800',
  },
  activeText: {
    color: '#4CAF50',
  },
  inactiveText: {
    color: '#F44336',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    minHeight: 100,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  favoriteVenueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  favoriteVenueRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#228B22',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  favoriteVenueInfo: {
    flex: 1,
  },
  favoriteVenueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  favoriteVenueCount: {
    fontSize: 12,
    color: '#666',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activityInfo: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#666',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#228B22',
  },
  editButton: {
    backgroundColor: '#228B22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disputesButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#228B22',
  },
  disputesButtonText: {
    color: '#228B22',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  signOutButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  signOutButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  memberSince: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 50,
  },
});
