import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { useRouter } from 'expo-router';
import { VenueImageGallery } from '../../components/VenueImageGallery';

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
}

interface VenueField {
  field_number: string;
  field_name: string;
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

export default function VenueCreateScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
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
    days_available: [1, 2, 3, 4, 5, 6, 0], // Default: all days
    fields: [{ field_number: '1', field_name: 'Main Field' }],
    images: [],
  });

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
    const requiredFields = [
      'name', 'location', 'maps_link', 'city', 'day_charges', 'night_charges',
      'weekday_charges', 'weekend_charges'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof VenueFormData]) {
        Alert.alert('Validation Error', `${field.replace('_', ' ').replace('maps link', 'Google Maps link')} is required`);
        return false;
      }
    }

    if (formData.services.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one service');
      return false;
    }

    if (formData.days_available.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one available day');
      return false;
    }

    if (formData.images.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one venue image');
      return false;
    }

    // Validate pricing fields are valid numbers
    const pricingFields = ['day_charges', 'night_charges', 'weekday_charges', 'weekend_charges'];
    for (const field of pricingFields) {
      const value = formData[field as keyof VenueFormData] as string;
      if (isNaN(parseFloat(value)) || parseFloat(value) < 0) {
        Alert.alert('Validation Error', `${field.replace('_', ' ')} must be a valid positive number`);
        return false;
      }
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.opening_time)) {
      Alert.alert('Validation Error', 'Opening time must be in HH:MM format');
      return false;
    }
    if (!timeRegex.test(formData.closing_time)) {
      Alert.alert('Validation Error', 'Closing time must be in HH:MM format');
      return false;
    }

    // Validate opening time is before closing time
    const openingMinutes = parseInt(formData.opening_time.split(':')[0]) * 60 + parseInt(formData.opening_time.split(':')[1]);
    const closingMinutes = parseInt(formData.closing_time.split(':')[0]) * 60 + parseInt(formData.closing_time.split(':')[1]);
    if (openingMinutes >= closingMinutes) {
      Alert.alert('Validation Error', 'Opening time must be before closing time');
      return false;
    }

    return true;
  };

  const uploadImageToSupabase = async (uri: string, venueId: string): Promise<string> => {
    try {
      console.log('Starting image upload for venue:', venueId);

      // Create a unique filename
      const fileName = `venue-${venueId}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `venues/${fileName}`;

      // For React Native, we need to use FormData for file uploads
      const formData = new FormData();

      // Create file object for React Native
      const fileObject = {
        uri: uri,
        type: 'image/jpeg',
        name: fileName,
      } as any;

      formData.append('file', fileObject);

      console.log('Uploading image with FormData approach');

      // Alternative approach: Use the decode method for React Native
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      console.log('Image converted to Uint8Array:', { size: uint8Array.length });

      const { data, error } = await supabase.storage
        .from('venue-images')
        .upload(filePath, uint8Array, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Supabase storage error:', error);
        throw error;
      }

      console.log('Image uploaded successfully:', data);

      const { data: urlData } = supabase.storage
        .from('venue-images')
        .getPublicUrl(data.path);

      console.log('Public URL generated:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const generateTimeSlots = async (venueId: string, fields: any[]) => {
    try {
      const timeSlots: any[] = [];

      // Parse opening and closing times
      const openingHour = parseInt(formData.opening_time.split(':')[0]);
      const closingHour = parseInt(formData.closing_time.split(':')[0]);

      // Generate hourly slots for each day and field
      for (const dayOfWeek of formData.days_available) {
        for (let hour = openingHour; hour < closingHour; hour++) {
          const startTime = `${hour.toString().padStart(2, '0')}:00`;
          const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

          // Create slots for the venue (general slots)
          timeSlots.push({
            venue_id: venueId,
            field_id: null, // General venue slot
            start_time: startTime,
            end_time: endTime,
            day_of_week: dayOfWeek,
            is_active: true,
          });

          // Create slots for each field
          for (const field of fields) {
            // We'll need to get the field ID after insertion
            // For now, we'll create these in a separate query
          }
        }
      }

      // Insert general venue time slots
      if (timeSlots.length > 0) {
        const { error: slotsError } = await supabase
          .from('time_slots')
          .insert(timeSlots);

        if (slotsError) {
          console.error('Error creating time slots:', slotsError);
          // Don't throw error - venue can exist without time slots initially
        } else {
          console.log('Time slots created successfully:', timeSlots.length);
        }
      }

      // Create field-specific time slots
      const { data: createdFields, error: fieldsQueryError } = await supabase
        .from('venue_fields')
        .select('id')
        .eq('venue_id', venueId);

      if (!fieldsQueryError && createdFields) {
        const fieldTimeSlots: any[] = [];

        for (const field of createdFields) {
          for (const dayOfWeek of formData.days_available) {
            for (let hour = openingHour; hour < closingHour; hour++) {
              const startTime = `${hour.toString().padStart(2, '0')}:00`;
              const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

              fieldTimeSlots.push({
                venue_id: venueId,
                field_id: field.id,
                start_time: startTime,
                end_time: endTime,
                day_of_week: dayOfWeek,
                is_active: true,
              });
            }
          }
        }

        if (fieldTimeSlots.length > 0) {
          const { error: fieldSlotsError } = await supabase
            .from('time_slots')
            .insert(fieldTimeSlots);

          if (fieldSlotsError) {
            console.error('Error creating field time slots:', fieldSlotsError);
          } else {
            console.log('Field time slots created successfully:', fieldTimeSlots.length);
          }
        }
      }
    } catch (error) {
      console.error('Error generating time slots:', error);
    }
  };

  const submitVenue = async () => {
    if (!validateForm()) return;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a venue');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating venue with data:', {
        owner_id: user.id,
        name: formData.name,
        city: formData.city,
        services: formData.services,
        images_count: formData.images.length
      });

      // Create venue record first
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .insert({
          owner_id: user.id,
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
          approval_status: 'pending',
        })
        .select()
        .single();

      if (venueError) {
        console.error('Venue creation error:', venueError);
        throw venueError;
      }

      console.log('Venue created successfully:', venue.id);

      // Upload images and create venue image records
      let imageRecords: any[] = [];

      if (formData.images.length > 0) {
        try {
          console.log('Processing', formData.images.length, 'images for venue:', venue.id);

          const imagePromises = formData.images.map(async (image, index) => {
            let imageUrl = image.image_url;

            // Upload image if it's a local file
            if (image.local_uri) {
              try {
                imageUrl = await uploadImageToSupabase(image.local_uri, venue.id);
                console.log(`Image ${index + 1} uploaded successfully`);
              } catch (uploadError) {
                console.error(`Failed to upload image ${index + 1}:`, uploadError);
                // Skip this image if upload fails
                return null;
              }
            }

            return {
              venue_id: venue.id,
              image_url: imageUrl,
              is_primary: image.is_primary,
              display_order: index,
            };
          });

          const uploadResults = await Promise.all(imagePromises);
          imageRecords = uploadResults.filter(record => record !== null);

          if (imageRecords.length > 0) {
            const { error: imagesError } = await supabase
              .from('venue_images')
              .insert(imageRecords);

            if (imagesError) {
              console.error('Error saving image records:', imagesError);
              // Don't throw error - venue can exist without images
            } else {
              console.log('Image records saved successfully:', imageRecords.length);
            }
          }
        } catch (error) {
          console.error('Error processing images:', error);
          // Continue with venue creation even if images fail
        }
      }

      // Create venue fields
      console.log('Creating venue fields:', formData.fields.length);
      const fieldsToInsert = formData.fields.map(field => ({
        venue_id: venue.id,
        field_number: field.field_number,
        field_name: field.field_name,
      }));

      const { error: fieldsError } = await supabase
        .from('venue_fields')
        .insert(fieldsToInsert);

      if (fieldsError) {
        console.error('Venue fields creation error:', fieldsError);
        throw fieldsError;
      }

      console.log('Venue fields created successfully');

      // Generate time slots for the venue
      console.log('Generating time slots for venue');
      await generateTimeSlots(venue.id, fieldsToInsert);

      Alert.alert(
        'Success!',
        'Your venue has been submitted for admin approval. You will be notified once it\'s reviewed.',
        [{
          text: 'OK',
          onPress: () => {
            // Navigate to venues tab to show the new venue
            router.replace('/(venue-owner-tabs)/venues');
          }
        }]
      );
    } catch (error: any) {
      console.error('Error creating venue:', error);
      Alert.alert('Error', 'Failed to create venue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5].map(step => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive
          ]}>
            <Text style={[
              styles.stepText,
              currentStep >= step && styles.stepTextActive
            ]}>
              {step}
            </Text>
          </View>
          {step < 5 && <View style={styles.stepLine} />}
        </View>
      ))}
    </View>
  );

  const renderBasicInfo = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Venue Name *</Text>
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
        <Text style={styles.label}>Location *</Text>
        <TextInput
          style={styles.input}
          value={formData.location}
          onChangeText={(text) => updateFormData('location', text)}
          placeholder="Full address"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          value={formData.city}
          onChangeText={(text) => updateFormData('city', text)}
          placeholder="City name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Google Maps Link *</Text>
        <TextInput
          style={styles.input}
          value={formData.maps_link}
          onChangeText={(text) => updateFormData('maps_link', text)}
          placeholder="https://maps.google.com/..."
        />
      </View>
    </View>
  );

  const renderServices = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Services & Facilities</Text>
      <Text style={styles.subtitle}>Select all services available at your venue</Text>

      <View style={styles.servicesGrid}>
        {SERVICES_OPTIONS.map(service => (
          <TouchableOpacity
            key={service}
            style={[
              styles.serviceItem,
              formData.services.includes(service) && styles.serviceItemSelected
            ]}
            onPress={() => toggleService(service)}
          >
            <Ionicons
              name={formData.services.includes(service) ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={formData.services.includes(service) ? '#007AFF' : '#ccc'}
            />
            <Text style={[
              styles.serviceText,
              formData.services.includes(service) && styles.serviceTextSelected
            ]}>
              {service}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderPricingAndAvailability = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Pricing & Availability</Text>

      {/* Pricing Section */}
      <Text style={styles.sectionTitle}>Pricing (per hour)</Text>
      <View style={styles.pricingGrid}>
        <View style={styles.priceInputGroup}>
          <Text style={styles.label}>Day Charges *</Text>
          <TextInput
            style={styles.input}
            value={formData.day_charges}
            onChangeText={(text) => updateFormData('day_charges', text)}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.priceInputGroup}>
          <Text style={styles.label}>Night Charges *</Text>
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
        <View style={styles.priceInputGroup}>
          <Text style={styles.label}>Weekday Charges *</Text>
          <TextInput
            style={styles.input}
            value={formData.weekday_charges}
            onChangeText={(text) => updateFormData('weekday_charges', text)}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.priceInputGroup}>
          <Text style={styles.label}>Weekend Charges *</Text>
          <TextInput
            style={styles.input}
            value={formData.weekend_charges}
            onChangeText={(text) => updateFormData('weekend_charges', text)}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Operating Hours */}
      <Text style={styles.sectionTitle}>Operating Hours</Text>
      <View style={styles.timeGrid}>
        <View style={styles.timeInputGroup}>
          <Text style={styles.label}>Opening Time *</Text>
          <TextInput
            style={styles.input}
            value={formData.opening_time}
            onChangeText={(text) => updateFormData('opening_time', text)}
            placeholder="06:00"
          />
        </View>
        <View style={styles.timeInputGroup}>
          <Text style={styles.label}>Closing Time *</Text>
          <TextInput
            style={styles.input}
            value={formData.closing_time}
            onChangeText={(text) => updateFormData('closing_time', text)}
            placeholder="23:00"
          />
        </View>
      </View>

      {/* Available Days */}
      <Text style={styles.sectionTitle}>Available Days</Text>
      <View style={styles.daysGrid}>
        {DAYS_OF_WEEK.map(day => (
          <TouchableOpacity
            key={day.value}
            style={[
              styles.dayItem,
              formData.days_available.includes(day.value) && styles.dayItemSelected
            ]}
            onPress={() => toggleDay(day.value)}
          >
            <Text style={[
              styles.dayText,
              formData.days_available.includes(day.value) && styles.dayTextSelected
            ]}>
              {day.label.substring(0, 3)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFields = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Venue Fields</Text>
      <Text style={styles.subtitle}>Configure the fields available at your venue</Text>

      {formData.fields.map((field, index) => (
        <View key={index} style={styles.fieldCard}>
          <View style={styles.fieldHeader}>
            <Text style={styles.fieldTitle}>Field {index + 1}</Text>
            {formData.fields.length > 1 && (
              <TouchableOpacity onPress={() => removeField(index)}>
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
              </TouchableOpacity>
            )}
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
  );

  const renderImages = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Venue Images</Text>
      <Text style={styles.subtitle}>Add high-quality photos to showcase your venue</Text>

      <VenueImageGallery
        images={formData.images}
        onImagesChange={(images) => updateFormData('images', images)}
        maxImages={10}
        editable={true}
      />

      <View style={styles.imageRequirements}>
        <Text style={styles.requirementsTitle}>Photo Requirements:</Text>
        <View style={styles.requirementItem}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.requirementText}>At least 1 photo required</Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.requirementText}>High resolution (minimum 800x600)</Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.requirementText}>Show different angles of your venue</Text>
        </View>
        <View style={styles.requirementItem}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.requirementText}>First photo will be the cover image</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Venue</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderBasicInfo()}
        {currentStep === 2 && renderServices()}
        {currentStep === 3 && renderPricingAndAvailability()}
        {currentStep === 4 && renderFields()}
        {currentStep === 5 && renderImages()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.buttonSecondaryText}>Previous</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => {
            if (currentStep < 5) {
              setCurrentStep(currentStep + 1);
            } else {
              submitVenue();
            }
          }}
          disabled={loading}
        >
          <Text style={styles.buttonPrimaryText}>
            {currentStep === 5 ? (loading ? 'Creating...' : 'Create Venue') : 'Next'}
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#007AFF',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepTextActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
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
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
  },
  serviceItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  serviceText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  serviceTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondaryText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
  },
  pricingGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  priceInputGroup: {
    flex: 1,
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  timeInputGroup: {
    flex: 1,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayItem: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  dayItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  dayText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#007AFF',
  },
  fieldCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  fieldTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: '#f0f8ff',
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addFieldText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  imageRequirements: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
});
