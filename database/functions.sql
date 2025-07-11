-- BookAndPlay Database Functions and Views
-- Analytics and utility functions for the admin dashboard

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, user_type, email_verified_at, is_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'player'),
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get venue statistics
CREATE OR REPLACE FUNCTION get_venue_statistics(venue_uuid UUID)
RETURNS TABLE (
  total_bookings BIGINT,
  confirmed_bookings BIGINT,
  pending_bookings BIGINT,
  cancelled_bookings BIGINT,
  total_revenue DECIMAL,
  average_rating DECIMAL,
  total_reviews BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
    COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
    COALESCE(AVG(r.rating), 0) as average_rating,
    COUNT(r.id) as total_reviews
  FROM venues v
  LEFT JOIN bookings b ON v.id = b.venue_id
  LEFT JOIN reviews r ON v.id = r.venue_id
  WHERE v.id = venue_uuid
  GROUP BY v.id;
END;
$$;

-- Function to get user booking statistics
CREATE OR REPLACE FUNCTION get_user_booking_stats(user_uuid UUID)
RETURNS TABLE (
  total_bookings BIGINT,
  completed_bookings BIGINT,
  cancelled_bookings BIGINT,
  total_spent DECIMAL,
  favorite_venue VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_amount ELSE 0 END), 0) as total_spent,
    (
      SELECT v.name 
      FROM venues v 
      JOIN bookings b2 ON v.id = b2.venue_id 
      WHERE b2.player_id = user_uuid 
      GROUP BY v.id, v.name 
      ORDER BY COUNT(*) DESC 
      LIMIT 1
    ) as favorite_venue
  FROM bookings b
  WHERE b.player_id = user_uuid;
END;
$$;

-- Function to get monthly revenue trends
CREATE OR REPLACE FUNCTION get_monthly_revenue_trends(months_back INTEGER DEFAULT 6)
RETURNS TABLE (
  month_year TEXT,
  total_revenue DECIMAL,
  booking_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC('month', b.created_at), 'Mon YYYY') as month_year,
    COALESCE(SUM(b.total_amount), 0) as total_revenue,
    COUNT(b.id) as booking_count
  FROM bookings b
  WHERE b.status = 'confirmed'
    AND b.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month' * months_back)
  GROUP BY DATE_TRUNC('month', b.created_at)
  ORDER BY DATE_TRUNC('month', b.created_at);
END;
$$;

