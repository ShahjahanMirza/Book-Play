// Simple event emitter for real-time updates across the app
import { EventEmitter } from 'events';

class AppEventEmitter extends EventEmitter {}

export const appEvents = new AppEventEmitter();

// Event types
export const EVENT_TYPES = {
  BOOKING_TRANSFERRED: 'booking_transferred',
  OFFER_ACCEPTED: 'offer_accepted',
  OFFER_REJECTED: 'offer_rejected',
  FORUM_POST_CREATED: 'forum_post_created',
  FORUM_POST_DELETED: 'forum_post_deleted',
  MESSAGE_RECEIVED: 'message_received',
  BOOKING_CREATED: 'booking_created',
  BOOKING_CANCELLED: 'booking_cancelled',
} as const;

// Helper functions for emitting events
export const emitBookingTransferred = (data: {
  bookingId: string;
  fromPlayerId: string;
  toPlayerId: string;
  venueId: string;
  gameDate: string;
}) => {
  appEvents.emit(EVENT_TYPES.BOOKING_TRANSFERRED, data);
};

export const emitOfferAccepted = (data: {
  offerId: string;
  postId: string;
  playerId: string;
}) => {
  appEvents.emit(EVENT_TYPES.OFFER_ACCEPTED, data);
};

export const emitOfferRejected = (data: {
  offerId: string;
  postId: string;
  playerId: string;
}) => {
  appEvents.emit(EVENT_TYPES.OFFER_REJECTED, data);
};

export const emitForumPostCreated = (data: {
  postId: string;
  playerId: string;
}) => {
  appEvents.emit(EVENT_TYPES.FORUM_POST_CREATED, data);
};

export const emitForumPostDeleted = (data: {
  postId: string;
  playerId: string;
}) => {
  appEvents.emit(EVENT_TYPES.FORUM_POST_DELETED, data);
};

export const emitMessageReceived = (data: {
  messageId: string;
  senderId: string;
  receiverId: string;
}) => {
  appEvents.emit(EVENT_TYPES.MESSAGE_RECEIVED, data);
};

export const emitBookingCreated = (data: {
  bookingId: string;
  playerId: string;
  venueId: string;
}) => {
  appEvents.emit(EVENT_TYPES.BOOKING_CREATED, data);
};

export const emitBookingCancelled = (data: {
  bookingId: string;
  playerId: string;
  venueId: string;
}) => {
  appEvents.emit(EVENT_TYPES.BOOKING_CANCELLED, data);
};
