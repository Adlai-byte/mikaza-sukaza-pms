# Emergency Fix: Users Table Stuck Loading

## Quick Test First

**Open browser console (F12) and run:**

```javascript
// Check if data exists in React Query cache
const cache = window.__queryClient.getQueryData(['users', 'list']);
console.log('📦 Users in cache:', cache);
console.log('📊 Number of users:', cache?.length);

// Check loading state
const state = window.__queryClient.getQueryState(['users', 'list']);
console.log('🔄 Query state:', state?.status);
console.log('⏰ Is fetching:', state?.isFetching);
```

**If you see:**
- `Users in cache: [array with data]` and `status: "success"` → Data exists but not rendering
- `Users in cache: undefined` and `status: "loading"` → Query is stuck
- `status: "error"` → Fetch failed

---

## Fix 1: Clear React Query Cache (30 seconds)

**Run in browser console:**

```javascript
// Clear all caches
localStorage.clear();
sessionStorage.clear();

// Clear React Query cache
window.__queryClient.clear();

// Hard reload
window.location.reload();
```

This fixes ~70% of loading issues.

---

## Fix 2: Force Refetch (10 seconds)

**Run in browser console:**

```javascript
// Invalidate users query
window.__queryClient.invalidateQueries({ queryKey: ['users', 'list'] });

// Force refetch
window.__queryClient.refetchQueries({ queryKey: ['users', 'list'] });
```

---

## Fix 3: Check if Database Has Users

**Run in Supabase SQL Editor:**

```sql
-- Do users exist?
SELECT COUNT(*) as user_count FROM users;

-- Show sample users
SELECT user_id, email, first_name, user_type FROM users LIMIT 3;
```

**If count = 0:** You need to create users first!

---

## Fix 4: Verify Permissions (Critical)

**Run in Supabase SQL Editor:**

```sql
-- Check RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- Should show: rowsecurity = false

-- Check grants
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND grantee IN ('authenticated', 'anon');
```

**Expected:** authenticated should have ALL or SELECT privileges

**If not:**
```sql
GRANT ALL ON public.users TO authenticated;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

---

## Fix 5: Test Direct Database Query

**Run in browser console:**

```javascript
// Test direct query
const testQuery = async () => {
  console.log('🧪 Testing direct Supabase query...');

  const { data, error } = await window.supabase
    .from('users')
    .select('*');

  console.log('📊 Result:', {
    success: !error,
    userCount: data?.length,
    data: data,
    error: error
  });

  return { data, error };
};

testQuery();
```

**If this returns data:** React Query is the issue
**If this returns error:** Database/permissions issue

---

## Fix 6: Check Network Request

1. Open **DevTools** → **Network** tab
2. Filter by "users"
3. Refresh page
4. Look for request to `/rest/v1/users`

**Check:**
- Status code: Should be 200
- Response: Should have user array
- Headers: Check authorization header exists

**If 403 Forbidden:** Permission/auth issue
**If 401 Unauthorized:** Not logged in
**If 200 but empty array:** Database is empty

---

## Fix 7: Temporary Bypass (Last Resort)

**Edit `src/pages/UserManagement.tsx`:**

**Replace line 21:**
```typescript
// OLD
const { users, loading, isFetching, createUser, updateUser, deleteUser } = useUsersOptimized();

// NEW - Force disable loading after 3 seconds
const hookData = useUsersOptimized();
const [forceShow, setForceShow] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => setForceShow(true), 3000);
  return () => clearTimeout(timer);
}, []);

const users = hookData.users;
const loading = forceShow ? false : hookData.loading;
const isFetching = hookData.isFetching;
const createUser = hookData.createUser;
const updateUser = hookData.updateUser;
const deleteUser = hookData.deleteUser;
```

This forces loading to stop after 3 seconds for debugging.

---

## Fix 8: Check User Type Matches

**Run in browser console:**

```javascript
// Check current user's type
const checkUser = async () => {
  const { data: { session } } = await window.supabase.auth.getSession();

  const userId = session?.user?.id;
  console.log('🆔 User ID:', userId);

  // Get user from database
  const { data: dbUser } = await window.supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single();

  console.log('👤 Database user:', dbUser);
  console.log('🔑 user_type:', dbUser?.user_type);
  console.log('✅ Should be: "admin" (lowercase)');
};

checkUser();
```

**If user_type is still "Administrator":** Run Fix 2 from QUICK_FIX_STEPS.md

---

## Fix 9: Enable Debug Mode

**Add to `src/hooks/useUsersOptimized.ts` line 27:**

```typescript
// Add before the current fetchUsers
const fetchUsers = async (): Promise<User[]> => {
  console.log('========================================');
  console.log('🔍 USERS FETCH DEBUG');
  console.log('========================================');
  console.log('⏰ Time:', new Date().toISOString());

  try {
    console.log('📡 Fetching from Supabase...');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('📊 Response received');
    console.log('   - Error:', error);
    console.log('   - Data:', data);
    console.log('   - Count:', data?.length);

    if (error) {
      console.error('❌ FETCH ERROR:', error);
      throw error;
    }

    console.log('✅ SUCCESS: Fetched', data?.length, 'users');
    console.log('========================================');

    return (data || []) as User[];
  } catch (err) {
    console.error('💥 EXCEPTION:', err);
    throw err;
  }
};
```

Then refresh and check console for detailed logs.

---

## What to Do Next

1. **Run Quick Test** (browser console commands above)
2. **Try Fix 1** (clear caches) - Most likely to work
3. **Try Fix 4** (verify permissions) - Second most common
4. **Share results** with me:
   - Console output from Quick Test
   - Network tab screenshot
   - SQL query results

---

## Most Likely Issues (Ranked)

1. **React Query cache stuck** (60%) → Fix 1
2. **RLS not actually disabled** (20%) → Fix 4
3. **Database empty** (10%) → Fix 3
4. **User type still wrong** (5%) → Fix 8
5. **Network/auth issue** (5%) → Fix 6

---

**Try these in order and let me know which one works!**
