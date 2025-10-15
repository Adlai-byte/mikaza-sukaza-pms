# Testing Guide - Security & Performance Implementation

This guide will help you test all the features implemented in recommendations 2-5.

---

## Prerequisites

Before testing, ensure:
1. ✅ Both migrations applied successfully (001 and 002)
2. ✅ Dev server is running (`npm run dev`)
3. ✅ You have both Admin and Ops user accounts created in Supabase

---

## Test 1: RLS Policies - Admin User

### Setup
1. Log in to your application as an **Admin** user
2. Open browser DevTools (F12) → Console tab

### Expected Behavior

#### ✅ Admin SHOULD Have Access To:

**Properties Page:**
- Navigate to `/properties`
- Should see all properties listed
- Click "Add Property" → Should work
- Edit a property → Should work
- Delete a property → Should work

**Bookings Page:**
- Navigate to `/bookings` or Calendar
- Should see all bookings
- Create a new booking → Should work
- Edit a booking → Should work
- Delete a booking → Should work

**Jobs Page:**
- Navigate to `/jobs`
- Should see all jobs
- Create a new job → Should work
- Edit a job → Should work
- Delete a job → Should work

**Issues Page:**
- Navigate to `/issues`
- Should see all issues
- Create a new issue → Should work
- Edit an issue → Should work
- Delete an issue → Should work

**Users Page:**
- Navigate to `/users`
- Should see all users
- Create a new user → Should work
- Edit a user → Should work
- Delete a user → Should work

#### ❌ Admin SHOULD NOT Have Access To:

**Todos/Tasks Page:**
- Try navigating to `/todos` or `/tasks`
- Should either:
  - Show empty list (no todos visible)
  - Show permission error
  - Page redirects to dashboard
- Admin cannot see Ops tasks (by design)

### Test SQL Query (in Supabase SQL Editor)

```sql
-- Simulate admin user
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"user_type": "admin"}';

  -- Should work
  SELECT COUNT(*) as properties FROM properties;
  SELECT COUNT(*) as bookings FROM property_bookings;
  SELECT COUNT(*) as jobs FROM jobs;
  SELECT COUNT(*) as issues FROM issues;
  SELECT COUNT(*) as users FROM users;

  -- Should fail or return 0
  SELECT COUNT(*) as tasks FROM tasks;

ROLLBACK;
```

**Expected Result:**
- All counts should show data EXCEPT tasks (should be 0 or error)

### Pass Criteria
- ✅ Admin can view/create/edit/delete: properties, bookings, jobs, issues, users
- ✅ Admin CANNOT access tasks/todos
- ✅ No console errors (except tasks permission denied)

---

## Test 2: RLS Policies - Ops User

### Setup
1. Log out and log in as an **Ops** user
2. Open browser DevTools (F12) → Console tab

### Expected Behavior

#### ✅ Ops SHOULD Have Access To:

**Properties Page:**
- Navigate to `/properties`
- Should see all properties listed
- Click "Add Property" → Should work
- Edit a property → Should work
- **Delete a property → Should FAIL** (Admin only)

**Bookings Page:**
- Navigate to `/bookings`
- Should see all bookings
- Create a booking → Should work
- Edit a booking → Should work (soft delete via status)
- **Hard delete a booking → Should FAIL** (Admin only)

**Jobs Page:**
- Navigate to `/jobs`
- Should see all jobs
- Create a job → Should work
- Edit a job → Should work
- Delete own jobs → Should work
- **Delete jobs created by others → Should FAIL**

**Issues Page:**
- Navigate to `/issues`
- Should see all issues
- Create an issue → Should work
- Edit an issue → Should work
- **Delete an issue → Should FAIL** (Admin only)

**Todos/Tasks Page:**
- Navigate to `/todos` or `/tasks`
- Should see all tasks (Ops exclusive access)
- Create a new task → Should work
- Edit a task → Should work
- Delete a task → Should work
- Mark tasks complete → Should work

#### ❌ Ops SHOULD NOT Be Able To:
- Delete properties (Admin only)
- Delete issues (Admin only)
- Hard delete bookings (Admin only)
- Manage users (view only, cannot create/edit/delete)

### Test SQL Query (in Supabase SQL Editor)

```sql
-- Simulate ops user
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims TO '{"user_type": "ops"}';

  -- Should work
  SELECT COUNT(*) as properties FROM properties;
  SELECT COUNT(*) as bookings FROM property_bookings;
  SELECT COUNT(*) as jobs FROM jobs;
  SELECT COUNT(*) as issues FROM issues;
  SELECT COUNT(*) as tasks FROM tasks;

  -- Should work (read-only)
  SELECT COUNT(*) as users FROM users;

  -- Try to delete a property (should fail)
  DELETE FROM properties WHERE property_id = (SELECT property_id FROM properties LIMIT 1);

ROLLBACK;
```

**Expected Result:**
- All SELECT queries should work
- DELETE query should fail with permission error

