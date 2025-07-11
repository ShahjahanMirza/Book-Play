# Book&Play - Complete Production Development Plan

## Project Overview
**Objective**: Develop a complete production-ready futsal booking app with React Native/Expo for Play Store deployment.

**Technology Stack**:
- **Frontend**: React Native with Expo (Latest SDK)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Context + Supabase subscriptions
- **UI Framework**: React Native Elements + Custom Components
- **Deployment**: EAS Build for Play Store
- **Notifications**: Expo Notifications + Supabase
- **Image Handling**: Expo Image Picker + Supabase Storage
- **Real-time**: Supabase Realtime for messaging and updates

## Complete Feature Requirements (From PRD)

### 1. USER TYPES & AUTHENTICATION

#### 1.1 User Types
- **Players** (Authenticated & Unauthenticated)
- **Venue Owners**
- **Admins**

#### 1.2 Authentication System
**Sign Up Requirements**:
- Name (required)
- Age (required)
- Address (optional)
- CNIC/Passport (optional)
- Phone number (required)
- User type selection: "I want to play" / "I want to list" (required)
- City (required)
- Email (required)
- Password (required)
- Rewrite password (required)

**Authentication Features**:
- Email verification system
- Forgot password functionality
- JWT token management
- Role-based access control
- Session persistence with AsyncStorage

### NOTE:
MUST HAVE SEPARATE TABS FOR UNAUTHENTICATED PLAYERS, AUTHENTICATED PLAYERS, VENUE OWNERS, AND ADMINS. NO USER SHOULD BE ABLE TO SEE ANYTHING THAT IS NOT FOR THEM. COMPLETE ROLE-BASED NAVIGATION.

### 2. PLAYER FEATURES

#### 2.1 Unauthenticated Players - Separate Tab
- Browse venues and details
- View venue information (read-only)

#### 2.2 Authenticated Players - Separate Tabs and profile (Browse, Bookings, Profile, Forum, Messaging, Notifications) - **PARTIALLY COMPLETED**
**Profile Management**:
- Manage complete profile
- Update personal information

**Booking Features**:
- Browse, search, and filter venues
- Click venues to open detailed view
- Book venues using day, date, and slots
- Select specific fields when venue has multiple fields
- Book multiple consecutive slots (e.g., 09:00pm to 11:00pm - 2 slots)
- View bookings (completed, pending, cancelled)
- Filter bookings by status
- Cannot cancel confirmed bookings (business rule)

**Communication**:
- Contact venues through venue detail section
- Phone number-based contact system
- In-app messaging system (real-time)

#### 2.3 Player Forum System
**Forum Features**:
- Post confirmed bookings to forum
- View offers from other players
- Contact players through phone numbers
- Approach players with bookings for partnerships
- Filter to find preferred venue bookings
- Filter to see accepted forum posts/offers

**Forum Workflow**:
1. Player posts confirmed booking
2. Other players can offer to join
3. Original player contacts interested players
4. Communication via phone numbers

### 3. VENUE OWNER FEATURES - Separate Tabs and profile (Dashboard, Bookings, Profile, Announcements, Messaging, Notifications, Add venue)

#### 3.1 Profile Management
- Create separate owner profile
- List multiple venues
- Manage multiple fields per venue

#### 3.2 Venue Management
**Required Venue Information**:
- Name (required)
- Field number (optional)
- Location (required)
- Maps link (required)
- Images (required)
- Services (required)
- Day charges (required)
- Night charges (required)
- Weekend charges (required)
- Weekday charges (required)
- Days available (required)
- Opening time (required)
- Closing time (required)
- Available slots (required)

#### 3.3 Venue Status Management
- Set venue status (open/closed)
- Override default availability for special occasions
- Real-time status updates affecting booking availability
- Individual field status control

#### 3.4 Booking Management
- Accept or reject booking requests
- View player details for booking requests
- Track all bookings (pending, confirmed, cancelled, completed)
- Access comprehensive booking dashboard

#### 3.5 Venue Updates
- Update all venue details
- Changes require admin approval before going live
- Update workflow with approval system

#### 3.6 Communication & Announcements
- Connect with players requesting bookings
- Add announcements visible to:
  - Venue viewers
  - Players with bookings at the venue

### 4. ADMIN FEATURES - Separate Tabs and profile (Dashboard for monitoring, overall and individual user/venue statistics, PLayers & Venues management, Bookings by player and venues, Disputes, Messaging, Notifications, Analytics, Settings)

