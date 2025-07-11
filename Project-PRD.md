# Book&Play - Product Requirements Document

## User Types

### 1. Players

- Separate profiles and tabs for all users.

#### Unauthenticated Players
- Browse venues and details

#### Authenticated Players
- Manage profiles
- View bookings (completed, pending, cancelled)
- Browse, search, and filter venues
- Click venues to open details
- Book venues using day, date, and slots
- Select specific fields when venue has multiple fields
- Book multiple consecutive slots (e.g., 09:00pm to 11:00pm - 2 slots)
- Contact venues through venue detail section
- Can filter to see their completed, pending, cancelled booking and accepted forum posts or offers.

#### Player Forum
- Post confirmed bookings
- View offers from other players
- Contact players through phone number
- Approach players with bookings to offer play partnerships
- Can filter to find their preferred venue bookings quicker.

### 2. Venue Owners

#### Profile Management
- Create separate owner profile
- List multiple venues
- List multiple fields per venue

#### Venue Management
**Required Information:**
- Name
- Field number (optional)
- Location
- Maps link
- Images
- Services
- Day and night charges
- Weekend and weekday charges
- Days available
- Opening and closing time
- Available slots

#### Booking Management
- Accept or reject bookings
- View player details for booking requests
- Track all bookings
- Access booking dashboard

#### Venue Status Management
- Set venue status (open/closed) based on availability
- Override default availability for special occasions or events
- Real-time status updates affecting booking availability

#### Venue Updates
- Update all venue details
- Changes require admin approval before going live

#### Communication
- Connect with players requesting bookings
- Add announcements (visible to venue viewers and players with bookings)

### 3. Admin

#### User Management
- Handle all users (players and owners)
- Suspend or remove players, venues, or owners
- Complete control over app usage
- Access to all user profiles and detailed information

#### Venue Management
- Review and approve venue listings
- Review and approve venue detail updates
- View venue booking statistics
- Access to all venue details and performance metrics
- Monitor venue status changes

#### Dispute Management
- Dedicated dispute/ticket section
- Handle disputes from players and venue owners
- View dispute descriptions with relevant venue/player profiles
- Resolve booking-related conflicts

#### Monitoring
- View player booking histories
- Oversee entire app ecosystem
- Comprehensive dashboard with all system metrics

## Core Features

### Authentication System
- Sign up requirements:
  - Name
  - Age
  - Address (optional)
  - CNIC/Passport (optional)
  - Phone number
  - User type selection (I want to play / I want to list)
  - City
  - Email
  - Password
  - Rewrite password
- Forgot password functionality

### Booking System
- Day, date, and slot-based booking
- Multiple field selection for venues with multiple fields
- Consecutive slot booking (e.g., 09:00pm to 11:00pm - 2 slots)
- Booking status tracking (pending, confirmed, cancelled, completed)
- Players cannot cancel confirmed bookings
- Venue availability based on owner-set status (open/closed)

### Venue Status System
- Default availability set during venue creation (days and time slots)
- Dynamic status changes (open/closed) by venue owners
- Status overrides for special occasions or events
- Real-time booking availability updates

### Dispute System
- Players and venue owners can create tickets/disputes
- Dispute descriptions include relevant venue/player profiles
- Admin-handled dispute resolution
- Dedicated admin section for dispute management

### Review System
- Players can leave reviews and ratings
- Reviews only available after booking completion

### Notification System
- Booking confirmations
- Booking cancellations
- Booking completions
- Venue announcements (to players with bookings)
- Forum activity notifications

### Modal System
- Confirmation modals for all user actions
- Booking confirmations
- Cancellation confirmations
- Status update notifications

### Communication Features
- Phone number-based contact between players
- Venue-player communication through venue details
- Forum-based player interactions

## Workflow Requirements

### Venue Creation Process
1. Owner creates venue with default availability (days and time slots)
2. Admin reviews venue
3. Venue goes live after approval

### Venue Update Process
1. Owner updates venue details
2. Admin reviews changes
3. Updates go live after admin approval
4. Owner can change venue status (open/closed) in real-time