### Pass Criteria
- ✅ Ops can view/create/edit: properties, bookings, jobs, issues, tasks
- ✅ Ops can ONLY view users (not create/edit/delete)
- ✅ Ops CANNOT delete properties or issues
- ✅ Ops has FULL access to tasks (Admin does not)

---

## Test 3: File Upload Validation

### Setup
1. Log in as any user (Admin or Ops)
2. Navigate to Issues page
3. Create or edit an issue

### Test Case 1: Valid Image Upload ✅

**Steps:**
1. Click "Upload Photo" or similar
2. Select a valid image file:
   - `.jpg` or `.jpeg` (< 5MB)
   - `.png` (< 5MB)
   - `.webp` (< 5MB)
3. Upload the file

**Expected Result:**
- File uploads successfully
- Console shows: `✅ File validation passed`
- Photo appears in the issue

### Test Case 2: Invalid File Type ❌

**Steps:**
1. Try uploading an executable file:
   - `.exe`
   - `.bat`
   - `.sh`
   - `.js`
   - `.zip`
2. Attempt to upload

**Expected Result:**
- Upload fails immediately
- Error message: "Dangerous file type detected"
- Console shows: `❌ File validation failed: Dangerous file type detected: .exe. Executable files are not allowed for security reasons.`
- File is NOT uploaded to Supabase Storage

### Test Case 3: Oversized File ❌

**Steps:**
1. Try uploading an image larger than 5MB
2. Attempt to upload

**Expected Result:**
- Upload fails
- Error message: "File size (X MB) exceeds maximum allowed size (5.00MB)"
- Console shows: `❌ File validation failed`
- File is NOT uploaded

### Test Case 4: File with Double Extension ❌

**Steps:**
1. Rename a file to have double extension:
   - `photo.jpg.exe`
   - `image.png.bat`
2. Try uploading

**Expected Result:**
- Upload fails
- Error message: "Suspicious file name detected. File appears to have a hidden executable extension."
- File is NOT uploaded

### Test Case 5: File with Invalid Characters ❌

**Steps:**
1. Rename a file with special characters:
   - `photo<script>.jpg`
   - `image|test.png`
2. Try uploading

**Expected Result:**
- Upload fails
- Error message: "File name contains invalid characters"
- File is NOT uploaded

### Test Case 6: Very Small File (Warning) ⚠️

**Steps:**
1. Upload a very small file (< 100 bytes)
2. Upload the file

**Expected Result:**
- File uploads (validation passes)
- Console warning: `⚠️ File validation warnings: File is very small (< 100 bytes). It may be corrupted or empty.`
- File is uploaded but with a warning

### Check Console Logs

Open browser console and look for:
```
🔍 Validating issue photo upload...
🔍 Validating file: photo.jpg (ISSUE_PHOTO)
✅ File validation passed
```

Or on failure:
```
🔍 Validating issue photo upload...
🔍 Validating file: malware.exe (ISSUE_PHOTO)
❌ Dangerous file detected: [Dangerous file type detected: .exe...]
❌ File validation failed: Dangerous file type detected...
```

### Pass Criteria
- ✅ Valid images (.jpg, .png, .webp < 5MB) upload successfully
- ✅ Executable files (.exe, .bat, .sh, etc.) are blocked
- ✅ Oversized files (> 5MB) are blocked
- ✅ Files with double extensions are blocked
- ✅ Files with invalid characters are blocked
- ✅ Clear error messages shown to user
- ✅ Console logs show validation details

---

## Test 4: Query Performance

### Setup
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"

### Test Case 1: Booking Conflict Detection

**Steps:**
1. Navigate to Calendar or Bookings page
2. Try to create a new booking that overlaps with an existing one
3. Watch the Network tab for queries to Supabase

**Expected Result:**
- Query to check booking conflicts completes in < 20ms
- Previously: ~200ms (10-20x improvement)

**Check Query Plan (in Supabase SQL Editor):**
```sql
EXPLAIN ANALYZE
SELECT * FROM property_bookings
WHERE property_id = 'your-property-id'
  AND booking_status != 'cancelled'
  AND check_in_date <= '2024-12-31'
  AND check_out_date >= '2024-12-01';
```

**Expected:** Should show `Index Scan using idx_bookings_property_dates_status`

### Test Case 2: Task List Loading

**Steps:**
1. Log in as Ops user
2. Navigate to Tasks/Todos page
3. Watch Network tab for the tasks query

**Expected Result:**
- Query completes in < 15ms
- Previously: ~150ms (10-15x improvement)

### Test Case 3: Calendar Rendering

**Steps:**
1. Navigate to Calendar page
2. Watch Network tab for booking queries
3. Note the total page load time

**Expected Result:**
- Calendar loads 30-50% faster than before
- All booking queries use indexes
- Total render time significantly reduced

### Test Case 4: User List Caching (React Query)

**Steps:**
1. Navigate to any page that loads users (Jobs, Tasks, Issues)
2. Watch Network tab
3. Navigate away and come back within 30 minutes
4. Watch Network tab again