#### 4.1 User Management
- Handle all users (players and owners)
- Suspend or remove players, venues, or owners
- Complete control over app usage
- Access to all user profiles and detailed information
- Bulk user management capabilities

#### 4.2 Venue Management
- Review and approve venue listings
- Review and approve venue detail updates
- View venue booking statistics
- Access to all venue details and performance metrics
- Monitor venue status changes
- Venue approval workflow management

#### 4.3 Dispute Management
- Dedicated dispute/ticket section
- Handle disputes from players and venue owners
- View dispute descriptions with relevant venue/player profiles
- Resolve booking-related conflicts
- Dispute communication system
- Track dispute resolution status

#### 4.4 Monitoring & Analytics
- View player booking histories
- Oversee entire app ecosystem
- Comprehensive dashboard with system metrics
- Revenue tracking and reports
- User analytics and behavior tracking
- System performance monitoring

### 5. CORE SYSTEM FEATURES

#### 5.1 Booking System
**Booking Process**:
1. Player checks venue availability and status
2. Player selects venue, date, and slot(s)
3. If venue has multiple fields, player selects specific field
4. Player can book multiple consecutive slots
5. Booking request sent to venue owner (if venue is open)
6. Owner accepts/rejects booking
7. Player receives notification
8. Confirmed bookings cannot be cancelled by players

**Booking Features**:
- Day, date, and slot-based booking
- Multiple field selection support
- Consecutive slot booking capability
- Booking status tracking (pending, confirmed, cancelled, completed)
- Venue availability based on owner-set status
- Real-time availability updates

#### 5.2 Review System
- Players can leave reviews and ratings (1-5 stars)
- Reviews only available after booking completion
- Review validation system
- Review display on venue details
- Rating calculation and aggregation

#### 5.3 Notification System
**Notification Types**:
- Booking confirmations
- Booking cancellations
- Booking completions
- Venue announcements (to players with bookings)
- Forum activity notifications
- Status change notifications
- Dispute updates

**Notification Delivery**:
- Push notifications
- In-app notifications
- Email notifications (optional)
- Notification preferences management

#### 5.4 Modal System
- Confirmation modals for all user actions
- Booking confirmation modals
- Cancellation confirmation modals
- Status update notification modals
- Error and success message modals

#### 5.5 Communication Features
- Phone number-based contact between players
- Venue-player communication through venue details
- Forum-based player interactions
- Real-time messaging system
- Image sharing in messages
- Message status tracking (sent, delivered, read)
- Admin monitoring of communications

### 6. WORKFLOW REQUIREMENTS

#### 6.1 Venue Creation Process
1. Owner creates venue with default availability (days and time slots)
2. Admin reviews venue submission
3. Venue goes live after admin approval
4. Rejection with reason if not approved

#### 6.2 Venue Update Process
1. Owner updates venue details
2. Admin reviews changes
3. Updates go live after admin approval
4. Owner can change venue status (open/closed) in real-time without approval

#### 6.3 Booking Process
1. Player checks venue availability and status
2. Player selects venue, date, and slot(s)
3. If venue has multiple fields, player selects specific field
4. Player can book multiple consecutive slots
5. Booking request sent to venue owner (if venue is open)
6. Owner accepts/rejects booking
7. Player receives notification
8. Confirmed bookings cannot be cancelled by players

#### 6.4 Dispute Process
1. Player or venue owner creates dispute/ticket
2. Dispute includes description and relevant profiles
3. Admin reviews and handles dispute
4. Resolution communicated to involved parties
5. Dispute tracking and status updates

#### 6.5 Forum Process
1. Player posts confirmed booking
2. Other players can offer to join
3. Original player can contact interested players
4. Communication happens via phone numbers
5. Forum post management and filtering

#### 6.6 Review Process
1. Booking must be completed
2. Player can leave review and rating
3. Reviews appear on venue details
4. Review validation and moderation

## DEVELOPMENT PHASES

### Phase 1: Project Setup & Foundation
**Duration**: 2-3 days

**Tasks**:
- Initialize Expo project with latest SDK
- Setup project structure and folder organization
- Configure TypeScript and ESLint
- Install core dependencies (Expo Router, Supabase, etc.)
- Setup environment configuration (.env files)
- Configure app.json for deep linking and permissions
- Setup version control and initial commit

