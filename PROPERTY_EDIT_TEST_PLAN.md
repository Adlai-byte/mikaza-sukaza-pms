# 🧪 Property Edit - Comprehensive Test Plan

## Test Environment Setup
- **Date:** January 12, 2025
- **Browser:** Chrome/Edge (latest)
- **Test Property:** Select any existing property from Properties page
- **Expected Behavior:** All changes should save immediately and persist after page refresh

---

## ✅ Test Checklist

### 1️⃣ **GENERAL TAB** - Property Details, Location, Communication, Access, Extras

#### **A. Property Basic Information**
- [ ] Change `property_name` → Save → Verify name updates
- [ ] Change `property_type` (dropdown) → Save → Verify type updates
- [ ] Toggle `is_active` checkbox → Save → Verify status changes
- [ ] Toggle `is_booking` checkbox → Save → Verify booking flag
- [ ] Toggle `is_pets_allowed` checkbox → Save → Verify pets flag
- [ ] Change `capacity` (number) → Save → Verify capacity updates
- [ ] Change `max_capacity` (number) → Save → Verify max capacity updates
- [ ] Change `size_sqf` (number) → Save → Verify size updates

**Expected:**
- ✅ Yellow "Unsaved changes" warning appears on edit
- ✅ Save button becomes enabled
- ✅ Green "All changes saved" appears after save
- ✅ Toast notification: "Property Saved Successfully"

#### **B. Room Configuration**
- [ ] Change `num_bedrooms` → Save → Verify count
- [ ] Change `num_bathrooms` → Save → Verify count
- [ ] Change `num_half_bath` → Save → Verify count
- [ ] Change `num_wcs` → Save → Verify count
- [ ] Change `num_kitchens` → Save → Verify count
- [ ] Change `num_living_rooms` → Save → Verify count

#### **C. Location Section**
- [ ] Change `address` → Save → Verify address updates
- [ ] Change `city` → Save → Verify city updates
- [ ] Change `state` → Save → Verify state updates
- [ ] Change `postal_code` → Save → Verify zip updates
- [ ] Change `latitude` → Save → Verify coordinates
- [ ] Change `longitude` → Save → Verify coordinates
- [ ] Click "View on Map" → Verify map opens with correct location

#### **D. Communication Section**
- [ ] Change `phone_number` → Save → Verify phone updates
- [ ] Toggle "Show password" on WiFi → Verify visibility toggle works
- [ ] Change `wifi_name` → Save → Verify WiFi name updates
- [ ] Change `wifi_password` → Save → Verify WiFi password updates

#### **E. Access Codes Section**
- [ ] Change `gate_code` → Save → Verify gate code updates
- [ ] Change `door_lock_password` → Save → Verify door lock updates
- [ ] Change `alarm_passcode` → Save → Verify alarm code updates
- [ ] Toggle password visibility → Verify all codes can be shown/hidden

#### **F. Extras Section**
- [ ] Change `storage_number` → Save → Verify storage# updates
- [ ] Change `storage_code` → Save → Verify storage code updates
- [ ] Change `front_desk` → Save → Verify front desk info updates
- [ ] Change `garage_number` → Save → Verify garage# updates
- [ ] Change `mailing_box` → Save → Verify mailbox# updates
- [ ] Change `pool_access_code` → Save → Verify pool code updates

**Validation Tests:**
- [ ] Try saving with `capacity > max_capacity` → Verify validation error
- [ ] Try saving with negative numbers → Verify validation error
- [ ] Try saving with empty required fields → Verify validation error

---

### 2️⃣ **PROVIDERS TAB** - Utility & Service Providers

#### **Add Provider Test**
- [ ] Click "Add Provider" button
- [ ] Fill in provider name (e.g., "FPL Electric")
- [ ] Select provider type (e.g., "Electric")
- [ ] Fill in phone number
- [ ] Fill in account number
- [ ] Fill in billing name
- [ ] Fill in website URL
- [ ] Add observations/notes
- [ ] Click Save → Verify provider appears in table

#### **Edit Provider Test**
- [ ] Click Edit icon on existing provider
- [ ] Modify provider name
- [ ] Change phone number
- [ ] Click Save → Verify changes persist

#### **Delete Provider Test**
- [ ] Click Delete icon on a provider
- [ ] Confirm deletion in dialog
- [ ] Verify provider is removed from table

#### **Search/Filter Test**
- [ ] Type in search box → Verify filtering works
- [ ] Search by name → Verify results
- [ ] Search by type → Verify results
- [ ] Search by phone → Verify results

**Expected:**
- ✅ Table view with all provider details
- ✅ Icons match provider type (⚡ Electric, 📡 Internet, etc.)
- ✅ Toast notifications for all CRUD operations

---

### 3️⃣ **UNIT OWNERS TAB** - Property Owners Management

#### **Add Owner Test**
- [ ] Click "Add Owner" button
- [ ] Fill in first name & last name
- [ ] Fill in email (must be valid)
- [ ] Select relationship to main owner
- [ ] Fill in primary phone
- [ ] Fill in USA phone
- [ ] Fill in WhatsApp
- [ ] Toggle "Primary Owner" if applicable
- [ ] Click Save → Verify owner appears in table