### Booking Process
1. Player checks venue availability and status
2. Player selects venue, date, and slot(s)
3. If venue has multiple fields, player selects specific field
4. Player can book multiple consecutive slots
5. Booking request sent to venue owner (if venue is open)
6. Owner accepts/rejects booking
7. Player receives notification
8. Confirmed bookings cannot be cancelled by players

### Dispute Process
1. Player or venue owner creates dispute/ticket
2. Dispute includes description and relevant profiles
3. Admin reviews and handles dispute
4. Resolution communicated to involved parties

### Forum Process
1. Player posts confirmed booking
2. Other players can offer to join
3. Original player can contact interested players
4. Communication happens via phone numbers

### Review Process
1. Booking must be completed
2. Player can leave review and rating
3. Reviews appear on venue details


The PRD now includes the complete venue status management system where owners can set default availability during creation, dynamically change status for special occasions, and update venue details (subject to admin approval).

# Book&Play - Development Plan & Database Schema

## Development Phases

### Phase 1: Foundation & Core Authentication 
**Priority: Critical**

#### Backend Setup
- Set up project structure react native with expo
- Database setup and configuration. Supabase.
- Environment configuration
- Basic API structure with middleware
- Error handling and logging

#### Authentication System
- User registration with all required fields
- Login/logout functionality
- JWT token management
- Forgot password functionality
- Email verification system
- Role-based access control (Player, Venue Owner, Admin)

#### Database Schema Implementation
- Create all core tables
- Set up relationships and constraints
- Database migrations and seeders
- Basic CRUD operations for users

#### Testing
- Unit tests for authentication
- API endpoint testing
- Database connection and query testing

### Phase 2: Core User Management 
**Priority: Critical**

#### User Profiles
- Player profile management
- Venue owner profile management
- Profile picture upload
- Profile validation and updates

#### Admin Panel Foundation
- Admin dashboard structure
- User management (view, suspend, remove)
- Basic admin controls
- Admin authentication and authorization

#### Testing
- Profile management testing
- Admin functionality testing
- User role verification

### Phase 3: Venue Management System 
**Priority: Critical**

#### Venue Creation & Management
- Venue listing functionality
- Multiple field support per venue
- Image upload for venues
- Venue details management
- Location and maps integration

#### Venue Status Management
- Venue open/closed status
- Individual field status control
- Availability scheduling
- Status override functionality

#### Admin Venue Management
- Venue approval workflow
- Venue update approval process
- Venue statistics and monitoring

#### Testing
- Venue creation and management testing
- Status management testing
- Admin approval workflow testing

### Phase 4: Booking System 
**Priority: Critical**

#### Core Booking Features
- Venue browsing and filtering
- Slot-based booking system
- Multiple consecutive slot booking
- Booking request management
- Booking status tracking

#### Booking Workflows
- Player booking process
- Venue owner booking management
- Booking confirmation/rejection
- Booking history and tracking

#### Testing
- Booking system testing
- Workflow testing
- Edge case handling

### Phase 5: In-App Messaging System 
**Priority: High**

#### Messaging Infrastructure
- Real-time messaging setup (WebSocket/Socket.io)
- Message storage and retrieval
- Image sharing functionality
- Message status tracking

#### User-to-User Communication
- Player-to-venue messaging
- Forum-based messaging
- Messaging restrictions and rules
- Message history management

#### Testing
- Messaging functionality testing
- Real-time communication testing
- Message delivery and status testing

### Phase 6: Forum & Community Features 
**Priority: High**

#### Forum System
- Booking posting functionality
- Player offer system
- Forum interaction management
- Booking-based forum restrictions

#### Community Features
- Player interaction workflows
- Offer management system
- Contact facilitation

#### Testing
- Forum functionality testing
- Community interaction testing
- Booking-forum integration testing

### Phase 7: Reviews & Rating System 
**Priority: Medium**

#### Review System
- Post-booking review functionality
- Rating system implementation
- Review display and management
- Review validation (completed bookings only)

#### Testing
- Review system testing
- Rating calculation testing
- Review display testing