**Deliverables**:
- Working Expo project structure
- Environment configuration
- Basic navigation setup
- Development environment ready

### Phase 2: Supabase Database Setup
**Duration**: 3-4 days

**Tasks**:
- Create Supabase project
- Implement complete database schema (15+ tables)
- Setup Row Level Security (RLS) policies
- Create database functions and triggers
- Setup storage buckets for images
- Configure authentication settings
- Create database indexes for performance
- Setup audit logging system

**Database Tables** (Complete Schema):
1. **users** - User profiles and authentication
2. **password_reset_tokens** - Password reset functionality
3. **venues** - Venue information and settings
4. **venue_images** - Venue image storage
5. **venue_fields** - Multiple fields per venue
6. **venue_updates** - Venue update approval workflow
7. **time_slots** - Available time slots per venue/field
8. **bookings** - Booking records and status
9. **booking_slots** - Individual slot details per booking
10. **reviews** - Player reviews and ratings
11. **forum_posts** - Forum posts for shared bookings
12. **forum_offers** - Offers from players to join bookings
13. **messages** - Real-time messaging system
14. **notifications** - Push and in-app notifications
15. **venue_announcements** - Venue owner announcements
16. **disputes** - Dispute/ticket system
17. **dispute_messages** - Dispute communication
18. **audit_logs** - System audit trail
19. **system_settings** - App configuration settings

**Deliverables**:
- Complete database schema
- RLS policies implemented
- Storage buckets configured
- Database documentation

### Phase 3: Authentication System
**Duration**: 4-5 days

**Tasks**:
- Implement Supabase Auth integration
- Create registration form with all required fields
- Implement login/logout functionality
- Setup email verification system
- Create forgot password functionality
- Implement role-based access control
- Setup session management with AsyncStorage
- Create authentication context and hooks
- Implement user type selection logic

**Components**:
- AuthProvider context
- Login screen
- Registration screen
- Forgot password screen
- Email verification screen
- User type selection screen

**Deliverables**:
- Complete authentication system
- User registration with all PRD fields
- Email verification working
- Role-based navigation
- Session persistence

### Phase 4: User Profile Management
**Duration**: 3-4 days

**Tasks**:
- Create separate player profile screens
- Create separate venue owner profile screens
- Create profile editing functionality
- Implement profile validation
- Setup image compression and optimization
- Create profile viewing screens
- Implement user preferences

**Components**:
- PlayerProfile screen
- VenueOwnerProfile screen
- ProfileEdit screen
- ImagePicker component

**Deliverables**:
- Complete profile management system
- Image upload functionality
- Profile validation
- User preference settings

### Phase 5: Venue Management System
**Duration**: 6-7 days

**Tasks**:
- Create venue listing screens
- Implement venue creation form with all PRD fields
- Setup multiple field support per venue
- Implement venue image upload (multiple images)
- Create venue details screen
- Implement venue search and filtering
- Setup maps integration
- Create venue status management
- Implement venue update workflow
- Setup admin approval system

**Required Venue Fields Implementation**:
- Name, Field number, Location, Maps link
- Image gallery with primary image selection
- Services (multi-select)
- Pricing: Day/Night charges, Weekend/Weekday charges
- Availability: Days available, Opening/Closing times
- Time slots configuration
- Venue status (open/closed)

**Components**:
- VenueList screen
- VenueDetails screen
- VenueCreate screen
- VenueEdit screen
- VenueImageGallery component
- VenueSearch component
- VenueFilter component
- MapView component
- VenueStatusToggle component

**Deliverables**:
- Complete venue management system
- Venue creation with all PRD fields
- Multiple field support
- Image gallery functionality
- Maps integration
- Search and filtering
- Admin approval workflow

### Phase 6: Booking System
**Duration**: 7-8 days

**Tasks**:
- Create booking calendar interface
- Implement slot-based booking system
- Setup multiple consecutive slot booking
- Create field selection for multi-field venues
- Implement booking request workflow
- Create booking management screens
- Setup booking status tracking
- Implement booking history and filtering
- Create booking confirmation system
- Setup booking cancellation rules (players cannot cancel confirmed)

**Booking Features Implementation**:
- Day, date, and slot selection
- Multiple consecutive slot booking (e.g., 9pm-11pm = 2 slots)
- Field selection when venue has multiple fields
- Real-time availability checking
- Booking status: pending, confirmed, cancelled, completed
- Booking history with filtering options
- Venue owner booking management dashboard