-- Function to get top performing venues
CREATE OR REPLACE FUNCTION get_top_venues(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  venue_id UUID,
  venue_name VARCHAR,
  total_bookings BIGINT,
  total_revenue DECIMAL,
  average_rating DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as venue_id,
    v.name as venue_name,
    COUNT(b.id) as total_bookings,
    COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
    COALESCE(AVG(r.rating), 0) as average_rating
  FROM venues v
  LEFT JOIN bookings b ON v.id = b.venue_id
  LEFT JOIN reviews r ON v.id = r.venue_id
  WHERE v.approval_status = 'approved'
  GROUP BY v.id, v.name
  ORDER BY total_revenue DESC, total_bookings DESC
  LIMIT limit_count;
END;
$$;

-- Function to get booking peak hours
CREATE OR REPLACE FUNCTION get_booking_peak_hours()
RETURNS TABLE (
  hour_of_day INTEGER,
  booking_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM b.start_time)::INTEGER as hour_of_day,
    COUNT(b.id) as booking_count
  FROM bookings b
  WHERE b.status = 'confirmed'
    AND b.created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY EXTRACT(HOUR FROM b.start_time)
  ORDER BY hour_of_day;
END;
$$;

-- Function to calculate user retention rate
CREATE OR REPLACE FUNCTION get_user_retention_rate()
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  total_users BIGINT;
  active_users BIGINT;
  retention_rate DECIMAL;
BEGIN
  -- Get total users registered more than 30 days ago
  SELECT COUNT(*) INTO total_users
  FROM users 
  WHERE created_at <= CURRENT_DATE - INTERVAL '30 days'
    AND user_type = 'player';
  
  -- Get users who made a booking in the last 30 days
  SELECT COUNT(DISTINCT u.id) INTO active_users
  FROM users u
  JOIN bookings b ON u.id = b.player_id
  WHERE u.created_at <= CURRENT_DATE - INTERVAL '30 days'
    AND b.created_at >= CURRENT_DATE - INTERVAL '30 days'
    AND u.user_type = 'player';
  
  IF total_users > 0 THEN
    retention_rate := (active_users::DECIMAL / total_users::DECIMAL) * 100;
  ELSE
    retention_rate := 0;
  END IF;
  
  RETURN retention_rate;
END;
$$;

-- Function to get system health metrics
CREATE OR REPLACE FUNCTION get_system_health_metrics()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  total_venues BIGINT,
  active_venues BIGINT,
  total_bookings_today BIGINT,
  open_disputes BIGINT,
  system_errors BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM users WHERE user_type IN ('player', 'venue_owner')) as total_users,
    (SELECT COUNT(*) FROM users WHERE is_active = true AND suspended_at IS NULL) as active_users,
    (SELECT COUNT(*) FROM venues WHERE approval_status = 'approved') as total_venues,
    (SELECT COUNT(*) FROM venues WHERE approval_status = 'approved' AND status = 'open') as active_venues,
    (SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = CURRENT_DATE) as total_bookings_today,
    (SELECT COUNT(*) FROM disputes WHERE status = 'open') as open_disputes,
    0::BIGINT as system_errors; -- Placeholder for error tracking
END;
$$;

