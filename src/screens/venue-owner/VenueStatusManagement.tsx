import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { VenueOwnerHeader } from '../../components/VenueOwnerHeader';
import { VenueStatusToggle } from '../../components/VenueStatusToggle';
import { FieldManagement } from '../../components/FieldManagement';

interface Venue {
  id: string;
  name: string;
  location: string;
  status: 'open' | 'closed';
  approval_status: 'pending' | 'approved' | 'rejected';
  venue_fields?: Array<{
    id: string;
    field_name: string;
    field_number: string;
    status: 'open' | 'closed';
  }>;
}

export default function VenueStatusManagement() {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedVenue, setExpandedVenue] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadVenues();
    }
  }, [user]);

  const loadVenues = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('venues')
        .select(`
          id,
          name,
          location,
          status,
          approval_status,
          venue_fields (
            id,
            field_name,
            field_number,
            status
          )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

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

  const handleVenueStatusChange = (venueId: string, newStatus: 'open' | 'closed') => {
    setVenues(prev => prev.map(venue => 
      venue.id === venueId ? { ...venue, status: newStatus } : venue
    ));
  };

  const toggleVenueExpansion = (venueId: string) => {
    setExpandedVenue(expandedVenue === venueId ? null : venueId);
  };

  const bulkUpdateStatus = async (newStatus: 'open' | 'closed') => {
    const approvedVenues = venues.filter(v => v.approval_status === 'approved');
    
    if (approvedVenues.length === 0) {
      Alert.alert('No Venues', 'You have no approved venues to update.');
      return;
    }

    const action = newStatus === 'open' ? 'open' : 'close';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} All Venues`,
      `Are you sure you want to ${action} all ${approvedVenues.length} approved venues?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `${action.charAt(0).toUpperCase() + action.slice(1)} All`,
          style: newStatus === 'closed' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const venueIds = approvedVenues.map(v => v.id);
              
              const { error } = await supabase
                .from('venues')
                .update({ 
                  status: newStatus,
                  updated_at: new Date().toISOString()
                })
                .in('id', venueIds);

              if (error) {
                console.error('Error bulk updating venues:', error);
                Alert.alert('Error', 'Failed to update venues');
                return;
              }

              // Update local state
              setVenues(prev => prev.map(venue => 
                approvedVenues.some(av => av.id === venue.id) 
                  ? { ...venue, status: newStatus }
                  : venue
              ));

              Alert.alert('Success', `All approved venues are now ${newStatus}`);
            } catch (error) {
              console.error('Error bulk updating venues:', error);
              Alert.alert('Error', 'Failed to update venues');
            }
          }
        }
      ]
    );
  };

  const getVenueStatusSummary = () => {
    const approved = venues.filter(v => v.approval_status === 'approved');
    const open = approved.filter(v => v.status === 'open').length;
    const closed = approved.filter(v => v.status === 'closed').length;
    
    return { total: approved.length, open, closed };
  };

  const summary = getVenueStatusSummary();

  return (
    <View style={styles.container}>
      <VenueOwnerHeader title="Venue Status Management" />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Status Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{summary.total}</Text>
            <Text style={styles.statLabel}>Total Venues</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{summary.open}</Text>
            <Text style={styles.statLabel}>Open</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#F44336' }]}>{summary.closed}</Text>
            <Text style={styles.statLabel}>Closed</Text>
          </View>
        </View>
      </View>

      {/* Bulk Actions */}
      {summary.total > 1 && (
        <View style={styles.bulkActions}>
          <Text style={styles.bulkActionsTitle}>Quick Actions</Text>
          <View style={styles.bulkButtons}>
            <TouchableOpacity
              style={[styles.bulkButton, styles.openAllButton]}
              onPress={() => bulkUpdateStatus('open')}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.bulkButtonText}>Open All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bulkButton, styles.closeAllButton]}
              onPress={() => bulkUpdateStatus('closed')}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.bulkButtonText}>Close All</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Venues List */}
      <View style={styles.venuesSection}>
        <Text style={styles.sectionTitle}>Individual Venue Control</Text>
        
        {venues.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Venues Found</Text>
            <Text style={styles.emptyStateText}>
              Add venues to manage their availability
            </Text>
          </View>
        ) : (
          venues.map((venue) => (
            <View key={venue.id} style={styles.venueCard}>
              <View style={styles.venueHeader}>
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName}>{venue.name}</Text>
                  <Text style={styles.venueLocation}>{venue.location}</Text>
                  {venue.approval_status !== 'approved' && (
                    <Text style={[
                      styles.approvalStatus,
                      { color: venue.approval_status === 'pending' ? '#FF9800' : '#F44336' }
                    ]}>
                      {venue.approval_status === 'pending' ? 'Pending Approval' : 'Rejected'}
                    </Text>
                  )}
                </View>
                
                {venue.approval_status === 'approved' && (
                  <VenueStatusToggle
                    venueId={venue.id}
                    currentStatus={venue.status}
                    venueName={venue.name}
                    onStatusChange={(newStatus) => handleVenueStatusChange(venue.id, newStatus)}
                    showLabel={false}
                    size="small"
                  />
                )}
              </View>

              {venue.approval_status === 'approved' && venue.venue_fields && venue.venue_fields.length > 0 && (
                <View style={styles.fieldsSection}>
                  <TouchableOpacity
                    style={styles.fieldsToggle}
                    onPress={() => toggleVenueExpansion(venue.id)}
                  >
                    <Text style={styles.fieldsToggleText}>
                      Manage Fields ({venue.venue_fields.length})
                    </Text>
                    <Ionicons
                      name={expandedVenue === venue.id ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                  
                  {expandedVenue === venue.id && (
                    <View style={styles.fieldsContainer}>
                      <FieldManagement
                        venueId={venue.id}
                        onFieldUpdate={loadVenues}
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          ))
        )}
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
  summaryCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  bulkActions: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 10,
  },
  bulkActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  bulkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  openAllButton: {
    backgroundColor: '#4CAF50',
  },
  closeAllButton: {
    backgroundColor: '#F44336',
  },
  bulkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  venuesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  venueCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  venueLocation: {
    fontSize: 14,
    color: '#666',
  },
  approvalStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  fieldsSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  fieldsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  fieldsToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  fieldsContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
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
  },
});
