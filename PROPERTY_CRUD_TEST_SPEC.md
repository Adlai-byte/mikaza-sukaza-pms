# Property Management CRUD - Comprehensive Test Specification

## Test Environment
- **Application**: Mikaza Sukaza Property Management System
- **URL**: http://localhost:8081
- **Test Date**: 2025-10-16
- **Tester**: Automated Functional Test

## Test Objectives
1. Verify CREATE operation creates properties successfully
2. Verify READ operation displays properties correctly
3. Verify UPDATE operation modifies properties accurately
4. Verify DELETE operation removes properties safely
5. Verify all form validations work correctly
6. Verify data persistence across operations

---

## Test Case 1: CREATE Property - Basic Information
**Priority**: CRITICAL
**Test ID**: TC-CREATE-001

### Pre-conditions:
- User is logged in with admin/ops privileges
- At least one user exists in the system (for owner selection)
- Browser console is open for logging verification

### Test Steps:
1. Navigate to Properties page
2. Click "Add Property" button
3. Verify form opens with all 7 tabs visible
4. Fill in Basic Info tab:
   - Select Property Owner
   - Enter Property Name: "Test Luxury Villa"
   - Select Property Type: "Villa"
   - Toggle Active Property: ON
   - Toggle Booking Available: ON
   - Toggle Pets Allowed: OFF

### Expected Results:
- Form opens successfully
- All required fields are editable
- Validation messages appear for empty required fields
- Console logs show: "🆕 [PropertyForm] Create mode - resetting form to defaults"

### Console Verification:
```
✅ [PropertyForm] Form reset complete
```

---

## Test Case 2: CREATE Property - Location with Map
**Priority**: HIGH
**Test ID**: TC-CREATE-002

### Test Steps:
1. Continue from TC-CREATE-001
2. Navigate to Location tab
3. Click "Select on Map" button
4. Verify map dialog opens
5. Search for address: "Miami, FL"
6. Click on map to select location
7. Verify address fields auto-populate
8. Click "Save Location"
9. Verify coordinates are filled

### Expected Results:
- Map opens in dialog
- Search works correctly
- Clicking map places marker
- Address fields auto-populate
- Coordinates display correctly
- Console shows map interaction logs

---

## Test Case 3: CREATE Property - All Details
**Priority**: HIGH
**Test ID**: TC-CREATE-003

### Test Steps:
1. Continue from TC-CREATE-002
2. Navigate to Details tab
3. Fill in:
   - Size: 2500 sq ft
   - Capacity: 6
   - Max Capacity: 8
   - Bedrooms: 3
   - Bathrooms: 2
   - Half Baths: 1
   - WCs: 0
   - Kitchens: 1
   - Living Rooms: 1

### Expected Results:
- All number fields accept input
- No controlled/uncontrolled component warnings
- Values are stored correctly

---

## Test Case 4: CREATE Property - Communication & Access
**Priority**: MEDIUM
**Test ID**: TC-CREATE-004

### Test Steps:
1. Navigate to Communication tab
2. Fill in:
   - Phone: "+1 (305) 555-0123"
   - WiFi Name: "VillaWiFi2024"
   - WiFi Password: "SecurePass123!"
3. Navigate to Access tab
4. Fill in:
   - Gate Code: "1234#"
   - Door Lock: "5678"
   - Alarm Code: "9999"
   - Storage Number: "A-15"
   - Pool Code: "POOL2024"

### Expected Results:
- All fields accept input
- Password field masks input
- Data is stored in state

---

## Test Case 5: CREATE Property - Features
**Priority**: MEDIUM
**Test ID**: TC-CREATE-005

### Test Steps:
1. Navigate to Features tab
2. Select amenities:
   - Pool
   - WiFi
   - Parking
   - Air Conditioning
3. Select rules:
   - No Smoking
   - No Parties

### Expected Results:
- Checkboxes toggle correctly
- Multiple selections work
- Selected items are highlighted

---

## Test Case 6: CREATE Property - Image Upload
**Priority**: MEDIUM
**Test ID**: TC-CREATE-006

### Test Steps:
1. Navigate to Images tab
2. Click "Upload Profile Image"
3. Select a valid image file (JPG/PNG)
4. Verify image preview appears
5. Enter image title: "Villa Exterior View"

### Expected Results:
- File input accepts images
- Preview displays correctly
- Image title can be edited
- Console shows: "📸 [PropertyForm] Processing images"

---

## Test Case 7: CREATE Property - Submit & Verification
**Priority**: CRITICAL
**Test ID**: TC-CREATE-007

### Test Steps:
1. Review all tabs for completeness
2. Click "Create Property" button
3. Monitor console logs
4. Wait for success toast
5. Verify form closes
6. Verify new property appears in list
7. Check property details in database

