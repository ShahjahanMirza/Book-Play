// Core types for Book&Play app
export interface User {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  age: number;
  address?: string;
  cnic_passport?: string;
  city: string;
  user_type: 'player' | 'venue_owner' | 'admin';
  profile_image_url?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  location: string;
  maps_link?: string;
  city: string;
  services: string[];
  day_charges?: number;
  night_charges?: number;
  weekday_charges?: number;
  weekend_charges?: number;
  opening_time: string;
  closing_time: string;
  days_available: number[];
  is_active: boolean;
  status: 'open' | 'closed';
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  player_id: string;
  venue_id: string;
  field_id?: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_slots: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  booking_type: 'regular' | 'forum_shared';
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface NavigationProps {
  navigation: any;
  route: any;
}
