// Guest browse venues screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';
import { CustomHeader } from '../../../components/CustomHeader';
import { FadeInView } from '../../../components/FadeInView';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { RESPONSIVE, wp, hp, rf } from '../../utils/responsive';

interface Venue {
  id: string;
  name: string;
  location: string;
  city: string;
  day_charges: number;
  night_charges: number;
  rating: number;
  total_reviews: number;
  status: string;
  venue_images: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
}

export const GuestBrowseScreen: React.FC = () => {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [cities, setCities] = useState<string[]>(['All Cities']);

  const loadVenues = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          location,
          city,
          day_charges,
          night_charges,
          status,
          venue_images (
            image_url,
            is_primary
          ),
          reviews (
            rating
          )
        `)
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading venues:', error);
        return;
      }

      // Calculate real ratings from reviews
      const venuesWithRatings = (data || []).map(venue => {
        console.log('Venue loaded:', {
          id: venue.id,
          name: venue.name,
          images_count: venue.venue_images?.length || 0,
          primary_image: venue.venue_images?.find(img => img.is_primary)?.image_url
        });

        // Calculate average rating from reviews
        const reviews = venue.reviews || [];
        const totalReviews = reviews.length;
        const averageRating = totalReviews > 0
          ? reviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0) / totalReviews
          : 0;

        return {
          ...venue,
          rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          total_reviews: totalReviews,
        };
      });

      setVenues(venuesWithRatings);

      // Extract unique cities
      const uniqueCities = ['All Cities', ...new Set(data?.map(v => v.city) || [])];
      setCities(uniqueCities);
    } catch (error) {
      console.error('Error loading venues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVenues();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVenues();
    setRefreshing(false);
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         venue.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'All Cities' || venue.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const handleVenuePress = (venueId: string) => {
    router.push(`/guest-venue-details?venueId=${venueId}`);
  };

  const handleSignUpPrompt = () => {
    Alert.alert(
      'Sign Up Required',
      'Create an account to book venues and access all features!',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Up', onPress: () => router.push('/(guest-tabs)/auth') },
      ]
    );
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

  const renderVenueCard = (venue: Venue) => {
    const primaryImage = venue.venue_images?.find(img => img.is_primary)?.image_url ||
                        venue.venue_images?.[0]?.image_url;

    return (
      <TouchableOpacity
        key={venue.id}
        style={styles.venueCard}
        onPress={() => handleVenuePress(venue.id)}
      >
        {primaryImage ? (
          <Image source={{ uri: primaryImage }} style={styles.venueImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={32} color="#ccc" />
          </View>
        )}

        <View style={styles.venueInfo}>
          <Text style={styles.venueName}>{venue.name}</Text>
          <View style={styles.locationRow}>
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
                <Text style={styles.rating}>
                  {getVenueRating(venue).toFixed(1)}
                </Text>
              )}
              <Text style={styles.reviewCount}>
                ({getReviewsCount(venue)} review{getReviewsCount(venue) !== 1 ? 's' : ''})
              </Text>
            </View>
          </View>

          <View style={styles.venueDetails}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>From</Text>
              <Text style={styles.price}>Rs {venue.day_charges}/hr</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
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
            <TouchableOpacity style={styles.signUpButton} onPress={handleSignUpPrompt}>
              <Text style={styles.signUpButtonText}>Sign Up to Book</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner
          text="Loading venues..."
          color="#228B22"
          animated={true}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <FadeInView duration={600} delay={100} direction="down">
          <View style={styles.header}>
            <Text style={styles.title}>Book&Play</Text>
            <Text style={styles.subtitle}>Find the perfect venue for your game</Text>
          </View>
        </FadeInView>

      {/* Search and Filters */}
      <FadeInView duration={600} delay={200} direction="up">
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search venues..."
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityFilters}>
            {cities.map((city) => (
              <TouchableOpacity
                key={city}
                style={[
                  styles.cityFilter,
                  selectedCity === city && styles.activeCityFilter
                ]}
                onPress={() => setSelectedCity(city)}
              >
                <Text style={[
                  styles.cityFilterText,
                  selectedCity === city && styles.activeCityFilterText
                ]}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </FadeInView>

      {/* Venues List */}
      <FadeInView duration={600} delay={300} direction="up">
        <View style={styles.venuesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filteredVenues.length} Venues Found
            </Text>
          </View>

          {filteredVenues.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.emptyStateTitle}>No venues found</Text>
              <Text style={styles.emptyStateText}>
                Try adjusting your search or filter criteria
              </Text>
            </View>
          ) : (
            filteredVenues.map((venue, index) => (
              <FadeInView key={venue.id} duration={400} delay={400 + (index * 100)} direction="up">
                {renderVenueCard(venue)}
              </FadeInView>
            ))
          )}
        </View>
      </FadeInView>

      {/* Sign Up Prompt */}
      <FadeInView duration={600} delay={500} direction="up">
        <View style={styles.signupPrompt}>
          <Text style={styles.promptTitle}>Ready to Play?</Text>
          <Text style={styles.promptText}>
            Join our community to book venues, connect with players, and access exclusive features!
          </Text>
          <TouchableOpacity style={styles.promptButton} onPress={handleSignUpPrompt}>
            <Text style={styles.promptButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </FadeInView>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#90EE90',
    paddingHorizontal: RESPONSIVE.padding.lg,
    paddingVertical: RESPONSIVE.padding.xl,
    paddingTop: RESPONSIVE.padding.lg,
  },
  title: {
    fontSize: RESPONSIVE.fontSize.xxxl,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: RESPONSIVE.margin.sm,
  },
  subtitle: {
    fontSize: RESPONSIVE.fontSize.md,
    color: '#666',
  },
  searchSection: {
    backgroundColor: '#fff',
    paddingHorizontal: RESPONSIVE.padding.lg,
    paddingVertical: RESPONSIVE.padding.md,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: RESPONSIVE.borderRadius.round,
    paddingHorizontal: RESPONSIVE.padding.md,
    marginBottom: RESPONSIVE.margin.md,
    minHeight: hp(6),
  },
  searchIcon: {
    marginRight: RESPONSIVE.margin.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: RESPONSIVE.padding.md,
    fontSize: RESPONSIVE.fontSize.md,
    color: '#333',
  },
  clearButton: {
    padding: 5,
    marginLeft: 5,
  },
  cityFilters: {
    flexDirection: 'row',
  },
  cityFilter: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: RESPONSIVE.padding.md,
    paddingVertical: RESPONSIVE.padding.sm,
    borderRadius: RESPONSIVE.borderRadius.lg,
    marginRight: RESPONSIVE.margin.sm,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeCityFilter: {
    backgroundColor: '#228B22',
    borderColor: '#228B22',
  },
  cityFilterText: {
    fontSize: RESPONSIVE.fontSize.sm,
    color: '#666',
    fontWeight: '500',
  },
  activeCityFilterText: {
    color: '#fff',
  },
  venuesSection: {
    padding: RESPONSIVE.padding.lg,
  },
  sectionHeader: {
    marginBottom: RESPONSIVE.margin.md,
  },
  sectionTitle: {
    fontSize: RESPONSIVE.fontSize.lg,
    fontWeight: '600',
    color: '#333',
  },
  venueCard: {
    backgroundColor: '#fff',
    borderRadius: RESPONSIVE.borderRadius.lg,
    marginBottom: RESPONSIVE.margin.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  venueImage: {
    width: '100%',
    height: hp(25),
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    width: '100%',
    height: hp(25),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueInfo: {
    padding: 16,
  },
  venueName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  venueLocation: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  venueDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#228B22',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  openBadge: {
    backgroundColor: '#e8f5e8',
  },
  closedBadge: {
    backgroundColor: '#ffeaea',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  openText: {
    color: '#4CAF50',
  },
  closedText: {
    color: '#f44336',
  },
  signUpButton: {
    backgroundColor: '#228B22',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  signupPrompt: {
    backgroundColor: '#228B22',
    margin: 20,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  promptText: {
    fontSize: 14,
    color: '#E3F2FD',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  promptButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  promptButtonText: {
    color: '#228B22',
    fontSize: 16,
    fontWeight: '600',
  },
});