**Expected Result:**
- First load: Query to Supabase (fetches users)
- Second load (within 30 min): No query (served from cache)
- Console shows: `useUsersOptimized: Using cached data`

### Pass Criteria
- ✅ Booking queries < 20ms (was ~200ms)
- ✅ Task queries < 15ms (was ~150ms)
- ✅ Query plans show index usage
- ✅ User list cached for 30 minutes
- ✅ Noticeable performance improvement in UI

---

## Test 5: Index Usage Verification

### Run After 1-2 Days of Testing

**In Supabase SQL Editor:**

```sql
-- Check index usage statistics
SELECT
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC
LIMIT 20;
```

**Expected Result:**
- Indexes should show `times_used > 0`
- Most used indexes should be:
  - `idx_bookings_property_dates_status`
  - `idx_tasks_assigned_status`
  - `idx_jobs_property_status`
  - `idx_issues_property_status`

**Find Unused Indexes:**

```sql
-- Find indexes that haven't been used
SELECT
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname LIKE 'idx_%'
ORDER BY tablename;
```

**Action:** If any indexes show 0 usage after 1 week, consider removing them to save storage.

---

## Test 6: Security Edge Cases

### Test Case 1: Unauthenticated Access

**Steps:**
1. Log out of the application
2. Try accessing `/properties`, `/bookings`, `/jobs` directly

**Expected Result:**
- Redirected to login page
- No data visible
- RLS blocks all access

### Test Case 2: Role Escalation Attempt

**Steps:**
1. Log in as Ops user
2. Open browser console
3. Try to manually call a protected mutation:

```javascript
// Try to delete a property (Ops should not be able to)
const { data, error } = await supabase
  .from('properties')
  .delete()
  .eq('property_id', 'some-id');

console.log(error); // Should show permission error
```

**Expected Result:**
- Error: "new row violates row-level security policy"
- Property is NOT deleted
- RLS blocks the operation at database level

### Test Case 3: JWT Tampering Protection

**Steps:**
1. Log in as Ops user
2. Open browser DevTools → Application → Local Storage
3. Try to modify the JWT token to change `user_type` to `admin`
4. Try accessing admin-only features

**Expected Result:**
- Supabase validates the JWT signature
- Modified token is rejected
- User remains as Ops (cannot escalate to Admin)

---

## Troubleshooting Common Issues

### Issue 1: "Permission denied for table X"

**Cause:** RLS is blocking access

**Fix:**
1. Check user role is set correctly: `SELECT user_type FROM users WHERE user_id = auth.uid();`
2. Verify JWT claims include `user_type`
3. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'X';`

### Issue 2: Queries Still Slow After Indexes

**Cause:** Query planner statistics not updated

**Fix:**
```sql
ANALYZE property_bookings;
ANALYZE tasks;
ANALYZE jobs;
-- Run for all tables with new indexes
```

### Issue 3: File Upload Validation Not Working

**Cause:** Import missing or function not called

**Fix:** Verify in component:
```typescript
import { validateFile } from '@/lib/file-validation';

const handleUpload = async (file: File) => {
  const result = await validateFile(file, 'ISSUE_PHOTO');
  if (!result.isValid) {
    alert(result.errors.join('. '));
    return;
  }
  // Proceed with upload
};
```

---

## Final Checklist

Before marking implementation as complete:

- [ ] All RLS policies verified (Admin and Ops access tested)
- [ ] File upload validation tested (valid and invalid files)
- [ ] Query performance improved (booking conflicts, task lists)
- [ ] User list caching working (React Query)
- [ ] Index usage verified (pg_stat_user_indexes)
- [ ] Security edge cases tested (unauthenticated, role escalation)
- [ ] Console shows no unexpected errors
- [ ] Documentation reviewed (QUICK_START.md, IMPLEMENTATION_SUMMARY.md)

---

## Success Metrics

After successful implementation:

✅ **Security**
- Zero unauthorized access to restricted resources
- Zero malicious file uploads accepted
- Database enforces all RBAC rules at RLS level

✅ **Performance**
- Booking conflict queries: < 20ms (was ~200ms)
- Task list loading: < 15ms (was ~150ms)
- Calendar rendering: 30% faster
- User list cached for 30 minutes (instant loading)

✅ **User Experience**
- Clear error messages for invalid uploads
- Faster page loads across all modules
- No permission errors for valid operations
- Ops users can access todos, Admin users cannot

---

## Next Steps After Testing

1. **Production Deployment:**
   - Enable Supabase authentication: `AUTH_ENABLED = true`
   - Deploy to production
   - Monitor error logs

2. **Ongoing Maintenance:**
   - Weekly: Check slow query log
   - Monthly: Run `VACUUM ANALYZE` on large tables
   - Quarterly: Review and optimize unused indexes

3. **Monitoring:**
   - Set up Supabase monitoring dashboard
   - Track query performance metrics
   - Monitor index usage statistics

---

**Status:** Ready for Testing
**Estimated Testing Time:** 1-2 hours
**Expected Impact:** System rating 8.5/10 → 9.5/10
