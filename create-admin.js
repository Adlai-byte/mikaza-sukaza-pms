// Script to create admin user: vinzlloydalferez@gmail.com
// Run this with: node create-admin.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihzkamfnctfreylyzgid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloemthbWZuY3RmcmV5bHl6Z2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTI4MjksImV4cCI6MjA3NDU2ODgyOX0.MBMAqte7iI49GTE3gnFVhdsHCVb2viA6qPjftwp3RtY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminUser() {
  console.log('🔐 Creating admin user account...');

  try {
    // Step 1: Create Supabase Auth user
    console.log('Step 1: Creating Supabase Auth account...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'vinzlloydalferez@gmail.com',
      password: '@Alferez123',
      options: {
        emailRedirectTo: 'http://localhost:8080/',
        data: {
          first_name: 'Vinz Lloyd',
          last_name: 'Alferez',
          user_type: 'admin',
        }
      }
    });

    if (authError) {
      console.error('❌ Error creating Supabase Auth user:', authError.message);

      if (authError.message.includes('already registered')) {
        console.log('\n⚠️  This email is already registered in Supabase Auth.');
        console.log('Options:');
        console.log('1. Delete the existing user in Supabase Dashboard → Authentication → Users');
        console.log('2. Use a different email address');
        console.log('3. If you already have access, just log in with: vinzlloydalferez@gmail.com');
      }

      return;
    }

    if (!authData.user) {
      console.error('❌ No user returned from Supabase Auth');
      return;
    }

    console.log('✅ Supabase Auth user created!');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    console.log('   Email Confirmed:', authData.user.email_confirmed_at ? 'Yes ✓' : 'No (needs verification)');

    // Step 2: Insert into database
    console.log('\nStep 2: Creating database record...');
    const { data: dbData, error: dbError } = await supabase
      .from('users')
      .insert([{
        user_id: authData.user.id,
        email: 'vinzlloydalferez@gmail.com',
        password: '@Alferez123',
        first_name: 'Vinz Lloyd',
        last_name: 'Alferez',
        user_type: 'admin',
        is_active: true,
        country: 'USA',
      }])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Error creating database record:', dbError.message);
      console.log('\n⚠️  Auth account created but database entry failed.');
      console.log('You can manually insert the record in Supabase Dashboard → SQL Editor:');
      console.log(`
INSERT INTO users (
  user_id, email, password, first_name, last_name,
  user_type, is_active, country
) VALUES (
  '${authData.user.id}',
  'vinzlloydalferez@gmail.com',
  '@Alferez123',
  'Vinz Lloyd',
  'Alferez',
  'admin',
  true,
  'USA'
);
      `);
      return;
    }

    console.log('✅ Database record created!');

    // Step 3: Check email verification status
    console.log('\n📧 Email Verification:');
    if (authData.user.email_confirmed_at) {
      console.log('   ✅ Email is already confirmed! You can log in immediately.');
    } else {
      console.log('   ⚠️  Email verification required!');
      console.log('   📬 A verification email has been sent to: vinzlloydalferez@gmail.com');
      console.log('   Please check your inbox and click the verification link.');
      console.log('   You MUST verify your email before you can log in.');
    }

    console.log('\n🎉 Admin account created successfully!');
    console.log('\n📝 Login Details:');
    console.log('   Email: vinzlloydalferez@gmail.com');
    console.log('   Password: @Alferez123');
    console.log('   User Type: admin');
    console.log('\n🌐 Login URL: http://localhost:8080/auth');

    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    if (!authData.user.email_confirmed_at) {
      console.log('1. Check email inbox for verification link');
      console.log('2. Click the verification link');
      console.log('3. Return to login page');
      console.log('4. Log in with credentials above');
      console.log('\nOR');
      console.log('Manually confirm email in Supabase Dashboard:');
      console.log('   → Authentication → Users → vinzlloydalferez@gmail.com → Confirm Email');
    } else {
      console.log('1. Go to: http://localhost:8080/auth');
      console.log('2. Log in with the credentials above');
      console.log('3. Start managing your property system!');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createAdminUser();
