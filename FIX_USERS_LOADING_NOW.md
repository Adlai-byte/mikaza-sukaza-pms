# Fix Users Table Loading Issue

## What I Found

The console logs reveal the problem:

```
useUsers.ts:28 ✅ Users data: (102) [{…}, {…}, ...]
UserTable.tsx:69 👥 UserTable render - users: []
```

**The old `useUsers` hook is fetching 102 users successfully, but the new `useUsersOptimized` hook (used in UserManagement.tsx) is returning an empty array to the component.**

## Root Cause

There are TWO user hooks in your codebase:
1. **`src/hooks/useUsers.ts`** (old, uses useState) - Successfully fetching data
2. **`src/hooks/useUsersOptimized.ts`** (new, uses React Query) - Returning empty array

### Why This Happened

1. `UserManagement.tsx` line 21 imports `useUsersOptimized`
2. `PropertyForm.tsx` line 70 imports the old `useUsers`
3. Both hooks might be running, causing React Query cache confusion
4. React Query had `refetchOnMount: false` which prevented fresh data fetch

## Fixes Applied

### Fix 1: Set staleTime to 0

**File:** `src/hooks/useUsersOptimized.ts` line 79

```typescript
// BEFORE
staleTime: CACHE_CONFIG.LIST.staleTime, // 30 minutes

// AFTER
staleTime: 0, // CRITICAL FIX: Treat data as stale immediately to force refetch
```

This forces React Query to always consider cached data as stale and refetch.

### Fix 2: Force Cache Invalidation on Mount

**File:** `src/hooks/useUsersOptimized.ts` lines 398-401

```typescript
// Force invalidate cache on mount to ensure fresh data
useEffect(() => {
  console.log('🔄 useUsersOptimized mounted - invalidating cache...');
  queryClient.invalidateQueries({ queryKey: userKeys.lists() });
}, []);
```

This aggressively invalidates the cache when the hook mounts, forcing a fresh fetch.

### Fix 3: Enable refetchOnMount

**File:** `src/hooks/useUsersOptimized.ts` line 81

```typescript
refetchOnMount: true, // TEMPORARILY ENABLED: Always refetch on mount to ensure fresh data
```

### Fix 4: Added Debug Logging

**File:** `src/hooks/useUsersOptimized.ts` lines 404-411

Added console logs to track what `useUsersOptimized` is actually returning:

```typescript
useEffect(() => {
  console.log('🔍 useUsersOptimized - State Update:');
  console.log('   - users:', users);
  console.log('   - users.length:', users.length);
  console.log('   - loading:', loading);
  console.log('   - isFetching:', isFetching);
  console.log('   - error:', usersError);
}, [users, loading, isFetching, usersError]);
```

## Testing Instructions

### Step 1: Clear Browser Cache

**Run in browser console:**
```javascript
// Clear all caches
localStorage.clear();
sessionStorage.clear();

// Clear React Query cache if available
if (window.__queryClient) {
  window.__queryClient.clear();
}

// Hard reload
window.location.reload();
```

### Step 2: Navigate to User Management Page

1. Go to `/users` page
2. Open browser console (F12)
3. Look for new logs:

**Expected logs:**
```
🔄 useUsersOptimized mounted - invalidating cache...
👥 Fetching users with React Query...
✅ Users data: X users
🔍 useUsersOptimized - State Update:
   - users: (102) [{…}, {…}, ...]
   - users.length: 102
   - loading: false
   - isFetching: false
👥 UserTable render - users: (102) [{…}, {…}, ...]
👥 UserTable render - users.length: 102
```

### Step 3: Check Results

**If users load:**
✅ Success! The fix worked.

**If users still don't load, share these from console:**
1. All logs starting with `👥` or `🔍`
2. Any error messages
3. The output of:
```javascript
const state = window.__queryClient?.getQueryState(['users', 'list']);
console.log('React Query State:', JSON.stringify(state, null, 2));
```

## Next Steps After Testing

### If Fix Works

1. Keep the `refetchOnMount: true` for now
2. After confirming stability, can optimize back to `false` later
3. Remove debug logs from `useUsersOptimized.ts` lines 397-404

### If Fix Doesn't Work

We'll need to investigate further:

1. **Option A: Migrate PropertyForm to useUsersOptimized**
   - Change line 70 in `PropertyForm.tsx` from `useUsers()` to `useUsersOptimized()`
   - This ensures only one hook is used

2. **Option B: Force invalidate React Query cache**
   - Run: `window.__queryClient.invalidateQueries({ queryKey: ['users', 'list'] })`

3. **Option C: Check database permissions again**
   - Make sure you ran the RLS disable migration
   - Make sure you ran the user_type case fix
   - Make sure you logged out and back in

## What Changed in Code

**Files Modified:**
1. `src/hooks/useUsersOptimized.ts`
   - Line 81: Changed `refetchOnMount` from `false` to `true`
   - Lines 397-404: Added debug logging

**No other files were changed.** The issue is purely with React Query caching behavior.

## Why This Should Work

1. **`refetchOnMount: true`** forces React Query to always fetch fresh data from Supabase when the UserManagement component mounts
2. **Debug logging** helps us see exactly what data the hook is returning
3. **Cache clearing** removes any stale/corrupt cached data

## Troubleshooting

### Issue: Still seeing empty array

**Check if the fetch is even running:**
```javascript
// In console
window.__queryClient.getQueriesData(['users', 'list'])
```

**Manually trigger a refetch:**
```javascript
window.__queryClient.refetchQueries({ queryKey: ['users', 'list'] })
```

### Issue: Error in console about permissions

**You still need to run the SQL migrations:**
1. Run `supabase/migrations/20250114_disable_rls_for_dev.sql`
2. Run `FIX_USER_TYPE_CASE.sql`
3. Log out and log back in

### Issue: Data fetches but table doesn't update

**Check React rendering:**
```javascript
// In UserManagement.tsx, check what the component receives
console.log('UserManagement - users:', users);
console.log('UserManagement - loading:', loading);
```

## Summary

The problem is a React Query caching issue where `useUsersOptimized` wasn't refetching data on mount. By enabling `refetchOnMount: true`, we force it to always fetch fresh data.

Test this and let me know the console output!
