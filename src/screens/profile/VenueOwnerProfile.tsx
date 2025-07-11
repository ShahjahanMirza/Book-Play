// Venue owner profile screen for managing owner information and venues
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
import { supabase } from '../../services/supabase';
import { VenueOwnerWelcomeHeader } from '../../components/VenueOwnerWelcomeHeader';
import { router } from 'expo-router';

interface VenueOwnerProfileProps {
  onNavigateToEdit?: () => void;
  onNavigateToVenues?: () => void;
  onNavigateToAddVenue?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToVenueDetails?: (venueId: string) => void;
  onNavigateToAnnouncements?: () => void;
}

interface VenueStats {
  totalVenues: number;
  activeVenues: number;
  pendingApproval: number;
  rejectedVenues: number;
  totalBookings: number;
  monthlyRevenue: number;
}

interface VenueInfo {
  id: string;
  name: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  status: 'open' | 'closed';
  location: string;
  venue_images?: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
  venue_fields?: Array<{
    id: string;
    field_name: string;
    status: 'open' | 'closed';
  }>;
}

export const VenueOwnerProfile: React.FC<VenueOwnerProfileProps> = ({
  onNavigateToEdit,
  onNavigateToVenues,
  onNavigateToAddVenue,
  onNavigateToAnalytics,
  onNavigateToVenueDetails,
  onNavigateToAnnouncements,
}) => {
  const { user, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<VenueInfo[]>([]);
  const [venueStats, setVenueStats] = useState<VenueStats>({
    totalVenues: 0,
    activeVenues: 0,
    pendingApproval: 0,
    rejectedVenues: 0,
    totalBookings: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    if (user) {
      loadVenueStats();
    }
  }, [user]);

  const loadVenueStats = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get venue statistics and details
      const { data: venueData, error: venuesError } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          approval_status,
          status,
          location,
          venue_images (
            image_url,
            is_primary
          ),
          venue_fields (
            id,
            field_name,
            status
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (venuesError) {
        console.error('Error loading venues:', venuesError);
        throw venuesError;
      }

      const venueList = venueData || [];
      setVenues(venueList);
      const totalVenues = venueList.length;
      const activeVenues = venueList.filter(v =>
        v.approval_status === 'approved' && v.status === 'open'
      ).length;
      const pendingApproval = venueList.filter(v =>
        v.approval_status === 'pending'
      ).length;
      const rejectedVenues = venueList.filter(v =>
        v.approval_status === 'rejected'
      ).length;

      // Get booking statistics
      let totalBookings = 0;
      let monthlyRevenue = 0;

      if (venueList.length > 0) {
        const venueIds = venueList.map(v => v.id);
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select('status, total_amount, booking_date')
          .in('venue_id', venueIds);

        if (bookingsError) {
          console.error('Error loading bookings:', bookingsError);
        } else {
          const bookingList = bookings || [];
          totalBookings = bookingList.length;

          // Calculate monthly revenue (current month)
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          monthlyRevenue = bookingList
            .filter(b => {
              const bookingDate = new Date(b.booking_date);
              return bookingDate.getMonth() === currentMonth &&
                     bookingDate.getFullYear() === currentYear &&
                     (b.status === 'confirmed' || b.status === 'completed');
            })
            .reduce((sum, b) => sum + (b.total_amount || 0), 0);
        }
      }

      setVenueStats({
        totalVenues,
        activeVenues,
        pendingApproval,
        rejectedVenues,
        totalBookings,
        monthlyRevenue,
      });
    } catch (error) {
      console.error('Error loading venue stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVenueStats();
    setRefreshing(false);
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


      {/* Profile Section */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {user.profile_image_url ? (
            <Image 
              source={{ uri: user.profile_image_url }} 
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.defaultProfileImage}>
              <Ionicons name="business" size={60} color="#666" />
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
        <Text style={styles.userType}>Venue Owner</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* Venue Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Venue Statistics</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="business" size={24} color="#228B22" />
            <Text style={styles.statNumber}>{venueStats.totalVenues}</Text>
            <Text style={styles.statLabel}>Total Venues</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{venueStats.activeVenues}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="time" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{venueStats.pendingApproval}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="close-circle" size={24} color="#F44336" />
            <Text style={styles.statNumber}>{venueStats.rejectedVenues}</Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color="#9C27B0" />
            <Text style={styles.statNumber}>{venueStats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="cash" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>Rs. {venueStats.monthlyRevenue.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Monthly Revenue</Text>
          </View>
        </View>
      </View>

      {/* Field Summary */}
      {venues.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Field Summary</Text>

          <View style={styles.fieldSummaryContainer}>
            {venues.map((venue) => (
              venue.venue_fields && venue.venue_fields.length > 0 && (
                <View key={venue.id} style={styles.venueFieldSummary}>
                  <Text style={styles.venueFieldSummaryTitle}>{venue.name}</Text>
                  <View style={styles.fieldSummaryRow}>
                    {venue.venue_fields.map((field) => (
                      <View key={field.id} style={styles.fieldSummaryItem}>
                        <View style={[
                          styles.fieldSummaryDot,
                          field.status === 'open' ? styles.fieldOpenDot : styles.fieldClosedDot
                        ]} />
                        <Text style={styles.fieldSummaryText}>
                          {field.field_name || `Field ${field.id.slice(-4)}`}
                        </Text>
                        <Text style={[
                          styles.fieldSummaryStatus,
                          field.status === 'open' ? styles.fieldOpenText : styles.fieldClosedText
                        ]}>
                          {field.status}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onNavigateToAddVenue}
        >
          <Ionicons name="add-circle" size={24} color="#228B22" />
          <Text style={styles.actionButtonText}>Add New Venue</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onNavigateToVenues}
        >
          <Ionicons name="list" size={24} color="#228B22" />
          <Text style={styles.actionButtonText}>Manage Venues</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onNavigateToAnalytics}
        >
          <Ionicons name="analytics" size={24} color="#228B22" />
          <Text style={styles.actionButtonText}>View Analytics</Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>

        {venues.length > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNavigateToVenues}
          >
            <Ionicons name="grid" size={24} color="#228B22" />
            <Text style={styles.actionButtonText}>Manage Fields</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        )}

        {venues.length > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNavigateToAnnouncements}
          >
            <Ionicons name="megaphone" size={24} color="#228B22" />
            <Text style={styles.actionButtonText}>Manage Announcements</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {/* My Venues */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Venues</Text>
          {venues.length > 0 && (
            <TouchableOpacity onPress={onNavigateToVenues}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {venues.length === 0 ? (
          <View style={styles.emptyVenuesContainer}>
            <Ionicons name="business-outline" size={48} color="#ccc" />
            <Text style={styles.emptyVenuesTitle}>No Venues Yet</Text>
            <Text style={styles.emptyVenuesText}>
              Start by adding your first venue to begin accepting bookings
            </Text>
            <TouchableOpacity
              style={styles.addFirstVenueButton}
              onPress={onNavigateToAddVenue}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addFirstVenueButtonText}>Add Your First Venue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {venues.slice(0, 3).map((venue) => (
              <TouchableOpacity
                key={venue.id}
                style={styles.venueCard}
                onPress={() => onNavigateToVenueDetails?.(venue.id)}
              >
                <View style={styles.venueImageContainer}>
                  {venue.venue_images && venue.venue_images.length > 0 ? (
                    <Image
                      source={{ uri: venue.venue_images.find(img => img.is_primary)?.image_url || venue.venue_images[0].image_url }}
                      style={styles.venueImage}
                    />
                  ) : (
                    <View style={styles.defaultVenueImage}>
                      <Ionicons name="business" size={24} color="#666" />
                    </View>
                  )}
                </View>

                <View style={styles.venueInfo}>
                  <Text style={styles.venueName}>{venue.name}</Text>
                  <Text style={styles.venueLocation}>{venue.location}</Text>

                  <View style={styles.venueStatusContainer}>
                    <View style={[
                      styles.statusBadge,
                      venue.approval_status === 'approved' ? styles.approvedBadge :
                      venue.approval_status === 'pending' ? styles.pendingBadge :
                      styles.rejectedBadge
                    ]}>
                      <Text style={[
                        styles.statusText,
                        venue.approval_status === 'approved' ? styles.approvedText :
                        venue.approval_status === 'pending' ? styles.pendingText :
                        styles.rejectedText
                      ]}>
                        {venue.approval_status === 'approved' ? 'Approved' :
                         venue.approval_status === 'pending' ? 'Pending' : 'Rejected'}
                      </Text>
                    </View>

                    {venue.approval_status === 'approved' && (
                      <View style={[
                        styles.statusBadge,
                        venue.status === 'open' ? styles.openBadge : styles.closedBadge
                      ]}>
                        <Text style={[
                          styles.statusText,
                          venue.status === 'open' ? styles.openText : styles.closedText
                        ]}>
                          {venue.status === 'open' ? 'Open' : 'Closed'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {venue.venue_fields && venue.venue_fields.length > 0 && (
                    <View style={styles.fieldsContainer}>
                      <Text style={styles.venueFields}>
                        {venue.venue_fields.length} field{venue.venue_fields.length > 1 ? 's' : ''}
                      </Text>
                      <View style={styles.fieldStatusContainer}>
                        {venue.venue_fields.map((field, index) => (
                          <View
                            key={field.id}
                            style={[
                              styles.fieldStatusDot,
                              field.status === 'open' ? styles.fieldOpenDot : styles.fieldClosedDot
                            ]}
                          />
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))}

            {venues.length > 3 && (
              <TouchableOpacity
                style={styles.viewMoreVenuesButton}
                onPress={onNavigateToVenues}
              >
                <Text style={styles.viewMoreVenuesText}>
                  View {venues.length - 3} more venue{venues.length - 3 > 1 ? 's' : ''}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#228B22" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Personal Information */}
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
    color: '#228B22',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 80,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
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
  // Venues section styles
  emptyVenuesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyVenuesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyVenuesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  addFirstVenueButton: {
    backgroundColor: '#228B22',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstVenueButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  venueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  venueImageContainer: {
    marginRight: 15,
  },
  venueImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  defaultVenueImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  venueLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  venueStatusContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  approvedBadge: {
    backgroundColor: '#E8F5E8',
    marginRight: 8,
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
    marginRight: 8,
  },
  rejectedBadge: {
    backgroundColor: '#FFEBEE',
    marginRight: 8,
  },
  openBadge: {
    backgroundColor: '#E3F2FD',
  },
  closedBadge: {
    backgroundColor: '#FAFAFA',
  },
  approvedText: {
    color: '#4CAF50',
  },
  pendingText: {
    color: '#FF9800',
  },
  rejectedText: {
    color: '#F44336',
  },
  openText: {
    color: '#2196F3',
  },
  closedText: {
    color: '#757575',
  },
  fieldsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  venueFields: {
    fontSize: 12,
    color: '#999',
  },
  fieldStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  fieldOpenDot: {
    backgroundColor: '#4CAF50',
  },
  fieldClosedDot: {
    backgroundColor: '#F44336',
  },
  viewMoreVenuesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 10,
  },
  viewMoreVenuesText: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: '600',
    marginRight: 5,
  },
  // Field summary styles
  fieldSummaryContainer: {
    gap: 15,
  },
  venueFieldSummary: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
  },
  venueFieldSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  fieldSummaryRow: {
    gap: 8,
  },
  fieldSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  fieldSummaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  fieldSummaryText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  fieldSummaryStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  fieldOpenText: {
    color: '#4CAF50',
  },
  fieldClosedText: {
    color: '#F44336',
  },
});