### Phase 8: Notifications & Alerts 
**Priority: High**

#### Notification System
- Push notification setup
- Email notification system
- In-app notification management
- Notification preferences

#### Notification Types
- Booking notifications
- Status change notifications
- Forum activity notifications
- Venue announcements

#### Testing
- Notification delivery testing
- Notification preferences testing
- Cross-platform notification testing

### Phase 9: Dispute Management System 
**Priority: Medium**

#### Dispute System
- Ticket creation functionality
- Dispute tracking and management
- Admin dispute resolution tools
- Dispute communication system

#### Testing
- Dispute creation and management testing
- Admin resolution workflow testing
- Dispute communication testing

### Phase 10: Advanced Admin Features 
**Priority: Medium**

#### Comprehensive Admin Panel
- Advanced user analytics
- Booking statistics and reports
- Revenue tracking and reports
- System monitoring tools

#### Admin Controls
- Bulk user management
- System configuration management
- Data export and reporting
- Advanced search and filtering

#### Testing
- Admin panel functionality testing
- Reporting system testing
- System monitoring testing

### Phase 11: Frontend Development 
**Priority: Critical**

#### Mobile App Development
- Cross-platform mobile app (React Native/Flutter)
- User interface implementation
- API integration
- Platform-specific features

#### Web Application
- Responsive web interface
- Admin web panel
- User dashboard implementation
- Real-time updates integration

#### Testing
- Frontend functionality testing
- Cross-platform compatibility testing
- User experience testing

### Phase 12: Integration & Testing 
**Priority: Critical**

#### System Integration
- End-to-end testing
- Performance optimization
- Security testing and hardening
- Load testing

#### Bug Fixes & Refinements
- Issue resolution
- Performance tuning
- User feedback integration
- Final optimizations

### Phase 13: Deployment & Launch 
**Priority: Critical**

#### Production Deployment
- Server setup and configuration
- Database migration to production
- SSL certificates and security setup
- Monitoring and logging setup

#### Launch Preparation
- User documentation
- Admin training materials
- Support system setup
- Marketing materials preparation

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    age INTEGER NOT NULL,
    address TEXT,
    cnic_passport VARCHAR(50),
    city VARCHAR(100) NOT NULL,
    user_type ENUM('player', 'venue_owner', 'admin') NOT NULL,
    profile_image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    suspended_at TIMESTAMP,
    suspended_by UUID REFERENCES users(id),
    suspension_reason TEXT
);
```

### Password Reset Tokens Table
```sql
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Venues Table
```sql
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(500) NOT NULL,
    maps_link VARCHAR(500),
    city VARCHAR(100) NOT NULL,
    services TEXT[],
    day_charges DECIMAL(10,2),
    night_charges DECIMAL(10,2),
    weekday_charges DECIMAL(10,2),
    weekend_charges DECIMAL(10,2),
    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,
    days_available INTEGER[] NOT NULL, -- Array of day numbers (0=Sunday, 1=Monday, etc.)
    is_active BOOLEAN DEFAULT true,
    status ENUM('open', 'closed') DEFAULT 'open',
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_venues_owner (owner_id),
    INDEX idx_venues_city (city),
    INDEX idx_venues_status (status),
    INDEX idx_venues_approval (approval_status)
);
```

### Venue Images Table
```sql
CREATE TABLE venue_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_venue_images_venue (venue_id)
);
```

### Venue Fields Table
```sql
CREATE TABLE venue_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    field_number VARCHAR(50),
    field_name VARCHAR(255),
    status ENUM('open', 'closed') DEFAULT 'open',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_venue_fields_venue (venue_id),
    INDEX idx_venue_fields_status (status)
);
```

### Venue Updates Table
```sql
CREATE TABLE venue_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    update_data JSON NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    requested_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_venue_updates_venue (venue_id),
    INDEX idx_venue_updates_status (status)
);
```

### Time Slots Table
```sql
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    field_id UUID REFERENCES venue_fields(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_time_slots_venue (venue_id),
    INDEX idx_time_slots_field (field_id),
    INDEX idx_time_slots_day (day_of_week)
);
```

