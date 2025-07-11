// Venue owner venues management screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/services/supabase';
import { COLORS } from '../../src/utils/constants';
import { useCallback } from 'react';
import { VenueOwnerWelcomeHeader } from '../../src/components/VenueOwnerWelcomeHeader';

interface Venue {
  id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  status: 'open' | 'closed';
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  venue_images: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
  venue_fields: Array<{
    id: string;
    field_name: string;
    status: 'open' | 'closed';
  }>;
}

const VenueCard: React.FC<{
  venue: Venue;
  onPress: () => void;
}> = ({ venue, onPress }) => {
  const primaryImage = venue.venue_images?.find(img => img.is_primary)?.image_url ||
                      venue.venue_images?.[0]?.image_url;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'rejected': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending Review';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  return (
    <TouchableOpacity style={styles.venueCard} onPress={onPress}>
      <View style={styles.venueCardContent}>
        {primaryImage ? (
          <Image source={{ uri: primaryImage }} style={styles.venueImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={32} color="#ccc" />
          </View>
        )}

        <View style={styles.venueInfo}>
          <View style={styles.venueHeader}>
            <Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(venue.approval_status) }]}>
              <Text style={styles.statusText}>{getStatusText(venue.approval_status)}</Text>
            </View>
          </View>

          <Text style={styles.venueLocation} numberOfLines={1}>
            <Ionicons name="location-outline" size={14} color="#666" /> {venue.location}
          </Text>

          <View style={styles.venueStats}>
            <View style={styles.statItem}>
              <Ionicons name="business-outline" size={16} color="#666" />
              <Text style={styles.statText}>{venue.venue_fields?.length || 0} Fields</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name={venue.status === 'open' ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={venue.status === 'open' ? '#4CAF50' : '#f44336'}
              />
              <Text style={styles.statText}>{venue.status === 'open' ? 'Open' : 'Closed'}</Text>
            </View>
          </View>

          {/* Edit Indicator */}
          <View style={styles.venueActions}>
            <View style={styles.editIndicator}>
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={styles.editIndicatorText}>Tap to Edit</Text>
            </View>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
  );
};

export default function VenueOwnerVenues() {
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<Venue[]>([]);

  const loadVenues = async () => {
    if (!user) {
      console.log('No user found, cannot load venues');
      return;
    }

    console.log('Loading venues for user:', user.id);

    try {
      const { data, error } = await supabase
        .from('venues')
        .select(`
          *,
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

      if (error) {
        console.error('Supabase error loading venues:', error);
        throw error;
      }

      console.log('Venues loaded successfully:', data?.length || 0, 'venues');
      console.log('Venue data:', data);
      setVenues(data || []);
    } catch (error) {
      console.error('Error loading venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVenues();
    setRefreshing(false);
  };

  useEffect(() => {
    loadVenues();
  }, [user]);

  // Refresh venues when screen comes into focus (e.g., after creating a new venue)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadVenues();
      }
    }, [user])
  );

  const getVenueStats = () => {
    const total = venues.length;
    const active = venues.filter(v => v.status === 'open' && v.approval_status === 'approved').length;
    const pending = venues.filter(v => v.approval_status === 'pending').length;
    return { total, active, pending };
  };

  const stats = getVenueStats();

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <VenueOwnerWelcomeHeader
        title="My Venues"
        subtitle="Manage your futsal venues"
      />

      {/* Quick Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Venues</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Quick Actions */}
      {venues.length > 0 && (
        <View style={styles.quickActionsSection}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/venue-status-management')}
          >
            <Ionicons name="toggle" size={20} color="#228B22" />
            <Text style={styles.quickActionText}>Manage Status</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/venue-create')}
          >
            <Ionicons name="add-circle" size={20} color="#228B22" />
            <Text style={styles.quickActionText}>Add Venue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Venues Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading your venues...</Text>
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Venues Yet</Text>
            <Text style={styles.emptyStateText}>
              Start your futsal business by adding your first venue.
              Our platform makes it easy to list and manage your facilities.
            </Text>
            <TouchableOpacity
              style={styles.addVenueButton}
              onPress={() => router.push('/venue-create')}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addVenueButtonText}>Add Your First Venue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {venues.map((venue) => (
              <VenueCard
                key={venue.id}
                venue={venue}
                onPress={() => router.push(`/venue-edit?venueId=${venue.id}`)}
              />
            ))}

            <TouchableOpacity
              style={styles.addAnotherVenueButton}
              onPress={() => router.push('/venue-create')}
            >
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
              <Text style={styles.addAnotherVenueText}>Add Another Venue</Text>
            </TouchableOpacity>
          </>
        )}
      </View>


    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },


  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: -20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quickActionsSection: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginTop: 15,
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    marginTop: 15,
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
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
    marginBottom: 25,
  },
  addVenueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addVenueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  venueCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  venueCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  venueImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  venueInfo: {
    flex: 1,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  venueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  venueLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  venueStats: {
    flexDirection: 'row',
    gap: 15,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  addAnotherVenueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    marginTop: 10,
  },
  addAnotherVenueText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 8,
  },

  venueActions: {
    marginTop: 10,
  },
  editIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  editIndicatorText: {
    marginLeft: 4,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
