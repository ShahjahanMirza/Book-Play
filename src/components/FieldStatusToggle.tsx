import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';

interface FieldStatusToggleProps {
  fieldId: string;
  fieldName: string;
  currentStatus: 'open' | 'closed';
  onStatusChange?: (newStatus: 'open' | 'closed') => void;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const FieldStatusToggle: React.FC<FieldStatusToggleProps> = ({
  fieldId,
  fieldName,
  currentStatus,
  onStatusChange,
  size = 'medium',
  showLabel = true,
}) => {
  const [status, setStatus] = useState<'open' | 'closed'>(currentStatus);
  const [updating, setUpdating] = useState(false);

  const toggleStatus = async () => {
    const newStatus = status === 'open' ? 'closed' : 'open';
    
    // Show confirmation for closing field
    if (newStatus === 'closed') {
      Alert.alert(
        'Close Field',
        `Are you sure you want to close "${fieldName}"? This will prevent new bookings for this field until you reopen it.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Close Field', 
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
        .from('venue_fields')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', fieldId);

      if (error) {
        console.error('Error updating field status:', error);
        Alert.alert('Error', 'Failed to update field status. Please try again.');
        return;
      }

      setStatus(newStatus);
      onStatusChange?.(newStatus);

      // Show success message
      const message = newStatus === 'open' 
        ? `${fieldName} is now open for bookings`
        : `${fieldName} is now closed for bookings`;
      
      // Don't show alert for small size (used in lists)
      if (size !== 'small') {
        Alert.alert('Status Updated', message);
      }
    } catch (error) {
      console.error('Error updating field status:', error);
      Alert.alert('Error', 'Failed to update field status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const getStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          button: styles.smallButton,
          text: styles.smallText,
          icon: 16,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          button: styles.largeButton,
          text: styles.largeText,
          icon: 24,
        };
      default:
        return {
          container: styles.mediumContainer,
          button: styles.mediumButton,
          text: styles.mediumText,
          icon: 20,
        };
    }
  };

  const componentStyles = getStyles();

  return (
    <View style={[styles.container, componentStyles.container]}>
      {showLabel && (
        <Text style={[styles.label, componentStyles.text]}>
          {fieldName}
        </Text>
      )}
      
      <TouchableOpacity
        style={[
          styles.statusButton,
          componentStyles.button,
          status === 'open' ? styles.openButton : styles.closedButton
        ]}
        onPress={toggleStatus}
        disabled={updating}
      >
        {updating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons
              name={status === 'open' ? 'checkmark-circle' : 'close-circle'}
              size={componentStyles.icon}
              color="#fff"
            />
            <Text style={[styles.statusText, componentStyles.text]}>
              {status === 'open' ? 'Open' : 'Closed'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallContainer: {
    paddingVertical: 4,
  },
  mediumContainer: {
    paddingVertical: 8,
  },
  largeContainer: {
    paddingVertical: 12,
  },
  label: {
    flex: 1,
    fontWeight: '500',
    color: '#333',
    marginRight: 10,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  smallButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mediumButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  largeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  openButton: {
    backgroundColor: '#4CAF50',
  },
  closedButton: {
    backgroundColor: '#F44336',
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  smallText: {
    fontSize: 12,
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
});
