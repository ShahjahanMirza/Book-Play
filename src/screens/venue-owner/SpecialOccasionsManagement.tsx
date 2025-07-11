import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { SpecialOccasionsService, SpecialOccasion } from '../../services/specialOccasionsService';

interface Venue {
  id: string;
  name: string;
  venue_fields?: Array<{
    id: string;
    field_name: string;
    field_number: string;
  }>;
}

export default function SpecialOccasionsManagement() {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [occasions, setOccasions] = useState<SpecialOccasion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (user) {
      loadVenues();
    }
  }, [user]);

  useEffect(() => {
    if (selectedVenue) {
      loadOccasions();
    }
  }, [selectedVenue]);

  const loadVenues = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          venue_fields (
            id,
            field_name,
            field_number
          )
        `)
        .eq('owner_id', user.id)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading venues:', error);
        Alert.alert('Error', 'Failed to load venues');
        return;
      }

      setVenues(data || []);
      if (data && data.length > 0 && !selectedVenue) {
        setSelectedVenue(data[0].id);
      }
    } catch (error) {
      console.error('Error loading venues:', error);
      Alert.alert('Error', 'Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const loadOccasions = async () => {
    if (!selectedVenue) return;

    try {
      const data = await SpecialOccasionsService.getVenueSpecialOccasions(selectedVenue);
      setOccasions(data);
    } catch (error) {
      console.error('Error loading occasions:', error);
      Alert.alert('Error', 'Failed to load special occasions');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOccasions();
    setRefreshing(false);
  };

  const deleteOccasion = async (occasionId: string) => {
    Alert.alert(
      'Delete Special Occasion',
      'Are you sure you want to delete this special occasion? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await SpecialOccasionsService.deleteSpecialOccasion(occasionId);
              Alert.alert('Success', 'Special occasion deleted successfully');
              loadOccasions();
            } catch (error) {
              console.error('Error deleting occasion:', error);
              Alert.alert('Error', 'Failed to delete special occasion');
            }
          }
        }
      ]
    );
  };

  const applyHolidayTemplate = async (template: any) => {
    if (!selectedVenue) return;

    try {
      for (const date of template.dates) {
        await SpecialOccasionsService.createSpecialOccasion(selectedVenue, {
          title: template.title,
          description: template.description,
          start_date: date,
          end_date: date,
          override_type: template.override_type,
          is_recurring: false,
        });
      }

      Alert.alert('Success', `${template.title} holidays added successfully`);
      setShowTemplates(false);
      loadOccasions();
    } catch (error) {
      console.error('Error applying template:', error);
      Alert.alert('Error', 'Failed to apply holiday template');
    }
  };

  const getOccasionIcon = (type: string) => {
    switch (type) {
      case 'closed':
        return 'close-circle';
      case 'custom_hours':
        return 'time';
      case 'custom_pricing':
        return 'pricetag';
      default:
        return 'calendar';
    }
  };

  const getOccasionColor = (type: string) => {
    switch (type) {
      case 'closed':
        return '#F44336';
      case 'custom_hours':
        return '#FF9800';
      case 'custom_pricing':
        return '#4CAF50';
      default:
        return '#2196F3';
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (startDate === endDate) {
      return start.toLocaleDateString();
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  const selectedVenueName = venues.find(v => v.id === selectedVenue)?.name || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Special Occasions</Text>
        <Text style={styles.subtitle}>
          Manage date-specific availability overrides
        </Text>
      </View>

      {/* Venue Selector */}
      {venues.length > 1 && (
        <View style={styles.venueSelector}>
          <Text style={styles.selectorLabel}>Select Venue:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {venues.map((venue) => (
              <TouchableOpacity
                key={venue.id}
                style={[
                  styles.venueTab,
                  selectedVenue === venue.id && styles.selectedVenueTab
                ]}
                onPress={() => setSelectedVenue(venue.id)}
              >
                <Text style={[
                  styles.venueTabText,
                  selectedVenue === venue.id && styles.selectedVenueTabText
                ]}>
                  {venue.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowTemplates(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Holiday Templates</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {/* TODO: Navigate to create custom occasion */}}
        >
          <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Add Custom</Text>
        </TouchableOpacity>
      </View>

      {/* Occasions List */}
      <ScrollView
        style={styles.occasionsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {occasions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Special Occasions</Text>
            <Text style={styles.emptyStateText}>
              Add special occasions to override default availability for holidays, maintenance, or special events.
            </Text>
          </View>
        ) : (
          occasions.map((occasion) => (
            <View key={occasion.id} style={styles.occasionCard}>
              <View style={styles.occasionHeader}>
                <View style={styles.occasionInfo}>
                  <View style={styles.occasionTitleRow}>
                    <Ionicons
                      name={getOccasionIcon(occasion.override_type)}
                      size={20}
                      color={getOccasionColor(occasion.override_type)}
                    />
                    <Text style={styles.occasionTitle}>{occasion.title}</Text>
                  </View>
                  <Text style={styles.occasionDate}>
                    {formatDateRange(occasion.start_date, occasion.end_date)}
                  </Text>
                  {occasion.description && (
                    <Text style={styles.occasionDescription}>
                      {occasion.description}
                    </Text>
                  )}
                </View>
                
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteOccasion(occasion.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#F44336" />
                </TouchableOpacity>
              </View>

              <View style={styles.occasionDetails}>
                <View style={[
                  styles.typeTag,
                  { backgroundColor: getOccasionColor(occasion.override_type) + '20' }
                ]}>
                  <Text style={[
                    styles.typeTagText,
                    { color: getOccasionColor(occasion.override_type) }
                  ]}>
                    {occasion.override_type.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>

                {occasion.override_type === 'custom_hours' && (
                  <Text style={styles.customDetails}>
                    Hours: {occasion.custom_opening_time} - {occasion.custom_closing_time}
                  </Text>
                )}

                {occasion.override_type === 'custom_pricing' && (
                  <Text style={styles.customDetails}>
                    Day: Rs.{occasion.custom_day_charges} | Night: Rs.{occasion.custom_night_charges}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Holiday Templates Modal */}
      <Modal
        visible={showTemplates}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Holiday Templates</Text>
            <TouchableOpacity onPress={() => setShowTemplates(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.templatesList}>
            {SpecialOccasionsService.getHolidayTemplates().map((template, index) => (
              <TouchableOpacity
                key={index}
                style={styles.templateCard}
                onPress={() => applyHolidayTemplate(template)}
              >
                <View style={styles.templateInfo}>
                  <Text style={styles.templateTitle}>{template.title}</Text>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                  <Text style={styles.templateDates}>
                    Dates: {template.dates.join(', ')}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color="#007AFF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  venueSelector: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  venueTab: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  selectedVenueTab: {
    backgroundColor: '#007AFF',
  },
  venueTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedVenueTabText: {
    color: '#fff',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  occasionsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  occasionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  occasionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  occasionInfo: {
    flex: 1,
  },
  occasionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  occasionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  occasionDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  occasionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  deleteButton: {
    padding: 5,
  },
  occasionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  customDetails: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  templatesList: {
    flex: 1,
    padding: 20,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  templateInfo: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  templateDates: {
    fontSize: 12,
    color: '#999',
  },
});
