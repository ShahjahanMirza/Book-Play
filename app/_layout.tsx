import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '../components/useColorScheme';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Dynamic initial route based on user authentication
  initialRouteName: '(guest-tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

// Loading screen component
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Guest tabs for unauthenticated users */}
        <Stack.Screen name="(guest-tabs)" options={{ headerShown: false }} />

        {/* Player tabs */}
        <Stack.Screen name="(player-tabs)" options={{ headerShown: false }} />

        {/* Venue owner tabs */}
        <Stack.Screen name="(venue-owner-tabs)" options={{ headerShown: false }} />

        {/* Admin tabs */}
        <Stack.Screen name="(admin-tabs)" options={{ headerShown: false }} />

        {/* Legacy tabs (will be removed) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Venue creation screen */}
        <Stack.Screen name="venue-create" options={{ headerShown: false }} />

        {/* Venue management screens */}
        <Stack.Screen name="venue-edit" options={{ headerShown: false }} />
        <Stack.Screen name="venue-status-management" options={{ headerShown: false }} />
        <Stack.Screen name="venue-announcements" options={{ headerShown: false }} />
        

        {/* Guest venue details screen */}
        <Stack.Screen name="guest-venue-details" options={{ headerShown: false }} />

        {/* Venue details screen */}
        <Stack.Screen name="venue-details" options={{ headerShown: false }} />

        {/* Booking screen */}
        <Stack.Screen name="booking" options={{ headerShown: false }} />

        {/* Chat screen */}
        <Stack.Screen name="chat" options={{ headerShown: false }} />

        {/* Forum screens */}
        <Stack.Screen name="create-forum-post" options={{ headerShown: false }} />
        <Stack.Screen name="forum-post" options={{ headerShown: false }} />

        {/* Admin screens */}
        <Stack.Screen name="admin-venues" options={{ headerShown: false }} />
        <Stack.Screen name="admin-users" options={{ headerShown: false }} />

        {/* Modal screens */}
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>

      {/* Route to appropriate tab structure based on user type */}
      {!isAuthenticated && <Redirect href="/(guest-tabs)/browse" />}
      {isAuthenticated && user?.user_type === 'admin' && <Redirect href="/(admin-tabs)/dashboard" />}
      {isAuthenticated && user?.user_type === 'venue_owner' && <Redirect href="/(venue-owner-tabs)/dashboard" />}
      {isAuthenticated && user?.user_type === 'player' && <Redirect href="/(player-tabs)/browse" />}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
