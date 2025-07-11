// Utility to fix missing time slots for existing venues
import { TimeSlotsService } from '../services/timeSlotsService';

/**
 * Fix time slots for all venues that don't have them
 * This can be called from the app to fix existing venues
 */
export const fixMissingTimeSlotsForAllVenues = async (): Promise<void> => {
  try {
    console.log('Starting time slots fix for all venues...');
    await TimeSlotsService.fixMissingTimeSlots();
    console.log('Time slots fix completed successfully');
  } catch (error) {
    console.error('Error fixing time slots:', error);
    throw error;
  }
};

/**
 * Check if a specific venue needs time slots and fix if needed
 */
export const fixTimeSlotsForVenue = async (venueId: string): Promise<boolean> => {
  try {
    const hasSlots = await TimeSlotsService.venueHasTimeSlots(venueId);
    
    if (!hasSlots) {
      console.log('Fixing time slots for venue:', venueId);
      // This will be handled by the booking screen when it detects missing slots
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking time slots for venue:', venueId, error);
    return false;
  }
};
