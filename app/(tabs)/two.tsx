// Second tab screen - shows different content based on user role
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { GuestAuthScreen } from '../../src/screens/guest/AuthScreen';

export default function TabTwoScreen() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <GuestAuthScreen />;
  }

  // Show different content based on user role
  const getContent = () => {
    switch (user.user_type) {
      case 'admin':
        return {
          title: 'User Management',
          subtitle: 'Manage all users in the system',
        };
      case 'venue_owner':
        return {
          title: 'My Venues',
          subtitle: 'Manage your venue listings',
        };
      case 'player':
      default:
        return {
          title: 'My Bookings',
          subtitle: 'View and manage your bookings',
        };
    }
  };

  const content = getContent();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.subtitle}>{content.subtitle}</Text>
      <Text style={styles.userInfo}>Logged in as: {user.name} ({user.user_type})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  userInfo: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
});