### Bookings Table
```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    field_id UUID REFERENCES venue_fields(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_slots INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    booking_type ENUM('regular', 'forum_shared') DEFAULT 'regular',
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id),
    confirmed_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_bookings_player (player_id),
    INDEX idx_bookings_venue (venue_id),
    INDEX idx_bookings_date (booking_date),
    INDEX idx_bookings_status (status),
    INDEX idx_bookings_field (field_id)
);
```

### Booking Slots Table
```sql
CREATE TABLE booking_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    slot_start_time TIME NOT NULL,
    slot_end_time TIME NOT NULL,
    slot_order INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_booking_slots_booking (booking_id)
);
```

### Reviews Table
```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_booking_review (booking_id),
    INDEX idx_reviews_venue (venue_id),
    INDEX idx_reviews_player (player_id),
    INDEX idx_reviews_rating (rating)
);
```

### Forum Posts Table
```sql
CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slots_available INTEGER NOT NULL,
    status ENUM('active', 'closed', 'expired') DEFAULT 'active',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_forum_posts_player (player_id),
    INDEX idx_forum_posts_booking (booking_id),
    INDEX idx_forum_posts_status (status)
);
```

### Forum Offers Table
```sql
CREATE TABLE forum_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_forum_offers_post (post_id),
    INDEX idx_forum_offers_player (player_id),
    INDEX idx_forum_offers_status (status)
);
```

### Messages Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type ENUM('text', 'image') DEFAULT 'text',
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    context_type ENUM('booking', 'forum', 'general') NOT NULL,
    context_id UUID, -- Can reference booking_id or forum_post_id
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    admin_flagged BOOLEAN DEFAULT false,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_messages_sender (sender_id),
    INDEX idx_messages_receiver (receiver_id),
    INDEX idx_messages_context (context_type, context_id),
    INDEX idx_messages_created (created_at),
    INDEX idx_messages_conversation (sender_id, receiver_id, created_at),
    INDEX idx_messages_admin_flagged (admin_flagged)
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('booking', 'forum', 'venue', 'system', 'message') NOT NULL,
    context_type ENUM('booking', 'venue', 'forum_post', 'message') NOT NULL,
    context_id UUID NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_created (created_at)
);
```

### Venue Announcements Table
```sql
CREATE TABLE venue_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_venue_announcements_venue (venue_id),
    INDEX idx_venue_announcements_active (is_active)
);
```

### Disputes Table
```sql
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    complainant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    defendant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    assigned_to UUID REFERENCES users(id),
    resolution TEXT,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_disputes_booking (booking_id),
    INDEX idx_disputes_complainant (complainant_id),
    INDEX idx_disputes_status (status),
    INDEX idx_disputes_assigned (assigned_to)
);
```

### Dispute Messages Table
```sql
CREATE TABLE dispute_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin_message BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_dispute_messages_dispute (dispute_id),
    INDEX idx_dispute_messages_sender (sender_id)
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_audit_logs_user (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_table (table_name),
    INDEX idx_audit_logs_record (record_id),
    INDEX idx_audit_logs_created (created_at)
);
```

### System Settings Table
```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'integer', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_system_settings_key (setting_key),
    INDEX idx_system_settings_public (is_public)
);
```

## Database Indexes and Constraints

### Performance Indexes
```sql
-- Composite indexes for common queries
CREATE INDEX idx_bookings_venue_date_status ON bookings(venue_id, booking_date, status);
CREATE INDEX idx_bookings_player_status_date ON bookings(player_id, status, booking_date);
CREATE INDEX idx_messages_receiver_read_created ON messages(receiver_id, is_read, created_at);
CREATE INDEX idx_notifications_user_read_created ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_forum_posts_status_created ON forum_posts(status, created_at);
CREATE INDEX idx_venues_city_approval_status ON venues(city, approval_status, status);

-- Admin chat monitoring indexes
CREATE INDEX idx_messages_admin_conversation ON messages(sender_id, receiver_id, created_at);
CREATE INDEX idx_messages_admin_flagged ON messages(admin_flagged);
```