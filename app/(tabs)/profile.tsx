// Profile tab screen - shows appropriate profile based on user type
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { PlayerProfile, VenueOwnerProfile, ProfileEdit } from '../../src/screens/profile';

export default function ProfileScreen() {
  const { user, isAuthenticated } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);

  // If user is not authenticated, this tab shouldn't be visible
  // But just in case, return null to prevent any issues
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleNavigateToEdit = () => {
    setShowEditProfile(true);
  };

  const handleNavigateBack = () => {
    setShowEditProfile(false);
  };

  const handleSaveSuccess = () => {
    // TODO: Refresh user data from context
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const handleNavigateToVenues = () => {
    // TODO: Navigate to venue management screen
    Alert.alert('Coming Soon', 'Venue management will be available in the next phase.');
  };

  const handleNavigateToAddVenue = () => {
    // TODO: Navigate to add venue screen
    Alert.alert('Coming Soon', 'Add venue functionality will be available in the next phase.');
  };

  // Show edit profile screen
  if (showEditProfile) {
    return (
      <ProfileEdit
        onNavigateBack={handleNavigateBack}
        onSaveSuccess={handleSaveSuccess}
      />
    );
  }

  // Show appropriate profile based on user type
  if (user?.user_type === 'venue_owner') {
    return (
      <VenueOwnerProfile
        onNavigateToEdit={handleNavigateToEdit}
        onNavigateToVenues={handleNavigateToVenues}
        onNavigateToAddVenue={handleNavigateToAddVenue}
      />
    );
  }

  // Default to player profile (includes admin for now)
  return (
    <PlayerProfile
      onNavigateToEdit={handleNavigateToEdit}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
