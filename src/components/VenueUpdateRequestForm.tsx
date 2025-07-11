import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../services/supabase';
import { VenueUpdateRequestService } from '../services/venueUpdateRequestService';

interface Venue {
  id: string;
  name: string;
  location: string;
  maps_link?: string;
  description?: string;
  weekday_day_charges: number;
  weekday_night_charges: number;
  weekend_day_charges: number;
  weekend_night_charges: number;
  opening_time: string;
  closing_time: string;
  days_available: string[];
  services: string[];
}

interface VenueUpdateRequestFormProps {
  venues: Venue[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const VenueUpdateRequestForm: React.FC<VenueUpdateRequestFormProps> = ({
  venues,
  onSuccess,
  onCancel,
}) => {
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [requestType, setRequestType] = useState<string>('');
  const [currentVenue, setCurrentVenue] = useState<Venue | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedVenue) {
      const venue = venues.find(v => v.id === selectedVenue);
      setCurrentVenue(venue || null);
      setFormData({});
      setRequestType('');
    }
  }, [selectedVenue, venues]);

  useEffect(() => {
    if (currentVenue && requestType) {
      initializeFormData();
    }
  }, [currentVenue, requestType]);

  const initializeFormData = () => {
    if (!currentVenue) return;

    switch (requestType) {
      case 'venue_info':
        setFormData({
          name: currentVenue.name,
          location: currentVenue.location,
          maps_link: currentVenue.maps_link || '',
          description: currentVenue.description || '',
        });
        break;
      case 'pricing':
        setFormData({
          weekday_day_charges: currentVenue.weekday_day_charges.toString(),
          weekday_night_charges: currentVenue.weekday_night_charges.toString(),
          weekend_day_charges: currentVenue.weekend_day_charges.toString(),
          weekend_night_charges: currentVenue.weekend_night_charges.toString(),
        });
        break;
      case 'availability':
        setFormData({
          opening_time: currentVenue.opening_time,
          closing_time: currentVenue.closing_time,
          days_available: [...currentVenue.days_available],
        });
        break;
      case 'services':
        setFormData({
          services: [...currentVenue.services],
          newService: '',
        });
        break;
      default:
        setFormData({});
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day: string) => {
    setFormData((prev: any) => ({
      ...prev,
      days_available: prev.days_available.includes(day)
        ? prev.days_available.filter((d: string) => d !== day)
        : [...prev.days_available, day]
    }));
  };

  const addService = () => {
    if (formData.newService && formData.newService.trim()) {
      setFormData((prev: any) => ({
        ...prev,
        services: [...prev.services, formData.newService.trim()],
        newService: '',
      }));
    }
  };

  const removeService = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      services: prev.services.filter((_: any, i: number) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    if (!selectedVenue) {
      Alert.alert('Validation Error', 'Please select a venue');
      return false;
    }

    if (!requestType) {
      Alert.alert('Validation Error', 'Please select a request type');
      return false;
    }

    if (!reason.trim()) {
      Alert.alert('Validation Error', 'Please provide a reason for this update');
      return false;
    }

    // Type-specific validation
    switch (requestType) {
      case 'venue_info':
        if (!formData.name?.trim()) {
          Alert.alert('Validation Error', 'Venue name is required');
          return false;
        }
        if (!formData.location?.trim()) {
          Alert.alert('Validation Error', 'Venue location is required');
          return false;
        }
        break;
      case 'pricing':
        const prices = [
          formData.weekday_day_charges,
          formData.weekday_night_charges,
          formData.weekend_day_charges,
          formData.weekend_night_charges,
        ];
        if (prices.some(price => !price || isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
          Alert.alert('Validation Error', 'All pricing fields must be valid positive numbers');
          return false;
        }
        break;
      case 'availability':
        if (!formData.opening_time || !formData.closing_time) {
          Alert.alert('Validation Error', 'Opening and closing times are required');
          return false;
        }
        if (!formData.days_available || formData.days_available.length === 0) {
          Alert.alert('Validation Error', 'At least one day must be available');
          return false;
        }
        break;
    }

    return true;
  };

  const getCurrentData = () => {
    if (!currentVenue) return {};

    switch (requestType) {
      case 'venue_info':
        return {
          name: currentVenue.name,
          location: currentVenue.location,
          maps_link: currentVenue.maps_link,
          description: currentVenue.description,
        };
      case 'pricing':
        return {
          weekday_day_charges: currentVenue.weekday_day_charges,
          weekday_night_charges: currentVenue.weekday_night_charges,
          weekend_day_charges: currentVenue.weekend_day_charges,
          weekend_night_charges: currentVenue.weekend_night_charges,
        };
      case 'availability':
        return {
          opening_time: currentVenue.opening_time,
          closing_time: currentVenue.closing_time,
          days_available: currentVenue.days_available,
        };
      case 'services':
        return {
          services: currentVenue.services,
        };
      default:
        return {};
    }
  };

  const getRequestedData = () => {
    const data = { ...formData };
    
    // Clean up form data
    if (requestType === 'pricing') {
      data.weekday_day_charges = parseFloat(data.weekday_day_charges);
      data.weekday_night_charges = parseFloat(data.weekday_night_charges);
      data.weekend_day_charges = parseFloat(data.weekend_day_charges);
      data.weekend_night_charges = parseFloat(data.weekend_night_charges);
    }

    if (requestType === 'services') {
      delete data.newService;
    }

    return data;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const currentData = getCurrentData();
      const requestedData = getRequestedData();

      await VenueUpdateRequestService.createUpdateRequest(
        selectedVenue,
        currentVenue!.owner_id || '', // This should be passed from parent
        requestType,
        currentData,
        requestedData,
        reason.trim()
      );

      Alert.alert('Success', 'Update request submitted successfully');
      onSuccess();
    } catch (error) {
      console.error('Error submitting update request:', error);
      Alert.alert('Error', 'Failed to submit update request');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (requestType) {
      case 'venue_info':
        return (
          <View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Venue Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name || ''}
                onChangeText={(text) => updateFormData('name', text)}
                placeholder="Enter venue name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location *</Text>
              <TextInput
                style={styles.input}
                value={formData.location || ''}
                onChangeText={(text) => updateFormData('location', text)}
                placeholder="Enter venue location"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Maps Link</Text>
              <TextInput
                style={styles.input}
                value={formData.maps_link || ''}
                onChangeText={(text) => updateFormData('maps_link', text)}
                placeholder="Enter Google Maps link"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description || ''}
                onChangeText={(text) => updateFormData('description', text)}
                placeholder="Enter venue description"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        );

      case 'pricing':
        return (
          <View>
            <Text style={styles.sectionTitle}>Weekday Pricing</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceInput}>
                <Text style={styles.label}>Day Charges (Rs.) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.weekday_day_charges || ''}
                  onChangeText={(text) => updateFormData('weekday_day_charges', text)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceInput}>
                <Text style={styles.label}>Night Charges (Rs.) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.weekday_night_charges || ''}
                  onChangeText={(text) => updateFormData('weekday_night_charges', text)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Weekend Pricing</Text>
            <View style={styles.priceRow}>
              <View style={styles.priceInput}>
                <Text style={styles.label}>Day Charges (Rs.) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.weekend_day_charges || ''}
                  onChangeText={(text) => updateFormData('weekend_day_charges', text)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceInput}>
                <Text style={styles.label}>Night Charges (Rs.) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.weekend_night_charges || ''}
                  onChangeText={(text) => updateFormData('weekend_night_charges', text)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        );

      case 'availability':
        return (
          <View>
            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text style={styles.label}>Opening Time *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.opening_time || ''}
                  onChangeText={(text) => updateFormData('opening_time', text)}
                  placeholder="HH:MM"
                />
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.label}>Closing Time *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.closing_time || ''}
                  onChangeText={(text) => updateFormData('closing_time', text)}
                  placeholder="HH:MM"
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Available Days *</Text>
            <View style={styles.daysContainer}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    formData.days_available?.includes(day) && styles.dayButtonActive
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    formData.days_available?.includes(day) && styles.dayButtonTextActive
                  ]}>
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'services':
        return (
          <View>
            <Text style={styles.sectionTitle}>Current Services</Text>
            <View style={styles.servicesContainer}>
              {formData.services?.map((service: string, index: number) => (
                <View key={index} style={styles.serviceItem}>
                  <Text style={styles.serviceText}>{service}</Text>
                  <TouchableOpacity
                    onPress={() => removeService(index)}
                    style={styles.removeServiceButton}
                  >
                    <Ionicons name="close" size={16} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.addServiceContainer}>
              <TextInput
                style={[styles.input, styles.addServiceInput]}
                value={formData.newService || ''}
                onChangeText={(text) => updateFormData('newService', text)}
                placeholder="Add new service"
              />
              <TouchableOpacity
                style={styles.addServiceButton}
                onPress={addService}
              >
                <Ionicons name="add" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        {/* Venue Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Venue *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedVenue}
              onValueChange={setSelectedVenue}
              style={styles.picker}
            >
              <Picker.Item label="Select a venue..." value="" />
              {venues.map((venue) => (
                <Picker.Item key={venue.id} label={venue.name} value={venue.id} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Request Type Selection */}
        {selectedVenue && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Request Type *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={requestType}
                onValueChange={setRequestType}
                style={styles.picker}
              >
                <Picker.Item label="Select request type..." value="" />
                <Picker.Item label="Venue Information" value="venue_info" />
                <Picker.Item label="Pricing" value="pricing" />
                <Picker.Item label="Availability" value="availability" />
                <Picker.Item label="Services" value="services" />
              </Picker>
            </View>
          </View>
        )}

        {/* Form Fields */}
        {requestType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Update Details</Text>
            {renderFormFields()}
          </View>
        )}

        {/* Reason */}
        {requestType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for Update *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Explain why this update is needed..."
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading || !requestType}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
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
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  priceInput: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  timeInput: {
    flex: 1,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  dayButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
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
    marginBottom: 15,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  removeServiceButton: {
    padding: 4,
  },
  addServiceContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  addServiceInput: {
    flex: 1,
  },
  addServiceButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});
