// Venue update request service for managing venue modification requests
import { supabase } from './supabase';
import { NotificationService } from './notificationService';

export interface VenueUpdateRequest {
  id: string;
  venue_id: string;
  update_type: 'venue_info' | 'pricing' | 'availability' | 'services' | 'images' | 'fields';
  old_values: any;
  new_values: any;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  requested_at: string;
  venue?: {
    id: string;
    name: string;
  };
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

export class VenueUpdateRequestService {
  /**
   * Create a new venue update request
   */
  static async createUpdateRequest(
    venueId: string,
    updateType: string,
    oldValues: any,
    newValues: any,
    adminNotes?: string
  ): Promise<VenueUpdateRequest> {
    try {
      const { data, error } = await supabase
        .from('venue_updates')
        .insert({
          venue_id: venueId,
          update_type: updateType,
          old_values: oldValues,
          new_values: newValues,
          admin_notes: adminNotes,
          status: 'pending',
        })
        .select(`
          *,
          venues!venue_updates_venue_id_fkey (
            id,
            name,
            users!venues_owner_id_fkey (
              id,
              name,
              email
            )
          )
        `)
        .single();

      if (error) {
        console.error('Error creating update request:', error);
        throw error;
      }

      // Send notification to admin about new update request
      try {
        // Get admin users (assuming user_type = 'admin')
        const { data: admins, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('user_type', 'admin');

        if (!adminError && admins && admins.length > 0) {
          const venueName = data.venues?.name || 'Unknown Venue';
          const ownerName = data.users?.name || 'Unknown Owner';

          // Send notification to all admins
          for (const admin of admins) {
            await NotificationService.notifyUpdateRequestSubmitted(
              admin.id,
              venueName,
              requestType.replace('_', ' '),
              ownerName
            );
          }
        }
      } catch (notificationError) {
        console.error('Error sending admin notification:', notificationError);
        // Don't fail the request creation if notification fails
      }

      return data;
    } catch (error) {
      console.error('Error creating update request:', error);
      throw error;
    }
  }

  /**
   * Get update requests for a venue owner
   */
  static async getOwnerUpdateRequests(
    ownerId: string,
    status?: string
  ): Promise<VenueUpdateRequest[]> {
    try {
      let query = supabase
        .from('venue_updates')
        .select(`
          *,
          venues (
            id,
            name,
            owner_id
          )
        `)
        .order('requested_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading update requests:', error);
        throw error;
      }

      // Filter by owner_id after fetching
      const filteredData = data?.filter(item => item.venues?.owner_id === ownerId) || [];

      // Filter by status if provided
      const finalData = status && status !== 'all'
        ? filteredData.filter(item => item.status === status)
        : filteredData;

      return finalData;
    } catch (error) {
      console.error('Error loading update requests:', error);
      throw error;
    }
  }

