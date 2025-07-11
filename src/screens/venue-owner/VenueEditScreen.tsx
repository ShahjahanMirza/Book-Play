import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { VenueImageGallery } from '../../components/VenueImageGallery';
import { VenueOwnerHeader } from '../../components/VenueOwnerHeader';

interface VenueImage {
  id?: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  local_uri?: string;
}

interface VenueFormData {
  name: string;
  description: string;
  location: string;
  maps_link: string;
  city: string;
  services: string[];
  day_charges: string;
  night_charges: string;
  weekday_charges: string;
  weekend_charges: string;
  opening_time: string;
  closing_time: string;
  days_available: number[];
  fields: VenueField[];
  images: VenueImage[];
  status: 'open' | 'closed';
}

interface VenueField {
  id?: string;
  field_number: string;
  field_name: string;
  status?: 'open' | 'closed';
}

const SERVICES_OPTIONS = [
  'Parking',
  'Changing Rooms',
  'Shower Facilities',
  'Equipment Rental',
  'Refreshments',
  'First Aid',
  'Security',
  'Lighting',
  'Air Conditioning',
  'WiFi',
];

const DAYS_OF_WEEK = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

export default function VenueEditScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { venueId } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [originalVenue, setOriginalVenue] = useState<any>(null);
  const [formData, setFormData] = useState<VenueFormData>({
    name: '',
    description: '',
    location: '',
    maps_link: '',
    city: '',
    services: [],
    day_charges: '',
    night_charges: '',
    weekday_charges: '',
    weekend_charges: '',
    opening_time: '06:00',
    closing_time: '23:00',
    days_available: [1, 2, 3, 4, 5, 6, 0],
    fields: [{ field_number: '1', field_name: 'Main Field' }],
    images: [],
    status: 'open',
  });

  useEffect(() => {
    if (venueId) {
      loadVenueData();
    }
  }, [venueId]);

  const loadVenueData = async () => {
    if (!venueId || !user) return;

    try {
      setInitialLoading(true);

      // Load venue data with all related information
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select(`
          *,
          venue_images (
            id,
            image_url,
            is_primary,
            display_order
          ),
          venue_fields (
            id,
            field_number,
            field_name,
            status
          )
        `)
        .eq('id', venueId)
        .eq('owner_id', user.id)
        .single();

      if (venueError) {
        console.error('Error loading venue:', venueError);
        Alert.alert('Error', 'Venue not found or you do not have permission to edit it');
        router.back();
        return;
      }

      setOriginalVenue(venue);

      // Populate form data
      setFormData({
        name: venue.name || '',
        description: venue.description || '',
        location: venue.location || '',
        maps_link: venue.maps_link || '',
        city: venue.city || '',
        services: venue.services || [],
        day_charges: venue.day_charges?.toString() || '',
        night_charges: venue.night_charges?.toString() || '',
        weekday_charges: venue.weekday_charges?.toString() || '',
        weekend_charges: venue.weekend_charges?.toString() || '',
        opening_time: venue.opening_time || '06:00',
        closing_time: venue.closing_time || '23:00',
        days_available: venue.days_available || [1, 2, 3, 4, 5, 6, 0],
        fields: venue.venue_fields?.map((field: any) => ({
          id: field.id,
          field_number: field.field_number || '',
          field_name: field.field_name || '',
          status: field.status || 'open',
        })) || [{ field_number: '1', field_name: 'Main Field' }],
        images: venue.venue_images?.map((img: any) => ({
          id: img.id,
          image_url: img.image_url,
          is_primary: img.is_primary,
          display_order: img.display_order,
        })) || [],
        status: venue.status || 'open',
      });
    } catch (error) {
      console.error('Error loading venue data:', error);
      Alert.alert('Error', 'Failed to load venue data');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const updateFormData = (field: keyof VenueFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleService = (service: string) => {
    const services = formData.services.includes(service)
      ? formData.services.filter(s => s !== service)
      : [...formData.services, service];
    updateFormData('services', services);
  };

  const toggleDay = (day: number) => {
    const days = formData.days_available.includes(day)
      ? formData.days_available.filter(d => d !== day)
      : [...formData.days_available, day];
    updateFormData('days_available', days);
  };

  const addField = () => {
    const newField = {
      field_number: (formData.fields.length + 1).toString(),
      field_name: `Field ${formData.fields.length + 1}`,
      status: 'open' as const,
    };
    updateFormData('fields', [...formData.fields, newField]);
  };

  const removeField = (index: number) => {
    if (formData.fields.length > 1) {
      const fields = formData.fields.filter((_, i) => i !== index);
      updateFormData('fields', fields);
    }
  };

  const updateField = (index: number, field: keyof VenueField, value: string) => {
    const fields = [...formData.fields];
    fields[index] = { ...fields[index], [field]: value };
    updateFormData('fields', fields);
  };

  const validateForm = (): boolean => {
    // Only validate venue name as required
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Venue name is required');
      return false;
    }

    // Validate pricing fields are valid numbers if provided
    const pricingFields = ['day_charges', 'night_charges', 'weekday_charges', 'weekend_charges'];
    for (const field of pricingFields) {
      const value = formData[field as keyof VenueFormData] as string;
      if (value && value.trim() && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
        Alert.alert('Validation Error', `${field.replace('_', ' ')} must be a valid positive number`);
        return false;
      }
    }

    // Validate time format if provided
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (formData.opening_time && !timeRegex.test(formData.opening_time)) {
      Alert.alert('Validation Error', 'Opening time must be in HH:MM format');
      return false;
    }
    if (formData.closing_time && !timeRegex.test(formData.closing_time)) {
      Alert.alert('Validation Error', 'Closing time must be in HH:MM format');
      return false;
    }

    // Validate opening time is before closing time if both are provided
    if (formData.opening_time && formData.closing_time) {
      const openingMinutes = parseInt(formData.opening_time.split(':')[0]) * 60 + parseInt(formData.opening_time.split(':')[1]);
      const closingMinutes = parseInt(formData.closing_time.split(':')[0]) * 60 + parseInt(formData.closing_time.split(':')[1]);
      if (openingMinutes >= closingMinutes) {
        Alert.alert('Validation Error', 'Opening time must be before closing time');
        return false;
      }
    }

    return true;
  };

  const saveChanges = async () => {
    if (!validateForm()) return;
    if (!user || !venueId) {
      Alert.alert('Error', 'Invalid venue or user data');
      return;
    }

    setLoading(true);
    try {
      console.log('Updating venue with data:', {
        venueId,
        name: formData.name,
        city: formData.city,
        services: formData.services,
        images_count: formData.images.length
      });

      // Create venue update request (requires admin approval)
      const updateData = {
        venue_id: venueId,
        update_data: {
          name: formData.name,
          description: formData.description,
          location: formData.location,
          maps_link: formData.maps_link,
          city: formData.city,
          services: formData.services,
          day_charges: parseFloat(formData.day_charges),
          night_charges: parseFloat(formData.night_charges),
          weekday_charges: parseFloat(formData.weekday_charges),
          weekend_charges: parseFloat(formData.weekend_charges),
          opening_time: formData.opening_time,
          closing_time: formData.closing_time,
          days_available: formData.days_available,
          fields: formData.fields,
          images: formData.images,
        },
        status: 'pending',
        requested_by: user.id,
      };

      const { error: updateError } = await supabase
        .from('venue_updates')
        .insert(updateData);

      if (updateError) {
        console.error('Venue update request error:', updateError);
        throw updateError;
      }

      // Update venue status immediately (doesn't require approval)
      const { error: statusError } = await supabase
        .from('venues')
        .update({ status: formData.status })
        .eq('id', venueId);

      if (statusError) {
        console.error('Venue status update error:', statusError);
        // Don't throw error - update request was successful
      }

      // Update field statuses immediately (doesn't require approval)
      for (const field of formData.fields) {
        if (field.id) {
          const { error: fieldStatusError } = await supabase
            .from('venue_fields')
            .update({ status: field.status || 'open' })
            .eq('id', field.id);

          if (fieldStatusError) {
            console.error('Field status update error:', fieldStatusError);
            // Don't throw error - continue with other updates
          }
        }
      }

      Alert.alert(
        'Success!',
        'Your venue update has been submitted for admin approval. Status changes are applied immediately.',
        [{
          text: 'OK',
          onPress: () => {
            router.back();
          }
        }]
      );
    } catch (error: any) {
      console.error('Error updating venue:', error);
      Alert.alert('Error', 'Failed to update venue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading venue data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VenueOwnerHeader
        title="Edit Venue"
        showBackButton={true}
        onBackPress={() => router.back()}
      />

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={saveChanges}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.venueTitle}>{originalVenue?.name}</Text>
        <Text style={styles.venueSubtitle}>
          Status: {originalVenue?.approval_status} • {formData.status}
        </Text>

        {/* Venue Status Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue Status</Text>
          <View style={styles.statusToggle}>
            <Text style={styles.statusLabel}>
              {formData.status === 'open' ? 'Open for Bookings' : 'Closed for Bookings'}
            </Text>
            <Switch
              value={formData.status === 'open'}
              onValueChange={(value) => updateFormData('status', value ? 'open' : 'closed')}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={formData.status === 'open' ? '#007AFF' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.statusNote}>
            Status changes are applied immediately and don't require approval.
          </Text>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Venue Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => updateFormData('name', text)}
              placeholder="Enter venue name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              placeholder="Describe your venue"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) => updateFormData('location', text)}
              placeholder="Full address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => updateFormData('city', text)}
              placeholder="City name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Google Maps Link</Text>
            <TextInput
              style={styles.input}
              value={formData.maps_link}
              onChangeText={(text) => updateFormData('maps_link', text)}
              placeholder="https://maps.google.com/..."
            />
          </View>
        </View>

        {/* Pricing Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <Text style={styles.subtitle}>Set your venue pricing rates</Text>

          <View style={styles.pricingGrid}>
            <View style={styles.pricingItem}>
              <Text style={styles.label}>Day Rate (6AM-6PM)</Text>
              <TextInput
                style={styles.input}
                value={formData.day_charges}
                onChangeText={(text) => updateFormData('day_charges', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.pricingItem}>
              <Text style={styles.label}>Night Rate (6PM-6AM)</Text>
              <TextInput
                style={styles.input}
                value={formData.night_charges}
                onChangeText={(text) => updateFormData('night_charges', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.pricingGrid}>
            <View style={styles.pricingItem}>
              <Text style={styles.label}>Weekday Rate</Text>
              <TextInput
                style={styles.input}
                value={formData.weekday_charges}
                onChangeText={(text) => updateFormData('weekday_charges', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.pricingItem}>
              <Text style={styles.label}>Weekend Rate</Text>
              <TextInput
                style={styles.input}
                value={formData.weekend_charges}
                onChangeText={(text) => updateFormData('weekend_charges', text)}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Operating Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operating Hours</Text>
          <Text style={styles.subtitle}>Set your venue's operating hours</Text>

          <View style={styles.timeGrid}>
            <View style={styles.timeItem}>
              <Text style={styles.label}>Opening Time</Text>
              <TextInput
                style={styles.input}
                value={formData.opening_time}
                onChangeText={(text) => updateFormData('opening_time', text)}
                placeholder="06:00"
              />
            </View>
            <View style={styles.timeItem}>
              <Text style={styles.label}>Closing Time</Text>
              <TextInput
                style={styles.input}
                value={formData.closing_time}
                onChangeText={(text) => updateFormData('closing_time', text)}
                placeholder="23:00"
              />
            </View>
          </View>
        </View>

        {/* Available Days */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Days</Text>
          <Text style={styles.subtitle}>Select the days your venue is available</Text>

          <View style={styles.daysContainer}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayButton,
                  formData.days_available.includes(day.value) && styles.dayButtonActive
                ]}
                onPress={() => toggleDay(day.value)}
              >
                <Text style={[
                  styles.dayButtonText,
                  formData.days_available.includes(day.value) && styles.dayButtonTextActive
                ]}>
                  {day.label.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services & Amenities</Text>
          <Text style={styles.subtitle}>Select the services available at your venue</Text>

          <View style={styles.servicesContainer}>
            {SERVICES_OPTIONS.map((service) => (
              <TouchableOpacity
                key={service}
                style={[
                  styles.serviceButton,
                  formData.services.includes(service) && styles.serviceButtonActive
                ]}
                onPress={() => toggleService(service)}
              >
                <Text style={[
                  styles.serviceButtonText,
                  formData.services.includes(service) && styles.serviceButtonTextActive
                ]}>
                  {service}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue Images</Text>
          <Text style={styles.subtitle}>Add photos to showcase your venue</Text>

          <VenueImageGallery
            images={formData.images}
            onImagesChange={(images) => updateFormData('images', images)}
            maxImages={10}
          />
        </View>

        {/* Fields Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue Fields</Text>
          <Text style={styles.subtitle}>Configure the fields available at your venue</Text>

          {formData.fields.map((field, index) => (
            <View key={field.id || index} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldTitle}>Field {index + 1}</Text>
                <View style={styles.fieldActions}>
                  <TouchableOpacity
                    style={styles.fieldStatusButton}
                    onPress={() => updateField(index, 'status', field.status === 'open' ? 'closed' : 'open')}
                  >
                    <Ionicons
                      name={field.status === 'open' ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={field.status === 'open' ? '#4CAF50' : '#F44336'}
                    />
                    <Text style={[
                      styles.fieldStatusText,
                      { color: field.status === 'open' ? '#4CAF50' : '#F44336' }
                    ]}>
                      {field.status === 'open' ? 'Open' : 'Closed'}
                    </Text>
                  </TouchableOpacity>
                  {formData.fields.length > 1 && (
                    <TouchableOpacity onPress={() => removeField(index)}>
                      <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.fieldInputs}>
                <View style={styles.fieldInputGroup}>
                  <Text style={styles.label}>Field Number</Text>
                  <TextInput
                    style={styles.input}
                    value={field.field_number}
                    onChangeText={(text) => updateField(index, 'field_number', text)}
                    placeholder="1"
                  />
                </View>
                <View style={styles.fieldInputGroup}>
                  <Text style={styles.label}>Field Name</Text>
                  <TextInput
                    style={styles.input}
                    value={field.field_name}
                    onChangeText={(text) => updateField(index, 'field_name', text)}
                    placeholder="Main Field"
                  />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addFieldButton} onPress={addField}>
            <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
            <Text style={styles.addFieldText}>Add Another Field</Text>
          </TouchableOpacity>
        </View>

        {/* Update Notice */}
        <View style={styles.updateNotice}>
          <Ionicons name="information-circle" size={20} color="#FF9800" />
          <Text style={styles.updateNoticeText}>
            Changes to venue details require admin approval before going live. Field status changes are applied immediately.
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => router.push('/venue-announcements')}
          >
            <Ionicons name="megaphone" size={20} color="#007AFF" />
            <Text style={styles.quickActionText}>Manage Announcements</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    backgroundColor: '#E8F5E8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  content: {
    flex: 1,
    padding: 20,
  },
  venueTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  venueSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 15,
    padding: 20,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statusNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  updateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  updateNoticeText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#E65100',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  fieldCard: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  fieldTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  fieldActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  fieldStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  fieldStatusText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  fieldInputs: {
    flexDirection: 'row',
    gap: 15,
  },
  fieldInputGroup: {
    flex: 1,
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 10,
    backgroundColor: '#f8f9ff',
  },
  addFieldText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  pricingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  pricingItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  timeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: '13%',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  dayButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  dayButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  serviceButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  serviceButtonText: {
    fontSize: 14,
    color: '#666',
  },
  serviceButtonTextActive: {
    color: '#fff',
  },
  quickActionsSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  quickActionText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#228B22',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
