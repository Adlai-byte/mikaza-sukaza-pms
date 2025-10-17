# Mikaza-Sukaza PMS - Complete System Test Plan

## Test Information
- **Tester Name**: ___________________________
- **Test Date**: ___________________________
- **Environment**: Production / Staging / Local (Circle one)
- **Application URL**: ___________________________

---

## 1. AUTHENTICATION & USER MANAGEMENT

### 1.1 User Login
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.1.1 | Valid login | 1. Go to login page<br>2. Enter valid email<br>3. Enter valid password<br>4. Click "Sign In" | User successfully logged in and redirected to dashboard | ☐ Pass<br>☐ Fail | |
| 1.1.2 | Invalid password | 1. Enter valid email<br>2. Enter wrong password<br>3. Click "Sign In" | Error message displayed: "Invalid credentials" | ☐ Pass<br>☐ Fail | |
| 1.1.3 | Invalid email | 1. Enter invalid email format<br>2. Enter password<br>3. Click "Sign In" | Error message about invalid email format | ☐ Pass<br>☐ Fail | |
| 1.1.4 | Empty fields | 1. Leave email empty<br>2. Leave password empty<br>3. Click "Sign In" | Validation errors shown for required fields | ☐ Pass<br>☐ Fail | |
| 1.1.5 | Logout | 1. Click user profile/menu<br>2. Click "Logout" | User logged out and redirected to login page | ☐ Pass<br>☐ Fail | |

### 1.2 User Management (Admin Only)
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 1.2.1 | View users list | 1. Navigate to User Management<br>2. Verify users table loads | All users displayed in table with correct data | ☐ Pass<br>☐ Fail | |
| 1.2.2 | Search users | 1. Enter name in search box<br>2. Verify results filter | Only matching users shown | ☐ Pass<br>☐ Fail | |
| 1.2.3 | Filter by user type | 1. Select user type filter (Admin/Owner/Manager/Staff/Provider/Customer)<br>2. Verify results | Only selected user type shown | ☐ Pass<br>☐ Fail | |
| 1.2.4 | Filter by status | 1. Select status filter (Active/Inactive)<br>2. Verify results | Only users with selected status shown | ☐ Pass<br>☐ Fail | |
| 1.2.5 | Create new user | 1. Click "Add User"<br>2. Fill all required fields<br>3. Select user type<br>4. Click "Create" | User created successfully, appears in list | ☐ Pass<br>☐ Fail | |
| 1.2.6 | Edit user | 1. Click Edit on any user<br>2. Modify user details<br>3. Click "Update" | User updated successfully, changes reflected | ☐ Pass<br>☐ Fail | |
| 1.2.7 | Deactivate user | 1. Click Edit on active user<br>2. Toggle "Active" to off<br>3. Click "Update" | User status changed to inactive | ☐ Pass<br>☐ Fail | |
| 1.2.8 | Pagination | 1. Navigate through pages<br>2. Change items per page (10/25/50/100) | Pagination works correctly | ☐ Pass<br>☐ Fail | |

---

## 2. PROPERTY MANAGEMENT

### 2.1 View Properties
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.1.1 | View all properties | 1. Navigate to Properties page<br>2. Verify properties load | All properties displayed in grid/list | ☐ Pass<br>☐ Fail | |
| 2.1.2 | Search properties | 1. Enter property name/address in search<br>2. Verify results | Matching properties displayed | ☐ Pass<br>☐ Fail | |
| 2.1.3 | Filter by status | 1. Select status filter (Available/Occupied/Maintenance)<br>2. Verify results | Only properties with selected status shown | ☐ Pass<br>☐ Fail | |
| 2.1.4 | View property details | 1. Click on any property card<br>2. Verify details page loads | Property details, images, and info displayed | ☐ Pass<br>☐ Fail | |

### 2.2 Create Property
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.2.1 | Create basic property | 1. Click "Add Property"<br>2. Fill required fields (name, address, type)<br>3. Click "Create" | Property created successfully | ☐ Pass<br>☐ Fail | |
| 2.2.2 | Create with all fields | 1. Fill all optional fields<br>2. Add bedrooms, bathrooms, sqft<br>3. Set rental price<br>4. Click "Create" | Property created with all details | ☐ Pass<br>☐ Fail | |
| 2.2.3 | Validation - empty required fields | 1. Leave required fields empty<br>2. Try to submit | Validation errors shown | ☐ Pass<br>☐ Fail | |
| 2.2.4 | Upload property images | 1. Click upload area<br>2. Select multiple images<br>3. Verify upload | Images uploaded and displayed | ☐ Pass<br>☐ Fail | |

