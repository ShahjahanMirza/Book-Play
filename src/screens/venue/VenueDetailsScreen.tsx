import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { VenueAnnouncements } from '../../components/VenueAnnouncements';

const { width } = Dimensions.get('window');

interface Review {
  id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  is_active: boolean;
}

interface Venue {
  id: string;
  name: string;
  description: string;
  location: string;
  day_charges: number;
  night_charges: number;
  weekday_charges: number;
  weekend_charges: number;
  opening_time: string;
  closing_time: string;
  contact_phone?: string;
  contact_email?: string;
  services: string[];
  images?: string[];
  rating?: number;
  total_reviews?: number;
  reviews?: Review[];
  fields: VenueField[];
  owner: {
    name: string;
    phone_number: string;
  };
}

interface VenueField {
  id: string;
  field_name: string;
  field_number: string;
}

export default function VenueDetailsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (venueId) {
      loadVenueDetails();
    }
  }, [venueId]);

  const loadVenueDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          description,
          location,
          day_charges,
          night_charges,
          weekday_charges,
          weekend_charges,
          opening_time,
          closing_time,
          services,
          views_count,
          venue_images (
            id,
            image_url,
            is_primary,
            display_order
          ),
          venue_fields (
            id,
            field_name,
            field_number
          ),
          users!venues_owner_id_fkey (
            name,
            phone_number
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
        console.error('Error loading venue:', error);
        Alert.alert('Error', 'Venue not found or not available');
        router.back();
        return;
      }

      // Calculate rating from reviews and filter active reviews
      const allReviews = data.reviews || [];
      const activeReviews = allReviews.filter((review: any) => review.is_active);
      const averageRating = activeReviews.length > 0
        ? activeReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / activeReviews.length
        : 0;

      // Sort images by primary first, then by display_order
      const sortedImages = (data.venue_images || [])
        .sort((a: any, b: any) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return (a.display_order || 0) - (b.display_order || 0);
        })
        .map((img: any) => img.image_url);

      setVenue({
        id: data.id,
        name: data.name,
        description: data.description,
        location: data.location,
        day_charges: data.day_charges,
        night_charges: data.night_charges,
        weekday_charges: data.weekday_charges,
        weekend_charges: data.weekend_charges,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        services: data.services || [],
        images: sortedImages,
        rating: averageRating,
        total_reviews: activeReviews.length,
        reviews: activeReviews,
        fields: data.venue_fields || [],
        owner: {
          name: (data.users as any)?.name || '',
          phone_number: (data.users as any)?.phone_number || '',
        },
      });
    } catch (error) {
      console.error('Error loading venue:', error);
      Alert.alert('Error', 'Failed to load venue details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleBookNow = () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to book this venue');
      return;
    }
    router.push(`/booking?venueId=${venue?.id}`);
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#228B22" />
        <Text style={styles.loadingText}>Loading venue details...</Text>
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>Venue not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Venue Details</Text>
      </View>

      {/* Image Gallery */}
      {venue.images && venue.images.length > 0 ? (
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
          >
            {venue.images.map((image, index) => (
              <Image
                key={index}
                source={{ uri: image }}
                style={styles.venueImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          {venue.images && venue.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {venue.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentImageIndex && styles.activeIndicator
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noImageContainer}>
          <Ionicons name="image-outline" size={64} color="#ccc" />
          <Text style={styles.noImageText}>No images available</Text>
        </View>
      )}

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
            {renderStars(venue.rating || 0)}
          </View>
          <Text style={styles.ratingText}>
            {(venue.rating || 0).toFixed(1)} ({venue.total_reviews || 0} reviews)
          </Text>
        </View>

        {/* Price */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Day charges:</Text>
          <Text style={styles.priceValue}>${venue.day_charges}</Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{venue.description}</Text>
      </View>

      {/* Venue Announcements */}
      <VenueAnnouncements venueId={venue.id} />

      {/* Operating Hours */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operating Hours</Text>
        <View style={styles.hoursRow}>
          <Ionicons name="time" size={20} color="#228B22" />
          <Text style={styles.hoursText}>
            {formatTime(venue.opening_time)} - {formatTime(venue.closing_time)}
          </Text>
        </View>
      </View>

      {/* Fields */}
      {venue.fields.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Fields</Text>
          {venue.fields.map((field) => (
            <View key={field.id} style={styles.fieldItem}>
              <Ionicons name="football" size={20} color="#228B22" />
              <View style={styles.fieldInfo}>
                <Text style={styles.fieldName}>
                  {field.field_name || `Field ${field.field_number}`}
                </Text>
                <Text style={styles.fieldType}>Field #{field.field_number}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Services */}
      {venue.services.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.amenitiesContainer}>
            {venue.services.map((service, index) => (
              <View key={index} style={styles.amenityItem}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.amenityText}>{service}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Reviews Section */}
      {venue.reviews && venue.reviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews ({venue.total_reviews})</Text>
          {venue.reviews.slice(0, 3).map((review) => (
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
          {venue.reviews.length > 3 && (
            <Text style={styles.moreReviews}>
              +{venue.reviews.length - 3} more reviews
            </Text>
          )}
        </View>
      )}

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.contactItem}>
          <Ionicons name="person" size={20} color="#228B22" />
          <Text style={styles.contactText}>{venue.owner.name}</Text>
        </View>
        <View style={styles.contactItem}>
          <Ionicons name="call" size={20} color="#228B22" />
          <Text style={styles.contactText}>{venue.owner.phone_number}</Text>
        </View>
        {venue.contact_email && (
          <View style={styles.contactItem}>
            <Ionicons name="mail" size={20} color="#228B22" />
            <Text style={styles.contactText}>{venue.contact_email}</Text>
          </View>
        )}
      </View>

      {/* Book Now Button */}
      <View style={styles.bookingSection}>
        <TouchableOpacity style={styles.bookButton} onPress={handleBookNow}>
          <Ionicons name="calendar" size={24} color="#fff" />
          <Text style={styles.bookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginTop: 20,
    marginBottom: 30,
  },
  header: {
    backgroundColor: '#90EE90',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f0f0',
  },
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  venueImage: {
    width: width,
    height: 250,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeIndicator: {
    backgroundColor: '#fff',
  },
  noImageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noImageText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  venueInfo: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: -20,
    marginHorizontal: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginBottom: 8,
  },
  venueLocation: {
    fontSize: 16,
    color: '#666',
    marginLeft: 5,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#228B22',
  },
  section: {
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
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldInfo: {
    marginLeft: 12,
  },
  fieldName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fieldType: {
    fontSize: 14,
    color: '#666',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  amenityText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  bookingSection: {
    padding: 20,
  },
  bookButton: {
    backgroundColor: '#228B22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#0f0f0f',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#0f0f0f',
    fontSize: 16,
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
