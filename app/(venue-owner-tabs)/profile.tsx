// Venue owner profile screen
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { VenueOwnerProfile, ProfileEdit } from '../../src/screens/profile';


export default function VenueOwnerProfileScreen() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
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
    setShowEditProfile(false);
  };

  const handleNavigateToVenues = () => {
    // Navigate to venues tab
    router.push('/(venue-owner-tabs)/venues');
  };

  const handleNavigateToAddVenue = () => {
    // Navigate to venue creation screen
    router.push('/venue-create');
  };

  const handleNavigateToAnalytics = () => {
    // Navigate to analytics tab
    router.push('/(venue-owner-tabs)/analytics');
  };

  const handleNavigateToVenueDetails = (venueId: string) => {
    // Navigate to venue edit screen for venue owners
    router.push(`/venue-edit?venueId=${venueId}`);
  };

  const handleNavigateToAnnouncements = () => {
    // Navigate to venue announcements management screen
    router.push('/venue-announcements');
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

  // Show venue owner profile
  return (
    <VenueOwnerProfile
      onNavigateToEdit={handleNavigateToEdit}
      onNavigateToVenues={handleNavigateToVenues}
      onNavigateToAddVenue={handleNavigateToAddVenue}
      onNavigateToAnalytics={handleNavigateToAnalytics}
      onNavigateToVenueDetails={handleNavigateToVenueDetails}
      onNavigateToAnnouncements={handleNavigateToAnnouncements}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});
