// Player browse screen for authenticated players
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { PlayerWelcomeHeader } from '../../../components/PlayerWelcomeHeader';
import { supabase } from '../../services/supabase';
import { router } from 'expo-router';

interface Venue {
  id: string;
  name: string;
  location: string;
  city: string;
  rating: number;
  total_reviews: number;
  day_charges: number;
  night_charges: number;
  status: string;
  venue_images?: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
}

export const PlayerBrowseScreen: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [cities, setCities] = useState<string[]>(['All Cities']);

  useEffect(() => {
    loadVenues();
  }, [selectedCity, searchQuery]);

  const loadVenues = async () => {
    try {
      let query = supabase
        .from('venues')
        .select(`
          *,
          venue_images (
            image_url,
            is_primary
          ),
          reviews (
            rating
          )
        `)
        .eq('approval_status', 'approved');

      // Apply city filter
      if (selectedCity !== 'All Cities') {
        query = query.eq('city', selectedCity);
      }

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`);
      }

      // Apply default sorting
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error loading venues:', error);
        Alert.alert('Error', 'Failed to load venues');
        return;
      }

      // Calculate real ratings from reviews
      const venuesWithRatings: Venue[] = (data || []).map(venue => {
        const reviews = venue.reviews || [];
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
          ? reviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / totalReviews
          : 0;

        return {
          id: venue.id,
          name: venue.name,
          location: venue.location,
          city: venue.city,
          rating: Math.round(averageRating * 10) / 10,
          total_reviews: totalReviews,
          day_charges: venue.day_charges || 0,
          night_charges: venue.night_charges || 0,
          status: venue.status === 'open' ? 'Available' : 'Closed',
          venue_images: venue.venue_images,
        };
      });

      setVenues(venuesWithRatings);

      // Extract unique cities
      const uniqueCities = ['All Cities', ...new Set(data?.map(v => v.city) || [])];
      setCities(uniqueCities);
    } catch (error) {
      console.error('Error loading venues:', error);
      Alert.alert('Error', 'Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVenues();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Welcome Header */}
      <PlayerWelcomeHeader
        title={`Welcome back, ${user?.name}!`}
        subtitle="Find and book your perfect futsal venue"
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search venues..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* City Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityFilter}>
          {cities.map((city) => (
            <TouchableOpacity
              key={city}
              style={[
                styles.cityChip,
                selectedCity === city && styles.selectedCityChip
              ]}
              onPress={() => setSelectedCity(city)}
            >
              <Text style={[
                styles.cityChipText,
                selectedCity === city && styles.selectedCityChipText
              ]}>
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="calendar" size={24} color="#228B22" />
            <Text style={styles.actionText}>My Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="people" size={24} color="#228B22" />
            <Text style={styles.actionText}>Forum</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="chatbubbles" size={24} color="#228B22" />
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <Ionicons name="notifications" size={24} color="#228B22" />
            <Text style={styles.actionText}>Notifications</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Featured Venues */}
      <View style={styles.venuesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Venues</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading venues...</Text>
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No venues found</Text>
          </View>
        ) : (
          venues.map((venue) => (
            <TouchableOpacity
              key={venue.id}
              style={styles.venueCard}
              onPress={() => router.push(`/venue-details?venueId=${venue.id}`)}
            >
              <View style={styles.venueInfo}>
                <Text style={styles.venueName}>{venue.name}</Text>
                <Text style={styles.venueLocation}>{venue.location}</Text>
                <View style={styles.venueDetails}>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.rating}>
                      {venue.rating > 0 ? venue.rating.toFixed(1) : 'No ratings'}
                      {venue.total_reviews > 0 && ` (${venue.total_reviews})`}
                    </Text>
                  </View>
                  <Text style={styles.price}>
                    Rs. {venue.day_charges}/hr day • Rs. {venue.night_charges}/hr night
                  </Text>
                </View>
              </View>
              <View style={styles.venueActions}>
                <View style={[
                  styles.statusBadge,
                  venue.status === 'Available' ? styles.availableBadge : styles.closedBadge
                ]}>
                  <Text style={styles.statusText}>{venue.status}</Text>
                </View>
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={() => router.push(`/venue-details?venueId=${venue.id}`)}
                >
                  <Text style={styles.bookButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <Ionicons name="information-circle" size={24} color="#228B22" />
          <Text style={styles.activityText}>
            No recent bookings. Start exploring venues to make your first booking!
          </Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginTop: -20,
    marginHorizontal: 15,
    borderRadius: 15,
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
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  cityFilter: {
    marginTop: 5,
  },
  cityChip: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedCityChip: {
    backgroundColor: '#228B22',
  },
  cityChipText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCityChipText: {
    color: '#fff',
  },
  quickActions: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  venuesSection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  venueCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  venueLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  venueDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  rating: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#228B22',
  },
  venueActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: '#E8F5E8',
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  bookButton: {
    backgroundColor: '#228B22',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  activitySection: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 15,
    padding: 20,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
  },
  activityText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 15,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  closedBadge: {
    backgroundColor: '#FF3B30',
  },
});