### 2.3 Edit Property
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.3.1 | Edit general info | 1. Open property edit page<br>2. Go to General tab<br>3. Modify fields<br>4. Click "Save" | Changes saved successfully | ☐ Pass<br>☐ Fail | |
| 2.3.2 | Edit amenities | 1. Go to Amenities tab<br>2. Add/remove amenities<br>3. Click "Save" | Amenities updated | ☐ Pass<br>☐ Fail | |
| 2.3.3 | Edit financial info | 1. Go to Financial tab<br>2. Update rent, deposit, fees<br>3. Click "Save" | Financial data updated | ☐ Pass<br>☐ Fail | |
| 2.3.4 | Manage images | 1. Go to Media tab<br>2. Add new images<br>3. Delete existing images<br>4. Reorder images | Image management works correctly | ☐ Pass<br>☐ Fail | |

### 2.4 Property Providers
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.4.1 | View assigned providers | 1. Open property edit<br>2. Go to Providers tab<br>3. View utility providers<br>4. View service contractors | All assigned providers displayed | ☐ Pass<br>☐ Fail | |
| 2.4.2 | Assign utility provider | 1. Click "Assign Utility Provider"<br>2. Select provider<br>3. Enter account number<br>4. Click "Assign" | Provider assigned to property | ☐ Pass<br>☐ Fail | |
| 2.4.3 | Assign service contractor | 1. Click "Assign Service Contractor"<br>2. Select contractor<br>3. Enter contract details<br>4. Click "Assign" | Contractor assigned to property | ☐ Pass<br>☐ Fail | |
| 2.4.4 | Edit provider assignment | 1. Click Edit on assigned provider<br>2. Modify details<br>3. Click "Update" | Assignment details updated | ☐ Pass<br>☐ Fail | |
| 2.4.5 | Unassign provider | 1. Click menu on assigned provider<br>2. Click "Unassign"<br>3. Confirm | Provider removed from property | ☐ Pass<br>☐ Fail | |

### 2.5 Delete Property
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 2.5.1 | Delete property | 1. Click Delete on property<br>2. Confirm deletion | Property deleted from list | ☐ Pass<br>☐ Fail | |

---

## 3. PROVIDERS MANAGEMENT

### 3.1 Utility Providers
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.1.1 | View utility providers | 1. Navigate to Providers page<br>2. Click "Utility Providers" tab | List of utility providers displayed | ☐ Pass<br>☐ Fail | |
| 3.1.2 | Search utility providers | 1. Enter provider name in search<br>2. Verify results | Matching providers shown | ☐ Pass<br>☐ Fail | |
| 3.1.3 | Filter by utility type | 1. Select type (Electric/Internet/Gas/Water/etc.)<br>2. Verify results | Only selected type shown | ☐ Pass<br>☐ Fail | |
| 3.1.4 | Filter by status | 1. Select Active/Inactive<br>2. Verify results | Only selected status shown | ☐ Pass<br>☐ Fail | |
| 3.1.5 | Create utility provider | 1. Click "Add Utility Provider"<br>2. Fill provider name (required)<br>3. Select utility type<br>4. Enter email, phone<br>5. Enter customer service hours<br>6. Enter emergency contact/phone<br>7. Click "Create" | Provider created successfully | ☐ Pass<br>☐ Fail | |
| 3.1.6 | Create with address | 1. Fill basic info<br>2. Fill address fields (street, city, state, ZIP)<br>3. Add notes<br>4. Click "Create" | Provider created with address | ☐ Pass<br>☐ Fail | |
| 3.1.7 | Edit utility provider | 1. Click Edit on provider<br>2. Modify details<br>3. Click "Update" | Provider updated successfully | ☐ Pass<br>☐ Fail | |
| 3.1.8 | Deactivate provider | 1. Click Edit<br>2. Toggle "Active" to off<br>3. Click "Update" | Provider status changed to inactive | ☐ Pass<br>☐ Fail | |
| 3.1.9 | Delete utility provider | 1. Click menu (3 dots)<br>2. Click "Delete"<br>3. Confirm | Provider deleted from list | ☐ Pass<br>☐ Fail | |
| 3.1.10 | Export to CSV | 1. Click "Export" button<br>2. Verify download | CSV file downloaded with provider data | ☐ Pass<br>☐ Fail | |
| 3.1.11 | Pagination | 1. Navigate pages<br>2. Change items per page | Pagination works correctly | ☐ Pass<br>☐ Fail | |