#### **Edit Owner Test**
- [ ] Click Edit icon on existing owner
- [ ] Modify contact information
- [ ] Click Save → Verify changes persist

#### **Delete Owner Test**
- [ ] Try to delete primary owner → Verify deletion is blocked
- [ ] Click Delete icon on non-primary owner
- [ ] Confirm deletion
- [ ] Verify owner is removed

#### **Search Test**
- [ ] Type in search box → Verify filtering works

**Expected:**
- ✅ Primary owner badge displayed
- ✅ Cannot delete primary owner
- ✅ Phone numbers formatted correctly
- ✅ Relationship badges shown

---

### 4️⃣ **VEHICLES TAB** - Registered Vehicles

#### **Add Vehicle Test**
- [ ] Click "Add Vehicle" button
- [ ] Fill in year
- [ ] Fill in make
- [ ] Fill in model
- [ ] Fill in color
- [ ] Fill in license plate
- [ ] Fill in owner name
- [ ] Fill in VIN
- [ ] Add registration info
- [ ] Add insurance info
- [ ] Click Save → Verify vehicle appears in table

#### **Edit Vehicle Test**
- [ ] Click Edit icon
- [ ] Modify vehicle details
- [ ] Click Save → Verify changes persist

#### **Delete Vehicle Test**
- [ ] Click Delete icon
- [ ] Confirm deletion
- [ ] Verify vehicle is removed

#### **Search Test**
- [ ] Search by license plate → Verify filtering

**Expected:**
- ✅ Vehicle display shows year + make + model
- ✅ License plate shown as badge
- ✅ Registration/Insurance badges with tooltips

---

### 5️⃣ **PHOTOS TAB** - Property Images

#### **Upload Photo Test**
- [ ] Click upload area or "Choose Files"
- [ ] Select image(s) from computer
- [ ] Verify upload progress
- [ ] Verify images appear in gallery

#### **Set Primary Image Test**
- [ ] Click "Set as Primary" on an image
- [ ] Verify primary badge appears

#### **Delete Photo Test**
- [ ] Click delete icon on image
- [ ] Confirm deletion
- [ ] Verify image is removed

#### **View Full Size Test**
- [ ] Click on image thumbnail
- [ ] Verify lightbox/modal opens
- [ ] Verify image loads in full size

**Expected:**
- ✅ Drag & drop upload works
- ✅ Image thumbnails load quickly
- ✅ Primary image badge displayed
- ✅ Lightbox navigation works

---

### 6️⃣ **QR CODE TAB** - Property QR Code

#### **QR Code Display Test**
- [ ] Verify QR code is displayed
- [ ] Verify property information shown below QR
- [ ] Scan QR code with phone → Verify it links to property

#### **Download QR Code Test**
- [ ] Click "Download QR Code" button
- [ ] Verify PNG file downloads
- [ ] Verify downloaded file is valid

#### **Print QR Code Test**
- [ ] Click "Print QR Code" button
- [ ] Verify print dialog opens
- [ ] Verify QR code prints correctly

**Expected:**
- ✅ QR code is scannable
- ✅ QR contains property URL or info
- ✅ Download works in PNG format

---

### 7️⃣ **FINANCIAL TAB** - Financial Entries

#### **Add Financial Entry Test**
- [ ] Click "Add Entry" button
- [ ] Fill in description
- [ ] Select entry type (Income/Expense)
- [ ] Fill in amount
- [ ] Select entry date
- [ ] Add notes
- [ ] Click Save → Verify entry appears in list

#### **Edit Financial Entry Test**
- [ ] Click Edit icon
- [ ] Modify amount or description
- [ ] Click Save → Verify changes persist

#### **Delete Financial Entry Test**
- [ ] Click Delete icon
- [ ] Confirm deletion
- [ ] Verify entry is removed

#### **Balance Calculation Test**
- [ ] Add income entry → Verify balance increases
- [ ] Add expense entry → Verify balance decreases
- [ ] Verify running balance is accurate

**Expected:**
- ✅ Income shows as green/positive
- ✅ Expenses show as red/negative
- ✅ Balance calculates correctly
- ✅ Date picker works

---

### 8️⃣ **CHECKLISTS TAB** - Task Checklists

#### **Create Checklist Test**
- [ ] Click "Create Checklist" button
- [ ] Fill in checklist name
- [ ] Add description
- [ ] Set priority level
- [ ] Set due date
- [ ] Assign to user
- [ ] Click Save → Verify checklist appears

#### **Add Checklist Items Test**
- [ ] Click on checklist
- [ ] Add multiple checklist items
- [ ] Verify items appear

#### **Complete Checklist Items Test**
- [ ] Check off items one by one
- [ ] Verify progress bar updates
- [ ] Verify completion percentage

#### **Delete Checklist Test**
- [ ] Click Delete icon
- [ ] Confirm deletion
- [ ] Verify checklist is removed

