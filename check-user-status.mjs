// Script to check user status and diagnose login issues
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihzkamfnctfreylyzgid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloemthbWZuY3RmcmV5bHl6Z2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTI4MjksImV4cCI6MjA3NDU2ODgyOX0.MBMAqte7iI49GTE3gnFVhdsHCVb2viA6qPjftwp3RtY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserStatus() {
  console.log('🔍 Checking user status for: vinzlloydalferez@gmail.com\n');

  try {
    // Check database record
    console.log('1️⃣ Checking database record...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'vinzlloydalferez@gmail.com')
      .single();

    if (userError) {
      console.error('❌ Database record not found:', userError.message);
      console.log('\n⚠️  The user needs to be inserted into the database!');
      console.log('Run this SQL in Supabase Dashboard → SQL Editor:\n');
      console.log(`INSERT INTO users (
  user_id, email, password, first_name, last_name,
  user_type, is_active, country, created_at, updated_at
) VALUES (
  '24910a22-e361-4a76-9959-d28959a021d5',
  'vinzlloydalferez@gmail.com',
  '@Alferez123',
  'Vinz Lloyd',
  'Alferez',
  'admin',
  true,
  'USA',
  NOW(),
  NOW()
);\n`);
    } else {
      console.log('✅ Database record found!');
      console.log('   User ID:', userData.user_id);
      console.log('   Email:', userData.email);
      console.log('   User Type:', userData.user_type);
      console.log('   Active:', userData.is_active);
    }

    // Try to sign in
    console.log('\n2️⃣ Testing login credentials...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'vinzlloydalferez@gmail.com',
      password: '@Alferez123',
    });

    if (signInError) {
      console.error('❌ Login failed:', signInError.message);

      if (signInError.message.includes('Invalid login credentials')) {
        console.log('\n⚠️  Possible Issues:');
        console.log('1. Email not verified in Supabase Auth');
        console.log('2. Password mismatch');
        console.log('3. User not found in Supabase Auth');
        console.log('\n🔧 Solutions:');
        console.log('A. Verify email in Supabase Dashboard:');
        console.log('   → Authentication → Users → vinzlloydalferez@gmail.com → Confirm Email');
        console.log('\nB. Check if user exists in Supabase Auth:');
        console.log('   → https://supabase.com/dashboard/project/ihzkamfnctfreylyzgid/auth/users');
        console.log('   → Look for: vinzlloydalferez@gmail.com');
      } else if (signInError.message.includes('Email not confirmed')) {
        console.log('\n⚠️  Email needs to be confirmed!');
        console.log('\n🔧 Solution:');
        console.log('1. Check email inbox for verification link, OR');
        console.log('2. Manually confirm in Supabase Dashboard:');
        console.log('   → Authentication → Users → vinzlloydalferez@gmail.com → Confirm Email');
      }
    } else {
      console.log('✅ Login successful!');
      console.log('   User ID:', signInData.user.id);
      console.log('   Email:', signInData.user.email);
      console.log('   Email Confirmed:', signInData.user.email_confirmed_at ? 'Yes ✓' : 'No ✗');

      if (!signInData.user.email_confirmed_at) {
        console.log('\n⚠️  Email is NOT confirmed!');
        console.log('User can authenticate but will be blocked by app due to unverified email.');
        console.log('\n🔧 Confirm email in Supabase Dashboard:');
        console.log('   → Authentication → Users → vinzlloydalferez@gmail.com → Confirm Email');
      } else {
        console.log('\n🎉 Everything looks good! User should be able to log in.');
      }
    }

    // Check profiles table
    console.log('\n3️⃣ Checking profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'vinzlloydalferez@gmail.com')
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('ℹ️  No profile record (this is OK - will be created on first login)');
      } else {
        console.error('❌ Profile check error:', profileError.message);
      }
    } else {
      console.log('✅ Profile record found!');
      console.log('   User Type:', profileData.user_type);
      console.log('   Active:', profileData.is_active);
    }

    console.log('\n' + '='.repeat(70));
    console.log('📋 SUMMARY');
    console.log('='.repeat(70));

    if (!userError && userData) {
      console.log('✅ Database record: EXISTS');
    } else {
      console.log('❌ Database record: MISSING - RUN SQL INSERT');
    }

    if (!signInError) {
      console.log('✅ Supabase Auth: WORKING');
      if (signInData.user.email_confirmed_at) {
        console.log('✅ Email verified: YES');
        console.log('\n🎉 User is ready to log in!');
      } else {
        console.log('❌ Email verified: NO - NEEDS CONFIRMATION');
      }
    } else {
      console.log('❌ Supabase Auth: FAILED');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkUserStatus();
