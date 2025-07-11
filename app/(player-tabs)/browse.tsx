// Player browse screen - simplified for venue browsing only
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { PlayerWelcomeHeader } from '../../components/PlayerWelcomeHeader';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';

interface Venue {
  id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  status: 'open' | 'closed';
  day_charges: number;
  night_charges: number;
  approval_status: 'pending' | 'approved' | 'rejected';
  venue_images: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
  venue_fields: Array<{
    field_name: string;
  }>;
}

export default function PlayerBrowse() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [venues, setVenues] = useState<Venue[]>([]);

  const cities = ['All Cities', 'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad'];

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
          venue_fields (
            field_name
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

      setVenues(data || []);
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

  const handleVenuePress = (venue: Venue) => {
    router.push(`/venue-details?venueId=${venue.id}`);
  };

  const getVenuePrice = (venue: Venue) => {
    const minPrice = Math.min(venue.day_charges, venue.night_charges);
    return `Rs. ${minPrice}/hour`;
  };

  const getVenueStatus = (venue: Venue) => {
    return venue.status === 'open' ? 'Available' : 'Closed';
  };

  const getPrimaryImage = (venue: Venue) => {
    const primaryImage = venue.venue_images?.find(img => img.is_primary);
    return primaryImage?.image_url || venue.venue_images?.[0]?.image_url;
  };

  const getVenueRating = (venue: any) => {
    if (!venue.reviews || venue.reviews.length === 0) return 0;
    const totalRating = venue.reviews.reduce((sum: number, review: any) => sum + review.rating, 0);
    return totalRating / venue.reviews.length;
  };

  const getReviewsCount = (venue: any) => {
    return venue.reviews?.length || 0;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={12} color="#FFD700" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={12} color="#FFD700" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={12} color="#FFD700" />);
      }
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      {/* Welcome Header */}
      <PlayerWelcomeHeader
        title={`Welcome back, ${user?.name}!`}
        subtitle="Find your perfect futsal venue"
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
            placeholder="Search venues by name, location..."
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

      {/* Venues List */}
      <View style={styles.venuesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available Venues ({venues.length})</Text>
          <TouchableOpacity style={styles.sortButton}>
            <Ionicons name="swap-vertical" size={16} color="#228B22" />
            <Text style={styles.sortButtonText}>Sort</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading venues...</Text>
          </View>
        ) : venues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Venues Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No venues available in this area'}
            </Text>
          </View>
        ) : (
          venues.map((venue) => {
            const primaryImage = getPrimaryImage(venue);
            const venueStatus = getVenueStatus(venue);
            const venuePrice = getVenuePrice(venue);

            return (
              <TouchableOpacity
                key={venue.id}
                style={styles.venueCard}
                onPress={() => handleVenuePress(venue)}
              >
                {/* Venue Image */}
                <View style={styles.venueImageContainer}>
                  {primaryImage ? (
                    <Image source={{ uri: primaryImage }} style={styles.venueImage} />
                  ) : (
                    <View style={styles.venueImagePlaceholder}>
                      <Ionicons name="image" size={32} color="#ccc" />
                    </View>
                  )}
                  <View style={[
                    styles.statusBadge,
                    venueStatus === 'Available' ? styles.availableBadge : styles.busyBadge
                  ]}>
                    <Text style={[
                      styles.statusText,
                      venueStatus === 'Available' ? styles.availableText : styles.busyText
                    ]}>
                      {venueStatus}
                    </Text>
                  </View>
                </View>

                {/* Venue Info */}
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName}>{venue.name}</Text>
                  <View style={styles.venueLocationRow}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <Text style={styles.venueLocation}>{venue.location}</Text>
                  </View>

                  {/* Rating */}
                  <View style={styles.ratingRow}>
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsContainer}>
                        {renderStars(getVenueRating(venue))}
                      </View>
                      {getVenueRating(venue) > 0 && (
                        <Text style={styles.ratingText}>
                          {getVenueRating(venue).toFixed(1)}
                        </Text>
                      )}
                      <Text style={styles.reviewsCount}>
                        ({getReviewsCount(venue)} review{getReviewsCount(venue) !== 1 ? 's' : ''})
                      </Text>
                    </View>
                  </View>

                  <View style={styles.venueDetails}>
                    <View style={styles.fieldsContainer}>
                      <Ionicons name="football" size={14} color="#666" />
                      <Text style={styles.fieldsText}>
                        {venue.venue_fields?.length || 0} field{venue.venue_fields?.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={styles.price}>{venuePrice}</Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.venueActions}>
                    <TouchableOpacity
                      style={styles.detailsButton}
                      onPress={() => router.push(`/venue-details?venueId=${venue.id}`)}
                    >
                      <Text style={styles.detailsButtonText}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.bookButton,
                        venueStatus !== 'Available' && styles.disabledButton
                      ]}
                      disabled={venueStatus !== 'Available'}
                      onPress={() => venueStatus === 'Available' && router.push(`/booking?venueId=${venue.id}`)}
                    >
                      <Text style={styles.bookButtonText}>
                        {venueStatus === 'Available' ? 'Book Now' : 'Unavailable'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Load More */}
      <View style={styles.loadMoreSection}>
        <TouchableOpacity style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Load More Venues</Text>
        </TouchableOpacity>
      </View>

      </ScrollView>
    </View>
  );
}

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
  clearButton: {
    padding: 5,
    marginLeft: 5,
  },
  cityFilter: {
    marginBottom: 15,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#228B22',
    marginLeft: 4,
  },
  venueCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },
  venueImageContainer: {
    position: 'relative',
    height: 120,
  },
  venueImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  venueImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: '#E8F5E8',
  },
  busyBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  availableText: {
    color: '#4CAF50',
  },
  busyText: {
    color: '#F44336',
  },
  venueInfo: {
    padding: 15,
  },
  venueName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  venueLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  venueLocation: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    marginRight: 4,
  },
  reviewsCount: {
    fontSize: 12,
    color: '#666',
  },
  venueDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  fieldsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldsText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#228B22',
  },
  venueActions: {
    flexDirection: 'row',
    gap: 10,
  },
  detailsButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#228B22',
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: '600',
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#228B22',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  loadMoreSection: {
    padding: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#228B22',
  },
  loadMoreText: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: '600',
  },
});
