import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

interface VenueStatusToggleProps {
  venueId: string;
  currentStatus: 'open' | 'closed';
  venueName: string;
  onStatusChange?: (newStatus: 'open' | 'closed') => void;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const VenueStatusToggle: React.FC<VenueStatusToggleProps> = ({
  venueId,
  currentStatus,
  venueName,
  onStatusChange,
  showLabel = true,
  size = 'medium',
}) => {
  const [status, setStatus] = useState<'open' | 'closed'>(currentStatus);
  const [updating, setUpdating] = useState(false);

  const toggleStatus = async () => {
    const newStatus = status === 'open' ? 'closed' : 'open';
    
    // Show confirmation for closing venue
    if (newStatus === 'closed') {
      Alert.alert(
        'Close Venue',
        `Are you sure you want to close "${venueName}"? This will prevent new bookings until you reopen it.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Close Venue', 
            style: 'destructive',
            onPress: () => updateStatus(newStatus)
          }
        ]
      );
    } else {
      updateStatus(newStatus);
    }
  };

  const updateStatus = async (newStatus: 'open' | 'closed') => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from('venues')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', venueId);

      if (error) {
        console.error('Error updating venue status:', error);
        Alert.alert('Error', 'Failed to update venue status. Please try again.');
        return;
      }

      setStatus(newStatus);
      onStatusChange?.(newStatus);

      // Show success message
      const message = newStatus === 'open' 
        ? `${venueName} is now open for bookings`
        : `${venueName} is now closed for bookings`;
      
      Alert.alert('Status Updated', message);
    } catch (error) {
      console.error('Error updating venue status:', error);
      Alert.alert('Error', 'Failed to update venue status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const getStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          label: styles.smallLabel,
          statusText: styles.smallStatusText,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          label: styles.largeLabel,
          statusText: styles.largeStatusText,
        };
      default:
        return {
          container: styles.mediumContainer,
          label: styles.mediumLabel,
          statusText: styles.mediumStatusText,
        };
    }
  };

  const componentStyles = getStyles();

  return (
    <View style={[styles.container, componentStyles.container]}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, componentStyles.label]}>Venue Status</Text>
          <View style={styles.statusIndicator}>
            <Ionicons
              name={status === 'open' ? 'checkmark-circle' : 'close-circle'}
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
              color={status === 'open' ? '#4CAF50' : '#F44336'}
            />
            <Text style={[
              styles.statusText,
              componentStyles.statusText,
              { color: status === 'open' ? '#4CAF50' : '#F44336' }
            ]}>
              {status === 'open' ? 'Open for Bookings' : 'Closed for Bookings'}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.toggleContainer}>
        {updating ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <Switch
            value={status === 'open'}
            onValueChange={toggleStatus}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={status === 'open' ? '#007AFF' : '#f4f3f4'}
            disabled={updating}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smallContainer: {
    paddingVertical: 8,
  },
  mediumContainer: {
    paddingVertical: 12,
  },
  largeContainer: {
    paddingVertical: 16,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  smallLabel: {
    fontSize: 14,
  },
  mediumLabel: {
    fontSize: 16,
  },
  largeLabel: {
    fontSize: 18,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 6,
    fontWeight: '500',
  },
  smallStatusText: {
    fontSize: 12,
  },
  mediumStatusText: {
    fontSize: 14,
  },
  largeStatusText: {
    fontSize: 16,
  },
  toggleContainer: {
    marginLeft: 15,
  },
});
