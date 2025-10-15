// Final script to create admin user with correct service role key
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihzkamfnctfreylyzgid.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloemthbWZuY3RmcmV5bHl6Z2lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MjgyOSwiZXhwIjoyMDc0NTY4ODI5fQ.YNzEdeoG55I89wOJzuRbLErlK09NqLpNLKDC32kFyWY';

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAdminAccount() {
  console.log('🔧 Setting up admin account with service role...');
  console.log('Email: vinzlloydalferez@gmail.com\n');

  try {
    // Step 1: Clean up any existing records
    console.log('Step 1: Cleaning up existing records...');

    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('email', 'vinzlloydalferez@gmail.com');

    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('email', 'vinzlloydalferez@gmail.com');

    console.log('✅ Cleanup complete\n');

    // Step 2: Insert into users table with admin role
    console.log('Step 2: Creating user record with ADMIN role...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        user_id: '24910a22-e361-4a76-9959-d28959a021d5',
        email: 'vinzlloydalferez@gmail.com',
        password: '@Alferez123',
        first_name: 'Vinz Lloyd',
        last_name: 'Alferez',
        user_type: 'admin',  // ← ADMIN ROLE
        is_active: true,
        country: 'USA',
      }])
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating user record:', userError.message);
      return;
    }

    console.log('✅ User record created successfully!');
    console.log('   User ID:', userData.user_id);
    console.log('   Email:', userData.email);
    console.log('   User Type:', userData.user_type);
    console.log('   Is Active:', userData.is_active);

    // Step 3: Insert into profiles table with admin role
    console.log('\nStep 3: Creating profile record with ADMIN role...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: '24910a22-e361-4a76-9959-d28959a021d5',
        user_id: '24910a22-e361-4a76-9959-d28959a021d5',
        email: 'vinzlloydalferez@gmail.com',
        first_name: 'Vinz Lloyd',
        last_name: 'Alferez',
        user_type: 'admin',  // ← ADMIN ROLE
        is_active: true,
      }])
      .select()
      .single();

    if (profileError) {
      console.error('⚠️  Profile creation failed:', profileError.message);
      console.log('   Profile will be auto-created on login with correct admin role.');
    } else {
      console.log('✅ Profile record created successfully!');
      console.log('   Profile ID:', profileData.id);
      console.log('   User Type:', profileData.user_type);
      console.log('   Is Active:', profileData.is_active);
    }

    // Step 4: Verify records
    console.log('\nStep 4: Verifying admin account...');

    const { data: verifyUser } = await supabase
      .from('users')
      .select('user_id, email, first_name, last_name, user_type, is_active')
      .eq('email', 'vinzlloydalferez@gmail.com')
      .single();

    const { data: verifyProfile } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, user_type, is_active')
      .eq('email', 'vinzlloydalferez@gmail.com')
      .single();

    console.log('\n' + '='.repeat(70));
    console.log('✅ ADMIN ACCOUNT SETUP COMPLETE!');
    console.log('='.repeat(70));

    if (verifyUser) {
      console.log('\n📊 USERS TABLE:');
      console.log('   User ID:', verifyUser.user_id);
      console.log('   Email:', verifyUser.email);
      console.log('   Name:', `${verifyUser.first_name} ${verifyUser.last_name}`);
      console.log('   User Type:', verifyUser.user_type, verifyUser.user_type === 'admin' ? '✅' : '❌');
      console.log('   Is Active:', verifyUser.is_active ? '✅' : '❌');
    }

    if (verifyProfile) {
      console.log('\n📊 PROFILES TABLE:');
      console.log('   Profile ID:', verifyProfile.id);
      console.log('   Email:', verifyProfile.email);
      console.log('   Name:', `${verifyProfile.first_name} ${verifyProfile.last_name}`);
      console.log('   User Type:', verifyProfile.user_type, verifyProfile.user_type === 'admin' ? '✅' : '❌');
      console.log('   Is Active:', verifyProfile.is_active ? '✅' : '❌');
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 SUCCESS! Your admin account is ready!');
    console.log('='.repeat(70));
    console.log('\n📝 Login Credentials:');
    console.log('   Email: vinzlloydalferez@gmail.com');
    console.log('   Password: @Alferez123');
    console.log('   Role: Admin');
    console.log('   Status: Active ✅');
    console.log('\n🌐 Login URL: http://localhost:8080/auth');

    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('1. LOG OUT of your current session');
    console.log('2. LOG BACK IN with the credentials above');
    console.log('3. You should now see "User Management" in the sidebar');
    console.log('4. You now have FULL ADMIN ACCESS! 🎉');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setupAdminAccount();