  /**
   * Get all pending update requests (for admin)
   */
  static async getPendingUpdateRequests(): Promise<VenueUpdateRequest[]> {
    try {
      const { data, error } = await supabase
        .from('venue_updates')
        .select(`
          *,
          venues!venue_updates_venue_id_fkey (
            id,
            name,
            users!venues_owner_id_fkey (
              id,
              name,
              email
            )
          )
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });

      if (error) {
        console.error('Error loading pending requests:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error loading pending requests:', error);
      throw error;
    }
  }

  /**
   * Update request status (for admin)
   */
  static async updateRequestStatus(
    requestId: string,
    status: 'approved' | 'rejected',
    adminId: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('venue_updates')
        .update({
          status,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
          admin_notes: status === 'rejected' ? adminNotes : null,
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error updating request status:', error);
        throw error;
      }

      // Send notification to venue owner
      try {
        const { data: request, error: requestError } = await supabase
          .from('venue_updates')
          .select(`
            *,
            venues!venue_updates_venue_id_fkey (
              name,
              users!venues_owner_id_fkey (name)
            )
          `)
          .eq('id', requestId)
          .single();

        if (!requestError && request) {
          const venueName = request.venues?.name || 'Unknown Venue';
          const requestTypeLabel = request.update_type.replace('_', ' ');
          const ownerId = request.venues?.users?.id;

          if (ownerId) {
            if (status === 'approved') {
              await NotificationService.notifyUpdateRequestApproved(
                ownerId,
                venueName,
                requestTypeLabel
              );
            } else {
              await NotificationService.notifyUpdateRequestRejected(
                ownerId,
                venueName,
                requestTypeLabel,
                adminNotes
              );
            }
          }
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the status update if notification fails
      }

      // If approved, apply the changes to the venue
      if (status === 'approved') {
        await this.applyApprovedChanges(requestId);
      }
    } catch (error) {
      console.error('Error updating request status:', error);
      throw error;
    }
  }

  /**
   * Apply approved changes to the venue
   */
  static async applyApprovedChanges(requestId: string): Promise<void> {
    try {
      // Get the request details
      const { data: request, error: requestError } = await supabase
        .from('venue_updates')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError || !request) {
        console.error('Error fetching request:', requestError);
        throw requestError;
      }

      // Apply all changes from new_values
      const updateData = request.new_values;

      // Update venue basic info
      if (updateData.name || updateData.description || updateData.location || updateData.maps_link || updateData.city) {
        await this.applyVenueInfoChanges(request.venue_id, updateData);
      }

      // Update pricing
      if (updateData.day_charges || updateData.night_charges || updateData.weekday_charges || updateData.weekend_charges) {
        await this.applyPricingChanges(request.venue_id, updateData);
      }

      // Update availability
      if (updateData.opening_time || updateData.closing_time || updateData.days_available) {
        await this.applyAvailabilityChanges(request.venue_id, updateData);
      }

      // Update services
      if (updateData.services) {
        await this.applyServicesChanges(request.venue_id, updateData);
      }

      // Update images
      if (updateData.images) {
        await this.applyImagesChanges(request.venue_id, updateData);
      }

      // Update fields
      if (updateData.fields) {
        await this.applyFieldsChanges(request.venue_id, updateData);
      }
    } catch (error) {
      console.error('Error applying approved changes:', error);
      throw error;
    }
  }

  /**
   * Apply venue info changes
   */
  private static async applyVenueInfoChanges(venueId: string, changes: any): Promise<void> {
    const { error } = await supabase
      .from('venues')
      .update({
        name: changes.name,
        location: changes.location,
        maps_link: changes.maps_link,
        description: changes.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', venueId);

    if (error) throw error;
  }

  /**
   * Apply pricing changes
   */
  private static async applyPricingChanges(venueId: string, changes: any): Promise<void> {
    const { error } = await supabase
      .from('venues')
      .update({
        weekday_day_charges: changes.weekday_day_charges,
        weekday_night_charges: changes.weekday_night_charges,
        weekend_day_charges: changes.weekend_day_charges,
        weekend_night_charges: changes.weekend_night_charges,
        updated_at: new Date().toISOString(),
      })
      .eq('id', venueId);

    if (error) throw error;
  }

  /**
   * Apply availability changes
   */
  private static async applyAvailabilityChanges(venueId: string, changes: any): Promise<void> {
    const { error } = await supabase
      .from('venues')
      .update({
        opening_time: changes.opening_time,
        closing_time: changes.closing_time,
        days_available: changes.days_available,
        updated_at: new Date().toISOString(),
      })
      .eq('id', venueId);

    if (error) throw error;
  }

  /**
   * Apply services changes
   */
  private static async applyServicesChanges(venueId: string, changes: any): Promise<void> {
    const { error } = await supabase
      .from('venues')
      .update({
        services: changes.services,
        updated_at: new Date().toISOString(),
      })
      .eq('id', venueId);

    if (error) throw error;
  }

  /**
   * Apply images changes
   */
  private static async applyImagesChanges(venueId: string, changes: any): Promise<void> {
    try {
      // First, delete existing venue images
      const { error: deleteError } = await supabase
        .from('venue_images')
        .delete()
        .eq('venue_id', venueId);

      if (deleteError) {
        console.error('Error deleting existing images:', deleteError);
        throw deleteError;
      }

      // Then, insert new images if any
      if (changes.images && changes.images.length > 0) {
        const imageRecords = changes.images.map((image: any, index: number) => ({
          venue_id: venueId,
          image_url: image.image_url,
          is_primary: image.is_primary || false,
          display_order: image.display_order || index,
        }));

        const { error: insertError } = await supabase
          .from('venue_images')
          .insert(imageRecords);

        if (insertError) {
          console.error('Error inserting new images:', insertError);
          throw insertError;
        }
      }

      // Update venue timestamp
      const { error: venueError } = await supabase
        .from('venues')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', venueId);

      if (venueError) {
        console.error('Error updating venue timestamp:', venueError);
        // Don't throw error for timestamp update failure
      }
    } catch (error) {
      console.error('Error applying images changes:', error);
      throw error;
    }
  }

  /**
   * Apply fields changes
   */
  private static async applyFieldsChanges(venueId: string, changes: any): Promise<void> {
    try {
      if (changes.fields && changes.fields.length > 0) {
        // Update existing fields or create new ones
        for (const field of changes.fields) {
          if (field.id) {
            // Update existing field
            const { error: updateError } = await supabase
              .from('venue_fields')
              .update({
                field_name: field.field_name,
                field_number: field.field_number,
                status: field.status || 'open',
              })
              .eq('id', field.id);

            if (updateError) {
              console.error('Error updating field:', updateError);
              throw updateError;
            }
          } else {
            // Create new field
            const { error: insertError } = await supabase
              .from('venue_fields')
              .insert({
                venue_id: venueId,
                field_name: field.field_name,
                field_number: field.field_number,
                status: field.status || 'open',
              });

            if (insertError) {
              console.error('Error creating field:', insertError);
              throw insertError;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error applying fields changes:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending update request
   */
  static async cancelUpdateRequest(requestId: string, ownerId: string): Promise<void> {
    try {
      // First check if the venue belongs to the owner
      const { data: venueCheck, error: venueError } = await supabase
        .from('venue_updates')
        .select(`
          id,
          venues!venue_updates_venue_id_fkey (
            owner_id
          )
        `)
        .eq('id', requestId)
        .eq('status', 'pending')
        .single();

      if (venueError || !venueCheck) {
        throw new Error('Update request not found or not accessible');
      }

      if (venueCheck.venues?.owner_id !== ownerId) {
        throw new Error('You can only cancel your own venue update requests');
      }

      const { error } = await supabase
        .from('venue_updates')
        .delete()
        .eq('id', requestId)
        .eq('status', 'pending');

      if (error) {
        console.error('Error cancelling update request:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error cancelling update request:', error);
      throw error;
    }
  }

  /**
   * Get request statistics for admin dashboard
   */
  static async getRequestStatistics(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('venue_updates')
        .select('status');

      if (error) {
        console.error('Error loading request statistics:', error);
        throw error;
      }

      const stats = {
        pending: 0,
        approved: 0,
        rejected: 0,
        total: data?.length || 0,
      };

      data?.forEach(request => {
        stats[request.status as keyof typeof stats]++;
      });

      return stats;
    } catch (error) {
      console.error('Error loading request statistics:', error);
      return { pending: 0, approved: 0, rejected: 0, total: 0 };
    }
  }
}
