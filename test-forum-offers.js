// Test script to verify forum offers visibility
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lckiftcidquupkplmyfv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxja2lmdGNpZHF1dXBrcGxteWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NzE5NzQsImV4cCI6MjA1MTE0Nzk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testForumOffers() {
  console.log('Testing forum offers visibility...');

  try {
    // Get a forum post first
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select('id, player_id')
      .limit(1);

    if (postsError || !posts || posts.length === 0) {
      console.log('No forum posts found to test with');
      return;
    }

    const testPost = posts[0];
    console.log('Testing with post:', testPost.id, 'owned by:', testPost.player_id);

    // Test 1: Get offers as post owner
    console.log('\n--- Test 1: Post owner sees all offers ---');
    const { data: ownerOffers, error: ownerError } = await supabase
      .from('forum_offers')
      .select(`
        id,
        post_id,
        player_id,
        message,
        status,
        created_at,
        users!forum_offers_player_id_fkey (
          id,
          name,
          phone_number,
          profile_image_url
        )
      `)
      .eq('post_id', testPost.id)
      .order('created_at', { ascending: false });

    if (ownerError) {
      console.error('Error loading offers as owner:', ownerError);
    } else {
      console.log('Post owner sees', ownerOffers?.length || 0, 'offers');
      if (ownerOffers && ownerOffers.length > 0) {
        console.log('Sample offer:', {
          id: ownerOffers[0].id,
          player_id: ownerOffers[0].player_id,
          message: ownerOffers[0].message
        });
      }
    }

    // Test 2: Get offers as different player (should only see their own)
    if (ownerOffers && ownerOffers.length > 0) {
      const testPlayerId = ownerOffers[0].player_id;
      console.log('\n--- Test 2: Other player sees only their offers ---');
      
      const { data: playerOffers, error: playerError } = await supabase
        .from('forum_offers')
        .select(`
          id,
          post_id,
          player_id,
          message,
          status,
          created_at,
          users!forum_offers_player_id_fkey (
            id,
            name,
            phone_number,
            profile_image_url
          )
        `)
        .eq('post_id', testPost.id)
        .eq('player_id', testPlayerId)
        .order('created_at', { ascending: false });

      if (playerError) {
        console.error('Error loading offers as player:', playerError);
      } else {
        console.log('Player', testPlayerId, 'sees', playerOffers?.length || 0, 'offers');
        if (playerOffers && playerOffers.length > 0) {
          console.log('All offers belong to this player:', 
            playerOffers.every(offer => offer.player_id === testPlayerId)
          );
        }
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testForumOffers();
