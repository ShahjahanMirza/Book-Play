// Guest tab layout for unauthenticated users
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';
import { CustomHeader } from '../../components/CustomHeader';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function GuestTabLayout() {
  const colorScheme = useColorScheme();

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
        headerShown: false, // We'll use custom header
      }}>
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse Venues',
          tabBarIcon: ({ color }) => <TabBarIcon name="football-outline" color={color} />,
          headerTitle: 'Browse Venues',
        }}
      />
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Sign In',
          tabBarIcon: ({ color }) => <TabBarIcon name="person-add-outline" color={color} />,
          headerTitle: 'Authentication',
        }}
      />
    </Tabs>
  );
}