### 3.2 Service Contractors
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 3.2.1 | View service contractors | 1. Navigate to Providers page<br>2. Click "Service Contractors" tab | List of contractors displayed | ☐ Pass<br>☐ Fail | |
| 3.2.2 | Search contractors | 1. Enter contractor name in search<br>2. Verify results | Matching contractors shown | ☐ Pass<br>☐ Fail | |
| 3.2.3 | Filter by service type | 1. Select type (Plumber/Electrician/HVAC/etc.)<br>2. Verify results | Only selected type shown | ☐ Pass<br>☐ Fail | |
| 3.2.4 | Filter by status | 1. Select Active/Inactive<br>2. Verify results | Only selected status shown | ☐ Pass<br>☐ Fail | |
| 3.2.5 | Create service contractor | 1. Click "Add Service Contractor"<br>2. Fill provider name (required)<br>3. Select service type<br>4. Enter contact info<br>5. Enter license number<br>6. Enter insurance expiry<br>7. Click "Create" | Contractor created successfully | ☐ Pass<br>☐ Fail | |
| 3.2.6 | Edit contractor | 1. Click Edit on contractor<br>2. Modify details<br>3. Click "Update" | Contractor updated successfully | ☐ Pass<br>☐ Fail | |
| 3.2.7 | Delete contractor | 1. Click menu (3 dots)<br>2. Click "Delete"<br>3. Confirm | Contractor deleted from list | ☐ Pass<br>☐ Fail | |
| 3.2.8 | View contractor details | 1. Click "View Details" on contractor<br>2. Verify modal opens | Details displayed correctly | ☐ Pass<br>☐ Fail | |
| 3.2.9 | Export to CSV | 1. Click "Export" button<br>2. Verify download | CSV file downloaded with contractor data | ☐ Pass<br>☐ Fail | |

---

## 4. BOOKING MANAGEMENT

### 4.1 View Bookings
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.1.1 | View all bookings | 1. Navigate to Bookings page<br>2. Verify bookings table loads | All bookings displayed | ☐ Pass<br>☐ Fail | |
| 4.1.2 | Search bookings | 1. Enter guest name or property name<br>2. Verify results | Matching bookings shown | ☐ Pass<br>☐ Fail | |
| 4.1.3 | Filter by status | 1. Select status (Pending/Confirmed/Cancelled/Completed)<br>2. Verify results | Only selected status shown | ☐ Pass<br>☐ Fail | |
| 4.1.4 | Filter by date range | 1. Select start date<br>2. Select end date<br>3. Verify results | Only bookings in date range shown | ☐ Pass<br>☐ Fail | |
| 4.1.5 | Sort by column | 1. Click column header to sort<br>2. Verify sorting | Data sorted correctly | ☐ Pass<br>☐ Fail | |

