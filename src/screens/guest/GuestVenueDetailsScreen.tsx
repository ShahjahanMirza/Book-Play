// Guest venue details screen - read-only with sign-up prompts
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';
import { VenueAnnouncements } from '../../components/VenueAnnouncements';

interface VenueDetails {
  id: string;
  name: string;
  description: string;
  location: string;
  maps_link: string;
  city: string;
  services: string[];
  day_charges: number;
  night_charges: number;
  weekday_charges: number;
  weekend_charges: number;
  opening_time: string;
  closing_time: string;
  status: string;
  venue_images: Array<{
    id: string;
    image_url: string;
    is_primary: boolean;
  }>;
  venue_fields: Array<{
    id: string;
    field_name: string;
    field_number: string;
  }>;
  users: {
    name: string;
    phone_number: string;
  };
}

export default function GuestVenueDetailsScreen() {
  const router = useRouter();
  const { venueId } = useLocalSearchParams();
  const [venue, setVenue] = useState<VenueDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (venueId) {
      loadVenueDetails();
    }
  }, [venueId]);

  const loadVenueDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select(`
          *,
          users!venues_owner_id_fkey (
            name,
            phone_number
          ),
          venue_images (
            id,
            image_url,
            is_primary
          ),
          venue_fields (
            id,
            field_name,
            field_number
          ),
          reviews (
            id,
            rating,
            review_text,
            created_at,
            is_active
          )
        `)
        .eq('id', venueId)
        .eq('approval_status', 'approved')
        .single();

      if (error) {
        console.error('Error loading venue details:', error);
        Alert.alert('Error', 'Venue not found');
        router.back();
        return;
      }

      console.log('Venue data loaded:', {
        id: data.id,
        name: data.name,
        images_count: data.venue_images?.length || 0,
        images: data.venue_images?.map(img => ({
          id: img.id,
          url: img.image_url,
          is_primary: img.is_primary
        }))
      });

      setVenue(data);
    } catch (error) {
      console.error('Error loading venue details:', error);
      Alert.alert('Error', 'Failed to load venue details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpPrompt = (action: string) => {
    Alert.alert(
      'Sign Up Required',
      `To ${action}, please create an account and join our community!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Up', onPress: () => router.push('/(guest-tabs)/auth') },
      ]
    );
  };

  const handleOpenMaps = () => {
    if (!venue?.maps_link) {
      Alert.alert('Location', 'Maps link not available');
      return;
    }
    Linking.openURL(venue.maps_link);
  };

  const renderImageGallery = () => {
    if (!venue?.venue_images || venue.venue_images.length === 0) {
      return (
        <View style={styles.placeholderImage}>
          <Ionicons name="image-outline" size={48} color="#ccc" />
          <Text style={styles.placeholderText}>No images available</Text>
        </View>
      );
    }

    const images = venue.venue_images.sort((a, b) => {
      if (a.is_primary) return -1;
      if (b.is_primary) return 1;
      return 0;
    });

    return (
      <View style={styles.imageGallery}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
            setCurrentImageIndex(index);
          }}
        >
          {images.map((image, index) => (
            <Image
              key={image.id}
              source={{ uri: image.image_url }}
              style={styles.venueImage}
              resizeMode="cover"
              onError={(error) => {
                console.error('Image loading error:', error.nativeEvent.error);
                console.log('Failed image URL:', image.image_url);
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', image.image_url);
              }}
            />
          ))}
        </ScrollView>

        {images.length > 1 && (
          <View style={styles.imageIndicators}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  currentImageIndex === index && styles.activeIndicator
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={16} color="#FFD700" />);
    }

    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={16} color="#FFD700" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={16} color="#FFD700" />);
    }

    return stars;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading venue details...</Text>
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.errorContainer}>
        <Text>Venue not found</Text>
      </View>
    );
  }

  // Calculate actual rating from reviews
  const activeReviews = venue.reviews?.filter((review: any) => review.is_active) || [];
  const rating = activeReviews.length > 0
    ? activeReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / activeReviews.length
    : 0;
  const totalReviews = activeReviews.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#228B22" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Venue Details</Text>
        <TouchableOpacity onPress={() => handleSignUpPrompt('contact venue')}>
          <Ionicons name="call" size={24} color="#228B22" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        {renderImageGallery()}

        {/* Venue Info */}
        <View style={styles.venueInfo}>
          <Text style={styles.venueName}>{venue.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.venueLocation}>{venue.location}</Text>
          </View>
          
          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {renderStars(rating)}
            </View>
            <Text style={styles.ratingText}>
              {rating.toFixed(1)} ({totalReviews} reviews)
            </Text>
          </View>

          {/* Description */}
          {venue.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{venue.description}</Text>
            </View>
          )}

          {/* Venue Announcements */}
          <VenueAnnouncements venueId={venue.id} />

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <View style={styles.pricingGrid}>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Day Rate</Text>
                <Text style={styles.priceValue}>Rs {venue.day_charges}/hr</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Night Rate</Text>
                <Text style={styles.priceValue}>Rs {venue.night_charges}/hr</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Weekday</Text>
                <Text style={styles.priceValue}>Rs {venue.weekday_charges}/hr</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Weekend</Text>
                <Text style={styles.priceValue}>Rs {venue.weekend_charges}/hr</Text>
              </View>
            </View>
          </View>

          {/* Operating Hours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Operating Hours</Text>
            <View style={styles.hoursContainer}>
              <View style={styles.hoursRow}>
                <Ionicons name="time" size={16} color="#666" />
                <Text style={styles.hoursText}>
                  {venue.opening_time} - {venue.closing_time}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                venue.status === 'open' ? styles.openBadge : styles.closedBadge
              ]}>
                <Text style={[
                  styles.statusText,
                  venue.status === 'open' ? styles.openText : styles.closedText
                ]}>
                  {venue.status === 'open' ? 'Open Now' : 'Closed'}
                </Text>
              </View>
            </View>
          </View>

          {/* Services */}
          {venue.services && venue.services.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services & Amenities</Text>
              <View style={styles.servicesContainer}>
                {venue.services.map((service, index) => (
                  <View key={index} style={styles.serviceItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.serviceText}>{service}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Fields */}
          {venue.venue_fields && venue.venue_fields.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Fields</Text>
              {venue.venue_fields.map((field) => (
                <View key={field.id} style={styles.fieldItem}>
                  <Ionicons name="football" size={16} color="#228B22" />
                  <Text style={styles.fieldText}>
                    Field {field.field_number}: {field.field_name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Reviews Section */}
          {activeReviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews ({totalReviews})</Text>
              {activeReviews.slice(0, 3).map((review: any) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewStars}>
                      {renderStars(review.rating)}
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {review.review_text && (
                    <Text style={styles.reviewText}>{review.review_text}</Text>
                  )}
                </View>
              ))}
              {activeReviews.length > 3 && (
                <Text style={styles.moreReviews}>
                  +{activeReviews.length - 3} more reviews
                </Text>
              )}
            </View>
          )}

          {/* Location & Map */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <TouchableOpacity style={styles.mapButton} onPress={handleOpenMaps}>
              <Ionicons name="map" size={20} color="#228B22" />
              <Text style={styles.mapButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sign Up Prompt Footer */}
      <View style={styles.signUpFooter}>
        <View style={styles.signUpContent}>
          <Text style={styles.signUpTitle}>Want to book this venue?</Text>
          <Text style={styles.signUpSubtitle}>Join our community to book and connect!</Text>
        </View>
        <TouchableOpacity
          style={styles.signUpButton}
          onPress={() => handleSignUpPrompt('book this venue')}
        >
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#90EE90',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  imageGallery: {
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  venueImage: {
    width: 400, // Approximate screen width
    height: 250,
    backgroundColor: '#f0f0f0',
  },
  placeholderImage: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#fff',
  },
  venueInfo: {
    backgroundColor: '#fff',
    padding: 20,
  },
  venueName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  venueLocation: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  priceCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#228B22',
  },
  hoursContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  openBadge: {
    backgroundColor: '#e8f5e8',
  },
  closedBadge: {
    backgroundColor: '#ffeaea',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  openText: {
    color: '#4CAF50',
  },
  closedText: {
    color: '#f44336',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: '500',
    marginLeft: 8,
  },
  signUpFooter: {
    backgroundColor: '#228B22',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  signUpContent: {
    flex: 1,
  },
  signUpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  signUpSubtitle: {
    fontSize: 12,
    color: '#E3F2FD',
  },
  signUpButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  signUpButtonText: {
    color: '#228B22',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewStars: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  moreReviews: {
    fontSize: 14,
    color: '#228B22',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
});
