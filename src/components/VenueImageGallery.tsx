import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../services/supabase';

const { width } = Dimensions.get('window');
const imageSize = (width - 60) / 3; // 3 images per row with margins

interface VenueImage {
  id?: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  local_uri?: string; // For newly selected images
}

interface VenueImageGalleryProps {
  venueId?: string;
  images: VenueImage[];
  onImagesChange: (images: VenueImage[]) => void;
  maxImages?: number;
  editable?: boolean;
}

export const VenueImageGallery: React.FC<VenueImageGalleryProps> = ({
  venueId,
  images,
  onImagesChange,
  maxImages = 10,
  editable = true,
}) => {
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload images.'
      );
      return false;
    }
    return true;
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }], // Resize to max width of 1024px
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri;
    }
  };

  const uploadImageToSupabase = async (uri: string): Promise<string> => {
    try {
      // Create a unique filename
      const fileName = `venue-${venueId || 'temp'}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `venues/${fileName}`;

      // Convert URI to blob for upload
      const response = await fetch(uri);
      const blob = await response.blob();

      console.log('Uploading image:', { fileName, filePath, blobSize: blob.size });

      const { data, error } = await supabase.storage
        .from('venue-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }

      console.log('Upload successful:', data);

      const { data: urlData } = supabase.storage
        .from('venue-images')
        .getPublicUrl(data.path);

      console.log('Public URL generated:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const selectImages = async () => {
    if (!editable) return;
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (images.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only upload up to ${maxImages} images.`);
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images' as any,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets) {
        setUploading(true);
        
        const newImages: VenueImage[] = [];
        const remainingSlots = maxImages - images.length;
        const selectedImages = result.assets.slice(0, remainingSlots);

        for (let i = 0; i < selectedImages.length; i++) {
          const asset = selectedImages[i];
          try {
            // Compress image
            const compressedUri = await compressImage(asset.uri);
            
            // Create temporary image object
            const newImage: VenueImage = {
              image_url: compressedUri,
              local_uri: compressedUri,
              is_primary: images.length === 0 && i === 0, // First image is primary if no images exist
              display_order: images.length + i,
            };
            
            newImages.push(newImage);
          } catch (error) {
            console.error('Error processing image:', error);
            Alert.alert('Error', 'Failed to process one or more images.');
          }
        }

        // Update images array
        onImagesChange([...images, ...newImages]);
      }
    } catch (error) {
      console.error('Error selecting images:', error);
      Alert.alert('Error', 'Failed to select images.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    if (!editable) return;
    
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedImages = images.filter((_, i) => i !== index);
            // Reorder remaining images
            const reorderedImages = updatedImages.map((img, i) => ({
              ...img,
              display_order: i,
              is_primary: i === 0 && updatedImages.length > 0, // First image becomes primary
            }));
            onImagesChange(reorderedImages);
          },
        },
      ]
    );
  };

  const setPrimaryImage = (index: number) => {
    if (!editable) return;
    
    const updatedImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index,
    }));
    onImagesChange(updatedImages);
  };

  const renderImage = (image: VenueImage, index: number) => (
    <View key={index} style={styles.imageContainer}>
      <Image
        source={{ uri: image.local_uri || image.image_url }}
        style={styles.image}
        resizeMode="cover"
      />
      
      {/* Primary badge */}
      {image.is_primary && (
        <View style={styles.primaryBadge}>
          <Text style={styles.primaryText}>PRIMARY</Text>
        </View>
      )}
      
      {/* Image actions */}
      {editable && (
        <View style={styles.imageActions}>
          {!image.is_primary && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setPrimaryImage(index)}
            >
              <Ionicons name="star-outline" size={16} color="#fff" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => removeImage(index)}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderAddButton = () => (
    <TouchableOpacity
      style={styles.addImageButton}
      onPress={selectImages}
      disabled={uploading || images.length >= maxImages}
    >
      {uploading ? (
        <ActivityIndicator size="small" color="#007AFF" />
      ) : (
        <>
          <Ionicons name="camera" size={32} color="#007AFF" />
          <Text style={styles.addImageText}>Add Photos</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Venue Photos</Text>
        <Text style={styles.subtitle}>
          {images.length}/{maxImages} photos • First photo will be the cover image
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gallery}
      >
        {images.map((image, index) => renderImage(image, index))}
        
        {editable && images.length < maxImages && renderAddButton()}
      </ScrollView>

      {images.length === 0 && editable && (
        <View style={styles.emptyState}>
          <Ionicons name="images-outline" size={48} color="#ccc" />
          <Text style={styles.emptyStateText}>No photos added yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Add high-quality photos to showcase your venue
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  header: {
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  gallery: {
    paddingHorizontal: 5,
  },
  imageContainer: {
    width: imageSize,
    height: imageSize,
    marginHorizontal: 5,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  imageActions: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  removeButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.8)',
  },
  addImageButton: {
    width: imageSize,
    height: imageSize,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
  },
  addImageText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});
