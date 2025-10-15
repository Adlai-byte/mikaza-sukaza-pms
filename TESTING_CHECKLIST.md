# Testing Checklist - All Fixes

## ✅ App Status
- **Running:** http://localhost:8081
- **Status:** No errors
- **Latest Updates:** All fixes applied and loaded via HMR

---

## 🧪 Test Each Fix

### Test 1: OPS User Can Create & Assign Tasks ✅

**Steps:**
1. Open http://localhost:8081
2. Login as an **OPS user** (not admin)
3. Navigate to **/todos**
4. Click **"New Task"** button

**Expected Result:**
- ✅ Dialog opens (OPS can create tasks)

5. Fill in task details:
   - Title: "Test Task from OPS"
   - Assign To: Select another user
   - Priority: High
   - Category: Maintenance

6. Click **"Create Task"**

**Expected Results:**
- ✅ Task creates successfully
- ✅ Dialog closes automatically
- ✅ Task appears in the list
- ✅ No permission errors

---

### Test 2: Date Field is Optional ✅

**Steps:**
1. Click **"New Task"**
2. Fill in:
   - Title: "Task Without Date"
   - Description: "Testing optional date"
3. **Leave "Due Date" blank**
4. Click **"Create Task"**

**Expected Results:**
- ✅ Task creates successfully
- ✅ No database errors
- ✅ No "invalid date" errors
- ✅ Dialog closes

**Now test adding a date:**
5. Edit the task you just created
6. Add a due date (select from calendar)
7. Click **"Update Task"**

**Expected Results:**
- ✅ Updates successfully
- ✅ Date saves

**Now test removing the date:**
8. Edit the same task
9. Clear the due date field
10. Click **"Update Task"**

**Expected Results:**
- ✅ Updates successfully
- ✅ No errors when date is removed

---

### Test 3: OPS User Can Create & Assign Issues ✅

**Steps:**
1. Navigate to **/issues**
2. Click **"Report Issue"**
3. Fill in:
   - Title: "Test Issue from OPS"
   - Description: "Testing OPS permissions"
   - Assign To: Select another user
   - Priority: High
   - Category: Maintenance
4. Click **"Create Issue"**

**Expected Results:**
- ✅ Issue creates successfully
- ✅ Dialog closes automatically
- ✅ No permission errors

---

### Test 4: Dialog Auto-Close ✅

**Already tested above, but verify:**
- ✅ Task dialog closes after create
- ✅ Task dialog closes after edit
- ✅ Issue dialog closes after create
- ✅ Issue dialog closes after edit

---

### Test 5: Notifications (Application-Layer) ✅

**No SQL migration needed!** Notifications are now created directly in the application code.

**Test notifications:**

**Setup:**
- Browser 1: Login as **User A** (creator)
- Browser 2: Login as **User B** (assignee) - use incognito/different browser

**Test Task Assignment Notification:**

1. **In Browser 1 (User A):**
   - Open browser console (F12)
   - Go to /todos
   - Click "New Task"
   - Fill in: "Notification Test Task"
   - **Assign To: User B**
   - Click "Create Task"
   - **Expected in console:** `✅ Notification created for task assignment`

2. **In Browser 2 (User B):**
   - Look at the notification bell in header
   - **Expected:** Bell shows red badge with "1"
   - Click the bell
   - **Expected:** See "New Task Assigned" notification
   - **Expected:** Message says "User A assigned you a task: Notification Test Task"
   - Click the notification
   - **Expected:** Navigates to /todos page
   - **Expected:** Notification is marked as read (badge updates)

**Test Status Change Notification:**

3. **In Browser 2 (User B):**
   - Open browser console (F12)
   - Find the task "Notification Test Task"
   - Change status to **"In Progress"**
   - **Expected in console:** `✅ Notification created for status change`

