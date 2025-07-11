// Notification service for managing in-app notifications
import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking' | 'forum_offer' | 'message' | 'general' | 'venue' | 'announcement';
  data?: any;
  is_read: boolean;
  created_at: string;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'booking' | 'forum_offer' | 'message' | 'general' | 'venue' | 'announcement',
    data?: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          message,
          type,
          context_type: type === 'general' ? null : type,
          context_id: data?.context_id || null,
          is_read: false,
        });

      if (error) {
        console.error('Error creating notification:', error);
        throw error;
      }

      console.log('Notification created successfully for user:', userId);
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50
  ): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error loading notifications:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error loading notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  /**
   * Notification helpers for specific events
   */

  // Forum offer notifications
  static async notifyOfferReceived(
    postOwnerId: string,
    offerPlayerName: string,
    postTitle: string
  ): Promise<void> {
    await this.createNotification(
      postOwnerId,
      'New Forum Offer',
      `${offerPlayerName} wants to join your game: ${postTitle}`,
      'forum_offer'
    );
  }

  static async notifyOfferAccepted(
    offerPlayerId: string,
    postOwnerName: string,
    postTitle: string
  ): Promise<void> {
    await this.createNotification(
      offerPlayerId,
      'Offer Accepted!',
      `${postOwnerName} accepted your offer to join: ${postTitle}`,
      'forum_offer'
    );
  }

  static async notifyOfferRejected(
    offerPlayerId: string,
    postOwnerName: string,
    postTitle: string
  ): Promise<void> {
    await this.createNotification(
      offerPlayerId,
      'Offer Declined',
      `${postOwnerName} declined your offer to join: ${postTitle}`,
      'forum_offer'
    );
  }

  // Booking notifications
  static async notifyBookingConfirmed(
    playerId: string,
    venueName: string,
    bookingDate: string
  ): Promise<void> {
    await this.createNotification(
      playerId,
      'Booking Confirmed',
      `Your booking at ${venueName} for ${bookingDate} has been confirmed`,
      'booking'
    );
  }

  static async notifyBookingCancelled(
    playerId: string,
    venueName: string,
    bookingDate: string,
    reason?: string
  ): Promise<void> {
    const message = reason
      ? `Your booking at ${venueName} for ${bookingDate} has been cancelled. Reason: ${reason}`
      : `Your booking at ${venueName} for ${bookingDate} has been cancelled`;

    await this.createNotification(
      playerId,
      'Booking Cancelled',
      message,
      'booking'
    );
  }

  // Message notifications
  static async notifyNewMessage(
    receiverId: string,
    senderName: string
  ): Promise<void> {
    await this.createNotification(
      receiverId,
      'New Message',
      `You have a new message from ${senderName}`,
      'message'
    );
  }

  // Venue update notifications
  static async notifyUpdateRequestSubmitted(
    adminId: string,
    venueName: string,
    requestType: string,
    ownerName: string
  ): Promise<void> {
    await this.createNotification(
      adminId,
      'New Update Request',
      `${ownerName} submitted a ${requestType} update request for ${venueName}`,
      'general'
    );
  }

  // Venue approval notifications
  static async notifyVenueApproved(
    ownerId: string,
    venueName: string
  ): Promise<void> {
    await this.createNotification(
      ownerId,
      'Venue Approved',
      `Your venue "${venueName}" has been approved and is now live!`,
      'venue'
    );
  }

  static async notifyVenueRejected(
    ownerId: string,
    venueName: string,
    reason?: string
  ): Promise<void> {
    const message = reason
      ? `Your venue "${venueName}" was rejected. Reason: ${reason}`
      : `Your venue "${venueName}" was rejected. Please contact support for details.`;

    await this.createNotification(
      ownerId,
      'Venue Rejected',
      message,
      'venue'
    );
  }

  static async notifyVenueUpdateApproved(
    ownerId: string,
    venueName: string
  ): Promise<void> {
    await this.createNotification(
      ownerId,
      'Venue Update Approved',
      `Your updates to "${venueName}" have been approved and are now live!`,
      'venue'
    );
  }

  static async notifyVenueUpdateRejected(
    ownerId: string,
    venueName: string,
    reason?: string
  ): Promise<void> {
    const message = reason
      ? `Your updates to "${venueName}" were rejected. Reason: ${reason}`
      : `Your updates to "${venueName}" were rejected. Please contact support for details.`;

    await this.createNotification(
      ownerId,
      'Venue Update Rejected',
      message,
      'venue'
    );
  }

  // Booking status notifications
  static async notifyBookingPending(
    ownerId: string,
    playerName: string,
    venueName: string,
    bookingDate: string
  ): Promise<void> {
    await this.createNotification(
      ownerId,
      'New Booking Request',
      `${playerName} requested a booking at ${venueName} for ${bookingDate}`,
      'booking'
    );
  }

  static async notifyBookingRejected(
    playerId: string,
    venueName: string,
    bookingDate: string,
    reason?: string
  ): Promise<void> {
    const message = reason
      ? `Your booking at ${venueName} for ${bookingDate} was rejected. Reason: ${reason}`
      : `Your booking at ${venueName} for ${bookingDate} was rejected`;

    await this.createNotification(
      playerId,
      'Booking Rejected',
      message,
      'booking'
    );
  }

  // Forum offer notifications
  static async notifyOfferAccepted(
    offerPlayerId: string,
    postOwnerName: string,
    postTitle: string
  ): Promise<void> {
    await this.createNotification(
      offerPlayerId,
      'Offer Accepted',
      `${postOwnerName} accepted your offer to join: ${postTitle}`,
      'forum_offer'
    );
  }

  static async notifyOfferRejected(
    offerPlayerId: string,
    postOwnerName: string,
    postTitle: string
  ): Promise<void> {
    await this.createNotification(
      offerPlayerId,
      'Offer Declined',
      `${postOwnerName} declined your offer to join: ${postTitle}`,
      'forum_offer'
    );
  }

  // Announcement notifications
  static async notifyNewAnnouncement(
    playerId: string,
    venueName: string,
    announcementTitle: string
  ): Promise<void> {
    await this.createNotification(
      playerId,
      'New Venue Announcement',
      `${venueName} posted: ${announcementTitle}`,
      'announcement'
    );
  }

  // Bulk notification for announcements to all venue customers
  static async notifyAnnouncementToVenueCustomers(
    venueId: string,
    venueName: string,
    announcementTitle: string,
    announcementContent: string
  ): Promise<void> {
    try {
      // Get all players who have booked this venue
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('player_id')
        .eq('venue_id', venueId)
        .eq('status', 'confirmed');

      if (error) {
        console.error('Error fetching venue customers:', error);
        return;
      }

      // Get unique player IDs
      const uniquePlayerIds = [...new Set(bookings?.map(b => b.player_id) || [])];

      // Send notification to each player
      const notificationPromises = uniquePlayerIds.map(playerId =>
        this.notifyNewAnnouncement(playerId, venueName, announcementTitle)
      );

      await Promise.all(notificationPromises);
      console.log(`Sent announcement notifications to ${uniquePlayerIds.length} players`);
    } catch (error) {
      console.error('Error sending announcement notifications:', error);
    }
  }

  static async notifyUpdateRequestApproved(
    ownerId: string,
    venueName: string,
    requestType: string
  ): Promise<void> {
    await this.createNotification(
      ownerId,
      'Update Request Approved',
      `Your ${requestType} update request for ${venueName} has been approved and applied`,
      'general'
    );
  }

  static async notifyUpdateRequestRejected(
    ownerId: string,
    venueName: string,
    requestType: string,
    reason?: string
  ): Promise<void> {
    const message = reason
      ? `Your ${requestType} update request for ${venueName} has been rejected. Reason: ${reason}`
      : `Your ${requestType} update request for ${venueName} has been rejected`;

    await this.createNotification(
      ownerId,
      'Update Request Rejected',
      message,
      'general'
    );
  }
}