### 4.2 Create Booking
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.2.1 | Create basic booking | 1. Click "Create Booking"<br>2. Select property<br>3. Enter guest name (required)<br>4. Enter guest email (required)<br>5. Select check-in date (required)<br>6. Select check-out date (required)<br>7. Enter number of guests (required)<br>8. Click "Create" | Booking created successfully | ☐ Pass<br>☐ Fail | |
| 4.2.2 | Create with all fields | 1. Fill basic fields<br>2. Enter guest phone<br>3. Enter payment amount<br>4. Select payment status<br>5. Add special requests<br>6. Click "Create" | Booking created with all details | ☐ Pass<br>☐ Fail | |
| 4.2.3 | Validation - required fields | 1. Leave required fields empty<br>2. Try to submit | Validation errors shown for each required field | ☐ Pass<br>☐ Fail | |
| 4.2.4 | Validation - invalid email | 1. Enter invalid email format<br>2. Try to submit | Email validation error shown | ☐ Pass<br>☐ Fail | |
| 4.2.5 | Validation - date range | 1. Select check-out before check-in<br>2. Try to submit | Date validation error shown | ☐ Pass<br>☐ Fail | |
| 4.2.6 | Validation - negative amounts | 1. Enter negative payment amount<br>2. Try to submit | Validation error for negative amount | ☐ Pass<br>☐ Fail | |
| 4.2.7 | Validation - zero guests | 1. Enter 0 for number of guests<br>2. Try to submit | Validation error for zero guests | ☐ Pass<br>☐ Fail | |
| 4.2.8 | Auto-calculate nights | 1. Select check-in date<br>2. Select check-out date<br>3. Verify nights calculated | Number of nights displayed correctly | ☐ Pass<br>☐ Fail | |

### 4.3 Edit Booking
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.3.1 | Edit booking details | 1. Click Edit on booking<br>2. Modify guest info<br>3. Click "Update" | Booking updated successfully | ☐ Pass<br>☐ Fail | |
| 4.3.2 | Change dates | 1. Click Edit<br>2. Change check-in/check-out dates<br>3. Click "Update" | Dates updated, nights recalculated | ☐ Pass<br>☐ Fail | |
| 4.3.3 | Update payment | 1. Click Edit<br>2. Update payment amount<br>3. Change payment status<br>4. Click "Update" | Payment info updated | ☐ Pass<br>☐ Fail | |
| 4.3.4 | Edit form pre-filled | 1. Click Edit on booking<br>2. Verify all fields populated | Form shows current booking data | ☐ Pass<br>☐ Fail | |

### 4.4 Booking Status Management
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.4.1 | Change to Confirmed | 1. Select Pending booking<br>2. Change status to Confirmed<br>3. Save | Status changed to Confirmed | ☐ Pass<br>☐ Fail | |
| 4.4.2 | Change to Cancelled | 1. Select booking<br>2. Change status to Cancelled<br>3. Save | Status changed to Cancelled | ☐ Pass<br>☐ Fail | |
| 4.4.3 | Change to Completed | 1. Select Confirmed booking<br>2. Change status to Completed<br>3. Save | Status changed to Completed | ☐ Pass<br>☐ Fail | |

### 4.5 Delete Booking
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 4.5.1 | Delete booking | 1. Click Delete on booking<br>2. Confirm deletion | Booking removed from list | ☐ Pass<br>☐ Fail | |

---

## 5. DASHBOARD & REPORTING

### 5.1 Dashboard
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 5.1.1 | View dashboard | 1. Login and land on dashboard<br>2. Verify widgets load | Dashboard displays with all widgets | ☐ Pass<br>☐ Fail | |
| 5.1.2 | Statistics cards | 1. Verify total properties count<br>2. Verify total bookings count<br>3. Verify revenue figures | All statistics display correctly | ☐ Pass<br>☐ Fail | |
| 5.1.3 | Recent activities | 1. Check recent activities list<br>2. Verify timestamps | Recent activities displayed | ☐ Pass<br>☐ Fail | |
| 5.1.4 | Charts/graphs | 1. Verify booking trends chart<br>2. Verify occupancy chart | Charts display data correctly | ☐ Pass<br>☐ Fail | |

---

## 6. PERMISSIONS & ACCESS CONTROL

### 6.1 Admin Permissions
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.1.1 | Full system access | 1. Login as Admin<br>2. Navigate to all modules | Admin can access all features | ☐ Pass<br>☐ Fail | |
| 6.1.2 | User management access | 1. Login as Admin<br>2. Go to User Management | Can view, create, edit, delete users | ☐ Pass<br>☐ Fail | |

### 6.2 Staff Permissions
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.2.1 | Limited access | 1. Login as Staff<br>2. Try to access User Management | Cannot access restricted areas | ☐ Pass<br>☐ Fail | |
| 6.2.2 | Booking management | 1. Login as Staff<br>2. Go to Bookings | Can view and manage bookings | ☐ Pass<br>☐ Fail | |

