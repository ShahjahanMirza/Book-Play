// Guest authentication screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LoginScreen } from '../auth/LoginScreen';
import { RegisterScreen } from '../auth/RegisterScreen';
import { ForgotPasswordScreen } from '../auth/ForgotPasswordScreen';
import { CustomHeader } from '../../../components/CustomHeader';
import { FadeInView } from '../../../components/FadeInView';
import { AnimatedPressable } from '../../../components/AnimatedPressable';
import { RESPONSIVE, wp, hp, rf } from '../../utils/responsive';

type AuthMode = 'welcome' | 'login' | 'register' | 'forgot';

export const GuestAuthScreen: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('welcome');

  const renderWelcomeScreen = () => (
    <SafeAreaView style={styles.welcomeContainer}>
      <ScrollView contentContainerStyle={styles.welcomeContent}>
        {/* Header */}
        <FadeInView duration={800} delay={100} direction="down">
          <View style={styles.welcomeHeader}>
            <Text style={styles.welcomeTitle}>Welcome to Book&Play</Text>
            <Text style={styles.welcomeSubtitle}>
              Your ultimate futsal booking companion
            </Text>
          </View>
        </FadeInView>

        {/* Features */}
        <View style={styles.featuresSection}>
          <FadeInView duration={600} delay={300} direction="up">
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="search" size={24} color="#228B22" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Discover Venues</Text>
                <Text style={styles.featureDescription}>
                  Find the perfect futsal venues near you with detailed information and reviews
                </Text>
              </View>
            </View>
          </FadeInView>

          <FadeInView duration={600} delay={400} direction="up">
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="calendar" size={24} color="#228B22" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Easy Booking</Text>
                <Text style={styles.featureDescription}>
                  Book your favorite venues with just a few taps and manage all your bookings
                </Text>
              </View>
            </View>
          </FadeInView>

          <FadeInView duration={600} delay={500} direction="up">
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="people" size={24} color="#228B22" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Join Community</Text>
                <Text style={styles.featureDescription}>
                  Connect with other players, share bookings, and build your futsal network
                </Text>
              </View>
            </View>
          </FadeInView>

          <FadeInView duration={600} delay={600} direction="up">
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="chatbubbles" size={24} color="#228B22" />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Real-time Chat</Text>
                <Text style={styles.featureDescription}>
                  Message venue owners and other players directly through the app
                </Text>
              </View>
            </View>
          </FadeInView>
        </View>

        {/* Action Buttons */}
        <FadeInView duration={600} delay={700} direction="up">
          <View style={styles.actionButtons}>
            <AnimatedPressable
              style={styles.primaryButton}
              onPress={() => setAuthMode('register')}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.secondaryButton}
              onPress={() => setAuthMode('login')}
            >
              <Text style={styles.secondaryButtonText}>I already have an account</Text>
            </AnimatedPressable>
          </View>
        </FadeInView>

        {/* Terms */}
        <FadeInView duration={600} delay={800} direction="up">
          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );

  const renderAuthScreen = () => {
    switch (authMode) {
      case 'register':
        return (
          <RegisterScreen
            onNavigateToLogin={() => setAuthMode('login')}
            onNavigateBack={() => setAuthMode('welcome')}
          />
        );
      case 'forgot':
        return (
          <ForgotPasswordScreen
            onNavigateToLogin={() => setAuthMode('login')}
            onNavigateBack={() => setAuthMode('login')}
          />
        );
      case 'login':
        return (
          <LoginScreen
            onNavigateToRegister={() => setAuthMode('register')}
            onNavigateToForgotPassword={() => setAuthMode('forgot')}
            onNavigateBack={() => setAuthMode('welcome')}
          />
        );
      case 'welcome':
      default:
        return renderWelcomeScreen();
    }
  };

  return (
    <View style={styles.container}>
      {renderAuthScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  welcomeContent: {
    flexGrow: 1,
    paddingHorizontal: RESPONSIVE.padding.lg,
    paddingVertical: RESPONSIVE.padding.xl,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: RESPONSIVE.margin.xl,
  },
  welcomeTitle: {
    fontSize: RESPONSIVE.fontSize.xxxl,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: RESPONSIVE.margin.sm,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: RESPONSIVE.fontSize.md,
    color: '#666',
    textAlign: 'center',
    lineHeight: rf(22),
  },
  featuresSection: {
    marginBottom: RESPONSIVE.margin.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: RESPONSIVE.margin.lg,
  },
  featureIcon: {
    width: RESPONSIVE.iconSize.xxl + 16,
    height: RESPONSIVE.iconSize.xxl + 16,
    borderRadius: (RESPONSIVE.iconSize.xxl + 16) / 2,
    backgroundColor: '#f0fff0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: RESPONSIVE.margin.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: '600',
    color: '#333',
    marginBottom: RESPONSIVE.margin.xs,
  },
  featureDescription: {
    fontSize: RESPONSIVE.fontSize.sm,
    color: '#666',
    lineHeight: rf(20),
  },
  actionButtons: {
    marginBottom: RESPONSIVE.margin.lg,
  },
  primaryButton: {
    backgroundColor: '#228B22',
    paddingVertical: RESPONSIVE.padding.md,
    borderRadius: RESPONSIVE.borderRadius.round,
    alignItems: 'center',
    marginBottom: RESPONSIVE.margin.md,
    minHeight: hp(6),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: RESPONSIVE.fontSize.md,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: RESPONSIVE.padding.md,
    borderRadius: RESPONSIVE.borderRadius.round,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#228B22',
    minHeight: hp(6),
  },
  secondaryButtonText: {
    color: '#228B22',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
});

// Default export for easier importing
export default GuestAuthScreen;