-- View for admin dashboard summary
CREATE OR REPLACE VIEW admin_dashboard_summary AS
SELECT
  (SELECT COUNT(*) FROM users WHERE user_type = 'player') as total_players,
  (SELECT COUNT(*) FROM users WHERE user_type = 'venue_owner') as total_venue_owners,
  (SELECT COUNT(*) FROM venues WHERE approval_status = 'approved') as approved_venues,
  (SELECT COUNT(*) FROM venues WHERE approval_status = 'pending') as pending_venues,
  (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as confirmed_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
  (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE status = 'confirmed') as total_revenue,
  (SELECT COUNT(*) FROM disputes WHERE status = 'open') as open_disputes,
  (SELECT COUNT(*) FROM forum_posts WHERE status = 'active') as active_forum_posts;

-- Function to log admin actions for audit trail
CREATE OR REPLACE FUNCTION log_admin_action(
  p_user_id UUID,
  p_action VARCHAR(100),
  p_table_name VARCHAR(100) DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_severity VARCHAR(20) DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    user_id, action, table_name, record_id, old_values, new_values,
    description, severity, created_at
  ) VALUES (
    p_user_id, p_action, p_table_name, p_record_id, p_old_values, p_new_values,
    p_description, p_severity, NOW()
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$;

-- Function to suspend user with audit logging
CREATE OR REPLACE FUNCTION suspend_user(
  p_admin_id UUID,
  p_user_id UUID,
  p_reason TEXT,
  p_duration_days INTEGER DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_user_data JSONB;
  new_user_data JSONB;
  suspension_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current user data for audit
  SELECT to_jsonb(u.*) INTO old_user_data
  FROM users u WHERE id = p_user_id;

  -- Calculate suspension end date if duration provided
  IF p_duration_days IS NOT NULL THEN
    suspension_until := NOW() + INTERVAL '1 day' * p_duration_days;
  END IF;

  -- Update user suspension
  UPDATE users
  SET
    suspended_at = NOW(),
    suspended_by = p_admin_id,
    suspension_reason = p_reason,
    is_active = false,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Get updated user data for audit
  SELECT to_jsonb(u.*) INTO new_user_data
  FROM users u WHERE id = p_user_id;

  -- Log the action
  PERFORM log_admin_action(
    p_admin_id,
    'USER_SUSPENDED',
    'users',
    p_user_id,
    old_user_data,
    new_user_data,
    'User suspended: ' || p_reason,
    'warning'
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    PERFORM log_admin_action(
      p_admin_id,
      'USER_SUSPENSION_FAILED',
      'users',
      p_user_id,
      NULL,
      NULL,
      'Failed to suspend user: ' || SQLERRM,
      'error'
    );
    RETURN FALSE;
END;
$$;

-- Function to approve/reject venue with audit logging
CREATE OR REPLACE FUNCTION update_venue_approval(
  p_admin_id UUID,
  p_venue_id UUID,
  p_status VARCHAR(20),
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_venue_data JSONB;
  new_venue_data JSONB;
  venue_name VARCHAR(255);
BEGIN
  -- Validate status
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval status: %', p_status;
  END IF;

  -- Get current venue data for audit
  SELECT to_jsonb(v.*), v.name INTO old_venue_data, venue_name
  FROM venues v WHERE id = p_venue_id;

  -- Update venue approval status
  UPDATE venues
  SET
    approval_status = p_status,
    approved_by = p_admin_id,
    approved_at = NOW(),
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_reason ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_venue_id;

  -- Get updated venue data for audit
  SELECT to_jsonb(v.*) INTO new_venue_data
  FROM venues v WHERE id = p_venue_id;

  -- Log the action
  PERFORM log_admin_action(
    p_admin_id,
    'VENUE_' || UPPER(p_status),
    'venues',
    p_venue_id,
    old_venue_data,
    new_venue_data,
    'Venue "' || venue_name || '" ' || p_status || COALESCE(': ' || p_reason, ''),
    CASE WHEN p_status = 'approved' THEN 'info' ELSE 'warning' END
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    PERFORM log_admin_action(
      p_admin_id,
      'VENUE_APPROVAL_FAILED',
      'venues',
      p_venue_id,
      NULL,
      NULL,
      'Failed to update venue approval: ' || SQLERRM,
      'error'
    );
    RETURN FALSE;
END;
$$;

-- Function to resolve dispute with audit logging
CREATE OR REPLACE FUNCTION resolve_dispute(
  p_admin_id UUID,
  p_dispute_id UUID,
  p_resolution TEXT,
  p_status VARCHAR(20) DEFAULT 'resolved'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_dispute_data JSONB;
  new_dispute_data JSONB;
  dispute_title VARCHAR(255);
BEGIN
  -- Validate status
  IF p_status NOT IN ('resolved', 'closed') THEN
    RAISE EXCEPTION 'Invalid dispute status: %', p_status;
  END IF;

  -- Get current dispute data for audit
  SELECT to_jsonb(d.*), d.title INTO old_dispute_data, dispute_title
  FROM disputes d WHERE id = p_dispute_id;

  -- Update dispute resolution
  UPDATE disputes
  SET
    status = p_status,
    resolution = p_resolution,
    resolved_by = p_admin_id,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_dispute_id;

  -- Get updated dispute data for audit
  SELECT to_jsonb(d.*) INTO new_dispute_data
  FROM disputes d WHERE id = p_dispute_id;

  -- Log the action
  PERFORM log_admin_action(
    p_admin_id,
    'DISPUTE_' || UPPER(p_status),
    'disputes',
    p_dispute_id,
    old_dispute_data,
    new_dispute_data,
    'Dispute "' || dispute_title || '" ' || p_status || ': ' || p_resolution,
    'info'
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    PERFORM log_admin_action(
      p_admin_id,
      'DISPUTE_RESOLUTION_FAILED',
      'disputes',
      p_dispute_id,
      NULL,
      NULL,
      'Failed to resolve dispute: ' || SQLERRM,
      'error'
    );
    RETURN FALSE;
END;
$$;

-- Trigger function for automatic audit logging
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  action_type VARCHAR(20);
  old_data JSONB;
  new_data JSONB;
  user_id UUID;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'INSERT';
    old_data := NULL;
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'UPDATE';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'DELETE';
    old_data := to_jsonb(OLD);
    new_data := NULL;
  END IF;

  -- Try to get current user ID from auth context
  BEGIN
    user_id := auth.uid();
  EXCEPTION
    WHEN OTHERS THEN
      user_id := NULL;
  END;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id, action, table_name, record_id, old_values, new_values,
    description, severity, created_at
  ) VALUES (
    user_id,
    action_type || '_' || UPPER(TG_TABLE_NAME),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    old_data,
    new_data,
    action_type || ' operation on ' || TG_TABLE_NAME,
    'info',
    NOW()
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create audit triggers for critical tables
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_venues_trigger ON venues;
CREATE TRIGGER audit_venues_trigger
  AFTER INSERT OR UPDATE OR DELETE ON venues
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_bookings_trigger ON bookings;
CREATE TRIGGER audit_bookings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_disputes_trigger ON disputes;
CREATE TRIGGER audit_disputes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON disputes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Analytics Views and Procedures

-- View for user analytics summary
CREATE OR REPLACE VIEW user_analytics_summary AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  user_type,
  COUNT(*) as new_users,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
  COUNT(CASE WHEN suspended_at IS NOT NULL THEN 1 END) as suspended_users
FROM users
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY DATE_TRUNC('month', created_at), user_type
ORDER BY month DESC, user_type;

-- View for venue performance analytics
CREATE OR REPLACE VIEW venue_performance_analytics AS
SELECT
  v.id,
  v.name,
  v.city,
  v.approval_status,
  v.created_at,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
  COALESCE(AVG(CASE WHEN b.status = 'confirmed' THEN b.total_amount END), 0) as avg_booking_value,
  COALESCE(AVG(r.rating), 0) as avg_rating,
  COUNT(r.id) as total_reviews
FROM venues v
LEFT JOIN bookings b ON v.id = b.venue_id
LEFT JOIN reviews r ON v.id = r.venue_id
WHERE v.approval_status = 'approved'
GROUP BY v.id, v.name, v.city, v.approval_status, v.created_at;

-- View for booking trends analytics
CREATE OR REPLACE VIEW booking_trends_analytics AS
SELECT
  DATE_TRUNC('month', booking_date) as month,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_bookings,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bookings,
  COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_amount ELSE 0 END), 0) as total_revenue,
  COALESCE(AVG(CASE WHEN status = 'confirmed' THEN total_amount END), 0) as avg_booking_value,
  EXTRACT(DOW FROM booking_date) as day_of_week,
  EXTRACT(HOUR FROM start_time) as hour_of_day
FROM bookings
WHERE booking_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY DATE_TRUNC('month', booking_date), EXTRACT(DOW FROM booking_date), EXTRACT(HOUR FROM start_time)
ORDER BY month DESC;

-- View for revenue analytics
CREATE OR REPLACE VIEW revenue_analytics AS
SELECT
  DATE_TRUNC('month', b.booking_date) as month,
  v.city,
  COUNT(b.id) as booking_count,
  SUM(b.total_amount) as total_revenue,
  AVG(b.total_amount) as avg_booking_value,
  SUM(b.total_amount) * 0.05 as platform_commission,
  COUNT(DISTINCT b.player_id) as unique_customers,
  COUNT(DISTINCT b.venue_id) as active_venues
FROM bookings b
JOIN venues v ON b.venue_id = v.id
WHERE b.status = 'confirmed'
  AND b.booking_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months')
GROUP BY DATE_TRUNC('month', b.booking_date), v.city
ORDER BY month DESC, total_revenue DESC;

-- Procedure to get comprehensive platform analytics
CREATE OR REPLACE FUNCTION get_platform_analytics(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  metric_name VARCHAR,
  metric_value DECIMAL,
  metric_change_percent DECIMAL,
  period_label VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
  prev_start_date DATE;
  prev_end_date DATE;
BEGIN
  -- Calculate previous period for comparison
  prev_end_date := p_start_date - INTERVAL '1 day';
  prev_start_date := prev_end_date - (p_end_date - p_start_date);

  RETURN QUERY
  WITH current_metrics AS (
    SELECT
      'total_revenue' as metric,
      COALESCE(SUM(total_amount), 0) as value
    FROM bookings
    WHERE status = 'confirmed'
      AND booking_date BETWEEN p_start_date AND p_end_date

    UNION ALL

    SELECT
      'total_bookings' as metric,
      COUNT(*)::DECIMAL as value
    FROM bookings
    WHERE booking_date BETWEEN p_start_date AND p_end_date

    UNION ALL

    SELECT
      'new_users' as metric,
      COUNT(*)::DECIMAL as value
    FROM users
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date

    UNION ALL

    SELECT
      'active_venues' as metric,
      COUNT(DISTINCT venue_id)::DECIMAL as value
    FROM bookings
    WHERE booking_date BETWEEN p_start_date AND p_end_date
  ),
  previous_metrics AS (
    SELECT
      'total_revenue' as metric,
      COALESCE(SUM(total_amount), 0) as value
    FROM bookings
    WHERE status = 'confirmed'
      AND booking_date BETWEEN prev_start_date AND prev_end_date

    UNION ALL

    SELECT
      'total_bookings' as metric,
      COUNT(*)::DECIMAL as value
    FROM bookings
    WHERE booking_date BETWEEN prev_start_date AND prev_end_date

    UNION ALL

    SELECT
      'new_users' as metric,
      COUNT(*)::DECIMAL as value
    FROM users
    WHERE DATE(created_at) BETWEEN prev_start_date AND prev_end_date

    UNION ALL

    SELECT
      'active_venues' as metric,
      COUNT(DISTINCT venue_id)::DECIMAL as value
    FROM bookings
    WHERE booking_date BETWEEN prev_start_date AND prev_end_date
  )
  SELECT
    c.metric,
    c.value,
    CASE
      WHEN p.value > 0 THEN ((c.value - p.value) / p.value) * 100
      ELSE 0
    END as change_percent,
    p_start_date::VARCHAR || ' to ' || p_end_date::VARCHAR as period
  FROM current_metrics c
  LEFT JOIN previous_metrics p ON c.metric = p.metric;
END;
$$;

-- Procedure to get user behavior analytics
CREATE OR REPLACE FUNCTION get_user_behavior_analytics()
RETURNS TABLE (
  user_id UUID,
  user_name VARCHAR,
  user_email VARCHAR,
  total_bookings BIGINT,
  total_spent DECIMAL,
  avg_booking_value DECIMAL,
  last_booking_date DATE,
  user_segment VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.email,
    COUNT(b.id) as total_bookings,
    COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END), 0) as total_spent,
    COALESCE(AVG(CASE WHEN b.status = 'confirmed' THEN b.total_amount END), 0) as avg_booking_value,
    MAX(b.booking_date) as last_booking_date,
    CASE
      WHEN COUNT(b.id) = 0 THEN 'Inactive'
      WHEN COUNT(b.id) = 1 THEN 'New Customer'
      WHEN COUNT(b.id) BETWEEN 2 AND 5 THEN 'Regular Customer'
      WHEN COUNT(b.id) > 5 THEN 'VIP Customer'
    END as user_segment
  FROM users u
  LEFT JOIN bookings b ON u.id = b.player_id
  WHERE u.user_type = 'player'
  GROUP BY u.id, u.name, u.email
  ORDER BY total_spent DESC;
END;
$$;

-- Procedure to get venue utilization analytics
CREATE OR REPLACE FUNCTION get_venue_utilization_analytics(
  p_venue_id UUID DEFAULT NULL
)
RETURNS TABLE (
  venue_id UUID,
  venue_name VARCHAR,
  total_slots INTEGER,
  booked_slots BIGINT,
  utilization_rate DECIMAL,
  peak_hours INTEGER[],
  revenue_per_slot DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.name,
    -- Estimate total available slots (simplified calculation)
    (EXTRACT(HOUR FROM v.closing_time) - EXTRACT(HOUR FROM v.opening_time))::INTEGER * 30 as total_slots,
    COUNT(b.id) as booked_slots,
    CASE
      WHEN (EXTRACT(HOUR FROM v.closing_time) - EXTRACT(HOUR FROM v.opening_time)) > 0
      THEN (COUNT(b.id)::DECIMAL / ((EXTRACT(HOUR FROM v.closing_time) - EXTRACT(HOUR FROM v.opening_time)) * 30)) * 100
      ELSE 0
    END as utilization_rate,
    ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM b.start_time)::INTEGER ORDER BY EXTRACT(HOUR FROM b.start_time)::INTEGER) as peak_hours,
    COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END) / NULLIF(COUNT(b.id), 0), 0) as revenue_per_slot
  FROM venues v
  LEFT JOIN bookings b ON v.id = b.venue_id
    AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days'
  WHERE v.approval_status = 'approved'
    AND (p_venue_id IS NULL OR v.id = p_venue_id)
  GROUP BY v.id, v.name, v.opening_time, v.closing_time
  ORDER BY utilization_rate DESC;
END;
$$;

-- View for system performance metrics
CREATE OR REPLACE VIEW system_performance_metrics AS
SELECT
  'database_size' as metric_name,
  pg_size_pretty(pg_database_size(current_database())) as metric_value,
  'info' as metric_type
UNION ALL
SELECT
  'total_tables' as metric_name,
  COUNT(*)::TEXT as metric_value,
  'info' as metric_type
FROM information_schema.tables
WHERE table_schema = 'public'
UNION ALL
SELECT
  'active_connections' as metric_name,
  COUNT(*)::TEXT as metric_value,
  'performance' as metric_type
FROM pg_stat_activity
WHERE state = 'active'
UNION ALL
SELECT
  'error_rate_24h' as metric_name,
  COALESCE(
    (COUNT(CASE WHEN severity IN ('error', 'critical') THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0) * 100)::TEXT || '%',
    '0%'
  ) as metric_value,
  'health' as metric_type
FROM audit_logs
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- View for venue performance metrics
CREATE OR REPLACE VIEW venue_performance_metrics AS
SELECT 
  v.id,
  v.name,
  v.city,
  v.status,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
  COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_amount ELSE 0 END), 0) as total_revenue,
  COALESCE(AVG(r.rating), 0) as average_rating,
  COUNT(r.id) as total_reviews,
  MAX(b.created_at) as last_booking_date
FROM venues v
LEFT JOIN bookings b ON v.id = b.venue_id
LEFT JOIN reviews r ON v.id = r.venue_id
WHERE v.approval_status = 'approved'
GROUP BY v.id, v.name, v.city, v.status;

-- View for user activity metrics
CREATE OR REPLACE VIEW user_activity_metrics AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.user_type,
  u.created_at as registration_date,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_amount ELSE 0 END), 0) as total_spent,
  MAX(b.created_at) as last_booking_date,
  COUNT(m.id) as messages_sent,
  COUNT(fp.id) as forum_posts_created
FROM users u
LEFT JOIN bookings b ON u.id = b.player_id
LEFT JOIN messages m ON u.id = m.sender_id
LEFT JOIN forum_posts fp ON u.id = fp.player_id
WHERE u.user_type IN ('player', 'venue_owner')
GROUP BY u.id, u.name, u.email, u.user_type, u.created_at;

-- Function to clean up old data (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete old notifications (older than 90 days)
  DELETE FROM notifications 
  WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
  
  -- Delete old messages (older than 1 year)
  DELETE FROM messages 
  WHERE created_at < CURRENT_DATE - INTERVAL '1 year';
  
  -- Archive old completed bookings (older than 2 years)
  -- This would typically move to an archive table in production
  
  RAISE NOTICE 'Old data cleanup completed';
END;
$$;