**Expected:**
- ✅ Progress bar shows completion %
- ✅ Priority badges displayed
- ✅ Due date warnings for overdue items

---

### 9️⃣ **BOOKING TAB** - Bookings & Rates

#### **Add Booking Test**
- [ ] Click "Add Booking" button
- [ ] Fill in guest name
- [ ] Fill in guest email
- [ ] Fill in guest phone
- [ ] Select check-in date
- [ ] Select check-out date
- [ ] Fill in number of guests
- [ ] Select payment method
- [ ] Fill in total amount
- [ ] Add special requests
- [ ] Click Save → Verify booking appears

#### **Booking Rates Test**
- [ ] Fill in low season rate
- [ ] Fill in medium season rate
- [ ] Fill in high season rate
- [ ] Fill in holiday rate
- [ ] Fill in extra guest price
- [ ] Fill in PM commission %
- [ ] Toggle payment methods (Cash, Card, Stripe)
- [ ] Click Save → Verify rates persist

#### **Edit Booking Test**
- [ ] Click Edit icon on booking
- [ ] Modify dates or guest info
- [ ] Click Save → Verify changes persist

#### **Cancel Booking Test**
- [ ] Change booking status to "Cancelled"
- [ ] Verify status badge updates

**Expected:**
- ✅ Date picker prevents past dates
- ✅ Check-out must be after check-in
- ✅ Booking status badges colored correctly
- ✅ Calendar view shows bookings

---

### 🔟 **NOTES TAB** - Property Notes

#### **Add Note Test**
- [ ] Click "Add Note" button
- [ ] Fill in note title
- [ ] Fill in note content (rich text if available)
- [ ] Click Save → Verify note appears

#### **Edit Note Test**
- [ ] Click Edit icon on note
- [ ] Modify title or content
- [ ] Click Save → Verify changes persist

#### **Delete Note Test**
- [ ] Click Delete icon
- [ ] Confirm deletion
- [ ] Verify note is removed

#### **Search Notes Test**
- [ ] Type in search box
- [ ] Verify filtering by title/content

**Expected:**
- ✅ Notes sorted by date (newest first)
- ✅ Timestamps shown
- ✅ User who created note shown

---

## 🔄 **CROSS-TAB TESTS**

### Tab Switching with Unsaved Changes
- [ ] Edit General tab data (don't save)
- [ ] Try to switch to Providers tab
- [ ] Verify warning dialog appears
- [ ] Click "Cancel" → Verify stays on General tab
- [ ] Click "Leave" → Verify switches without saving

### Data Persistence Test
- [ ] Make changes in General tab → Save
- [ ] Switch to another tab
- [ ] Switch back to General tab
- [ ] Verify all saved data is still there

### Refresh Test
- [ ] Make changes and save
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Navigate back to property edit
- [ ] Verify all changes persisted

---

## 🐛 **ERROR HANDLING TESTS**

### Network Error Test
- [ ] Disconnect internet
- [ ] Try to save → Verify error message shown
- [ ] Reconnect internet
- [ ] Retry save → Verify success

### Invalid Data Test
- [ ] Enter invalid email in Owners tab
- [ ] Try to save → Verify validation error
- [ ] Enter text in number fields
- [ ] Verify validation prevents save

### Permission Test
- [ ] Log out and log in as non-admin user (if available)
- [ ] Try to edit property
- [ ] Verify appropriate permissions applied

---

## 📊 **PERFORMANCE TESTS**

- [ ] Load property with 100+ images → Verify page loads within 3 seconds
- [ ] Load property with 50+ financial entries → Verify no lag
- [ ] Switch between tabs quickly → Verify no memory leaks
- [ ] Leave page open for 10 minutes → Verify no auto-refetching

---

## ✅ **SUCCESS CRITERIA**

All tests should meet these criteria:
- ✅ No console errors
- ✅ Changes persist after save
- ✅ Changes persist after page refresh
- ✅ Toast notifications appear for all actions
- ✅ Loading states show during operations
- ✅ Validation errors are clear and helpful
- ✅ No infinite loading states
- ✅ No memory leaks or performance degradation

---

## 🎯 **TEST RESULTS**

**Date Tested:** __________________
**Tested By:** __________________
**Browser:** __________________
**Test Duration:** __________________

**Tabs Tested:**
- [ ] General Tab: ✅ Pass / ❌ Fail
- [ ] Providers Tab: ✅ Pass / ❌ Fail
- [ ] Owners Tab: ✅ Pass / ❌ Fail
- [ ] Vehicles Tab: ✅ Pass / ❌ Fail
- [ ] Photos Tab: ✅ Pass / ❌ Fail
- [ ] QR Code Tab: ✅ Pass / ❌ Fail
- [ ] Financial Tab: ✅ Pass / ❌ Fail
- [ ] Checklists Tab: ✅ Pass / ❌ Fail
- [ ] Booking Tab: ✅ Pass / ❌ Fail
- [ ] Notes Tab: ✅ Pass / ❌ Fail

**Issues Found:**
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

**Overall Status:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
