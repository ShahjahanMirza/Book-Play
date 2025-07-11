// Messaging service for real-time communication between users
import { supabase } from './supabase';
import { ImageUploadService } from './imageUpload';
import { NotificationService } from './notificationService';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image';
  image_url?: string;
  context_type: 'booking' | 'forum' | 'general';
  context_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    user_type: string;
    profile_image_url?: string;
  };
  receiver?: {
    id: string;
    name: string;
    user_type: string;
    profile_image_url?: string;
  };
}

export interface Conversation {
  id: string;
  participant_id: string;
  participant_name: string;
  participant_type: string;
  participant_image?: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  context_type?: string;
  context_id?: string;
}

export class MessagingService {
  /**
   * Get all conversations for a user
   */
  static async getConversations(userId: string): Promise<Conversation[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          message_type,
          context_type,
          context_id,
          is_read,
          created_at,
          sender:users!messages_sender_id_fkey (
            id,
            name,
            user_type,
            profile_image_url
          ),
          receiver:users!messages_receiver_id_fkey (
            id,
            name,
            user_type,
            profile_image_url
          )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        throw error;
      }

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();

      messages?.forEach(message => {
        const isFromUser = message.sender_id === userId;
        const partnerId = isFromUser ? message.receiver_id : message.sender_id;
        const partner = isFromUser ? message.receiver : message.sender;

        if (!partner) return;

        const existingConversation = conversationMap.get(partnerId);
        
        if (!existingConversation || new Date(message.created_at) > new Date(existingConversation.last_message_time)) {
          conversationMap.set(partnerId, {
            id: partnerId,
            participant_id: partnerId,
            participant_name: partner.name,
            participant_type: partner.user_type,
            participant_image: partner.profile_image_url,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: 0, // Will be calculated separately
            context_type: message.context_type,
            context_id: message.context_id,
          });
        }
      });

      // Calculate unread counts
      for (const conversation of conversationMap.values()) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', conversation.participant_id)
          .eq('receiver_id', userId)
          .eq('is_read', false);

        conversation.unread_count = count || 0;
      }

      return Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime());
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  /**
   * Get messages between two users
   */
  static async getMessages(userId: string, partnerId: string, limit: number = 50): Promise<Message[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          message_type,
          image_url,
          context_type,
          context_id,
          is_read,
          read_at,
          created_at,
          sender:users!messages_sender_id_fkey (
            id,
            name,
            user_type,
            profile_image_url
          ),
          receiver:users!messages_receiver_id_fkey (
            id,
            name,
            user_type,
            profile_image_url
          )
        `)
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error loading messages:', error);
        throw error;
      }

      return messages || [];
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Send a text message
   */
  static async sendMessage(
    senderId: string,
    receiverId: string,
    content: string,
    contextType: 'booking' | 'forum' | 'general' = 'general',
    contextId?: string
  ): Promise<Message> {
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content,
          message_type: 'text',
          context_type: contextType,
          context_id: contextId,
          is_read: false,
        })
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          message_type,
          context_type,
          context_id,
          is_read,
          created_at,
          sender:users!messages_sender_id_fkey (
            id,
            name,
            user_type,
            profile_image_url
          ),
          receiver:users!messages_receiver_id_fkey (
            id,
            name,
            user_type,
            profile_image_url
          )
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw error;
      }

      // Send notification to receiver
      try {
        await NotificationService.notifyNewMessage(
          receiverId,
          message.sender.name
        );
      } catch (notificationError) {
        console.error('Error sending message notification:', notificationError);
        // Don't fail the message if notification fails
      }

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send an image message
   */
  static async sendImageMessage(
    senderId: string,
    receiverId: string,
    imageUri: string,
    contextType: 'booking' | 'forum' | 'general' = 'general',
    contextId?: string
  ): Promise<Message> {
    try {
      console.log('Starting image message send process:', { senderId, receiverId, imageUri });

      // Upload image first
      const uploadResult = await ImageUploadService.uploadMessageImage(imageUri, senderId);

      console.log('Image upload result:', uploadResult);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload image');
      }

      console.log('Image uploaded successfully, URL:', uploadResult.url);

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          content: 'Image',
          message_type: 'image',
          image_url: uploadResult.url,
          context_type: contextType,
          context_id: contextId,
          is_read: false,
        })
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          message_type,
          image_url,
          context_type,
          context_id,
          is_read,
          created_at,
          sender:users!messages_sender_id_fkey (
            id,
            name,
            user_type,
            profile_image_url
          ),
          receiver:users!messages_receiver_id_fkey (
            id,
            name,
            user_type,
            profile_image_url
          )
        `)
        .single();

      if (error) {
        console.error('Error inserting image message to database:', error);
        throw error;
      }

      console.log('Image message saved to database:', message);
      return message;
    } catch (error) {
      console.error('Error sending image message:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(userId: string, partnerId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('sender_id', partnerId)
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  /**
   * Get unread message count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Subscribe to real-time message updates
   */
  static subscribeToMessages(
    userId: string,
    onMessage: (message: Message) => void,
    onError?: (error: any) => void
  ) {
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          try {
            // Fetch the complete message with user details
            const { data: message, error } = await supabase
              .from('messages')
              .select(`
                id,
                sender_id,
                receiver_id,
                content,
                message_type,
                image_url,
                context_type,
                context_id,
                is_read,
                read_at,
                created_at,
                sender:users!messages_sender_id_fkey (
                  id,
                  name,
                  user_type,
                  profile_image_url
                ),
                receiver:users!messages_receiver_id_fkey (
                  id,
                  name,
                  user_type,
                  profile_image_url
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching new message:', error);
              onError?.(error);
              return;
            }

            onMessage(message);
          } catch (error) {
            console.error('Error processing new message:', error);
            onError?.(error);
          }
        }
      )
      .subscribe();

    return subscription;
  }
}
