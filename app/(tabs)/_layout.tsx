import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { useAuth } from '../../src/contexts/AuthContext';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // GUEST/UNAUTHENTICATED USERS - Only Browse and Auth tabs
  if (!isAuthenticated || !user) {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#228B22',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            backgroundColor: '#90EE90',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            height: 60,
          },
          headerStyle: {
            backgroundColor: '#90EE90',
          },
          headerTintColor: '#fff',
          headerShown: true,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Browse Venues',
            tabBarIcon: ({ color }) => <TabBarIcon name="search-outline" color={color} />,
            headerTitle: 'Browse Venues',
          }}
        />
        <Tabs.Screen
          name="two"
          options={{
            title: 'Sign In',
            tabBarIcon: ({ color }) => <TabBarIcon name="log-in-outline" color={color} />,
            headerTitle: 'Authentication',
          }}
        />
      </Tabs>
    );
  }

  // For authenticated users, show role-based tabs
  // The actual content will be determined by the individual screen components
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: {
          backgroundColor: '#90EE90',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#90EE90',
        },
        headerTintColor: '#fff',
        headerShown: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: user.user_type === 'admin' || user.user_type === 'venue_owner' ? 'Dashboard' : 'Browse',
          tabBarIcon: ({ color }) => <TabBarIcon name={user.user_type === 'admin' || user.user_type === 'venue_owner' ? "grid-outline" : "search-outline"} color={color} />,
          headerTitle: user.user_type === 'admin' ? 'Admin Dashboard' : user.user_type === 'venue_owner' ? 'Dashboard' : 'Browse Venues',
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: user.user_type === 'admin' ? 'Users' : user.user_type === 'venue_owner' ? 'Venues' : 'Bookings',
          tabBarIcon: ({ color }) => <TabBarIcon name={user.user_type === 'admin' ? "people-outline" : user.user_type === 'venue_owner' ? "business-outline" : "calendar-outline"} color={color} />,
          headerTitle: user.user_type === 'admin' ? 'User Management' : user.user_type === 'venue_owner' ? 'My Venues' : 'My Bookings',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-outline" color={color} />,
          headerTitle: 'My Profile',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