### 6.3 Manager Permissions
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 6.3.1 | Property access | 1. Login as Manager<br>2. Access Properties | Can manage properties | ☐ Pass<br>☐ Fail | |
| 6.3.2 | Reports access | 1. Login as Manager<br>2. Access Reports | Can view and generate reports | ☐ Pass<br>☐ Fail | |

---

## 7. UI/UX & RESPONSIVENESS

### 7.1 Desktop View (1920x1080)
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.1.1 | Layout | 1. Open app in desktop browser<br>2. Check all pages | Layout displays correctly | ☐ Pass<br>☐ Fail | |
| 7.1.2 | Tables | 1. View tables on all pages<br>2. Check column widths | Tables display properly without horizontal scroll | ☐ Pass<br>☐ Fail | |
| 7.1.3 | Forms | 1. Open various forms<br>2. Check field layouts | Forms well-organized and readable | ☐ Pass<br>☐ Fail | |

### 7.2 Tablet View (768px)
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.2.1 | Layout adaptation | 1. Resize browser to tablet size<br>2. Check all pages | Layout adapts to tablet view | ☐ Pass<br>☐ Fail | |
| 7.2.2 | Navigation | 1. Check sidebar/menu<br>2. Navigate pages | Navigation works on tablet | ☐ Pass<br>☐ Fail | |

### 7.3 Mobile View (375px)
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.3.1 | Layout adaptation | 1. Resize to mobile size<br>2. Check all pages | Layout adapts to mobile view | ☐ Pass<br>☐ Fail | |
| 7.3.2 | Tables to cards | 1. View tables on mobile<br>2. Verify card layout | Tables display as cards on mobile | ☐ Pass<br>☐ Fail | |
| 7.3.3 | Forms | 1. Open forms on mobile<br>2. Check usability | Forms stack vertically and usable | ☐ Pass<br>☐ Fail | |
| 7.3.4 | Touch targets | 1. Try clicking buttons/links<br>2. Check spacing | All interactive elements easily tappable | ☐ Pass<br>☐ Fail | |

### 7.4 Loading States
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.4.1 | Table loading | 1. Navigate to pages with tables<br>2. Observe loading | Loading spinner/skeleton shown | ☐ Pass<br>☐ Fail | |
| 7.4.2 | Form submission | 1. Submit any form<br>2. Observe button state | Button shows loading state during submit | ☐ Pass<br>☐ Fail | |

### 7.5 Error Messages
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 7.5.1 | Validation errors | 1. Submit forms with errors<br>2. Check error display | Clear error messages displayed | ☐ Pass<br>☐ Fail | |
| 7.5.2 | Toast notifications | 1. Perform success/error actions<br>2. Check toasts | Toast notifications appear and disappear | ☐ Pass<br>☐ Fail | |

---

## 8. DATA INTEGRITY

### 8.1 Data Persistence
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 8.1.1 | Create and refresh | 1. Create new record<br>2. Refresh page<br>3. Verify record exists | Data persists after refresh | ☐ Pass<br>☐ Fail | |
| 8.1.2 | Edit and refresh | 1. Edit record<br>2. Refresh page<br>3. Verify changes saved | Changes persist after refresh | ☐ Pass<br>☐ Fail | |
| 8.1.3 | Delete and refresh | 1. Delete record<br>2. Refresh page<br>3. Verify deletion | Deletion persists after refresh | ☐ Pass<br>☐ Fail | |

### 8.2 Relationships
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 8.2.1 | Property-Booking link | 1. Create booking for property<br>2. View property details<br>3. Check bookings list | Booking appears under property | ☐ Pass<br>☐ Fail | |
| 8.2.2 | Property-Provider link | 1. Assign provider to property<br>2. View property providers<br>3. Check assignment | Provider appears in property's list | ☐ Pass<br>☐ Fail | |

---

## 9. PERFORMANCE

### 9.1 Load Times
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 9.1.1 | Initial page load | 1. Clear cache<br>2. Load application<br>3. Measure time | Page loads within 3 seconds | ☐ Pass<br>☐ Fail | Time: ___s |
| 9.1.2 | Page navigation | 1. Navigate between pages<br>2. Measure transition time | Page transitions smooth (< 1s) | ☐ Pass<br>☐ Fail | Time: ___s |
| 9.1.3 | Table loading | 1. Load page with large table<br>2. Measure load time | Table loads within 2 seconds | ☐ Pass<br>☐ Fail | Time: ___s |

