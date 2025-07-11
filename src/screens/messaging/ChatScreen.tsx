// Individual chat screen for messaging
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MessagingService, Message } from '../../services/messagingService';
import { useImagePicker } from '../../components/ImagePicker';
import { supabase } from '../../services/supabase';

export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { partnerId, partnerName } = useLocalSearchParams();
  const { pickProfileImage } = useImagePicker();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [partnerPhoneNumber, setPartnerPhoneNumber] = useState<string>('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (user && partnerId) {
      loadMessages();
      loadPartnerDetails();
      markMessagesAsRead();

      // Subscribe to real-time updates
      const subscription = MessagingService.subscribeToMessages(
        user.id,
        (message) => {
          if (message.sender_id === partnerId) {
            setMessages(prev => [...prev, message]);
            markMessagesAsRead();
          }
        },
        (error) => {
          console.error('Real-time message error:', error);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, partnerId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadMessages = async () => {
    if (!user || !partnerId) return;

    try {
      setLoading(true);
      const messagesList = await MessagingService.getMessages(user.id, partnerId as string);
      setMessages(messagesList);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerDetails = async () => {
    if (!partnerId) return;

    try {
      const { data: partner, error } = await supabase
        .from('users')
        .select('phone_number')
        .eq('id', partnerId)
        .single();

      if (error) {
        console.error('Error loading partner details:', error);
        return;
      }

      if (partner?.phone_number) {
        setPartnerPhoneNumber(partner.phone_number);
      }
    } catch (error) {
      console.error('Error loading partner details:', error);
    }
  };

  const handleCall = () => {
    if (!partnerPhoneNumber) {
      Alert.alert('No Phone Number', 'This user has not provided a phone number.');
      return;
    }

    Alert.alert(
      'Call Player',
      `Call ${partnerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: () => Linking.openURL(`tel:${partnerPhoneNumber}`)
        },
      ]
    );
  };

  const markMessagesAsRead = async () => {
    if (!user || !partnerId) return;

    try {
      await MessagingService.markMessagesAsRead(user.id, partnerId as string);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !partnerId || !newMessage.trim()) return;

    try {
      setSending(true);
      const message = await MessagingService.sendMessage(
        user.id,
        partnerId as string,
        newMessage.trim()
      );
      
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendImageMessage = async () => {
    if (!user || !partnerId) return;

    try {
      const result = await pickProfileImage();
      if (!result) return;

      setSending(true);
      const message = await MessagingService.sendImageMessage(
        user.id,
        partnerId as string,
        result.uri
      );
      
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Error sending image:', error);
      Alert.alert('Error', 'Failed to send image');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isFromUser = message.sender_id === user?.id;
    const showDate = index === 0 || 
      new Date(message.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

    return (
      <View key={message.id}>
        {showDate && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>{formatDate(message.created_at)}</Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          isFromUser ? styles.userMessage : styles.partnerMessage
        ]}>
          {message.message_type === 'image' && message.image_url ? (
            <TouchableOpacity
              style={styles.imageMessage}
              onPress={() => setSelectedImage(message.image_url)}
            >
              {failedImages.has(message.id) ? (
                <View style={styles.failedImageContainer}>
                  <Ionicons name="image-outline" size={40} color="#ccc" />
                  <Text style={styles.failedImageText}>Image failed to load</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: message.image_url }}
                  style={styles.messageImage}
                  resizeMode="cover"
                  onError={(error) => {
                    console.error('Image loading error:', error);
                    setFailedImages(prev => new Set([...prev, message.id]));
                  }}
                  onLoad={() => {
                    console.log('Image loaded successfully:', message.image_url);
                  }}
                />
              )}
            </TouchableOpacity>
          ) : (
            <Text style={[
              styles.messageText,
              isFromUser ? styles.userMessageText : styles.partnerMessageText
            ]}>
              {message.content}
            </Text>
          )}
          
          <Text style={[
            styles.messageTime,
            isFromUser ? styles.userMessageTime : styles.partnerMessageTime
          ]}>
            {formatTime(message.created_at)}
            {isFromUser && (
              <Ionicons 
                name={message.is_read ? 'checkmark-done' : 'checkmark'} 
                size={12} 
                color={message.is_read ? '#4CAF50' : '#999'} 
                style={{ marginLeft: 4 }}
              />
            )}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#228B22" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{partnerName}</Text>
        <TouchableOpacity onPress={handleCall}>
          <Ionicons name="call" size={24} color="#228B22" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.imageButton}
          onPress={sendImageMessage}
          disabled={sending}
        >
          <Ionicons name="camera" size={24} color="#228B22" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={1000}
        />
        
        <TouchableOpacity 
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          <Ionicons 
            name={sending ? "hourglass" : "send"} 
            size={20} 
            color={(!newMessage.trim() || sending) ? "#ccc" : "#fff"} 
          />
        </TouchableOpacity>
      </View>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity
            style={styles.imageModalOverlay}
            onPress={() => setSelectedImage(null)}
          >
            <View style={styles.imageModalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close" size={30} color="#fff" />
              </TouchableOpacity>

              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#90EE90',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f0f0f',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 15,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 2,
    padding: 12,
    borderRadius: 18,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#228B22',
    borderBottomRightRadius: 4,
  },
  partnerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  partnerMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  partnerMessageTime: {
    color: '#666',
  },
  imageMessage: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  failedImageContainer: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  failedImageText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  imageButton: {
    padding: 8,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#228B22',
    borderRadius: 20,
    padding: 10,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalOverlay: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: -50,
    right: 0,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 10,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
});