**Components**:
- BookingCalendar component
- SlotSelector component
- FieldSelector component
- BookingForm screen
- BookingHistory screen
- BookingDetails screen
- BookingManagement screen (for venue owners)
- BookingConfirmation modal

**Deliverables**:
- Complete booking system
- Slot-based booking with consecutive slots
- Field selection functionality
- Booking workflow implementation
- Status tracking system
- Booking history and management

### Phase 7: Forum & Community Features
**Duration**: 5-6 days

**Tasks**:
- Create forum post creation system
- Implement forum browsing and filtering
- Setup player offer system
- Create forum post details screen
- Implement forum search functionality
- Setup forum post management
- Create offer management system
- Implement forum notifications

**Forum Features Implementation**:
- Post confirmed bookings to forum
- View offers from other players
- Filter forum posts by venue/date/location
- Contact players through phone numbers
- Forum post status management
- Offer acceptance/rejection system

**Components**:
- ForumList screen
- ForumPost screen
- CreateForumPost screen
- ForumOffers screen
- ForumSearch component
- ForumFilter component
- OfferCard component

**Deliverables**:
- Complete forum system
- Booking sharing functionality
- Player offer system
- Forum filtering and search
- Community interaction features

### Phase 8: Real-time Messaging System
**Duration**: 6-7 days

**Tasks**:
- Setup Supabase Realtime for messaging
- Create messaging interface
- Implement real-time message delivery
- Setup image sharing in messages
- Create message status tracking (sent, delivered, read)
- Implement conversation management
- Setup admin message monitoring
- Create message search functionality

**Messaging Features Implementation**:
- Real-time text messaging
- Image sharing capability
- Message status indicators
- Conversation threading
- Admin monitoring and flagging
- Message context (booking, forum, general)
- Phone number-based contact initiation

**Components**:
- MessageList screen
- MessageInput component
- ConversationList screen
- ImageMessage component
- MessageStatus component
- AdminMessageMonitor screen

**Deliverables**:
- Real-time messaging system
- Image sharing functionality
- Message status tracking
- Admin monitoring tools
- Conversation management

### Phase 9: Review & Rating System
**Duration**: 3-4 days

**Tasks**:
- Create review submission form
- Implement rating system (1-5 stars)
- Setup review validation (only after completed bookings)
- Create review display components
- Implement review aggregation
- Setup review moderation
- Create review management for admins

**Review Features Implementation**:
- 5-star rating system
- Text review submission
- Review validation (booking completion required)
- Review display on venue details
- Rating aggregation and averages
- Review moderation system

**Components**:
- ReviewForm screen
- ReviewCard component
- RatingDisplay component
- ReviewList component
- ReviewModeration screen (admin)

**Deliverables**:
- Complete review system
- Rating functionality
- Review validation
- Review display and aggregation
- Admin moderation tools

### Phase 10: Notification System
**Duration**: 4-5 days

**Tasks**:
- Setup Expo Notifications
- Implement push notification service
- Create in-app notification system
- Setup notification preferences
- Implement notification history
- Create notification templates
- Setup notification triggers for all events

**Notification Types Implementation**:
- Booking confirmations/cancellations/completions
- Venue announcements
- Forum activity notifications
- Message notifications
- Status change notifications
- Dispute updates

**Components**:
- NotificationList screen
- NotificationCard component
- NotificationPreferences screen
- PushNotificationService
- NotificationProvider context

**Deliverables**:
- Complete notification system
- Push notifications working
- In-app notifications
- Notification preferences
- Notification history

### Phase 11: Dispute Management System
**Duration**: 4-5 days

**Tasks**:
- Create dispute/ticket creation system
- Implement dispute tracking
- Setup admin dispute resolution tools
- Create dispute communication system
- Implement dispute status management
- Setup dispute notifications

**Dispute Features Implementation**:
- Dispute creation with description and context
- Dispute tracking and status updates
- Admin resolution workflow
- Dispute communication between parties
- Dispute history and management

**Components**:
- CreateDispute screen
- DisputeList screen
- DisputeDetails screen
- DisputeResolution screen (admin)
- DisputeMessages component

**Deliverables**:
- Complete dispute system
- Ticket creation and tracking
- Admin resolution tools
- Dispute communication
- Status management

### Phase 12: Admin Panel & Analytics
**Duration**: 6-7 days

