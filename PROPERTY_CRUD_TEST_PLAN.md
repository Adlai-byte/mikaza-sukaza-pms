# Property Management - Comprehensive CRUD Test Plan

**Test Date:** 2025-10-04
**Tester:** _______________
**Environment:** Development (http://localhost:8084)
**Status:** 🔄 In Progress

---

## 🎯 Test Objectives

1. ✅ Verify all CRUD operations work correctly
2. ✅ Ensure all fields in all 10 tabs save properly
3. ✅ Validate data integrity across related tables
4. ✅ Confirm performance improvements
5. ✅ Check error handling and validation

---

## 📊 Test Coverage Summary

| Operation | Tabs to Test | Fields Count | Status |
|-----------|--------------|--------------|--------|
| CREATE | All 10 | 50+ | ⏳ Pending |
| READ | List View | 15 | ⏳ Pending |
| UPDATE | All 10 | 50+ | ⏳ Pending |
| DELETE | N/A | N/A | ⏳ Pending |

---

## 🔴 TEST 1: CREATE Property (Complete Flow)

### Prerequisites
- [ ] Logged in as admin user
- [ ] At least one user exists as owner
- [ ] Amenities exist in database
- [ ] Rules exist in database

### Steps

1. **Navigate to Properties page**
   - URL: http://localhost:8084/properties
   - Click "Add Property" button

2. **Fill Basic Information** (General Tab)
   ```
   Property Name: Test Property - [Timestamp]
   Property Type: Apartment
   Owner: [Select existing user]
   ```

3. **Property Details**
   ```
   ☑️ Is Active
   ☑️ Is Booking Available
   ☐ Pets Allowed

   Capacity: 4
   Max Capacity: 6
   Size (sqft): 1200
   Bedrooms: 2
   Bathrooms: 2
   Half Baths: 1
   WCs: 0
   Kitchens: 1
   Living Rooms: 1
   ```

4. **Location Information**
   ```
   Address: 123 Test Street, Unit 4B
   City: Miami
   State: FL
   Postal Code: 33101
   Latitude: 25.7617
   Longitude: -80.1918
   ```

5. **Communication Details**
   ```
   Phone: (305) 555-0123
   WiFi Name: TestApartment_5G
   WiFi Password: TestPass123!
   ```

6. **Access Codes**
   ```
   Gate Code: #1234
   Door Lock Password: 5678
   Alarm Passcode: 9012
   ```

7. **Extras**
   ```
   Storage Number: S-42
   Storage Code: 3456
   Front Desk: (305) 555-0199
   Garage Number: G-15
   Mailing Box: 4B
   Pool Access Code: POOL2024
   ```

8. **Amenities** (Select multiple)
   ```
   ☑️ Pool
   ☑️ Gym
   ☑️ Parking
   ☑️ WiFi
   ☑️ Air Conditioning
   ```

9. **Rules** (Select multiple)
   ```
   ☑️ No Smoking
   ☑️ Quiet Hours
   ☑️ Check-in/Check-out Times
   ```

10. **Submit**
    - Click "Create Property"
    - Wait for success toast
    - Note the property ID created

### Expected Results
- ✅ Property appears in list immediately (optimistic update)
- ✅ Success toast: "Property created successfully"
- ✅ Activity log created
- ✅ All fields saved correctly
- ✅ Redirected to properties list

### Verification Steps
```sql
-- Run in Supabase SQL Editor
SELECT
  p.*,
  pl.*,
  pc.*,
  pa.*,
  pe.*
FROM properties p
LEFT JOIN property_location pl ON p.property_id = pl.property_id
LEFT JOIN property_communication pc ON p.property_id = pc.property_id
LEFT JOIN property_access pa ON p.property_id = pa.property_id
LEFT JOIN property_extras pe ON p.property_id = pe.property_id
WHERE p.property_name LIKE 'Test Property%'
ORDER BY p.created_at DESC
LIMIT 1;
```

### Test Results
- [ ] **PASS** - All data saved correctly
- [ ] **FAIL** - Issues found: _______________

**Notes:** _______________________________________________

---

## 🟢 TEST 2: READ/LIST Properties

### Test 2A: Property List Display

**Steps:**
1. Navigate to `/properties`
2. Observe initial load time
3. Check browser console for query logs

**Expected Console Logs:**
```
🔍 Fetching properties list (optimized query)...
✅ Fetched properties list: X properties (lightweight)
```

**Verify Display:**
- [ ] Property image/placeholder shown
- [ ] Property name displayed
- [ ] Property type shown
- [ ] Owner name and email visible
- [ ] Location (city, address) displayed
- [ ] Status badges (Active/Inactive, Booking, Pet Friendly)
- [ ] Capacity and size shown
- [ ] Action buttons (View, Images, Edit, Delete) visible

**Performance:**
- Initial load time: _______ seconds
- Expected: < 2 seconds
- [ ] **PASS** / [ ] **FAIL**

---

### Test 2B: Search Functionality

**Test Cases:**

1. **Search by Property Name**
   - Input: "Test Property"
   - Expected: Shows matching properties
   - Result: [ ] PASS / [ ] FAIL

2. **Search by Property Type**
   - Input: "Apartment"
   - Expected: Shows all apartments
   - Result: [ ] PASS / [ ] FAIL

3. **Search by Owner Name**
   - Input: Owner first/last name
   - Expected: Shows properties owned by that person
   - Result: [ ] PASS / [ ] FAIL

4. **Search by Location**
   - Input: "Miami"
   - Expected: Shows properties in Miami
   - Result: [ ] PASS / [ ] FAIL

5. **Search Performance**
   - Type in search box
   - Expected: Instant filtering (< 200ms)
   - Actual time: _______ ms
   - Result: [ ] PASS / [ ] FAIL

---

### Test 2C: Filter Functionality

**Property Type Filter:**
- [ ] "All Types" shows all
- [ ] Filter by specific type works
- [ ] Count is accurate
- Result: [ ] PASS / [ ] FAIL

**Status Filter:**
- [ ] "All Status" shows all
- [ ] "Active" shows only active
- [ ] "Inactive" shows only inactive
- [ ] "Booking" shows booking-available
- Result: [ ] PASS / [ ] FAIL

**City Filter:**
- [ ] "All Cities" shows all
- [ ] Filter by specific city works
- [ ] Cities populated correctly
- Result: [ ] PASS / [ ] FAIL

**Bedrooms Filter:**
- [ ] Studio (0 beds)
- [ ] 1 Bed
- [ ] 2 Beds
- [ ] 3 Beds
- [ ] 4+ Beds
- Result: [ ] PASS / [ ] FAIL

**Combined Filters:**
- [ ] Multiple filters work together
- [ ] Filter performance: _______ ms (Expected: < 200ms)
- Result: [ ] PASS / [ ] FAIL

---

### Test 2D: Pagination

- [ ] Shows 50 items per page
- [ ] Page navigation works
- [ ] "Previous" button disabled on page 1
- [ ] "Next" button disabled on last page
- [ ] Current page indicator accurate
- [ ] Items count accurate
- Result: [ ] PASS / [ ] FAIL

---

### Test 2E: Export Functionality

**Steps:**
1. Click "Export" button
2. Check downloaded CSV file

**Verify CSV Contains:**
- [ ] Property Type
- [ ] Owner name
- [ ] Location
- [ ] Status
- [ ] Bedrooms/Bathrooms
- [ ] Capacity
- [ ] Size
- Result: [ ] PASS / [ ] FAIL

---

## 🟡 TEST 3: UPDATE Property - General Tab (All Fields)

### Prerequisites
- [ ] Property created in TEST 1
- [ ] Navigate to property edit page

### Test 3A: Basic Information Updates

**Steps:**
1. Click "Edit" on test property
2. Verify page loads with property data
3. Check console for detail query log

**Expected Console:**
```
🔍 Fetching property detail for: [property-id]
✅ Fetched property detail: [property-id]
```

**Performance:**
- Edit page load time: _______ seconds
- Expected: < 1.5 seconds
- Result: [ ] PASS / [ ] FAIL

---

### Test 3B: Update Each Field Group

**Property Status (Checkboxes):**
1. Toggle "Is Active" ☑️ → ☐ → ☑️
2. Toggle "Is Booking" ☑️ → ☐ → ☑️
3. Toggle "Pets Allowed" ☐ → ☑️ → ☐
4. Click "Save Changes"
5. Verify: [ ] Saved correctly / [ ] FAIL

**Property Name:**
1. Change to: "Updated Test Property"
2. Save
3. Verify: [ ] Updated in list / [ ] FAIL

**Numeric Fields:**
```
Capacity: 4 → 5
Max Capacity: 6 → 8
Size: 1200 → 1350
Bedrooms: 2 → 3
Bathrooms: 2 → 2.5
Half Baths: 1 → 0
WCs: 0 → 1
Kitchens: 1 → 1
Living Rooms: 1 → 2
```
- [ ] All numbers save correctly
- [ ] No type conversion errors
- [ ] Nulls handled properly
- Result: [ ] PASS / [ ] FAIL

---

### Test 3C: Location Updates

**Test Address Update:**
```
Original: 123 Test Street, Unit 4B
Updated: 456 Beach Boulevard, Apt 9C
```

**Test City/State/Zip:**
```
City: Miami → Fort Lauderdale
State: FL → FL
Zip: 33101 → 33301
```

**Test Coordinates:**
```
Latitude: 25.7617 → 26.1224
Longitude: -80.1918 → -80.1373
```

**Verify Map:**
- [ ] Click "Show Map"
- [ ] Map displays correct location
- [ ] Marker placed accurately
- Result: [ ] PASS / [ ] FAIL

---

### Test 3D: Communication Updates

```
Phone: (305) 555-0123 → (954) 555-0456
WiFi Name: TestApartment_5G → BeachHouse_WiFi
WiFi Password: TestPass123! → SecurePass456!
```

**Security Check:**
- [ ] WiFi password shows as masked (••••••••)
- [ ] "Reveal" button works
- [ ] Password saves encrypted (check DB)
- Result: [ ] PASS / [ ] FAIL

---

### Test 3E: Access Codes Updates

```
Gate Code: #1234 → #5678
Door Lock: 5678 → 9012
Alarm: 9012 → 3456
```

**Security Verification:**
- [ ] Access codes masked in UI
- [ ] Reveal functionality works
- [ ] Data saves correctly
- [ ] Encrypted in database (verify in Supabase)
- Result: [ ] PASS / [ ] FAIL

---

### Test 3F: Extras Updates

```
Storage Number: S-42 → S-88
Storage Code: 3456 → 7890
Front Desk: (305) 555-0199 → (954) 555-0299
Garage: G-15 → G-27
Mailing Box: 4B → 9C
Pool Code: POOL2024 → POOL2025
```

- [ ] All extras update correctly
- Result: [ ] PASS / [ ] FAIL

---

### Test 3G: Unsaved Changes Warning

**Steps:**
1. Make any change to a field
2. Try to switch tabs
3. Verify warning dialog appears

**Expected:**
- [ ] Dialog shows: "Unsaved Changes"
- [ ] "Stay on This Tab" button works
- [ ] "Leave Without Saving" discards changes
- Result: [ ] PASS / [ ] FAIL

---

## 🟣 TEST 4: UPDATE Property - Providers Tab

### Test 4A: Add Provider

**Steps:**
1. Navigate to Providers tab
2. Click "Add Provider"
3. Fill in:
   ```
   Provider Type: Electricity
   Company Name: Florida Power & Light
   Account Number: FPL-12345
   Phone: (800) 555-0100
   Email: billing@fpl.com
   Notes: Main electric provider
   ```
4. Save

**Verify:**
- [ ] Provider added to list
- [ ] All fields saved
- [ ] Edit/Delete buttons appear
- Result: [ ] PASS / [ ] FAIL

---

### Test 4B: Update Provider

**Steps:**
1. Click "Edit" on provider
2. Update phone number
3. Save

**Verify:**
- [ ] Update saved
- [ ] Changes reflected immediately
- Result: [ ] PASS / [ ] FAIL

---

### Test 4C: Delete Provider

**Steps:**
1. Click "Delete" on provider
2. Confirm deletion

**Verify:**
- [ ] Confirmation dialog appears
- [ ] Provider removed from list
- [ ] Removed from database
- Result: [ ] PASS / [ ] FAIL

---

### Test 4D: Multiple Providers

**Add these provider types:**
- [ ] Water - Miami-Dade Water
- [ ] Gas - FPL Gas
- [ ] Internet - Comcast
- [ ] Trash - Waste Management
- [ ] HOA - Condo Association

**Verify:**
- [ ] All providers display
- [ ] Sorted correctly
- [ ] All editable
- Result: [ ] PASS / [ ] FAIL

---

## 🔵 TEST 5: UPDATE Property - Unit Owners Tab

### Test 5A: Add Unit Owner

**Steps:**
1. Navigate to Unit Owners tab
2. Click "Add Owner"
3. Select user from dropdown
4. Fill ownership details:
   ```
   Ownership %: 50
   Start Date: 2024-01-01
   Notes: Primary owner
   ```
5. Save

**Verify:**
- [ ] Owner added
- [ ] User details populated
- [ ] Ownership % calculated
- Result: [ ] PASS / [ ] FAIL

---

### Test 5B: Multiple Owners

**Add second owner:**
```
Owner: [Different user]
Ownership %: 50
Start Date: 2024-01-01
```

**Verify:**
- [ ] Total ownership = 100%
- [ ] Warning if > 100%
- [ ] Both owners listed
- Result: [ ] PASS / [ ] FAIL

---

## 🟠 TEST 6: UPDATE Property - Vehicles Tab

### Test 6A: Add Vehicle

**Steps:**
1. Navigate to Vehicles tab
2. Add vehicle:
   ```
   Type: Car
   Make: Toyota
   Model: Camry
   Year: 2023
   Color: Silver
   License Plate: ABC123
   Parking Spot: P-42
   ```
3. Save

**Verify:**
- [ ] Vehicle added
- [ ] All fields saved
- [ ] Image placeholder shown
- Result: [ ] PASS / [ ] FAIL

---

### Test 6B: Multiple Vehicles

**Add:**
- [ ] Second car
- [ ] Motorcycle
- [ ] Bicycle

**Verify:**
- [ ] All vehicles listed
- [ ] Edit/Delete works for each
- Result: [ ] PASS / [ ] FAIL

---

## 🟤 TEST 7: UPDATE Property - Photos Tab

### Test 7A: Upload Photo

**Steps:**
1. Navigate to Photos tab
2. Click "Upload Photo"
3. Select image file (< 5MB)
4. Add title: "Living Room View"
5. Mark as primary

**Verify:**
- [ ] Upload progress shown
- [ ] Photo appears in grid
- [ ] Primary badge shown
- [ ] Thumbnail generated
- Result: [ ] PASS / [ ] FAIL

---

### Test 7B: Multiple Photos

**Upload:**
- [ ] Bedroom photo
- [ ] Kitchen photo
- [ ] Bathroom photo
- [ ] Exterior photo

**Verify:**
- [ ] All photos upload
- [ ] Grid layout works
- [ ] Lazy loading works
- Result: [ ] PASS / [ ] FAIL

---

### Test 7C: Photo Operations

**Test:**
- [ ] Set different photo as primary
- [ ] Edit photo title
- [ ] Delete photo (with confirmation)
- [ ] Reorder photos (if feature exists)

**Verify:**
- [ ] All operations work
- [ ] Primary image updates in list view
- Result: [ ] PASS / [ ] FAIL

---

## 🟡 TEST 8: UPDATE Property - QR Code Tab

### Test 8A: Generate QR Code

**Steps:**
1. Navigate to QR Code tab
2. Click "Generate QR Code"
3. Select data to encode

**Verify:**
- [ ] QR code generated
- [ ] Preview shown
- [ ] Download button works
- Result: [ ] PASS / [ ] FAIL

---

## 💰 TEST 9: UPDATE Property - Financial Tab

### Test 9A: Booking Rates

**Steps:**
1. Navigate to Financial tab
2. Enter rates:
   ```
   Low Season: $150/night
   High Season: $250/night
   Holiday Rate: $350/night
   Extra Guest: $25/person
   Cleaning Fee: $100
   Deposit: $500
   ```
3. Save

**Verify:**
- [ ] All rates saved
- [ ] Decimal handling correct
- [ ] Currency formatting works
- Result: [ ] PASS / [ ] FAIL

---

### Test 9B: Payment Methods

**Enable:**
- [ ] Cash Payment
- [ ] Credit Card
- [ ] Debit Card
- [ ] Deposit Required

**Verify:**
- [ ] Checkboxes save
- [ ] Payment options display
- Result: [ ] PASS / [ ] FAIL

---

## ✅ TEST 10: UPDATE Property - Checklists Tab

### Test 10A: Create Checklist

**Steps:**
1. Navigate to Checklists tab
2. Click "Add Checklist"
3. Create "Cleaning Checklist":
   ```
   Tasks:
   - Clean bathrooms
   - Vacuum carpets
   - Change linens
   - Restock supplies
   - Check appliances
   ```
4. Save

**Verify:**
- [ ] Checklist created
- [ ] All tasks listed
- [ ] Checkboxes work
- Result: [ ] PASS / [ ] FAIL

---

### Test 10B: Complete Checklist

**Steps:**
1. Check off all tasks
2. Save completion

**Verify:**
- [ ] Completion tracked
- [ ] Timestamp saved
- [ ] Can reset checklist
- Result: [ ] PASS / [ ] FAIL

---

## 📅 TEST 11: UPDATE Property - Booking Tab

### Test 11A: Create Booking

**Steps:**
1. Navigate to Booking tab
2. Click "Add Booking"
3. Fill in:
   ```
   Guest Name: John Doe
   Check-in: 2025-01-15
   Check-out: 2025-01-20
   Guests: 2 adults, 1 child
   Total: $750
   Status: Confirmed
   ```
4. Save

**Verify:**
- [ ] Booking created
- [ ] Dates validated
- [ ] Calendar updated
- [ ] No overlap with existing bookings
- Result: [ ] PASS / [ ] FAIL

---

### Test 11B: Booking Calendar

**Verify:**
- [ ] Calendar displays bookings
- [ ] Available dates shown
- [ ] Blocked dates marked
- [ ] Click date to create booking
- Result: [ ] PASS / [ ] FAIL

---

## 📝 TEST 12: UPDATE Property - Notes Tab

### Test 12A: Add Note

**Steps:**
1. Navigate to Notes tab
2. Click "Add Note"
3. Write:
   ```
   Title: Maintenance Required
   Content: HVAC filter needs replacement
   Category: Maintenance
   Priority: Medium
   ```
4. Save

**Verify:**
- [ ] Note saved
- [ ] Timestamp recorded
- [ ] Category badge shown
- [ ] Rich text formatting works (if enabled)
- Result: [ ] PASS / [ ] FAIL

---

### Test 12B: Multiple Notes

**Add notes for:**
- [ ] Guest feedback
- [ ] Repair history
- [ ] Future improvements

**Verify:**
- [ ] All notes listed
- [ ] Sortable by date/category
- [ ] Edit/Delete works
- Result: [ ] PASS / [ ] FAIL

---

## 🗑️ TEST 13: DELETE Property

### Test 13A: Delete Confirmation

**Steps:**
1. Navigate to properties list
2. Click "Delete" on test property
3. Observe confirmation dialog

**Verify:**
- [ ] Dialog shows property details
- [ ] Warning about related data
- [ ] "Cancel" button works
- [ ] "Delete" button requires confirmation
- Result: [ ] PASS / [ ] FAIL

---

### Test 13B: Execute Delete

**Steps:**
1. Click "Delete"
2. Confirm deletion
3. Wait for completion

**Verify:**
- [ ] Property removed from list (optimistic update)
- [ ] Success toast shown
- [ ] Activity log created
- [ ] Database record deleted
- [ ] Related records handled (cascade/preserve)
- Result: [ ] PASS / [ ] FAIL

---

### Test 13C: Verify Cascade Deletes

**Check Database:**
```sql
-- Verify related records deleted
SELECT COUNT(*) FROM property_location WHERE property_id = '[deleted-id]';
SELECT COUNT(*) FROM property_communication WHERE property_id = '[deleted-id]';
SELECT COUNT(*) FROM property_access WHERE property_id = '[deleted-id]';
SELECT COUNT(*) FROM property_extras WHERE property_id = '[deleted-id]';
SELECT COUNT(*) FROM property_images WHERE property_id = '[deleted-id]';
```

**Expected:** All counts = 0

**Verify:**
- [ ] All related records deleted
- [ ] No orphaned data
- Result: [ ] PASS / [ ] FAIL

---

## 🚀 TEST 14: Performance Verification

### Test 14A: Query Performance

**Browser Console Logs:**

1. **List Query:**
   ```
   Expected: "✅ Fetched properties list: X properties (lightweight)"
   Actual: _______________
   ```

2. **Detail Query:**
   ```
   Expected: "✅ Fetched property detail: [id]"
   Actual: _______________
   ```

**Network Tab Analysis:**

1. **List API Call:**
   - Payload size: _______ KB (Expected: < 200KB for 50 properties)
   - Response time: _______ ms (Expected: < 500ms)
   - [ ] PASS / [ ] FAIL

2. **Detail API Call:**
   - Payload size: _______ KB (Expected: < 50KB)
   - Response time: _______ ms (Expected: < 400ms)
   - [ ] PASS / [ ] FAIL

---

### Test 14B: UI Performance

**Measure:**
- Page load time: _______ seconds (Expected: < 2s)
- Time to interactive: _______ seconds (Expected: < 3s)
- Filter response time: _______ ms (Expected: < 200ms)
- Search response time: _______ ms (Expected: < 200ms)
- Tab switch time: _______ ms (Expected: < 300ms)

**Results:**
- [ ] All metrics within expected range
- [ ] PASS / [ ] FAIL

---

### Test 14C: Memory Usage

**Chrome DevTools → Performance Monitor:**

1. **Initial load:**
   - JS Heap Size: _______ MB (Expected: < 50MB)

2. **After loading 50 properties:**
   - JS Heap Size: _______ MB (Expected: < 100MB)

3. **After navigating 5 edit pages:**
   - JS Heap Size: _______ MB (Expected: < 150MB)

**Memory Leaks:**
- [ ] No continuous memory growth
- [ ] Heap size stabilizes
- [ ] PASS / [ ] FAIL

---

## 🛡️ TEST 15: Error Handling

### Test 15A: Error Boundary

**Test:**
1. Open DevTools Console
2. Run: `throw new Error('Test error boundary');`

**Verify:**
- [ ] Error boundary catches error
- [ ] Friendly error UI shown
- [ ] "Try Again" button works
- [ ] "Go Home" button works
- [ ] Dev mode shows stack trace
- [ ] PASS / [ ] FAIL

---

### Test 15B: Network Errors

**Simulate offline:**
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to save property

**Verify:**
- [ ] Retry logic kicks in (2 retries)
- [ ] Error message shown to user
- [ ] Data not lost
- [ ] Can retry when back online
- [ ] PASS / [ ] FAIL

---

### Test 15C: Validation Errors

**Test invalid data:**
1. **Required field:** Leave property name empty
2. **Number field:** Enter text in capacity field
3. **Date field:** Enter invalid date

**Verify:**
- [ ] Validation errors shown
- [ ] Fields highlighted in red
- [ ] Helpful error messages
- [ ] Submit button disabled until fixed
- [ ] PASS / [ ] FAIL

---

## 🎯 Final Summary

### Overall Test Results

**Total Tests:** 100+
**Passed:** _______
**Failed:** _______
**Pass Rate:** _______%

### Performance Summary

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| List load time | < 2s | ___s | ⏳ |
| Edit load time | < 1.5s | ___s | ⏳ |
| Filter response | < 200ms | ___ms | ⏳ |
| Search response | < 200ms | ___ms | ⏳ |
| Memory usage | < 100MB | ___MB | ⏳ |

### Critical Issues Found

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Recommendations

1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## 📋 Sign-Off

**Tester Name:** _______________
**Date:** _______________
**Signature:** _______________

**Status:**
- [ ] ✅ ALL TESTS PASSED - Ready for Production
- [ ] ⚠️ MINOR ISSUES - Can deploy with fixes scheduled
- [ ] ❌ CRITICAL ISSUES - Do NOT deploy

**Notes:** _______________________________________________
