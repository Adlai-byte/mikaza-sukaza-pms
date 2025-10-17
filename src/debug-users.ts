// Quick diagnostic script to test users table access
import { supabase } from "./integrations/supabase/client";

async function testUsersAccess() {
  console.log("🔍 Testing users table access...");

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ Error fetching users:", error);
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log("✅ Users fetched successfully!");
      console.log("📊 Users count:", data?.length || 0);
      console.log("👥 Users data:", data);

      if (data && data.length > 0) {
        console.log("First user sample:", {
          user_id: data[0].user_id,
          first_name: data[0].first_name,
          last_name: data[0].last_name,
          email: data[0].email,
          user_type: data[0].user_type,
          is_active: data[0].is_active
        });
      }
    }
  } catch (err) {
    console.error("❌ Exception:", err);
  }
}

// Run the test
testUsersAccess();
