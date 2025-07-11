# BookAndPlay Database Schema Documentation

## Overview
This document provides comprehensive documentation for the BookAndPlay futsal booking platform database schema, including all tables, relationships, functions, and security policies.

## Database Structure

### Core Tables

#### 1. Users Table
**Purpose**: Central user management for players, venue owners, and admins
```sql
- id (UUID, Primary Key)
- name (VARCHAR, NOT NULL)
- email (VARCHAR, UNIQUE, NOT NULL)
- phone_number (VARCHAR)
- age (INTEGER)
- city (VARCHAR)
- address (TEXT)
- cnic_passport (VARCHAR)
- user_type (ENUM: 'player', 'venue_owner', 'admin')
- is_active (BOOLEAN, DEFAULT true)
- is_verified (BOOLEAN, DEFAULT false)
- profile_image_url (TEXT)
- suspended_at (TIMESTAMP)
- suspension_reason (TEXT)
- created_at, updated_at (TIMESTAMP)
```

#### 2. Venues Table
**Purpose**: Venue information and approval management
```sql
- id (UUID, Primary Key)
- owner_id (UUID, Foreign Key → users.id)
- name (VARCHAR, NOT NULL)
- description (TEXT)
- location (TEXT, NOT NULL)
- city (VARCHAR, NOT NULL)
- phone_number, email (VARCHAR)
- latitude, longitude (DECIMAL)
- status (ENUM: 'open', 'closed', 'maintenance')
- approval_status (ENUM: 'pending', 'approved', 'rejected')
- rejection_reason (TEXT)
- approved_by (UUID, Foreign Key → users.id)
- created_at, updated_at (TIMESTAMP)
```

#### 3. Bookings Table
**Purpose**: Core booking management system
```sql
- id (UUID, Primary Key)
- player_id (UUID, Foreign Key → users.id)
- venue_id (UUID, Foreign Key → venues.id)
- field_id (UUID, Foreign Key → venue_fields.id)
- booking_date (DATE, NOT NULL)
- start_time, end_time (TIME, NOT NULL)
- duration_hours (INTEGER, NOT NULL)
- price_per_hour, total_amount (DECIMAL, NOT NULL)
- status (ENUM: 'pending', 'confirmed', 'cancelled', 'completed')
- payment_status (ENUM: 'pending', 'paid', 'refunded')
- payment_method, payment_reference (TEXT)
- notes (TEXT)
- cancellation_reason (TEXT)
- created_at, updated_at (TIMESTAMP)
```

### Supporting Tables

#### Venue Management
- **venue_images**: Store multiple images per venue with primary image flag
- **venue_fields**: Individual fields within venues
- **venue_pricing**: Day/night and weekday/weekend pricing structure
- **venue_schedules**: Operating hours for each day of the week

#### Communication & Social
- **messages**: Direct messaging between users
- **notifications**: System notifications for users
- **forum_posts**: Player-to-player booking sharing
- **forum_offers**: Offers made on forum posts
- **reviews**: Venue reviews and ratings

#### Admin & Support
- **disputes**: Dispute management system
- **dispute_messages**: Communication within disputes
- **venue_updates**: Track venue modification requests

## Key Features

### 1. User Management
- **Multi-role system**: Players, venue owners, and admins
- **Profile management**: Complete user profiles with verification
- **Suspension system**: Admin can suspend users with reasons
- **Authentication integration**: Works with Supabase Auth

### 2. Venue Management
- **Approval workflow**: Venues require admin approval
- **Multi-field support**: Venues can have multiple fields
- **Flexible pricing**: Different rates for day/night and weekday/weekend
- **Operating schedules**: Customizable hours for each day
- **Image management**: Multiple images with primary image selection

### 3. Booking System
- **Time slot management**: Hourly booking system
- **Status tracking**: Pending → Confirmed → Completed workflow
- **Payment integration**: Payment status and method tracking
- **Cancellation support**: Cancellation with reason tracking

### 4. Communication Features
- **Direct messaging**: User-to-user communication
- **Forum system**: Share bookings with other players
- **Offer system**: Make offers on shared bookings
- **Notification system**: Real-time notifications

### 5. Review & Rating System
- **Booking-based reviews**: Reviews tied to completed bookings
- **5-star rating system**: Standard rating scale
- **Public visibility**: Reviews visible to all users

### 6. Dispute Management
- **Structured disputes**: Title, description, priority levels
- **Status workflow**: Open → In Progress → Resolved/Closed
- **Communication**: Built-in messaging for disputes
- **Admin resolution**: Admin-managed resolution process

## Database Functions

### Analytics Functions
- `get_venue_statistics(venue_uuid)`: Comprehensive venue performance metrics
- `get_user_booking_stats(user_uuid)`: User booking history and statistics
- `get_monthly_revenue_trends(months_back)`: Revenue trends over time
- `get_top_venues(limit_count)`: Top performing venues by revenue
- `get_booking_peak_hours()`: Popular booking times analysis
- `get_user_retention_rate()`: User retention calculation
- `get_system_health_metrics()`: Overall system health indicators

### Utility Functions
- `handle_new_user()`: Automatic user profile creation on registration
- `cleanup_old_data()`: Maintenance function for data cleanup
- `update_updated_at_column()`: Automatic timestamp updates

### Views
- `admin_dashboard_summary`: Key metrics for admin dashboard
- `venue_performance_metrics`: Venue performance overview
- `user_activity_metrics`: User activity and engagement metrics

## Security (Row Level Security)

### Access Control
- **Role-based access**: Different permissions for players, venue owners, and admins
- **Data isolation**: Users can only access their own data
- **Admin privileges**: Full access for administrative functions
- **Public data**: Approved venues and reviews are publicly accessible

### Key Security Policies
- Users can only view/edit their own profiles
- Venue owners can manage their own venues
- Players can only book and review venues they've used
- Dispute access limited to involved parties and admins
- Messages private between sender and receiver

## Setup Instructions

### 1. Initial Setup
```sql
-- Run in order:
1. schema.sql - Creates all tables and indexes
2. functions.sql - Creates functions and views
3. rls_policies.sql - Applies security policies
```

### 2. Required Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### 3. Storage Buckets (Supabase)
Create these storage buckets in Supabase dashboard:
- `venue-images`: For venue photos
- `profile-images`: For user profile pictures
- `message-images`: For images in messages

### 4. Environment Variables
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

## Maintenance

### Regular Tasks
- Run `cleanup_old_data()` monthly to remove old notifications and messages
- Monitor `get_system_health_metrics()` for system performance
- Review dispute resolution times and user feedback

### Backup Strategy
- Daily automated backups of all data
- Point-in-time recovery enabled
- Regular backup restoration testing

### Performance Monitoring
- Monitor query performance on booking-related operations
- Track venue search and filtering performance
- Monitor user authentication and profile operations

## API Integration

### Supabase Client Configuration
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)
```

### Common Query Patterns
```typescript
// Get user bookings
const { data: bookings } = await supabase
  .from('bookings')
  .select('*, venues(name), venue_fields(field_name)')
  .eq('player_id', userId)

// Get venue with pricing
const { data: venue } = await supabase
  .from('venues')
  .select('*, venue_pricing(*), venue_schedules(*)')
  .eq('id', venueId)
  .single()
```

## Future Enhancements

### Planned Features
- Real-time booking availability updates
- Advanced analytics dashboard
- Mobile push notifications
- Payment gateway integration
- Automated venue recommendations

### Scalability Considerations
- Database partitioning for large booking tables
- Read replicas for analytics queries
- Caching layer for frequently accessed data
- CDN integration for image storage
