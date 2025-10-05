# RBAC Testing Plan

## Server Information
- **Development Server**: http://localhost:8083
- **Test Date**: 2025-10-05
- **Authentication Mode**: Session-based (AUTH_ENABLED = false)

## Test Users Required

### Admin User
- **Email**: admin@test.com
- **User Type**: admin
- **Expected Access**: Full access to all modules and operations

### Ops User
- **Email**: ops@test.com
- **User Type**: ops
- **Expected Access**: Limited access (no user management, no property deletion)

---

## Test Scenarios

### 1. Admin User Tests

#### 1.1 Sidebar Navigation Access
- [ ] **Test**: Login as Admin user
- [ ] **Expected**: See all menu items including:
  - Dashboard
  - User Management ✓
  - Properties
  - Active Jobs
  - Calendar
  - Issues & Photos
  - All Document sections (Contracts, Employee Documents, etc.)
  - All Finance sections (Pipeline, Invoices, Commissions)
  - Media
  - Highlights

#### 1.2 Route Access
- [ ] **Test**: Navigate to `/users` (User Management)
- [ ] **Expected**: Access granted, can see user management page
- [ ] **Test**: Navigate to `/properties`
- [ ] **Expected**: Access granted
- [ ] **Test**: Navigate to `/finance/commissions`
- [ ] **Expected**: Access granted

#### 1.3 User Management Operations
- [ ] **Test**: Create a new user
- [ ] **Expected**: Success - user created
- [ ] **Test**: Edit an existing user
- [ ] **Expected**: Success - user updated
- [ ] **Test**: Delete a user
- [ ] **Expected**: Success - user deleted

#### 1.4 Property Management Operations
- [ ] **Test**: Create a new property
- [ ] **Expected**: Success - property created
- [ ] **Test**: Edit an existing property
- [ ] **Expected**: Success - property updated
- [ ] **Test**: Delete a property
- [ ] **Expected**: Success - property deleted (Admin only capability)

---

### 2. Ops User Tests

#### 2.1 Sidebar Navigation Access
- [ ] **Test**: Login as Ops user
- [ ] **Expected**: See limited menu items:
  - Dashboard ✓
  - Properties ✓
  - Active Jobs ✓
  - Calendar ✓
  - Issues & Photos ✓
  - Documents - Contracts ✓ (view only)
  - Documents - COIs ✓ (view only)
  - Finance - View only ✓
  - Media ✓
  - Highlights ✓

- [ ] **Expected**: Should NOT see:
  - User Management ✗
  - Employee Documents ✗
  - Commissions ✗

#### 2.2 Route Protection
- [ ] **Test**: Try to navigate directly to `/users` (URL bar)
- [ ] **Expected**: Redirected to `/unauthorized` page
- [ ] **Verify**: Unauthorized page shows:
  - User role (Operations Manager)
  - Attempted access path
  - Helpful error message
  - "Go Back" and "Go to Dashboard" buttons

#### 2.3 User Management Operations (Should Fail)
- [ ] **Test**: Try to access user management via URL
- [ ] **Expected**: Redirected to unauthorized page

#### 2.4 Property Management Operations
- [ ] **Test**: View properties list
- [ ] **Expected**: Success - can see all properties
- [ ] **Test**: Create a new property
- [ ] **Expected**: Success - property created
- [ ] **Test**: Edit an existing property
- [ ] **Expected**: Success - property updated
- [ ] **Test**: Try to delete a property
- [ ] **Expected**: FAIL - Error message "You don't have permission to delete properties"
- [ ] **Verify**: Delete button should be hidden or disabled for Ops users

#### 2.5 Finance Access
- [ ] **Test**: View finance data
- [ ] **Expected**: Success - can view finance information
- [ ] **Test**: Try to create/edit finance records
- [ ] **Expected**: Based on implementation, should be restricted

---

## Step-by-Step Testing Instructions

### Setup Phase

1. **Open Browser**: Navigate to http://localhost:8083
2. **Check Login Page**: Should see the auth page
3. **Click "Show Available Users (Session Mode)"**: See list of users
4. **Verify Test Users Exist**:
   - If no users exist, create them via User Management first
   - Need at least one Admin user and one Ops user

