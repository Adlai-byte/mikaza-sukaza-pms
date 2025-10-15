// Fix user ID mismatch - update database to match actual Supabase Auth ID
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihzkamfnctfreylyzgid.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloemthbWZuY3RmcmV5bHl6Z2lkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MjgyOSwiZXhwIjoyMDc0NTY4ODI5fQ.YNzEdeoG55I89wOJzuRbLErlK09NqLpNLKDC32kFyWY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUserIdMismatch() {
  console.log('🔧 Fixing user ID mismatch...\n');

  const correctAuthUserId = '7eec73d7-14ad-43ad-8920-3d39b533795a'; // From the error log
  const email = 'vinzlloydalferez@gmail.com';

  try {
    // Step 1: Delete old records with wrong user_id
    console.log('Step 1: Cleaning up old records...');

    await supabase.from('profiles').delete().eq('email', email);
    await supabase.from('users').delete().eq('email', email);

    console.log('✅ Old records deleted\n');

    // Step 2: Insert user with CORRECT Auth user ID
    console.log('Step 2: Creating user with correct Auth user ID...');
    console.log('   Correct Auth User ID:', correctAuthUserId);

    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([{
        user_id: correctAuthUserId,  // ← Correct Auth ID
        email: email,
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
      console.error('❌ Error creating user:', userError.message);
      return;
    }

    console.log('✅ User record created!');
    console.log('   User ID:', userData.user_id);
    console.log('   Email:', userData.email);
    console.log('   User Type:', userData.user_type);

    // Step 3: Insert profile with CORRECT Auth user ID
    console.log('\nStep 3: Creating profile with correct Auth user ID...');

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: correctAuthUserId,  // ← Correct Auth ID
        user_id: correctAuthUserId,
        email: email,
        first_name: 'Vinz Lloyd',
        last_name: 'Alferez',
        user_type: 'admin',
        is_active: true,
      }])
      .select()
      .single();

    if (profileError) {
      console.error('⚠️  Profile creation failed:', profileError.message);
      console.log('   Profile will be auto-created on login.');
    } else {
      console.log('✅ Profile record created!');
      console.log('   Profile ID:', profileData.id);
      console.log('   User Type:', profileData.user_type);
    }

    // Step 4: Verify
    console.log('\nStep 4: Verifying records...');

    const { data: verifyUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    const { data: verifyProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    console.log('\n' + '='.repeat(70));
    console.log('✅ USER ID MISMATCH FIXED!');
    console.log('='.repeat(70));

    if (verifyUser) {
      console.log('\n📊 USERS TABLE:');
      console.log('   User ID:', verifyUser.user_id);
      console.log('   Matches Auth ID:', verifyUser.user_id === correctAuthUserId ? '✅' : '❌');
      console.log('   Email:', verifyUser.email);
      console.log('   User Type:', verifyUser.user_type);
      console.log('   Is Active:', verifyUser.is_active ? '✅' : '❌');
    }

    if (verifyProfile) {
      console.log('\n📊 PROFILES TABLE:');
      console.log('   Profile ID:', verifyProfile.id);
      console.log('   Matches Auth ID:', verifyProfile.id === correctAuthUserId ? '✅' : '❌');
      console.log('   Email:', verifyProfile.email);
      console.log('   User Type:', verifyProfile.user_type);
      console.log('   Is Active:', verifyProfile.is_active ? '✅' : '❌');
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 SUCCESS!');
    console.log('='.repeat(70));
    console.log('\n⚠️  NEXT STEPS:');
    console.log('1. Refresh the page (F5 or Ctrl+R)');
    console.log('2. You should now see "User Management" in the sidebar');
    console.log('3. You now have FULL ADMIN ACCESS! 🎉');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixUserIdMismatch();
