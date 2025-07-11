-- BookAndPlay Row Level Security (RLS) Policies
-- Secure data access based on user roles and ownership

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_updates ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT user_type INTO user_role
  FROM users
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'anonymous');
END;
$$;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id OR is_admin());

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (is_admin());

-- Public read access for basic user info (for venue owners to see player details)
CREATE POLICY "Public read access for basic user info" ON users
  FOR SELECT USING (true);

-- Venues table policies
CREATE POLICY "Anyone can view approved venues" ON venues
  FOR SELECT USING (approval_status = 'approved' OR auth.uid() = owner_id OR is_admin());

CREATE POLICY "Venue owners can insert their venues" ON venues
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Venue owners can update their venues" ON venues
  FOR UPDATE USING (auth.uid() = owner_id OR is_admin());

CREATE POLICY "Admins can delete venues" ON venues
  FOR DELETE USING (is_admin());

-- Venue images policies
CREATE POLICY "Anyone can view venue images" ON venue_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM venues v 
      WHERE v.id = venue_id 
      AND (v.approval_status = 'approved' OR auth.uid() = v.owner_id OR is_admin())
    )
  );

CREATE POLICY "Venue owners can manage their venue images" ON venue_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM venues v 
      WHERE v.id = venue_id 
      AND (auth.uid() = v.owner_id OR is_admin())
    )
  );

-- Venue fields policies
CREATE POLICY "Anyone can view venue fields" ON venue_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM venues v 
      WHERE v.id = venue_id 
      AND (v.approval_status = 'approved' OR auth.uid() = v.owner_id OR is_admin())
    )
  );

CREATE POLICY "Venue owners can manage their venue fields" ON venue_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM venues v 
      WHERE v.id = venue_id 
      AND (auth.uid() = v.owner_id OR is_admin())
    )
  );

-- Venue pricing policies
CREATE POLICY "Anyone can view venue pricing" ON venue_pricing
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM venues v 
      WHERE v.id = venue_id 
      AND (v.approval_status = 'approved' OR auth.uid() = v.owner_id OR is_admin())
    )
  );

CREATE POLICY "Venue owners can manage their venue pricing" ON venue_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM venues v 
      WHERE v.id = venue_id 
      AND (auth.uid() = v.owner_id OR is_admin())
    )
  );

-- Venue schedules policies
CREATE POLICY "Anyone can view venue schedules" ON venue_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM venues v 
      WHERE v.id = venue_id 
      AND (v.approval_status = 'approved' OR auth.uid() = v.owner_id OR is_admin())
    )
  );

CREATE POLICY "Venue owners can manage their venue schedules" ON venue_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM venues v 
      WHERE v.id = venue_id 
      AND (auth.uid() = v.owner_id OR is_admin())
    )
  );

-- Bookings table policies
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (
    auth.uid() = player_id OR 
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND auth.uid() = v.owner_id) OR
    is_admin()
  );

CREATE POLICY "Players can create bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Players and venue owners can update bookings" ON bookings
  FOR UPDATE USING (
    auth.uid() = player_id OR 
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND auth.uid() = v.owner_id) OR
    is_admin()
  );

CREATE POLICY "Admins can delete bookings" ON bookings
  FOR DELETE USING (is_admin());

-- Reviews table policies
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Players can create reviews for their bookings" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.player_id = auth.uid())
  );

CREATE POLICY "Players can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = player_id OR is_admin());

CREATE POLICY "Admins can delete reviews" ON reviews
  FOR DELETE USING (is_admin());

-- Forum posts policies
CREATE POLICY "Anyone can view active forum posts" ON forum_posts
  FOR SELECT USING (status = 'active' OR auth.uid() = player_id OR is_admin());

CREATE POLICY "Players can create forum posts" ON forum_posts
  FOR INSERT WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.player_id = auth.uid())
  );

CREATE POLICY "Players can update their own forum posts" ON forum_posts
  FOR UPDATE USING (auth.uid() = player_id OR is_admin());

CREATE POLICY "Players can delete their own forum posts" ON forum_posts
  FOR DELETE USING (auth.uid() = player_id OR is_admin());

-- Forum offers policies
CREATE POLICY "Post owners and offer makers can view offers" ON forum_offers
  FOR SELECT USING (
    auth.uid() = player_id OR
    EXISTS (SELECT 1 FROM forum_posts fp WHERE fp.id = post_id AND auth.uid() = fp.player_id) OR
    is_admin()
  );

CREATE POLICY "Players can create offers" ON forum_offers
  FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE POLICY "Post owners and offer makers can update offers" ON forum_offers
  FOR UPDATE USING (
    auth.uid() = player_id OR
    EXISTS (SELECT 1 FROM forum_posts fp WHERE fp.id = post_id AND auth.uid() = fp.player_id) OR
    is_admin()
  );

-- Messages table policies
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR is_admin());

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their sent messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR is_admin());

-- Notifications table policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id OR is_admin());

-- Disputes table policies
CREATE POLICY "Dispute parties and admins can view disputes" ON disputes
  FOR SELECT USING (
    auth.uid() = complainant_id OR 
    auth.uid() = defendant_id OR 
    is_admin()
  );

CREATE POLICY "Users can create disputes" ON disputes
  FOR INSERT WITH CHECK (
    auth.uid() = complainant_id AND
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND (b.player_id = auth.uid() OR EXISTS (SELECT 1 FROM venues v WHERE v.id = b.venue_id AND v.owner_id = auth.uid())))
  );

CREATE POLICY "Admins can update disputes" ON disputes
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete disputes" ON disputes
  FOR DELETE USING (is_admin());

-- Dispute messages policies
CREATE POLICY "Dispute parties and admins can view dispute messages" ON dispute_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM disputes d 
      WHERE d.id = dispute_id 
      AND (auth.uid() = d.complainant_id OR auth.uid() = d.defendant_id)
    ) OR is_admin()
  );

CREATE POLICY "Dispute parties and admins can send dispute messages" ON dispute_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM disputes d 
      WHERE d.id = dispute_id 
      AND (auth.uid() = d.complainant_id OR auth.uid() = d.defendant_id OR auth.uid() = sender_id)
    ) OR is_admin()
  );

-- Venue updates policies
CREATE POLICY "Venue owners and admins can view venue updates" ON venue_updates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND auth.uid() = v.owner_id) OR
    is_admin()
  );

CREATE POLICY "Venue owners can create venue updates" ON venue_updates
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM venues v WHERE v.id = venue_id AND auth.uid() = v.owner_id)
  );

CREATE POLICY "Admins can update venue updates" ON venue_updates
  FOR UPDATE USING (is_admin());

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role for admin functions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