**Tasks**:
- Create comprehensive admin dashboard
- Implement user management tools
- Setup venue approval workflows
- Create booking analytics
- Implement system monitoring
- Setup admin controls and settings
- Create reporting system

**Admin Features Implementation**:
- User management (suspend, remove, view details)
- Venue approval/rejection workflow
- Booking statistics and analytics
- Dispute resolution tools
- System settings management
- Comprehensive reporting dashboard

**Components**:
- AdminDashboard screen
- UserManagement screen
- VenueApproval screen
- BookingAnalytics screen
- SystemSettings screen
- AdminReports screen

**Deliverables**:
- Complete admin panel
- User management tools
- Venue approval system
- Analytics dashboard
- System monitoring tools

### Phase 13: Testing, Optimization & Deployment
**Duration**: 5-6 days

**Tasks**:
- Comprehensive testing (unit, integration, E2E)
- Performance optimization
- Security testing and hardening
- EAS Build configuration
- Play Store preparation
- App store assets creation
- Production deployment
- Monitoring setup

**Testing & Deployment**:
- Unit tests for all components
- Integration tests for workflows
- End-to-end testing
- Performance optimization
- Security audit
- EAS Build setup for Play Store
- App store compliance
- Production monitoring

**Deliverables**:
- Fully tested application
- Performance optimized
- Play Store ready build
- Production deployment
- Monitoring and analytics setup

## TECHNICAL SPECIFICATIONS

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

### Security Implementation

#### Row Level Security (RLS) Policies
- Users can only access their own data
- Venue owners can only manage their venues
- Players can only view approved venues
- Admins have full access to all data
- Booking data is accessible to involved parties only

#### Authentication Security
- JWT tokens with automatic refresh
- Email verification required
- Password strength requirements
- Session management with secure storage
- Role-based access control

### Performance Optimization

#### Database Optimization
- Proper indexing on frequently queried columns
- Composite indexes for complex queries
- Database connection pooling
- Query optimization for large datasets

#### App Performance
- Image optimization and caching
- Lazy loading for large lists
- Efficient state management
- Memory leak prevention
- Bundle size optimization

### Deployment Configuration

#### EAS Build Setup
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

#### Environment Configuration
- Development environment
- Staging environment
- Production environment
- Environment-specific Supabase projects
- Secure credential management

## QUALITY ASSURANCE

### Testing Strategy
- Unit tests for all business logic
- Integration tests for API endpoints
- Component testing for UI elements
- End-to-end testing for user workflows
- Performance testing for scalability
- Security testing for vulnerabilities

### Code Quality
- TypeScript for type safety
- ESLint for code consistency
- Prettier for code formatting
- Husky for pre-commit hooks
- Code review process
- Documentation standards

## PROJECT TIMELINE

**Total Estimated Duration**: 8-10 weeks

**Phase Breakdown**:
- Phases 1-3 (Foundation): 2 weeks
- Phases 4-6 (Core Features): 3 weeks
- Phases 7-9 (Community Features): 2.5 weeks
- Phases 10-12 (Admin & Advanced): 2 weeks
- Phase 13 (Testing & Deployment): 1.5 weeks

**Milestones**:
- Week 2: Authentication and profiles complete
- Week 5: Core booking system functional
- Week 7: Community features implemented
- Week 9: Admin panel and all features complete
- Week 10: Production-ready app deployed

## SUCCESS CRITERIA

### Functional Requirements
✅ All PRD features implemented without exception
✅ Multi-user system working (Players, Venue Owners, Admins)
✅ Complete booking workflow functional
✅ Real-time messaging and notifications
✅ Forum and community features operational
✅ Admin panel with full management capabilities
✅ Review and dispute systems working
✅ Mobile-responsive design

### Technical Requirements
✅ Production-ready code quality
✅ Comprehensive testing coverage
✅ Performance optimized for mobile
✅ Security best practices implemented
✅ Play Store deployment ready
✅ Scalable architecture
✅ Proper error handling and logging
✅ Documentation complete

### Business Requirements
✅ User-friendly interface
✅ Reliable booking system
✅ Efficient venue management
✅ Effective dispute resolution
✅ Community engagement features
✅ Admin control and monitoring
✅ Revenue tracking capabilities
✅ Market-ready application

This comprehensive plan ensures every single feature from your PRD is implemented with professional quality and production readiness for Play Store deployment.