### Admin Testing Phase

1. **Login as Admin**:
   - Click "Show Available Users"
   - Find admin user and click "Login as User"
   - Should redirect to Dashboard

2. **Test Sidebar**:
   - Verify "User Management" appears in sidebar
   - Verify all document sections appear
   - Verify "Commissions" appears in Finance section

3. **Test User Management**:
   - Click "User Management" in sidebar
   - Try to create a user (should succeed)
   - Try to edit a user (should succeed)
   - Try to delete a user (should succeed)

4. **Test Property Management**:
   - Navigate to Properties
   - Try to create a property (should succeed)
   - Try to edit a property (should succeed)
   - Try to delete a property (should succeed)

5. **Logout**: Click profile menu → Sign Out

### Ops Testing Phase

1. **Login as Ops**:
   - Go back to auth page
   - Click "Show Available Users"
   - Find ops user and click "Login as User"
   - Should redirect to Dashboard

2. **Test Sidebar Filtering**:
   - **Verify NOT visible**: "User Management", "Employee Documents", "Commissions"
   - **Verify visible**: Dashboard, Properties, Jobs, Calendar, etc.

3. **Test Direct URL Access**:
   - Manually type in URL bar: `http://localhost:8083/users`
   - Press Enter
   - **Expected**: Should redirect to `/unauthorized`
   - **Verify Unauthorized Page**:
     - Shows role: "Operations Manager"
     - Shows attempted path: "/users"
     - Has "Go Back" and "Go to Dashboard" buttons

4. **Test Property Operations**:
   - Navigate to Properties
   - Try to create a property (should succeed)
   - Try to edit a property (should succeed)
   - Look for delete button:
     - Should be hidden OR
     - Clicking it should show error toast: "You don't have permission to delete properties"

5. **Test Finance**:
   - Navigate to Finance section (if visible)
   - Should be able to VIEW data
   - Should NOT be able to create/edit/delete

---

## Expected Results Summary

| Feature | Admin | Ops |
|---------|-------|-----|
| View Dashboard | ✅ | ✅ |
| View Properties | ✅ | ✅ |
| Create Property | ✅ | ✅ |
| Edit Property | ✅ | ✅ |
| Delete Property | ✅ | ❌ |
| View Users | ✅ | ❌ |
| Create/Edit/Delete Users | ✅ | ❌ |
| View Finance | ✅ | ✅ (view only) |
| Edit Finance | ✅ | ❌ |
| View Employee Docs | ✅ | ❌ |
| View Commissions | ✅ | ❌ |
| Access `/users` route | ✅ | ❌ (redirects to /unauthorized) |
| Access `/properties` route | ✅ | ✅ |

---

## Console Checks

Open Browser DevTools (F12) and check:

1. **Permission Errors**: When Ops user tries restricted actions
   - Should see error in console with permission message
   - Should see toast notification with user-friendly error

2. **Network Tab**: When making requests
   - Admin requests should succeed
   - Ops requests to restricted endpoints should fail with permission errors

---

## Database Verification

If needed, verify RLS policies in Supabase:

1. Open Supabase Dashboard
2. Go to Database → Policies
3. Verify policies exist for:
   - users table
   - properties table
   - bank_accounts table
   - credit_cards table
   - All property-related tables

---

## Bug Reporting Template

If issues are found:

```
**Issue**: [Brief description]
**User Role**: [Admin / Ops]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Steps to Reproduce**:
1. Step 1
2. Step 2
3. ...

**Error Messages**: [Copy any error messages]
**Screenshot**: [If applicable]
```

---

## Notes

- The RLS migration file is located at: `supabase/migrations/20251005000000_add_rbac_rls_policies.sql`
- If RLS policies haven't been applied, run: `npx supabase migration up` or apply via Supabase dashboard
- Session-based auth stores user in localStorage with key: `tempSessionUser`
- To clear session manually: `localStorage.removeItem('tempSessionUser')`
