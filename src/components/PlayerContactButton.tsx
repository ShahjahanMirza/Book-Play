import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { MessagingService } from '../services/messagingService';

interface PlayerContactButtonProps {
  playerId: string;
  playerName: string;
  bookingId?: string;
  venueName?: string;
  bookingDate?: string;
  style?: any;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  onPress?: () => void;
}

export const PlayerContactButton: React.FC<PlayerContactButtonProps> = ({
  playerId,
  playerName,
  bookingId,
  venueName,
  bookingDate,
  style,
  size = 'medium',
  variant = 'primary',
  onPress,
}) => {
  const { user } = useAuth();
  const router = useRouter();

  const handleContactPlayer = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to send messages');
      return;
    }

    if (user.id === playerId) {
      Alert.alert('Error', 'You cannot message yourself');
      return;
    }

    try {
      // If there's a booking context, send an initial message
      if (bookingId && venueName && bookingDate) {
        const initialMessage = `Hi ${playerName}! I'm reaching out regarding your booking at ${venueName} on ${new Date(bookingDate).toLocaleDateString()}. How can I help you?`;
        
        await MessagingService.sendMessage(
          user.id,
          playerId,
          initialMessage,
          'booking',
          bookingId
        );
      }

      // Navigate to chat screen
      router.push(`/chat?partnerId=${playerId}&partnerName=${encodeURIComponent(playerName)}`);
      
      // Call custom onPress if provided
      onPress?.();
    } catch (error) {
      console.error('Error initiating conversation:', error);
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    // Size variations
    switch (size) {
      case 'small':
        baseStyle.push(styles.buttonSmall);
        break;
      case 'large':
        baseStyle.push(styles.buttonLarge);
        break;
      default:
        baseStyle.push(styles.buttonMedium);
    }

    // Variant variations
    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.buttonSecondary);
        break;
      case 'outline':
        baseStyle.push(styles.buttonOutline);
        break;
      default:
        baseStyle.push(styles.buttonPrimary);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.buttonText];
    
    // Size variations
    switch (size) {
      case 'small':
        baseStyle.push(styles.textSmall);
        break;
      case 'large':
        baseStyle.push(styles.textLarge);
        break;
      default:
        baseStyle.push(styles.textMedium);
    }

    // Variant variations
    switch (variant) {
      case 'secondary':
        baseStyle.push(styles.textSecondary);
        break;
      case 'outline':
        baseStyle.push(styles.textOutline);
        break;
      default:
        baseStyle.push(styles.textPrimary);
    }

    return baseStyle;
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'secondary':
        return '#666';
      case 'outline':
        return '#007AFF';
      default:
        return '#fff';
    }
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={handleContactPlayer}
      activeOpacity={0.7}
    >
      <Ionicons 
        name="chatbubble" 
        size={getIconSize()} 
        color={getIconColor()} 
      />
      <Text style={getTextStyle()}>
        {size === 'small' ? 'Message' : 'Contact Player'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 6,
  },
  buttonSmall: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  buttonMedium: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buttonLarge: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#f8f9fa',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 12,
  },
  textMedium: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 16,
  },
  textPrimary: {
    color: '#fff',
  },
  textSecondary: {
    color: '#666',
  },
  textOutline: {
    color: '#007AFF',
  },
});
