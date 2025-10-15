// Script to check and fix admin role
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihzkamfnctfreylyzgid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloemthbWZuY3RmcmV5bHl6Z2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTI4MjksImV4cCI6MjA3NDU2ODgyOX0.MBMAqte7iI49GTE3gnFVhdsHCVb2viA6qPjftwp3RtY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFixAdminRole() {
  console.log('🔍 Checking admin role for: vinzlloydalferez@gmail.com\n');

  try {
    // Check users table
    console.log('1️⃣ Checking users table...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'vinzlloydalferez@gmail.com')
      .single();

    if (userError) {
      console.error('❌ User not found in users table:', userError.message);
      return;
    }

    console.log('✅ User found in users table');
    console.log('   User ID:', userData.user_id);
    console.log('   Email:', userData.email);
    console.log('   User Type:', userData.user_type);
    console.log('   Is Active:', userData.is_active);

    if (userData.user_type !== 'admin') {
      console.log('\n⚠️  User type is NOT admin! Current type:', userData.user_type);
    } else {
      console.log('\n✅ User type is correctly set to admin');
    }

    // Check profiles table
    console.log('\n2️⃣ Checking profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'vinzlloydalferez@gmail.com')
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('⚠️  No profile record found');
        console.log('   Profile will be created automatically on next login');
      } else {
        console.error('❌ Profile check error:', profileError.message);
      }
    } else {
      console.log('✅ Profile found');
      console.log('   User Type:', profileData.user_type);
      console.log('   Is Active:', profileData.is_active);

      if (profileData.user_type !== 'admin') {
        console.log('\n⚠️  Profile user type is NOT admin! Current type:', profileData.user_type);
      } else {
        console.log('\n✅ Profile user type is correctly set to admin');
      }
    }

    // Generate SQL to fix the issue
    console.log('\n' + '='.repeat(70));
    console.log('📝 SQL TO FIX ADMIN ROLE');
    console.log('='.repeat(70));
    console.log('\nRun this SQL in Supabase Dashboard → SQL Editor:\n');

    console.log('-- Update users table');
    console.log(`UPDATE users
SET user_type = 'admin'
WHERE email = 'vinzlloydalferez@gmail.com';
`);

    if (profileData) {
      console.log('-- Update profiles table');
      console.log(`UPDATE profiles
SET user_type = 'admin'
WHERE email = 'vinzlloydalferez@gmail.com';
`);
    }

    console.log('-- Verify the update');
    console.log(`SELECT user_id, email, first_name, last_name, user_type, is_active
FROM users
WHERE email = 'vinzlloydalferez@gmail.com';
`);

    if (profileData) {
      console.log(`SELECT id, email, user_type, is_active
FROM profiles
WHERE email = 'vinzlloydalferez@gmail.com';
`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🔧 QUICK FIX STEPS');
    console.log('='.repeat(70));
    console.log('1. Go to: https://supabase.com/dashboard/project/ihzkamfnctfreylyzgid');
    console.log('2. Click: SQL Editor → New Query');
    console.log('3. Copy and paste the SQL above');
    console.log('4. Click: Run (or Ctrl+Enter)');
    console.log('5. Log out and log back in');
    console.log('6. You should now have admin access!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAndFixAdminRole();
