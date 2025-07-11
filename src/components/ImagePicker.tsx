// Image picker component for profile pictures and venue images
import React from 'react';
import {
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface ImagePickerOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

interface ImagePickerResult {
  uri: string;
  width: number;
  height: number;
  type?: string;
  fileSize?: number;
}

export class ImagePickerService {
  static async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permissions
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      
      // Request media library permissions
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      return cameraPermission.status === 'granted' && mediaLibraryPermission.status === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  static async pickImage(options: ImagePickerOptions = {}): Promise<ImagePickerResult | null> {
    const {
      allowsEditing = true,
      aspect = [1, 1],
      quality = 0.8,
      maxWidth = 1024,
      maxHeight = 1024,
    } = options;

    try {
      // Check permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        Alert.alert(
          'Permissions Required',
          'Please grant camera and photo library permissions to upload images.'
        );
        return null;
      }

      // Show action sheet
      const source = await this.showImageSourceActionSheet();
      if (!source) return null;

      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'Images' as any,
          allowsEditing,
          aspect,
          quality,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'Images' as any,
          allowsEditing,
          aspect,
          quality,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];

      // Compress and resize image if needed
      const processedImage = await this.processImage(asset.uri, {
        maxWidth,
        maxHeight,
        quality,
      });

      return {
        uri: processedImage.uri,
        width: processedImage.width,
        height: processedImage.height,
        type: asset.type,
        fileSize: asset.fileSize,
      };
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      return null;
    }
  }

  private static showImageSourceActionSheet(): Promise<'camera' | 'library' | null> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Image Source',
        'Choose where to get your image from',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(null),
          },
          {
            text: 'Camera',
            onPress: () => resolve('camera'),
          },
          {
            text: 'Photo Library',
            onPress: () => resolve('library'),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(null) }
      );
    });
  }

  private static async processImage(
    uri: string,
    options: {
      maxWidth: number;
      maxHeight: number;
      quality: number;
    }
  ): Promise<ImageManipulator.ImageResult> {
    try {
      const { maxWidth, maxHeight, quality } = options;

      // Get image info
      const imageInfo = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      const { width, height } = imageInfo;

      // Calculate resize dimensions
      let newWidth = width;
      let newHeight = height;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;

        if (width > height) {
          newWidth = maxWidth;
          newHeight = maxWidth / aspectRatio;
        } else {
          newHeight = maxHeight;
          newWidth = maxHeight * aspectRatio;
        }
      }

      // Process image with resize and compression
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: Math.round(newWidth),
              height: Math.round(newHeight),
            },
          },
        ],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return manipulatedImage;
    } catch (error) {
      console.error('Error processing image:', error);
      // Return original image if processing fails
      return { uri, width: 0, height: 0 };
    }
  }

  static async pickMultipleImages(
    options: ImagePickerOptions & { maxImages?: number } = {}
  ): Promise<ImagePickerResult[]> {
    const {
      allowsEditing = false,
      quality = 0.8,
      maxWidth = 1024,
      maxHeight = 1024,
      maxImages = 5,
    } = options;

    try {
      // Check permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        Alert.alert(
          'Permissions Required',
          'Please grant photo library permissions to upload images.'
        );
        return [];
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images' as any,
        allowsEditing,
        quality,
        allowsMultipleSelection: true,
        selectionLimit: maxImages,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return [];
      }

      // Process all selected images
      const processedImages: ImagePickerResult[] = [];

      for (const asset of result.assets) {
        try {
          const processedImage = await this.processImage(asset.uri, {
            maxWidth,
            maxHeight,
            quality,
          });

          processedImages.push({
            uri: processedImage.uri,
            width: processedImage.width,
            height: processedImage.height,
            type: asset.type,
            fileSize: asset.fileSize,
          });
        } catch (error) {
          console.error('Error processing image:', error);
          // Skip this image if processing fails
        }
      }

      return processedImages;
    } catch (error) {
      console.error('Error picking multiple images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
      return [];
    }
  }

  static getImageSizeText(fileSize?: number): string {
    if (!fileSize) return '';
    
    const sizeInMB = fileSize / (1024 * 1024);
    if (sizeInMB < 1) {
      const sizeInKB = fileSize / 1024;
      return `${sizeInKB.toFixed(1)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  }

  static validateImageSize(fileSize?: number, maxSizeMB: number = 5): boolean {
    if (!fileSize) return true;
    
    const sizeInMB = fileSize / (1024 * 1024);
    return sizeInMB <= maxSizeMB;
  }

  static validateImageDimensions(
    width: number,
    height: number,
    minWidth: number = 100,
    minHeight: number = 100,
    maxWidth: number = 4000,
    maxHeight: number = 4000
  ): boolean {
    return (
      width >= minWidth &&
      height >= minHeight &&
      width <= maxWidth &&
      height <= maxHeight
    );
  }
}

// Hook for using ImagePicker in components
export const useImagePicker = () => {
  const pickProfileImage = async (): Promise<ImagePickerResult | null> => {
    return ImagePickerService.pickImage({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      maxWidth: 512,
      maxHeight: 512,
    });
  };

  const pickVenueImages = async (maxImages: number = 5): Promise<ImagePickerResult[]> => {
    return ImagePickerService.pickMultipleImages({
      allowsEditing: false,
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
      maxImages,
    });
  };

  const pickSingleVenueImage = async (): Promise<ImagePickerResult | null> => {
    return ImagePickerService.pickImage({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 768,
    });
  };

  return {
    pickProfileImage,
    pickVenueImages,
    pickSingleVenueImage,
    pickImage: ImagePickerService.pickImage,
    pickMultipleImages: ImagePickerService.pickMultipleImages,
  };
};

export default ImagePickerService;
