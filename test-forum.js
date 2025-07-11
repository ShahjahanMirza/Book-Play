// Test script to verify forum functionality
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lckiftcidquupkplmyfv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxja2lmdGNpZHF1dXBrcGxteWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NzE5NzQsImV4cCI6MjA1MTE0Nzk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testForumPosts() {
  console.log('Testing forum posts query...');

  try {
    const { data: posts, error } = await supabase
      .from('forum_posts')
      .select(`
        id,
        player_id,
        booking_id,
        title,
        description,
        slots_available,
        status,
        expires_at,
        created_at,
        updated_at,
        bookings!forum_posts_booking_id_fkey (
          id,
          booking_date,
          start_time,
          end_time,
          total_amount,
          venues (
            id,
            name,
            location
          ),
          venue_fields (
            id,
            field_name,
            field_number
          )
        ),
        users!forum_posts_player_id_fkey (
          id,
          name,
          profile_image_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error loading forum posts:', error);
      return;
    }

    console.log('Forum posts loaded successfully!');
    console.log('Number of posts:', posts?.length || 0);

    if (posts && posts.length > 0) {
      console.log('Sample post:', JSON.stringify(posts[0], null, 2));
    } else {
      console.log('No forum posts found in database');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testForumPosts();
