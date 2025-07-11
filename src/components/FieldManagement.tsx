import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

interface Field {
  id: string;
  field_name: string;
  field_number: string;
  status: 'open' | 'closed';
  venue_id: string;
}

interface FieldManagementProps {
  venueId: string;
  onFieldUpdate?: () => void;
}

export const FieldManagement: React.FC<FieldManagementProps> = ({
  venueId,
  onFieldUpdate,
}) => {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFields();
  }, [venueId]);

  const loadFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('venue_fields')
        .select('*')
        .eq('venue_id', venueId)
        .order('field_number');

      if (error) {
        console.error('Error loading fields:', error);
        throw error;
      }

      setFields(data || []);
    } catch (error) {
      console.error('Error loading fields:', error);
      Alert.alert('Error', 'Failed to load venue fields');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFields();
    setRefreshing(false);
  };

  const toggleFieldStatus = async (fieldId: string, currentStatus: 'open' | 'closed') => {
    try {
      const newStatus = currentStatus === 'open' ? 'closed' : 'open';
      
      const { error } = await supabase
        .from('venue_fields')
        .update({ status: newStatus })
        .eq('id', fieldId);

      if (error) {
        console.error('Error updating field status:', error);
        Alert.alert('Error', 'Failed to update field status');
        return;
      }

      // Update local state
      setFields(prev => prev.map(field => 
        field.id === fieldId ? { ...field, status: newStatus } : field
      ));

      onFieldUpdate?.();
    } catch (error) {
      console.error('Error toggling field status:', error);
      Alert.alert('Error', 'Failed to update field status');
    }
  };

  const renderField = ({ item }: { item: Field }) => (
    <View style={styles.fieldCard}>
      <View style={styles.fieldInfo}>
        <Text style={styles.fieldName}>{item.field_name}</Text>
        <Text style={styles.fieldNumber}>Field #{item.field_number}</Text>
      </View>
      
      <TouchableOpacity
        style={[
          styles.statusButton,
          item.status === 'open' ? styles.openButton : styles.closedButton
        ]}
        onPress={() => toggleFieldStatus(item.id, item.status)}
      >
        <Ionicons
          name={item.status === 'open' ? 'checkmark-circle' : 'close-circle'}
          size={16}
          color="#fff"
        />
        <Text style={styles.statusButtonText}>
          {item.status === 'open' ? 'Open' : 'Closed'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading fields...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Field Management</Text>
        <Text style={styles.subtitle}>
          Manage individual field availability
        </Text>
      </View>

      {fields.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="grid-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateTitle}>No Fields Found</Text>
          <Text style={styles.emptyStateText}>
            Add fields to your venue to manage their availability
          </Text>
        </View>
      ) : (
        <FlatList
          data={fields}
          renderItem={renderField}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  fieldCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fieldInfo: {
    flex: 1,
  },
  fieldName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  fieldNumber: {
    fontSize: 14,
    color: '#666',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  openButton: {
    backgroundColor: '#4CAF50',
  },
  closedButton: {
    backgroundColor: '#F44336',
  },
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
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
  },
});
