// Authentication context for managing user state
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { User, AuthState } from '../types';
import { ImageUploadService } from '../services/imageUpload';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (profileData: any, profileImageUri?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        // Fetch user profile data
        fetchUserProfile(session.user.id);
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setAuthState({
            user: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setAuthState({
        user: data,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    // Handle admin login with hardcoded credentials
    if (email === 'admin@booknplay.com' && password === 'P@ssw0rd12@dmin') {
      console.log('Admin login detected, creating admin session');

      // Create a mock admin user
      const adminUser: User = {
        id: 'a87a1832-475d-46fd-b0d4-1eb1a8f1c737',
        email: 'admin@booknplay.com',
        name: 'System Administrator',
        user_type: 'admin',
        phone_number: '',
        age: null,
        address: null,
        cnic_passport: null,
        city: 'System',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Set admin state
      setAuthState({
        user: adminUser,
        isLoading: false,
        isAuthenticated: true,
      });

      console.log('Admin login successful');
      return;
    }

    // Regular user login
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (userData: any) => {
    console.log('Starting registration with data:', userData);

    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          phone_number: userData.phone_number,
          age: userData.age,
          address: userData.address,
          cnic_passport: userData.cnic_passport,
          city: userData.city,
          user_type: userData.user_type,
        },
      },
    });

    console.log('Supabase auth.signUp response:', { data, error });

    if (error) {
      console.error('Registration error details:', error);
      throw new Error(`Database error saving new user: ${error.message}`);
    }

    // If user is created but not confirmed, we still want to show success
    if (data.user && !data.user.email_confirmed_at) {
      // User needs to verify email
      return { needsVerification: true, email: userData.email };
    }

    return { needsVerification: false };
  };

  const signOut = async () => {
    try {
      // Check if it's admin logout
      if (authState.user?.id === 'a87a1832-475d-46fd-b0d4-1eb1a8f1c737') {
        console.log('Admin logout detected');
        // Just clear the state for admin
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        return;
      }

      // Regular user logout
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Immediately clear the auth state
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const updateProfile = async (profileData: any, profileImageUri?: string) => {
    if (!authState.user) {
      throw new Error('No user logged in');
    }

    try {
      let profileImageUrl = authState.user.profile_image_url;

      // Upload new profile image if provided
      if (profileImageUri) {
        console.log('Uploading new profile image...');
        const uploadResult = await ImageUploadService.uploadProfileImage(
          profileImageUri,
          authState.user.id
        );

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Failed to upload profile image');
        }

        profileImageUrl = uploadResult.url;
        console.log('Profile image uploaded successfully:', profileImageUrl);
      }

      // Update the users table with new profile data
      const updateData: any = {
        name: profileData.name,
        phone_number: profileData.phone_number,
        age: parseInt(profileData.age),
        address: profileData.address || null,
        cnic_passport: profileData.cnic_passport || null,
        city: profileData.city,
        updated_at: new Date().toISOString(),
      };

      // Include profile image URL if it was updated
      if (profileImageUrl) {
        updateData.profile_image_url = profileImageUrl;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', authState.user.id);

      if (error) throw error;

      // Refresh the user profile to get updated data
      await fetchUserProfile(authState.user.id);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const refreshProfile = async () => {
    if (authState.user) {
      await fetchUserProfile(authState.user.id);
    }
  };

  const value: AuthContextType = {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