### 9.2 Large Data Sets
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 9.2.1 | 100+ properties | 1. Load properties page<br>2. Check performance | Pagination handles large data smoothly | ☐ Pass<br>☐ Fail | |
| 9.2.2 | 500+ bookings | 1. Load bookings page<br>2. Check performance | Table handles large data without lag | ☐ Pass<br>☐ Fail | |

---

## 10. BROWSER COMPATIBILITY

### 10.1 Chrome
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 10.1.1 | Full functionality | 1. Open in Chrome<br>2. Test all features | All features work correctly | ☐ Pass<br>☐ Fail | Version: ___ |

### 10.2 Firefox
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 10.2.1 | Full functionality | 1. Open in Firefox<br>2. Test all features | All features work correctly | ☐ Pass<br>☐ Fail | Version: ___ |

### 10.3 Safari
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 10.3.1 | Full functionality | 1. Open in Safari<br>2. Test all features | All features work correctly | ☐ Pass<br>☐ Fail | Version: ___ |

### 10.4 Edge
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 10.4.1 | Full functionality | 1. Open in Edge<br>2. Test all features | All features work correctly | ☐ Pass<br>☐ Fail | Version: ___ |

---

## 11. EDGE CASES & ERROR HANDLING

### 11.1 Network Issues
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 11.1.1 | Offline mode | 1. Disconnect internet<br>2. Try to perform actions | Appropriate error message shown | ☐ Pass<br>☐ Fail | |
| 11.1.2 | Slow connection | 1. Throttle network to 3G<br>2. Perform actions | Loading states shown, no crashes | ☐ Pass<br>☐ Fail | |

### 11.2 Special Characters
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 11.2.1 | Special chars in text | 1. Enter special characters (@#$%^&*)<br>2. Save | Special characters handled correctly | ☐ Pass<br>☐ Fail | |
| 11.2.2 | Emoji in text | 1. Enter emoji in text fields<br>2. Save | Emoji saved and displayed correctly | ☐ Pass<br>☐ Fail | |

### 11.3 Boundary Values
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 11.3.1 | Very long text | 1. Enter 1000+ characters in text field<br>2. Save | System handles or limits long text | ☐ Pass<br>☐ Fail | |
| 11.3.2 | Large numbers | 1. Enter very large numbers<br>2. Save | System validates/limits large numbers | ☐ Pass<br>☐ Fail | |

---

## 12. SECURITY

### 12.1 Authentication
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 12.1.1 | Session timeout | 1. Login<br>2. Wait for session timeout<br>3. Try to perform action | User redirected to login | ☐ Pass<br>☐ Fail | |
| 12.1.2 | Unauthorized access | 1. Logout<br>2. Try to access protected URLs directly | Redirected to login page | ☐ Pass<br>☐ Fail | |

### 12.2 Data Protection
| # | Test Case | Steps | Expected Result | Status | Notes |
|---|-----------|-------|-----------------|--------|-------|
| 12.2.1 | Password visibility | 1. Check password fields<br>2. Verify masking | Passwords masked by default | ☐ Pass<br>☐ Fail | |
| 12.2.2 | XSS protection | 1. Enter script tags in fields<br>2. Save and view | Scripts not executed, displayed as text | ☐ Pass<br>☐ Fail | |

---

## TEST SUMMARY

### Overall Statistics
- **Total Test Cases**: 161
- **Tests Passed**: _______
- **Tests Failed**: _______
- **Pass Rate**: _______%

### Critical Issues Found
| # | Module | Issue Description | Severity | Status |
|---|--------|-------------------|----------|--------|
| 1 | | | High/Medium/Low | Open/Fixed |
| 2 | | | High/Medium/Low | Open/Fixed |
| 3 | | | High/Medium/Low | Open/Fixed |

### Recommendations
1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

### Sign-off
- **Tested By**: ___________________________
- **Signature**: ___________________________
- **Date**: ___________________________
- **Approved By**: ___________________________
- **Date**: ___________________________

---

## NOTES
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________
