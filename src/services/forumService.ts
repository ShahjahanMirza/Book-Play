// Forum service for managing forum posts and offers
import { supabase } from './supabase';
import { NotificationService } from './notificationService';
import { emitBookingTransferred, emitOfferAccepted, emitOfferRejected } from '../utils/eventEmitter';

export interface ForumPost {
  id: string;
  player_id: string;
  venue_id: string;
  field_id?: string;
  venue_name: string;
  venue_location: string;
  field_name?: string;
  game_date: string;
  start_time: string;
  end_time: string;
  note?: string;
  status: 'active' | 'closed' | 'expired';
  expires_at?: string;
  created_at: string;
  updated_at: string;
  player: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  offers_count: number;
}

export interface ForumOffer {
  id: string;
  post_id: string;
  player_id: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  player: {
    id: string;
    name: string;
    phone_number: string;
    profile_image_url?: string;
  };
}

export interface CreateForumPostData {
  venue_id: string;
  field_id?: string;
  venue_name: string;
  venue_location: string;
  field_name?: string;
  game_date: string;
  start_time: string;
  end_time: string;
  note?: string;
}

export class ForumService {
  /**
   * Get all forum posts with filters
   */
  static async getForumPosts(
    filters: {
      status?: 'active' | 'closed' | 'expired';
      venue_id?: string;
      date_from?: string;
      date_to?: string;
      search?: string;
    } = {},
    limit: number = 20,
    offset: number = 0,
    currentUserId?: string
  ): Promise<ForumPost[]> {
    try {
      let query = supabase
        .from('forum_posts')
        .select(`
          id,
          player_id,
          venue_id,
          field_id,
          venue_name,
          venue_location,
          field_name,
          game_date,
          start_time,
          end_time,
          note,
          status,
          expires_at,
          created_at,
          updated_at,
          users!forum_posts_player_id_fkey (
            id,
            name,
            profile_image_url
          )
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.date_from) {
        query = query.gte('game_date', filters.date_from);
      }

      if (filters.date_to) {
        query = query.lte('game_date', filters.date_to);
      }

      if (filters.venue_id) {
        query = query.eq('venue_id', filters.venue_id);
      }

      if (filters.search) {
        query = query.or(`venue_name.ilike.%${filters.search}%,venue_location.ilike.%${filters.search}%,note.ilike.%${filters.search}%`);
      }

      const { data: posts, error } = await query;

      if (error) {
        console.error('Error loading forum posts:', error);
        throw error;
      }

      // Filter out posts with accepted offers (unless user is the post owner)
      let filteredPosts = posts || [];
      if (currentUserId) {
        const postsToCheck = await Promise.all(
          filteredPosts.map(async (post) => {
            // If user is the post owner, always show the post
            if (post.player_id === currentUserId) {
              return { post, shouldShow: true };
            }

            // Check if this post has any accepted offers
            const { data: acceptedOffers } = await supabase
              .from('forum_offers')
              .select('id')
              .eq('post_id', post.id)
              .eq('status', 'accepted')
              .limit(1);

            // Hide post if it has accepted offers and user is not the owner
            return { post, shouldShow: !acceptedOffers || acceptedOffers.length === 0 };
          })
        );

        filteredPosts = postsToCheck
          .filter(({ shouldShow }) => shouldShow)
          .map(({ post }) => post);
      }

      // Get offer counts for each remaining post
      const postsWithCounts = await Promise.all(
        filteredPosts.map(async (post) => {
          const { count: totalOffers } = await supabase
            .from('forum_offers')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            id: post.id,
            player_id: post.player_id,
            venue_id: post.venue_id,
            field_id: post.field_id,
            venue_name: post.venue_name,
            venue_location: post.venue_location,
            field_name: post.field_name,
            game_date: post.game_date,
            start_time: post.start_time,
            end_time: post.end_time,
            note: post.note,
            status: post.status,
            expires_at: post.expires_at,
            created_at: post.created_at,
            updated_at: post.updated_at,
            player: {
              id: (post.users as any)?.id || post.player_id,
              name: (post.users as any)?.name || 'Unknown Player',
              profile_image_url: (post.users as any)?.profile_image_url || null,
            },
            offers_count: totalOffers || 0,
          };
        })
      );

      // Apply search filter if provided
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        return postsWithCounts.filter(post =>
          (post.note && post.note.toLowerCase().includes(searchTerm)) ||
          post.venue_name.toLowerCase().includes(searchTerm) ||
          post.venue_location.toLowerCase().includes(searchTerm) ||
          post.player.name.toLowerCase().includes(searchTerm)
        );
      }

      return postsWithCounts;
    } catch (error) {
      console.error('Error getting forum posts:', error);
      throw error;
    }
  }

  /**
   * Create a new forum post with venue and game details
   */
  static async createForumPost(
    playerId: string,
    postData: CreateForumPostData
  ): Promise<ForumPost> {
    try {
      // Verify the venue exists
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .select('id, name, location')
        .eq('id', postData.venue_id)
        .single();

      if (venueError || !venue) {
        throw new Error('Venue not found');
      }

      // Verify field exists if provided
      if (postData.field_id) {
        const { data: field, error: fieldError } = await supabase
          .from('venue_fields')
          .select('id, field_name')
          .eq('id', postData.field_id)
          .eq('venue_id', postData.venue_id)
          .single();

        if (fieldError || !field) {
          throw new Error('Field not found');
        }
      }

      // Create the forum post
      const { data: post, error } = await supabase
        .from('forum_posts')
        .insert({
          player_id: playerId,
          venue_id: postData.venue_id,
          field_id: postData.field_id,
          venue_name: postData.venue_name,
          venue_location: postData.venue_location,
          field_name: postData.field_name,
          game_date: postData.game_date,
          start_time: postData.start_time,
          end_time: postData.end_time,
          note: postData.note,
          status: 'active',
        })
        .select(`
          id,
          player_id,
          venue_id,
          field_id,
          venue_name,
          venue_location,
          field_name,
          game_date,
          start_time,
          end_time,
          note,
          status,
          expires_at,
          created_at,
          updated_at,
          users!forum_posts_player_id_fkey (
            id,
            name,
            profile_image_url
          )
        `)
        .single();

      if (error) {
        console.error('Error creating forum post:', error);
        throw error;
      }

      return {
        id: post.id,
        player_id: post.player_id,
        venue_id: post.venue_id,
        field_id: post.field_id,
        venue_name: post.venue_name,
        venue_location: post.venue_location,
        field_name: post.field_name,
        game_date: post.game_date,
        start_time: post.start_time,
        end_time: post.end_time,
        note: post.note,
        status: post.status,
        expires_at: post.expires_at,
        created_at: post.created_at,
        updated_at: post.updated_at,
        player: {
          id: (post.users as any)?.id || playerId,
          name: (post.users as any)?.name || 'Unknown Player',
          profile_image_url: (post.users as any)?.profile_image_url || null,
        },
        offers_count: 0,
      };
    } catch (error) {
      console.error('Error creating forum post:', error);
      throw error;
    }
  }

  /**
   * Delete a forum post (only by the post owner)
   */
  static async deleteForumPost(playerId: string, postId: string): Promise<void> {
    try {
      // Verify the user owns the post
      const { data: post, error: postError } = await supabase
        .from('forum_posts')
        .select('id, player_id')
        .eq('id', postId)
        .single();

      if (postError || !post) {
        throw new Error('Forum post not found');
      }

      if (post.player_id !== playerId) {
        throw new Error('You can only delete your own forum posts');
      }

      // Delete the forum post (this will cascade delete offers due to foreign key constraints)
      const { error: deleteError } = await supabase
        .from('forum_posts')
        .delete()
        .eq('id', postId);

      if (deleteError) {
        console.error('Error deleting forum post:', deleteError);
        throw deleteError;
      }
    } catch (error) {
      console.error('Error deleting forum post:', error);
      throw error;
    }
  }

  /**
   * Get a specific forum post by ID
   */
  static async getForumPostById(postId: string): Promise<ForumPost | null> {
    try {
      const { data: post, error } = await supabase
        .from('forum_posts')
        .select(`
          id,
          player_id,
          venue_id,
          field_id,
          venue_name,
          venue_location,
          field_name,
          game_date,
          start_time,
          end_time,
          note,
          status,
          expires_at,
          created_at,
          updated_at,
          users!forum_posts_player_id_fkey (
            id,
            name,
            profile_image_url
          )
        `)
        .eq('id', postId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Post not found
          return null;
        }
        console.error('Error loading forum post:', error);
        throw error;
      }

      return {
        id: post.id,
        player_id: post.player_id,
        venue_id: post.venue_id,
        field_id: post.field_id,
        venue_name: post.venue_name,
        venue_location: post.venue_location,
        field_name: post.field_name,
        game_date: post.game_date,
        start_time: post.start_time,
        end_time: post.end_time,
        note: post.note,
        status: post.status,
        expires_at: post.expires_at,
        created_at: post.created_at,
        updated_at: post.updated_at,
        player: {
          id: (post.users as any)?.id || post.player_id,
          name: (post.users as any)?.name || 'Unknown Player',
          profile_image_url: (post.users as any)?.profile_image_url || null,
        },
        offers_count: 0, // Will be loaded separately if needed
      };
    } catch (error) {
      console.error('Error loading forum post by ID:', error);
      throw error;
    }
  }

  /**
   * Get offers for a specific forum post
   * Post owners see all offers, other players only see their own offers
   */
  static async getPostOffers(postId: string, currentUserId?: string): Promise<ForumOffer[]> {
    try {
      // First, check if the current user is the post owner
      let isPostOwner = false;
      if (currentUserId) {
        const { data: post, error: postError } = await supabase
          .from('forum_posts')
          .select('player_id')
          .eq('id', postId)
          .single();

        if (!postError && post) {
          isPostOwner = post.player_id === currentUserId;
        }
      }

      // Build the query
      let query = supabase
        .from('forum_offers')
        .select(`
          id,
          post_id,
          player_id,
          message,
          status,
          created_at,
          users!forum_offers_player_id_fkey (
            id,
            name,
            phone_number,
            profile_image_url
          )
        `)
        .eq('post_id', postId);

      // If not the post owner and no user ID provided, return empty array
      if (!currentUserId) {
        return [];
      }

      // If not the post owner, only show their own offers
      if (!isPostOwner) {
        query = query.eq('player_id', currentUserId);
      }

      const { data: offers, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading post offers:', error);
        throw error;
      }

      return (offers || []).map(offer => ({
        id: offer.id,
        post_id: offer.post_id,
        player_id: offer.player_id,
        message: offer.message,
        status: offer.status,
        created_at: offer.created_at,
        player: {
          id: (offer.users as any)?.id || offer.player_id,
          name: (offer.users as any)?.name || 'Unknown Player',
          phone_number: (offer.users as any)?.phone_number || '',
          profile_image_url: (offer.users as any)?.profile_image_url || null,
        },
      }));
    } catch (error) {
      console.error('Error getting post offers:', error);
      throw error;
    }
  }

  /**
   * Create an offer for a forum post
   */
  static async createOffer(
    playerId: string,
    postId: string,
    message: string
  ): Promise<ForumOffer> {
    try {
      // Check if the player already has an offer for this post
      const { data: existingOffer, error: existingError } = await supabase
        .from('forum_offers')
        .select('id')
        .eq('post_id', postId)
        .eq('player_id', playerId)
        .single();

      if (existingOffer) {
        throw new Error('You have already made an offer for this post');
      }

      // Check if the post is still open
      const { data: post, error: postError } = await supabase
        .from('forum_posts')
        .select('status, player_id')
        .eq('id', postId)
        .single();

      if (postError || !post) {
        throw new Error('Forum post not found');
      }

      if (post.status !== 'active') {
        throw new Error('This forum post is no longer accepting offers');
      }

      if (post.player_id === playerId) {
        throw new Error('You cannot make an offer on your own post');
      }

      // Create the offer
      const { data: offer, error } = await supabase
        .from('forum_offers')
        .insert({
          post_id: postId,
          player_id: playerId,
          message,
          status: 'pending',
        })
        .select(`
          id,
          post_id,
          player_id,
          message,
          status,
          created_at,
          users!forum_offers_player_id_fkey (
            id,
            name,
            phone_number,
            profile_image_url
          )
        `)
        .single();

      if (error) {
        console.error('Error creating offer:', error);
        throw error;
      }

      // Send notification to post owner
      try {
        const postOwnerName = (offer.users as any)?.name || 'Unknown Player';
        const postTitle = `Game at venue`; // You might want to get actual venue name
        await NotificationService.notifyOfferReceived(
          post.player_id,
          postOwnerName,
          postTitle
        );
      } catch (notificationError) {
        console.error('Error sending offer notification:', notificationError);
        // Don't fail the offer creation if notification fails
      }

      return {
        id: offer.id,
        post_id: offer.post_id,
        player_id: offer.player_id,
        message: offer.message,
        status: offer.status,
        created_at: offer.created_at,
        player: {
          id: (offer.users as any)?.id || offer.player_id,
          name: (offer.users as any)?.name || 'Unknown Player',
          phone_number: (offer.users as any)?.phone_number || '',
          profile_image_url: (offer.users as any)?.profile_image_url || null,
        },
      };
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Accept or reject an offer
   */
  static async updateOfferStatus(
    postOwnerId: string,
    offerId: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> {
    try {
      // Verify the user owns the post and get offer details
      const { data: offer, error: offerError } = await supabase
        .from('forum_offers')
        .select(`
          id,
          post_id,
          player_id,
          forum_posts!forum_offers_post_id_fkey (
            player_id,
            venue_id,
            game_date,
            start_time,
            end_time
          )
        `)
        .eq('id', offerId)
        .single();

      if (offerError || !offer) {
        throw new Error('Offer not found');
      }

      const forumPost = Array.isArray(offer.forum_posts) ? offer.forum_posts[0] : offer.forum_posts;

      if (!forumPost || forumPost.player_id !== postOwnerId) {
        throw new Error('You can only manage offers on your own posts');
      }

      // Update the offer status
      const { error: updateError } = await supabase
        .from('forum_offers')
        .update({ status })
        .eq('id', offerId);

      if (updateError) {
        throw updateError;
      }

      // Send notification to the player who made the offer
      try {
        const postTitle = `Game at venue`; // You might want to get actual venue name
        const postOwnerName = 'Post Owner'; // You might want to get actual post owner name

        if (status === 'accepted') {
          await NotificationService.notifyOfferAccepted(
            offer.player_id,
            postOwnerName,
            postTitle
          );

          // Share the booking with the player who made the offer
          console.log('Starting booking sharing process:', {
            originalPlayer: forumPost?.player_id,
            newPlayer: offer.player_id,
            venue: forumPost?.venue_id,
            date: forumPost?.game_date,
            time: `${forumPost?.start_time} - ${forumPost?.end_time}`
          });

          await this.shareBookingWithPlayer(
            forumPost.player_id, // original booking owner
            offer.player_id, // player who made the offer
            forumPost.venue_id,
            forumPost.game_date,
            forumPost.start_time,
            forumPost.end_time
          );

          console.log('Booking sharing completed successfully');

          // Emit event for real-time updates
          emitBookingTransferred({
            bookingId: 'unknown', // We'll need to get this from the transfer function
            fromPlayerId: forumPost.player_id,
            toPlayerId: offer.player_id,
            venueId: forumPost.venue_id,
            gameDate: forumPost.game_date,
          });

          emitOfferAccepted({
            offerId: offer.id,
            postId: offer.post_id,
            playerId: offer.player_id,
          });

          // Update forum post status to closed when offer is accepted
          await supabase
            .from('forum_posts')
            .update({ status: 'closed' })
            .eq('id', offer.post_id);

        } else if (status === 'rejected') {
          await NotificationService.notifyOfferRejected(
            offer.player_id,
            postOwnerName,
            postTitle
          );
        }
      } catch (notificationError) {
        console.error('Error sending status notification:', notificationError);
        // Don't fail the status update if notification fails
      }
    } catch (error) {
      console.error('Error updating offer status:', error);
      throw error;
    }
  }

  /**
   * Share booking with the player who made the accepted offer by creating a duplicate booking
   */
  static async shareBookingWithPlayer(
    originalOwnerId: string,
    newPlayerId: string,
    venueId: string,
    gameDate: string,
    startTime: string,
    endTime: string
  ): Promise<void> {
    console.log('🔄 shareBookingWithPlayer function called!');
    try {
      console.log('Sharing booking with details:', {
        originalOwnerId,
        newPlayerId,
        venueId,
        gameDate,
        startTime,
        endTime
      });

      // Find the original booking
      const bookingDate = gameDate.includes('T') ? gameDate.split('T')[0] : gameDate;

      const { data: originalBooking, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('player_id', originalOwnerId)
        .eq('venue_id', venueId)
        .eq('booking_date', bookingDate)
        .eq('start_time', startTime)
        .eq('end_time', endTime)
        .eq('status', 'confirmed')
        .single();

      if (bookingError || !originalBooking) {
        console.error('Original booking not found:', bookingError);
        throw new Error('Original booking not found');
      }

      console.log('Found original booking:', originalBooking.id);

      // Create a duplicate booking for the new player
      const { data: newBooking, error: createError } = await supabase
        .from('bookings')
        .insert({
          player_id: newPlayerId,
          venue_id: originalBooking.venue_id,
          field_id: originalBooking.field_id,
          booking_date: originalBooking.booking_date,
          start_time: originalBooking.start_time,
          end_time: originalBooking.end_time,
          total_slots: originalBooking.total_slots,
          total_amount: originalBooking.total_amount, // Show the same price as original booking
          status: 'confirmed',
          booking_type: 'forum_shared',
          confirmed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Error creating shared booking:', createError);
        console.error('Booking data that failed:', {
          player_id: newPlayerId,
          venue_id: originalBooking.venue_id,
          field_id: originalBooking.field_id,
          booking_date: originalBooking.booking_date,
          start_time: originalBooking.start_time,
          end_time: originalBooking.end_time,
          total_slots: originalBooking.total_slots,
          total_amount: 0,
          status: 'confirmed',
          booking_type: 'forum_shared'
        });
        throw new Error('Failed to create shared booking');
      }

      console.log('Created shared booking:', newBooking.id, 'for player:', newPlayerId);

      // Copy booking slots if they exist
      const { data: originalSlots } = await supabase
        .from('booking_slots')
        .select('*')
        .eq('booking_id', originalBooking.id);

      if (originalSlots && originalSlots.length > 0) {
        const newSlots = originalSlots.map(slot => ({
          booking_id: newBooking.id,
          slot_start_time: slot.slot_start_time,
          slot_end_time: slot.slot_end_time,
          slot_order: slot.slot_order,
          created_at: new Date().toISOString()
        }));

        const { error: slotsError } = await supabase
          .from('booking_slots')
          .insert(newSlots);

        if (slotsError) {
          console.error('Error copying booking slots:', slotsError);
          // Don't fail the whole process for slots error
        } else {
          console.log('Copied', newSlots.length, 'booking slots');
        }
      }

      console.log('Booking sharing completed successfully');
    } catch (error) {
      console.error('Error in booking sharing:', error);
      throw error;
    }
  }

  /**
   * Transfer booking to the player who made the accepted offer using booking ID (legacy)
   */
  static async transferBookingToPlayerById(
    bookingId: string,
    newOwnerId: string
  ): Promise<void> {
    try {
      console.log('Transferring booking:', bookingId, 'to player:', newOwnerId);

      // Transfer the booking to the new player
      const { error: transferError } = await supabase
        .from('bookings')
        .update({
          player_id: newOwnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (transferError) {
        console.error('Error transferring booking:', transferError);
        throw new Error('Failed to transfer booking');
      }

      console.log('Booking transferred successfully to', newOwnerId);
    } catch (error) {
      console.error('Error in booking transfer:', error);
      throw error;
    }
  }

  /**
   * Transfer booking to the player who made the accepted offer (legacy method)
   */
  static async transferBookingToPlayer(
    currentOwnerId: string,
    newOwnerId: string,
    venueId: string,
    gameDate: string,
    startTime: string,
    endTime: string
  ): Promise<void> {
    try {
      console.log('Searching for booking with details:', {
        currentOwnerId,
        venueId,
        gameDate,
        startTime,
        endTime
      });

      // Find the booking that matches the forum post details
      // Convert gameDate to proper format if needed
      const bookingDate = gameDate.includes('T') ? gameDate.split('T')[0] : gameDate;

      console.log('Formatted search criteria:', {
        player_id: currentOwnerId,
        venue_id: venueId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed'
      });

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id, total_amount, field_id, booking_date, start_time, end_time, player_id')
        .eq('player_id', currentOwnerId)
        .eq('venue_id', venueId)
        .eq('booking_date', bookingDate)
        .eq('start_time', startTime)
        .eq('end_time', endTime)
        .eq('status', 'confirmed')
        .single();

      if (bookingError || !booking) {
        console.error('Booking not found for transfer:', {
          error: bookingError,
          searchCriteria: {
            currentOwnerId,
            venueId,
            bookingDate,
            startTime,
            endTime
          }
        });

        // Try to find any booking for this user and venue on this date
        const { data: allBookings } = await supabase
          .from('bookings')
          .select('id, booking_date, start_time, end_time, status')
          .eq('player_id', currentOwnerId)
          .eq('venue_id', venueId)
          .eq('booking_date', bookingDate);

        console.log('All bookings for user on this date:', allBookings);
        throw new Error('Associated booking not found');
      }

      console.log('Found booking to transfer:', booking);

      // Transfer the booking to the new player
      const { error: transferError } = await supabase
        .from('bookings')
        .update({
          player_id: newOwnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

      if (transferError) {
        console.error('Error transferring booking:', transferError);
        throw new Error('Failed to transfer booking');
      }

      console.log('Booking transferred successfully from', currentOwnerId, 'to', newOwnerId);
    } catch (error) {
      console.error('Error in booking transfer:', error);
      throw error;
    }
  }

  /**
   * Get player's own forum posts
   */
  static async getPlayerPosts(playerId: string): Promise<ForumPost[]> {
    try {
      return await this.getForumPosts({}, 50, 0, playerId);
    } catch (error) {
      console.error('Error getting player posts:', error);
      throw error;
    }
  }

  /**
   * Get player's offers
   */
  static async getPlayerOffers(playerId: string): Promise<ForumOffer[]> {
    try {
      const { data: offers, error } = await supabase
        .from('forum_offers')
        .select(`
          id,
          post_id,
          player_id,
          message,
          status,
          created_at,
          forum_posts!forum_offers_post_id_fkey (
            title,
            bookings!forum_posts_booking_id_fkey (
              booking_date,
              start_time,
              venues (
                name,
                location
              )
            )
          ),
          users!forum_offers_player_id_fkey (
            id,
            name,
            phone_number,
            profile_image_url
          )
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading player offers:', error);
        throw error;
      }

      return (offers || []).map(offer => ({
        id: offer.id,
        post_id: offer.post_id,
        player_id: offer.player_id,
        message: offer.message,
        status: offer.status,
        created_at: offer.created_at,
        player: {
          id: (offer.users as any)?.id || offer.player_id,
          name: (offer.users as any)?.name || 'Unknown Player',
          phone_number: (offer.users as any)?.phone_number || '',
          profile_image_url: (offer.users as any)?.profile_image_url || null,
        },
      }));
    } catch (error) {
      console.error('Error getting player offers:', error);
      throw error;
    }
  }
}
