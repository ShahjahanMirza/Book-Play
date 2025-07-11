// Test script to verify time slots loading
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lckiftcidquupkplmyfv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxja2lmdGNpZHF1dXBrcGxteWZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NzE5NzQsImV4cCI6MjA1MTE0Nzk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTimeSlots() {
  console.log('Testing time slots loading...');

  try {
    // Get a venue first
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name')
      .limit(1);

    if (venuesError || !venues || venues.length === 0) {
      console.log('No venues found to test with');
      return;
    }

    const testVenue = venues[0];
    console.log('Testing with venue:', testVenue.name, '(', testVenue.id, ')');

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(today).getDay();

    console.log('Testing for date:', today, 'day of week:', dayOfWeek);

    // Test 1: Get time slots without field filter
    console.log('\n--- Test 1: Get time slots without field filter ---');
    
    let query = supabase
      .from('time_slots')
      .select(`
        id,
        venue_id,
        field_id,
        start_time,
        end_time,
        day_of_week,
        is_active
      `)
      .eq('venue_id', testVenue.id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .order('start_time', { ascending: true });

    // Handle field filtering properly - no field specified
    query = query.is('field_id', null);

    const { data: slots, error } = await query;

    if (error) {
      console.error('Error loading time slots:', error);
    } else {
      console.log('Found', slots?.length || 0, 'time slots');
      if (slots && slots.length > 0) {
        console.log('Sample slot:', {
          id: slots[0].id,
          start_time: slots[0].start_time,
          end_time: slots[0].end_time,
          field_id: slots[0].field_id
        });
      }
    }

    // Test 2: Get time slots with field filter
    console.log('\n--- Test 2: Get time slots with field filter ---');
    
    // Get a field first
    const { data: fields, error: fieldsError } = await supabase
      .from('venue_fields')
      .select('id, field_name')
      .eq('venue_id', testVenue.id)
      .limit(1);

    if (fieldsError || !fields || fields.length === 0) {
      console.log('No fields found for this venue');
    } else {
      const testField = fields[0];
      console.log('Testing with field:', testField.field_name, '(', testField.id, ')');

      let fieldQuery = supabase
        .from('time_slots')
        .select(`
          id,
          venue_id,
          field_id,
          start_time,
          end_time,
          day_of_week,
          is_active
        `)
        .eq('venue_id', testVenue.id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .order('start_time', { ascending: true });

      // Handle field filtering properly - specific field
      fieldQuery = fieldQuery.eq('field_id', testField.id);

      const { data: fieldSlots, error: fieldError } = await fieldQuery;

      if (fieldError) {
        console.error('Error loading field time slots:', fieldError);
      } else {
        console.log('Found', fieldSlots?.length || 0, 'field-specific time slots');
        if (fieldSlots && fieldSlots.length > 0) {
          console.log('Sample field slot:', {
            id: fieldSlots[0].id,
            start_time: fieldSlots[0].start_time,
            end_time: fieldSlots[0].end_time,
            field_id: fieldSlots[0].field_id
          });
        }
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testTimeSlots();