4. **In Browser 1 (User A):**
   - **Expected:** Bell badge updates automatically (no refresh!)
   - Click bell
   - **Expected:** See "Task Status Updated" notification
   - **Expected:** Shows old status → new status

**Test Issue Assignment Notification:**

5. **In Browser 1 (User A):**
   - Keep browser console open (F12)
   - Go to /issues
   - Click "Report Issue"
   - Fill in: "Notification Test Issue"
   - **Assign To: User B**
   - Click "Create Issue"
   - **Expected in console:** `✅ Notification created for issue assignment`

6. **In Browser 2 (User B):**
   - **Expected:** Bell badge increments
   - Click bell
   - **Expected:** See "New Issue Assigned" notification

**Test Real-Time Updates:**

7. **Open both browsers side-by-side**
8. **In Browser 1:** Create a task, assign to User B
9. **In Browser 2:** Watch the bell icon
   - **Expected:** Badge updates **immediately** without page refresh!
   - This confirms real-time subscriptions are working

---

## 📋 Checklist Summary

Mark each as you test:

### OPS User Permissions:
- [ ] OPS can create tasks
- [ ] OPS can assign tasks to anyone
- [ ] OPS can view all tasks (not just their own)
- [ ] OPS can create issues
- [ ] OPS can assign issues

### Date Fields:
- [ ] Can create task without date (no errors)
- [ ] Can add date to existing task
- [ ] Can remove date from task (no errors)

### Dialogs:
- [ ] Task dialog closes after create
- [ ] Task dialog closes after edit
- [ ] Issue dialog closes after create
- [ ] Issue dialog closes after edit

### Notifications (Application-Layer):
- [ ] Task assignment sends notification (check console for ✅)
- [ ] Notification bell shows unread count
- [ ] Can click notification to navigate
- [ ] Status change sends notification (check console for ✅)
- [ ] Issue assignment sends notification (check console for ✅)
- [ ] Real-time updates work (no refresh needed)
- [ ] Mark as read works
- [ ] Delete notification works

---

## 🐛 If Something Fails

### OPS User Can't Create Tasks
**Check:**
- Is the user's `user_type` set to `'ops'` in database?
- Did you refresh the page after I updated the permissions?
- Try logging out and back in

### Date Field Errors
**Check:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)
- Check browser console for errors

### Notifications Not Appearing
**Check:**
1. **Open browser console (F12)** - Look for:
   - `✅ Notification created for task assignment` (success)
   - `❌ Failed to create notification: [error]` (failure)
   - Any errors from Supabase

2. **If you see ✅ but no notification in bell:**
   - Check real-time subscription is working
   - Look for `🔔 Notification update:` logs in console
   - Refresh the page as the assigned user
   - Check Supabase Dashboard → Database → notifications table

3. **If you see ❌ error:**
   - Read the error message in console
   - Likely a permission or database issue
   - Check RLS policies on `notifications` table

4. **Manually create a test notification:**
   - In Supabase Dashboard → SQL Editor, run:
```sql
-- Get your user_id first
SELECT user_id, first_name FROM users LIMIT 5;

-- Create test (replace YOUR_USER_ID)
INSERT INTO notifications (user_id, type, title, message, link)
VALUES (
    'YOUR_USER_ID'::uuid,
    'task_assigned',
    'Manual Test',
    'This is a manual test notification',
    '/todos'
);
```

If manual notification appears in the bell, then the notification creation code is the issue.

---

## 📊 Expected Results Summary

**After all tests pass:**
- ✅ OPS users have full access to tasks and issues
- ✅ Date fields work perfectly (optional)
- ✅ Dialogs close smoothly after save
- ✅ Notifications send and display correctly
- ✅ Real-time updates work without refresh
- ✅ No console errors
- ✅ Smooth user experience

---

## 📞 Report Results

Please test each section and let me know:
1. Which tests passed ✅
2. Which tests failed ❌
3. Any error messages you see
4. Screenshots if something looks wrong

I'm ready to fix any issues you encounter!
