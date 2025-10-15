// Script to create admin user using service role key (bypasses RLS)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihzkamfnctfreylyzgid.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloemthbWZuY3RmcmV5bHl6Z2lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MjgyOSwiZXhwIjoyMDc0NTY4ODI5fQ.sb_secret_jnjttqCZH8LCi1rhAcPvpQ_TR_euezd';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUserComplete() {
  console.log('🔐 Creating admin user with service role key...');
  console.log('Email: vinzlloydalferez@gmail.com\n');

  try {
    // Step 1: Clean up any existing records
    console.log('Step 1: Cleaning up any existing records...');

    await supabase.from('profiles').delete().eq('email', 'vinzlloydalferez@gmail.com');
    await supabase.from('users').delete().eq('email', 'vinzlloydalferez@gmail.com');

    console.log('✅ Cleanup complete\n');

    // Step 2: Insert into users table
    console.log('Step 2: Inserting into users table...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        user_id: '24910a22-e361-4a76-9959-d28959a021d5',
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

    if (userError) {
      console.error('❌ Error inserting into users table:', userError.message);
      return;
    }

    console.log('✅ User record created!');
    console.log('   User ID:', userData.user_id);
    console.log('   Email:', userData.email);
    console.log('   User Type:', userData.user_type);
    console.log('   Is Active:', userData.is_active);

    // Step 3: Insert into profiles table
    console.log('\nStep 3: Inserting into profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: '24910a22-e361-4a76-9959-d28959a021d5',
        user_id: '24910a22-e361-4a76-9959-d28959a021d5',
        email: 'vinzlloydalferez@gmail.com',
        first_name: 'Vinz Lloyd',
        last_name: 'Alferez',
        user_type: 'admin',
        is_active: true,
      }])
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error inserting into profiles table:', profileError.message);
      console.log('⚠️  User record created but profile creation failed.');
      console.log('   Profile will be auto-created on login.');
    } else {
      console.log('✅ Profile record created!');
      console.log('   Profile ID:', profileData.id);
      console.log('   User Type:', profileData.user_type);
    }

    // Step 4: Verify both records
    console.log('\nStep 4: Verifying records...');

    const { data: verifyUser, error: verifyUserError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'vinzlloydalferez@gmail.com')
      .single();

    const { data: verifyProfile, error: verifyProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'vinzlloydalferez@gmail.com')
      .single();

    console.log('\n' + '='.repeat(70));
    console.log('📋 VERIFICATION RESULTS');
    console.log('='.repeat(70));

    if (!verifyUserError && verifyUser) {
      console.log('\n✅ USERS TABLE:');
      console.log('   User ID:', verifyUser.user_id);
      console.log('   Email:', verifyUser.email);
      console.log('   User Type:', verifyUser.user_type);
      console.log('   Is Active:', verifyUser.is_active);
      console.log('   Created At:', verifyUser.created_at);
    } else {
      console.log('\n❌ USERS TABLE: Record not found');
    }

    if (!verifyProfileError && verifyProfile) {
      console.log('\n✅ PROFILES TABLE:');
      console.log('   Profile ID:', verifyProfile.id);
      console.log('   Email:', verifyProfile.email);
      console.log('   User Type:', verifyProfile.user_type);
      console.log('   Is Active:', verifyProfile.is_active);
      console.log('   Created At:', verifyProfile.created_at);
    } else {
      console.log('\n⚠️  PROFILES TABLE: Record not found (will be auto-created on login)');
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 SUCCESS!');
    console.log('='.repeat(70));
    console.log('\n📝 Login Details:');
    console.log('   Email: vinzlloydalferez@gmail.com');
    console.log('   Password: @Alferez123');
    console.log('   User Type: admin');
    console.log('   Status: Active');
    console.log('\n🌐 Login URL: http://localhost:8080/auth');
    console.log('\n⚠️  IMPORTANT: LOG OUT and LOG BACK IN to refresh your session!');
    console.log('\nAfter logging back in, you should see:');
    console.log('   ✅ "User Management" in the sidebar');
    console.log('   ✅ Full admin access to all features');
    console.log('   ✅ Ability to create new users');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createAdminUserComplete();
