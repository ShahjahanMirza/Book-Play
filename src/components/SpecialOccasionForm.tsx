import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { SpecialOccasionsService } from '../services/specialOccasionsService';

interface SpecialOccasionFormProps {
  venueId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SpecialOccasionForm: React.FC<SpecialOccasionFormProps> = ({
  venueId,
  onSuccess,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    overrideType: 'closed' as 'closed' | 'custom_hours' | 'custom_pricing',
    customOpeningTime: '06:00',
    customClosingTime: '23:00',
    customDayCharges: '',
    customNightCharges: '',
    isRecurring: false,
    recurrencePattern: 'yearly' as 'weekly' | 'monthly' | 'yearly',
  });
  const [loading, setLoading] = useState(false);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return false;
    }

    if (!formData.startDate) {
      Alert.alert('Validation Error', 'Start date is required');
      return false;
    }

    if (!formData.endDate) {
      Alert.alert('Validation Error', 'End date is required');
      return false;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      Alert.alert('Validation Error', 'Start date must be before or equal to end date');
      return false;
    }

    if (formData.overrideType === 'custom_pricing') {
      if (!formData.customDayCharges || !formData.customNightCharges) {
        Alert.alert('Validation Error', 'Custom pricing requires both day and night charges');
        return false;
      }

      if (isNaN(parseFloat(formData.customDayCharges)) || isNaN(parseFloat(formData.customNightCharges))) {
        Alert.alert('Validation Error', 'Pricing must be valid numbers');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const occasionData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        start_date: formData.startDate,
        end_date: formData.endDate,
        override_type: formData.overrideType,
        custom_opening_time: formData.overrideType === 'custom_hours' ? formData.customOpeningTime : undefined,
        custom_closing_time: formData.overrideType === 'custom_hours' ? formData.customClosingTime : undefined,
        custom_day_charges: formData.overrideType === 'custom_pricing' ? parseFloat(formData.customDayCharges) : undefined,
        custom_night_charges: formData.overrideType === 'custom_pricing' ? parseFloat(formData.customNightCharges) : undefined,
        is_recurring: formData.isRecurring,
        recurrence_pattern: formData.isRecurring ? formData.recurrencePattern : undefined,
      };

      await SpecialOccasionsService.createSpecialOccasion(venueId, occasionData);

      Alert.alert('Success', 'Special occasion created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating special occasion:', error);
      Alert.alert('Error', 'Failed to create special occasion');
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Special Occasion</Text>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => updateFormData('title', text)}
              placeholder="e.g., Maintenance Day, Holiday Closure"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => updateFormData('description', text)}
              placeholder="Optional description"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Date Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          
          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Text style={styles.label}>Start Date *</Text>
              <TextInput
                style={styles.input}
                value={formData.startDate}
                onChangeText={(text) => updateFormData('startDate', text)}
                placeholder="YYYY-MM-DD"
              />
            </View>
            
            <View style={styles.dateInput}>
              <Text style={styles.label}>End Date *</Text>
              <TextInput
                style={styles.input}
                value={formData.endDate}
                onChangeText={(text) => updateFormData('endDate', text)}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>
        </View>

        {/* Override Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Override Type</Text>
          
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.overrideType}
              onValueChange={(value) => updateFormData('overrideType', value)}
              style={styles.picker}
            >
              <Picker.Item label="Venue Closed" value="closed" />
              <Picker.Item label="Custom Hours" value="custom_hours" />
              <Picker.Item label="Custom Pricing" value="custom_pricing" />
            </Picker>
          </View>
        </View>

        {/* Custom Hours */}
        {formData.overrideType === 'custom_hours' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Hours</Text>
            
            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text style={styles.label}>Opening Time</Text>
                <TextInput
                  style={styles.input}
                  value={formData.customOpeningTime}
                  onChangeText={(text) => updateFormData('customOpeningTime', text)}
                  placeholder="HH:MM"
                />
              </View>
              
              <View style={styles.timeInput}>
                <Text style={styles.label}>Closing Time</Text>
                <TextInput
                  style={styles.input}
                  value={formData.customClosingTime}
                  onChangeText={(text) => updateFormData('customClosingTime', text)}
                  placeholder="HH:MM"
                />
              </View>
            </View>
          </View>
        )}

        {/* Custom Pricing */}
        {formData.overrideType === 'custom_pricing' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Custom Pricing</Text>
            
            <View style={styles.priceRow}>
              <View style={styles.priceInput}>
                <Text style={styles.label}>Day Charges (Rs.)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.customDayCharges}
                  onChangeText={(text) => updateFormData('customDayCharges', text)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.priceInput}>
                <Text style={styles.label}>Night Charges (Rs.)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.customNightCharges}
                  onChangeText={(text) => updateFormData('customNightCharges', text)}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
        )}

        {/* Recurrence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recurrence</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Recurring Event</Text>
            <Switch
              value={formData.isRecurring}
              onValueChange={(value) => updateFormData('isRecurring', value)}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={formData.isRecurring ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          {formData.isRecurring && (
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.recurrencePattern}
                onValueChange={(value) => updateFormData('recurrencePattern', value)}
                style={styles.picker}
              >
                <Picker.Item label="Weekly" value="weekly" />
                <Picker.Item label="Monthly" value="monthly" />
                <Picker.Item label="Yearly" value="yearly" />
              </Picker>
            </View>
          )}
        </View>

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
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Creating...' : 'Create'}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    height: 80,
    textAlignVertical: 'top',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 15,
  },
  dateInput: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 15,
  },
  timeInput: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 15,
  },
  priceInput: {
    flex: 1,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
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
