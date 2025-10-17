# Mikaza-Sukaza PMS - Quick Test Checklist

**Tester**: _________________ | **Date**: _________________ | **Environment**: _________________

---

## ✅ AUTHENTICATION (5 tests)
- [ ] **Login with valid credentials** - User logged in successfully
- [ ] **Login with invalid password** - Error message shown
- [ ] **Login with invalid email** - Validation error shown
- [ ] **Login with empty fields** - Required field errors shown
- [ ] **Logout** - User logged out, redirected to login

---

## ✅ USER MANAGEMENT (8 tests)
- [ ] **View users list** - All users displayed in table
- [ ] **Search users** - Search filters results correctly
- [ ] **Filter by user type** - Filter works (Admin/Owner/Manager/Staff/Provider/Customer)
- [ ] **Filter by status** - Filter works (Active/Inactive)
- [ ] **Create new user** - User created successfully
- [ ] **Edit user** - User updated, changes reflected
- [ ] **Deactivate user** - Status changed to inactive
- [ ] **Pagination** - Navigate pages, change items per page works

---

## ✅ PROPERTIES (16 tests)

### Viewing (4)
- [ ] **View all properties** - Properties grid/list displayed
- [ ] **Search properties** - Search by name/address works
- [ ] **Filter by status** - Available/Occupied/Maintenance filter works
- [ ] **View property details** - Details page shows all info

### Creating (4)
- [ ] **Create basic property** - Required fields only, property created
- [ ] **Create with all fields** - All fields filled, property created
- [ ] **Required field validation** - Errors shown for empty required fields
- [ ] **Upload images** - Multiple images uploaded successfully

### Editing (4)
- [ ] **Edit general info** - Changes saved successfully
- [ ] **Edit amenities** - Amenities updated
- [ ] **Edit financial info** - Rent, deposit, fees updated
- [ ] **Manage images** - Add, delete, reorder images works

### Providers (4)
- [ ] **View assigned providers** - Utility & service providers shown
- [ ] **Assign utility provider** - Provider assigned with account number
- [ ] **Assign service contractor** - Contractor assigned with details
- [ ] **Unassign provider** - Provider removed from property

---

## ✅ UTILITY PROVIDERS (11 tests)
- [ ] **View utility providers list** - Table displayed with all providers
- [ ] **Search providers** - Search by name works
- [ ] **Filter by utility type** - Electric/Internet/Gas/Water/etc. filter works
- [ ] **Filter by status** - Active/Inactive filter works
- [ ] **Create utility provider (basic)** - Name, type, contact info - created
- [ ] **Create with address** - All fields including address - created
- [ ] **Edit utility provider** - Changes saved successfully
- [ ] **Deactivate provider** - Status changed to inactive
- [ ] **Delete provider** - Provider removed from list
- [ ] **Export to CSV** - CSV file downloaded with data
- [ ] **Pagination** - Navigate pages, change items per page works

---

## ✅ SERVICE CONTRACTORS (9 tests)
- [ ] **View contractors list** - Table displayed with all contractors
- [ ] **Search contractors** - Search by name works
- [ ] **Filter by service type** - Plumber/Electrician/HVAC/etc. filter works
- [ ] **Filter by status** - Active/Inactive filter works
- [ ] **Create service contractor** - Name, type, license, insurance - created
- [ ] **Edit contractor** - Changes saved successfully
- [ ] **Delete contractor** - Contractor removed from list
- [ ] **View contractor details** - Details modal displayed
- [ ] **Export to CSV** - CSV file downloaded with data

---

## ✅ BOOKINGS (20 tests)

### Viewing (5)
- [ ] **View all bookings** - Bookings table displayed
- [ ] **Search bookings** - Search by guest/property works
- [ ] **Filter by status** - Pending/Confirmed/Cancelled/Completed works
- [ ] **Filter by date range** - Date range filter works
- [ ] **Sort by column** - Column sorting works

### Creating (8)
- [ ] **Create basic booking** - Required fields only - booking created
- [ ] **Create with all fields** - All fields filled - booking created
- [ ] **Required fields validation** - Errors shown for empty required fields
- [ ] **Invalid email validation** - Email format error shown
- [ ] **Date range validation** - Check-out before check-in error shown
- [ ] **Negative amount validation** - Negative payment error shown
- [ ] **Zero guests validation** - Zero guests error shown
- [ ] **Auto-calculate nights** - Nights calculated from dates