### Expected Results:
- Submit button shows loading state
- Console shows complete workflow:
  ```
  🎯 [PropertyForm] handleSubmit called with data
  📸 [PropertyForm] Processing images, count: 1
  ⬆️ [PropertyForm] Uploading new image file
  📦 [PropertyForm] Submitting data
  🏠 [Properties] Creating property
  ✅ [Properties] Property created, refetching list
  ✅ [PropertyForm] Property submission successful
  ```
- Success toast appears
- Form closes automatically
- Property appears in table
- All data is saved correctly

---

## Test Case 8: READ Property - List View
**Priority**: HIGH
**Test ID**: TC-READ-001

### Test Steps:
1. On Properties page, verify properties table loads
2. Check table displays:
   - Property name
   - Property type
   - Owner name
   - Status indicators
   - Action buttons
3. Verify stats cards show correct counts:
   - Total Properties
   - Active Properties
   - Booking Available
   - Pet Friendly

### Expected Results:
- Table loads without errors
- All columns display correctly
- Pagination works (if applicable)
- Stats cards show accurate numbers
- Loading states display appropriately

---

## Test Case 9: READ Property - Details Dialog
**Priority**: HIGH
**Test ID**: TC-READ-002

### Test Steps:
1. Click "View Details" button on a property
2. Verify details dialog opens
3. Check all sections display:
   - Basic information
   - Location details
   - Communication info
   - Access codes
   - Amenities list
   - Rules list
   - Property images

### Expected Results:
- Dialog opens smoothly
- All data displays correctly
- Images load properly
- No missing or null values
- Close button works

---

## Test Case 10: UPDATE Property - Edit Basic Info
**Priority**: CRITICAL
**Test ID**: TC-UPDATE-001

### Test Steps:
1. Click "Edit" button on test property
2. Verify form opens with existing data populated
3. Change Property Name to: "Test Luxury Villa - Updated"
4. Toggle Pets Allowed: ON
5. Click "Update Property"
6. Verify changes are saved

### Expected Results:
- Form populates with existing data
- Console shows: "📝 [PropertyForm] Edit mode - populating form"
- All fields show current values
- Changes save successfully
- Console shows update workflow
- Updated property displays new values

---

## Test Case 11: UPDATE Property - Modify All Tabs
**Priority**: HIGH
**Test ID**: TC-UPDATE-002

### Test Steps:
1. Edit the same property
2. Update Location: Change address
3. Update Details: Change capacity to 10
4. Update Communication: Change WiFi password
5. Update Access: Change gate code
6. Update Features: Add/remove amenities
7. Update Images: Replace property image
8. Submit changes

### Expected Results:
- All tabs update successfully
- No data loss between tabs
- All changes persist
- Image upload works in edit mode
- Console shows complete update workflow

---

## Test Case 12: DELETE Property - Soft Delete
**Priority**: HIGH
**Test ID**: TC-DELETE-001

### Test Steps:
1. Click "Delete" button on test property
2. Verify confirmation dialog appears
3. Click "Cancel" first to test
4. Verify property remains
5. Click "Delete" again
6. Click "Confirm"
7. Verify property is removed from list

### Expected Results:
- Confirmation dialog appears
- Cancel button works
- Delete confirmation executes
- Console shows: "🗑️ [Properties] Deleting property"
- Success toast appears
- Property disappears from list
- List updates automatically

---

## Test Case 13: Form Validation - Required Fields
**Priority**: HIGH
**Test ID**: TC-VALIDATION-001

### Test Steps:
1. Open Add Property form
2. Try to submit without filling required fields
3. Verify validation messages appear:
   - "Owner is required"
   - "Property name is required"
   - "Property type is required"
4. Fill required fields
5. Submit successfully

### Expected Results:
- Form prevents submission when invalid
- Red validation messages appear
- Fields are highlighted in red
- Form submits when all required fields are filled

---

## Test Case 14: Form Validation - Number Fields
**Priority**: MEDIUM
**Test ID**: TC-VALIDATION-002

### Test Steps:
1. Open Add Property form
2. Navigate to Details tab
3. Try entering negative numbers
4. Try entering decimals where integers expected
5. Try entering very large numbers
6. Verify validation handles edge cases

### Expected Results:
- Negative numbers are handled appropriately
- Number parsing works correctly
- No uncontrolled component warnings
- Values store as numbers, not strings

---

## Test Case 15: Data Persistence - Page Reload
**Priority**: HIGH
**Test ID**: TC-PERSISTENCE-001

### Test Steps:
1. Create a property with all fields filled
2. Note property ID
3. Refresh the page
4. Verify property still exists
5. Edit property and change data
6. Refresh page
7. Verify changes persisted

### Expected Results:
- Data survives page reload
- No data loss
- React Query cache works correctly
- Database sync is maintained

---

## Test Case 16: Concurrent Operations
**Priority**: MEDIUM
**Test ID**: TC-CONCURRENT-001

### Test Steps:
1. Open property form
2. Start filling data
3. Open another tab with same app
4. Create property in second tab
5. Complete first tab's property creation
6. Verify both properties exist
7. Check for any conflicts

