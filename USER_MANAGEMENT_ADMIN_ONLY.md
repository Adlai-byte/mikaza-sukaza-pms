# User Management - Admin Only Access

## Date
October 16, 2025

## Change Summary
**Reverted previous change** - User Management is now **Admin Only** again.

## Current State

### Admin Users
✅ **Full Access to User Management**
- Can view all users
- Can create new users
- Can edit user details
- Can delete users
- Can change user roles
- "User Management" link visible in sidebar
- Can access `/users` route

### Ops Users
❌ **No Access to User Management**
- Cannot view users
- Cannot create users
- Cannot edit users
- Cannot delete users
- Cannot change roles
- "User Management" link **hidden** in sidebar
- Cannot access `/users` route (will see "Access Denied")

## How It Works

### 1. Permissions System
**File:** `src/lib/rbac/permissions.ts`

**Admin permissions (lines 132-141):**
```typescript
admin: {
  permissions: [
    // ALL PERMISSIONS including:
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_EDIT,
    PERMISSIONS.USERS_DELETE,
    PERMISSIONS.USERS_CHANGE_ROLE,
    // ... all other permissions
  ]
}
```

**Ops permissions (lines 148-236):**
```typescript
ops: {
  permissions: [
    // NO user management permissions
    PERMISSIONS.PROPERTIES_VIEW,
    PERMISSIONS.PROPERTIES_CREATE,
    // ... other permissions but NO USERS_* permissions
  ]
}
```

### 2. Route Protection
**File:** `src/App.tsx` (lines 148-156)

```typescript
<Route
  path="/users"
  element={
    <RBACProtectedRoute permission={PERMISSIONS.USERS_VIEW}>
      <UserManagement />
    </RBACProtectedRoute>
  }
/>
```

When an ops user tries to access `/users`:
1. `RBACProtectedRoute` checks if user has `USERS_VIEW` permission
2. Ops role does not have this permission
3. User is redirected to "Access Denied" page

### 3. Sidebar Menu
**File:** `src/components/AppSidebar.tsx` (line 36)

```typescript
const mainMenuItems = [
  // ...
  {
    title: "User Management",
    url: "/users",
    icon: Users,
    permission: PERMISSIONS.USERS_VIEW
  },
  // ...
];
```

The sidebar automatically filters menu items based on permissions:
- Admin has `USERS_VIEW` → Item is visible
- Ops lacks `USERS_VIEW` → Item is hidden

## Testing

### Test as Admin User
1. ✅ See "User Management" in sidebar
2. ✅ Click and access `/users` page
3. ✅ See all users in table
4. ✅ Can create/edit/delete users
5. ✅ Can change user roles

### Test as Ops User
1. ❌ "User Management" **NOT visible** in sidebar
2. ❌ Manual navigation to `/users` shows "Access Denied"
3. ❌ No access to any user management functionality

## Why Admin Only?

**Security & Compliance Reasons:**

1. **Data Privacy**: User data includes sensitive information
   - Email addresses
   - Phone numbers
   - Bank account details
   - Credit card information
   - Personal addresses

2. **Audit Trail**: Changes to user accounts need oversight
   - Who created/deleted accounts?
   - Who changed user information?
   - Admin-only ensures accountability

3. **Prevent Abuse**: Limits who can manipulate user accounts
   - Ops cannot create fake accounts
   - Ops cannot delete competitor accounts
   - Ops cannot access financial data

4. **Role Protection**: Only admins can assign/change roles
   - Prevents privilege escalation
   - Ops cannot promote themselves to admin
   - Maintains security hierarchy

## Alternative: Ops Needs User Info?

If ops users need to **view** (but not edit) user information for support:

### Option 1: Read-Only View
Grant only `PERMISSIONS.USERS_VIEW`:
```typescript
ops: {
  permissions: [
    PERMISSIONS.USERS_VIEW, // View only, no editing
    // ... other permissions
  ]
}
```

### Option 2: Customer Support Portal
Create a separate "Customer Support" page that shows:
- User contact information (read-only)
- Property ownership (read-only)
- Booking history (read-only)
- No editing, no bank details, no deletion

### Option 3: Request System
Ops requests user changes through a ticket system:
- Ops submits request: "Need to update user email"
- Admin approves and makes the change
- Audit trail maintained

## Files Involved

### Modified
1. **`src/lib/rbac/permissions.ts`**
   - Lines 148-158: Ops role definition
   - Removed user permissions from ops

### Already Configured (No Changes Needed)
1. **`src/App.tsx`**
   - Lines 148-156: Route protection with `USERS_VIEW`

2. **`src/components/AppSidebar.tsx`**
   - Line 36: Menu item with `USERS_VIEW` permission

3. **`src/components/rbac/ProtectedRoute.tsx`**
   - Permission checking logic

4. **`src/hooks/usePermissions.ts`**
   - Permission evaluation hook

## Permission Hierarchy

```
┌─────────────────────────────────────────┐
│              ADMIN                      │
│  ✅ Full User Management                │
│  ✅ Create/Edit/Delete Users            │
│  ✅ Change Roles                        │
│  ✅ View All User Data                  │
│  ✅ Financial Information               │
└─────────────────────────────────────────┘
                 │
                 │ Delegates work but not user access
                 ▼
┌─────────────────────────────────────────┐
│               OPS                       │
│  ❌ No User Management                  │
│  ✅ Properties Management               │
│  ✅ Jobs Management                     │
│  ✅ Bookings Management                 │
│  ✅ Issues & Photos                     │
│  ✅ Todos Management                    │
└─────────────────────────────────────────┘
```

## Implementation Status

✅ **Complete and Active**

Ops users now have **NO access** to user management:
- Sidebar link hidden
- Route protected
- All CRUD operations restricted to admins

## Rollback (If Needed Later)

To give ops full user access again:

1. Edit `src/lib/rbac/permissions.ts` line 151
2. Add before line 152:
   ```typescript
   PERMISSIONS.USERS_VIEW,
   PERMISSIONS.USERS_CREATE,
   PERMISSIONS.USERS_EDIT,
   PERMISSIONS.USERS_DELETE,
   ```
3. Save and refresh browser

## Notes

- Changes take effect **immediately** after saving `permissions.ts`
- Users may need to **refresh browser** to see changes
- No database migrations required
- No API changes required
- Completely frontend permission control

---

**User Management is now restricted to Admin users only for security and compliance.**
