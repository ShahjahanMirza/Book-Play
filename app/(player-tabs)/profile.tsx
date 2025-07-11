// Player profile screen
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { PlayerProfile, ProfileEdit } from '../../src/screens/profile';

export default function PlayerProfileScreen() {
  const { user, isAuthenticated } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);

  // If user is not authenticated, this tab shouldn't be visible
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
    Alert.alert('Success', 'Profile updated successfully!');
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

  // Show player profile
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