### Expected Results:
- Both operations complete successfully
- No data corruption
- Cache invalidation works
- Lists update correctly

---

## Test Case 17: Image Upload - Edge Cases
**Priority**: MEDIUM
**Test ID**: TC-IMAGE-001

### Test Steps:
1. Try uploading very large image (>10MB)
2. Try uploading invalid file type (.txt, .pdf)
3. Try uploading multiple images (should restrict to one)
4. Remove image and add new one
5. Submit property with image

### Expected Results:
- Large images are handled (compressed or rejected)
- Invalid types are rejected
- Only one image allowed as per requirement
- Image removal works
- Image upload to Supabase succeeds

---

## Test Case 18: Map Integration - Error Handling
**Priority**: MEDIUM
**Test ID**: TC-MAP-001

### Test Steps:
1. Open property form
2. Click "Select on Map"
3. Try searching for invalid address
4. Try clicking map without internet
5. Cancel map selection
6. Verify coordinates can be entered manually

### Expected Results:
- Invalid searches handled gracefully
- Network errors don't crash app
- Cancel button works
- Manual coordinate entry works
- Validation on coordinate format

---

## Test Case 19: Permissions - RBAC
**Priority**: HIGH
**Test ID**: TC-PERMISSIONS-001

### Test Steps:
1. Log in as admin user
2. Verify all CRUD operations available
3. Log in as ops user
4. Verify appropriate permissions
5. Check permission logs in console

### Expected Results:
- Admin has full access
- Ops user has appropriate restrictions
- Console shows permission checks:
  ```
  🔐 [PERMISSION] Permission check: GRANTED
  ```
- Unauthorized actions are blocked

---

## Test Case 20: Performance - Large Dataset
**Priority**: LOW
**Test ID**: TC-PERFORMANCE-001

### Test Steps:
1. Create 50+ properties
2. Measure list load time
3. Test pagination (if implemented)
4. Test search/filter
5. Monitor memory usage

### Expected Results:
- List loads in <2 seconds
- No memory leaks
- Smooth scrolling
- Efficient rendering
- React Query caching helps performance

---

## Pass/Fail Criteria

### Critical (Must Pass):
- TC-CREATE-001, TC-CREATE-007
- TC-UPDATE-001
- TC-DELETE-001
- TC-READ-001
- TC-VALIDATION-001

### High Priority (Should Pass):
- All other CREATE, READ, UPDATE, DELETE tests
- TC-READ-002
- TC-PERSISTENCE-001
- TC-PERMISSIONS-001

### Medium Priority (Nice to Pass):
- All validation edge cases
- Image upload edge cases
- Concurrent operations
- Map error handling

---

## Test Execution Summary

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| TC-CREATE-001 | Basic Create | ⏳ PENDING | To be executed |
| TC-CREATE-002 | Location Map | ⏳ PENDING | To be executed |
| TC-CREATE-003 | All Details | ⏳ PENDING | To be executed |
| TC-CREATE-004 | Communication | ⏳ PENDING | To be executed |
| TC-CREATE-005 | Features | ⏳ PENDING | To be executed |
| TC-CREATE-006 | Image Upload | ⏳ PENDING | To be executed |
| TC-CREATE-007 | Submit & Verify | ⏳ PENDING | To be executed |
| TC-READ-001 | List View | ⏳ PENDING | To be executed |
| TC-READ-002 | Details Dialog | ⏳ PENDING | To be executed |
| TC-UPDATE-001 | Edit Basic | ⏳ PENDING | To be executed |
| TC-UPDATE-002 | Modify All Tabs | ⏳ PENDING | To be executed |
| TC-DELETE-001 | Soft Delete | ⏳ PENDING | To be executed |
| TC-VALIDATION-001 | Required Fields | ⏳ PENDING | To be executed |
| TC-VALIDATION-002 | Number Fields | ⏳ PENDING | To be executed |
| TC-PERSISTENCE-001 | Page Reload | ⏳ PENDING | To be executed |
| TC-CONCURRENT-001 | Concurrent Ops | ⏳ PENDING | To be executed |
| TC-IMAGE-001 | Image Edge Cases | ⏳ PENDING | To be executed |
| TC-MAP-001 | Map Errors | ⏳ PENDING | To be executed |
| TC-PERMISSIONS-001 | RBAC | ⏳ PENDING | To be executed |
| TC-PERFORMANCE-001 | Large Dataset | ⏳ PENDING | To be executed |

---

## Defects Log

| Defect ID | Test Case | Severity | Description | Status | Resolution |
|-----------|-----------|----------|-------------|--------|------------|
| DEF-001 | | | | | |

---

## Sign-off

**Test Status**: 🟡 IN PROGRESS
**Critical Tests Passed**: 0/5
**High Priority Tests Passed**: 0/8
**All Tests Passed**: 0/20

**Next Steps**:
1. Execute all test cases systematically
2. Log any defects found
3. Fix defects immediately
4. Re-test failed cases
5. Achieve 100% pass rate on critical tests
