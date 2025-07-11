// Image upload service for handling profile and venue images
import { supabase } from './supabase';
import { Alert } from 'react-native';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class ImageUploadService {
  /**
   * Upload profile image to Supabase storage
   */
  static async uploadProfileImage(
    uri: string, 
    userId: string
  ): Promise<ImageUploadResult> {
    try {
      console.log('Starting profile image upload for user:', userId);

      // Create a unique filename
      const fileName = `profile-${userId}-${Date.now()}.jpg`;
      const filePath = `profiles/${fileName}`;

      // Convert URI to array buffer for upload
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      console.log('Profile image converted to Uint8Array:', { size: uint8Array.length });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(filePath, uint8Array, {
          contentType: 'image/jpeg',
          upsert: true, // Allow overwriting existing files
        });

      if (error) {
        console.error('Supabase storage error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('Profile image uploaded successfully:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(data.path);

      console.log('Profile image public URL generated:', urlData.publicUrl);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload image',
      };
    }
  }

  /**
   * Delete profile image from Supabase storage
   */
  static async deleteProfileImage(imageUrl: string): Promise<boolean> {
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `profiles/${fileName}`;

      const { error } = await supabase.storage
        .from('profile-images')
        .remove([filePath]);

      if (error) {
        console.error('Error deleting profile image:', error);
        return false;
      }

      console.log('Profile image deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting profile image:', error);
      return false;
    }
  }

  /**
   * Upload venue image to Supabase storage
   */
  static async uploadVenueImage(
    uri: string, 
    venueId: string
  ): Promise<ImageUploadResult> {
    try {
      console.log('Starting venue image upload for venue:', venueId);

      // Create a unique filename
      const fileName = `venue-${venueId}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `venues/${fileName}`;

      // Convert URI to array buffer for upload
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      console.log('Venue image converted to Uint8Array:', { size: uint8Array.length });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('venue-images')
        .upload(filePath, uint8Array, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Supabase storage error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('Venue image uploaded successfully:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('venue-images')
        .getPublicUrl(data.path);

      console.log('Venue image public URL generated:', urlData.publicUrl);

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error: any) {
      console.error('Error uploading venue image:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload image',
      };
    }
  }

  /**
   * Upload message image to Supabase storage
   */
  static async uploadMessageImage(
    uri: string, 
    senderId: string
  ): Promise<ImageUploadResult> {
    try {
      console.log('Starting message image upload for user:', senderId);

      // Create a unique filename
      const fileName = `message-${senderId}-${Date.now()}.jpg`;
      const filePath = `messages/${fileName}`;

      // Convert URI to array buffer for upload
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      console.log('Message image converted to Uint8Array:', { size: uint8Array.length });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('message-images')
        .upload(filePath, uint8Array, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Supabase storage error:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      console.log('Message image uploaded successfully:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('message-images')
        .getPublicUrl(data.path);

      console.log('Message image public URL generated:', urlData.publicUrl);

      // Test if the URL is accessible
      try {
        const testResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
        console.log('URL accessibility test:', {
          url: urlData.publicUrl,
          status: testResponse.status,
          accessible: testResponse.ok
        });
      } catch (testError) {
        console.error('URL accessibility test failed:', testError);
      }

      return {
        success: true,
        url: urlData.publicUrl,
      };
    } catch (error: any) {
      console.error('Error uploading message image:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload image',
      };
    }
  }
}