### Editing (4)
- [ ] **Edit booking details** - Changes saved successfully
- [ ] **Change dates** - Dates updated, nights recalculated
- [ ] **Update payment** - Payment info updated
- [ ] **Edit form pre-filled** - Form shows current booking data

### Status (3)
- [ ] **Change to Confirmed** - Status changed from Pending
- [ ] **Change to Cancelled** - Status changed to Cancelled
- [ ] **Change to Completed** - Status changed to Completed

---

## ✅ DASHBOARD (4 tests)
- [ ] **View dashboard widgets** - All widgets displayed
- [ ] **Statistics cards** - Properties, bookings, revenue shown correctly
- [ ] **Recent activities** - Activities list with timestamps displayed
- [ ] **Charts/graphs** - Booking trends, occupancy charts display

---

## ✅ PERMISSIONS (6 tests)
- [ ] **Admin full access** - Can access all modules
- [ ] **Admin user management** - Can create, edit, delete users
- [ ] **Staff limited access** - Cannot access restricted areas
- [ ] **Staff booking access** - Can view and manage bookings
- [ ] **Manager property access** - Can manage properties
- [ ] **Manager reports access** - Can view and generate reports

---

## ✅ UI/UX & RESPONSIVENESS (14 tests)

### Desktop (3)
- [ ] **Desktop layout (1920x1080)** - All pages display correctly
- [ ] **Tables display** - No horizontal scroll, columns fit
- [ ] **Forms display** - Forms well-organized and readable

### Tablet (2)
- [ ] **Tablet layout (768px)** - Layout adapts to tablet
- [ ] **Tablet navigation** - Sidebar/menu works properly

### Mobile (4)
- [ ] **Mobile layout (375px)** - Layout adapts to mobile
- [ ] **Tables to cards** - Tables become cards on mobile
- [ ] **Forms usability** - Forms stack vertically, usable
- [ ] **Touch targets** - Buttons/links easily tappable

### States (5)
- [ ] **Table loading states** - Spinner/skeleton shown
- [ ] **Form submission loading** - Button shows loading state
- [ ] **Validation errors** - Clear error messages displayed
- [ ] **Toast notifications** - Success/error toasts appear
- [ ] **Empty states** - Appropriate message when no data

---

## ✅ DATA INTEGRITY (5 tests)
- [ ] **Create and refresh** - New record persists after page refresh
- [ ] **Edit and refresh** - Edited changes persist after refresh
- [ ] **Delete and refresh** - Deletion persists after refresh
- [ ] **Property-Booking link** - Bookings appear under property
- [ ] **Property-Provider link** - Providers appear under property

---

## ✅ PERFORMANCE (5 tests)
- [ ] **Initial page load** - Loads within 3 seconds | Time: ____s
- [ ] **Page navigation** - Transitions smooth (< 1s) | Time: ____s
- [ ] **Table loading** - Loads within 2 seconds | Time: ____s
- [ ] **100+ properties** - Pagination handles large data smoothly
- [ ] **500+ bookings** - Table handles large data without lag

---

## ✅ BROWSER COMPATIBILITY (4 tests)
- [ ] **Chrome** - All features work | Version: ________
- [ ] **Firefox** - All features work | Version: ________
- [ ] **Safari** - All features work | Version: ________
- [ ] **Edge** - All features work | Version: ________

---

## ✅ EDGE CASES (6 tests)
- [ ] **Offline mode** - Appropriate error message shown
- [ ] **Slow connection (3G)** - Loading states shown, no crashes
- [ ] **Special characters (@#$%)** - Handled correctly
- [ ] **Emoji in text** - Saved and displayed correctly
- [ ] **Very long text (1000+ chars)** - System handles or limits
- [ ] **Large numbers** - System validates or limits

---

## ✅ SECURITY (4 tests)
- [ ] **Session timeout** - User redirected to login after timeout
- [ ] **Unauthorized URL access** - Redirected to login when logged out
- [ ] **Password masking** - Passwords hidden by default
- [ ] **XSS protection** - Script tags not executed, shown as text

---

## 📊 SUMMARY

**Total Tests**: 122
**Passed**: _______
**Failed**: _______
**Pass Rate**: _______%

---

## 🐛 CRITICAL ISSUES FOUND

| # | Module | Description | Severity |
|---|--------|-------------|----------|
| 1 |        |             | High/Med/Low |
| 2 |        |             | High/Med/Low |
| 3 |        |             | High/Med/Low |

---

## 📝 NOTES
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________
____________________________________________________________________

---

## ✍️ SIGN-OFF
**Tested By**: _________________________ **Date**: _________________
**Approved By**: _______________________ **Date**: _________________
