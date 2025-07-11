// Main tab screen - shows different content based on user role
import React from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { GuestBrowseScreen } from '../../src/screens/guest/BrowseScreen';
import { PlayerBrowseScreen } from '../../src/screens/player/PlayerBrowseScreen';
import { VenueOwnerDashboard } from '../../src/screens/venue-owner/VenueOwnerDashboard';
import { AdminDashboard } from '../../src/screens/admin/AdminDashboard';

export default function TabOneScreen() {
  const { user, isAuthenticated } = useAuth();

  // Show guest browse for unauthenticated users
  if (!isAuthenticated || !user) {
    return <GuestBrowseScreen />;
  }

  // Show role-specific screens for authenticated users
  switch (user.user_type) {
    case 'admin':
      return <AdminDashboard />;
    case 'venue_owner':
      return <VenueOwnerDashboard />;
    case 'player':
    default:
      return <PlayerBrowseScreen />;
  }
}
