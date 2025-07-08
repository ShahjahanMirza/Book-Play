// Venue owner dashboard screen
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const VenueOwnerDashboard: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Venue Owner Dashboard</Text>
      <Text style={styles.subtitle}>Manage your venues and bookings</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
