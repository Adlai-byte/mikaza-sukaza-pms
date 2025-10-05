# Quick Test Guide - Property Management CRUD

**Environment:** http://localhost:8084
**Status:** ✅ Dev server running on port 8084

---

## 🚀 Quick Start Testing (5 Minutes)

### Step 1: Open App & Run Automated Tests

1. **Open Browser:** http://localhost:8084
2. **Login** as admin
3. **Go to Properties page**
4. **Open DevTools Console** (F12)
5. **Copy & paste** `test-property-crud.js` script into console
6. **Run:** `await runAllTests()`

**Expected Output:**
```
✅ Passed: 10+
❌ Failed: 0
📈 Pass Rate: 100%
```

---

### Step 2: Verify Performance (2 Minutes)

**Check Console for:**
```
🔍 Fetching properties list (optimized query)...
✅ Fetched properties list: XX properties (lightweight)
```

**Check Network Tab:**
- Filter by: Fetch/XHR
- Look for Supabase API call
- Verify: Response size < 200KB ✅
- Verify: Response time < 500ms ✅

---

### Step 3: Test Key Operations (8 Minutes)

#### A. CREATE Property (2 min)
1. Click "Add Property"
2. Fill minimum required fields:
   - Property Name: Test-[timestamp]
   - Property Type: Apartment
   - Owner: Select user
3. Click Save
4. ✅ Verify appears in list

#### B. READ/FILTER (2 min)
1. Use search box: Type "apartment"
2. ✅ Results filter instantly (< 200ms)
3. Try filters:
   - Type filter
   - Status filter
   - City filter
4. ✅ All work correctly

#### C. UPDATE Property (3 min)
1. Click "Edit" on test property
2. **Console should show:**
   ```
   🔍 Fetching property detail for: [id]
   ✅ Fetched property detail: [id]
   ```
3. Go to General tab
4. Change property name
5. Click "Save Changes"
6. ✅ Verify updated in list

#### D. DELETE Property (1 min)
1. Click "Delete" on test property
2. Confirm deletion
3. ✅ Verify removed from list

---

## 📋 Complete Field Testing Checklist

### General Tab (32 Fields)

**Basic Info:**
- [ ] is_active (checkbox)
- [ ] is_booking (checkbox)
- [ ] is_pets_allowed (checkbox)
- [ ] property_name (text)
- [ ] property_type (dropdown)

**Property Details:**
- [ ] capacity (number)
- [ ] max_capacity (number)
- [ ] size_sqf (number)
- [ ] num_bedrooms (number)
- [ ] num_bathrooms (number)
- [ ] num_half_bath (number)
- [ ] num_wcs (number)
- [ ] num_kitchens (number)
- [ ] num_living_rooms (number)

**Location (6 fields):**
- [ ] address (text)
- [ ] city (text)
- [ ] state (text)
- [ ] postal_code (text)
- [ ] latitude (number)
- [ ] longitude (number)

**Communication (3 fields):**
- [ ] phone_number (text)
- [ ] wifi_name (text)
- [ ] wifi_password (text) - Should be masked

**Access Codes (3 fields):**
- [ ] gate_code (text) - Should be masked
- [ ] door_lock_password (text) - Should be masked
- [ ] alarm_passcode (text) - Should be masked

**Extras (6 fields):**
- [ ] storage_number (text)
- [ ] storage_code (text)
- [ ] front_desk (text)
- [ ] garage_number (text)
- [ ] mailing_box (text)
- [ ] pool_access_code (text)

**Total General Tab Fields: 32** ✅

---

### Other Tabs Quick Verification

**Providers Tab:**
- [ ] Can add provider
- [ ] Can edit provider
- [ ] Can delete provider
- [ ] All fields save

**Owners Tab:**
- [ ] Can add owner
- [ ] Ownership % calculates
- [ ] Can edit owner details
- [ ] Can delete owner

**Vehicles Tab:**
- [ ] Can add vehicle
- [ ] All vehicle fields save
- [ ] Can delete vehicle

**Photos Tab:**
- [ ] Can upload image
- [ ] Can set primary photo
- [ ] Can delete photo
- [ ] Thumbnails load

**QR Code Tab:**
- [ ] Can generate QR code
- [ ] Can download QR code

**Financial Tab:**
- [ ] Can set rates
- [ ] Can enable payment methods
- [ ] All rates save correctly

**Checklists Tab:**
- [ ] Can create checklist
- [ ] Can add tasks
- [ ] Can mark complete

**Booking Tab:**
- [ ] Can create booking
- [ ] Date validation works
- [ ] Calendar updates

**Notes Tab:**
- [ ] Can add note
- [ ] Can categorize note
- [ ] Can edit/delete note

---

## ⚡ Performance Benchmarks

| Operation | Target | Pass Criteria |
|-----------|--------|---------------|
| **List Page Load** | < 2s | ✅ |
| **Edit Page Load** | < 1.5s | ✅ |
| **Search Response** | < 200ms | ✅ |
| **Filter Response** | < 200ms | ✅ |
| **Save Response** | < 1s | ✅ |
| **Memory Usage** | < 100MB | ✅ |

**How to Check:**
1. **DevTools → Performance tab**
2. **Record page load**
3. **Check timing metrics**

---

## 🐛 Common Issues to Watch For

### Issue 1: Data Not Loading
**Symptoms:**
- Blank list
- Spinner forever

**Check:**
- Console for errors
- Network tab for failed requests
- Verify logged in

### Issue 2: Save Not Working
**Symptoms:**
- Changes don't persist
- Error toast appears

**Check:**
- Console for validation errors
- Required fields filled
- Network tab for API errors

### Issue 3: Slow Performance
**Symptoms:**
- Lag when filtering
- Slow page load

**Check:**
- Console for "lightweight" query message
- Network tab for large payloads (> 200KB)
- Memory usage > 150MB

---

## 🔧 Testing Tools

### Browser DevTools

**Console Tab:**
- Watch for query logs
- Check for errors
- Run test script

**Network Tab:**
- Monitor API calls
- Check payload sizes
- Verify response times

**Performance Tab:**
- Record page load
- Check memory usage
- Monitor FPS

---

## ✅ Quick Pass/Fail Criteria

### Must Pass (Critical):
- [ ] List loads in < 2 seconds
- [ ] Edit page loads in < 1.5 seconds
- [ ] All CRUD operations work
- [ ] No console errors during normal use
- [ ] Data persists after save
- [ ] No memory leaks

### Should Pass (Important):
- [ ] Search/filter instant (< 200ms)
- [ ] Unsaved changes warning works
- [ ] Error boundary catches errors
- [ ] All 32 General tab fields save
- [ ] All tab data saves correctly

### Nice to Have (Enhancement):
- [ ] Smooth animations
- [ ] Skeleton loaders shown
- [ ] Optimistic updates work
- [ ] Images lazy load
- [ ] Mobile responsive

---

## 📞 Report Issues

If tests fail, document:

1. **What you were doing**
2. **What you expected**
3. **What actually happened**
4. **Console errors** (screenshot)
5. **Network errors** (screenshot)

---

## 🎯 Success Criteria

**Ready for Production if:**
- ✅ All critical tests pass
- ✅ No console errors
- ✅ Performance within targets
- ✅ All CRUD operations work
- ✅ Data integrity maintained

**NOT ready if:**
- ❌ Any critical test fails
- ❌ Data loss on save
- ❌ Performance > 2x targets
- ❌ Frequent errors in console
- ❌ Memory leaks detected

---

## 📚 Full Test Documentation

For complete testing procedures, see:
- `PROPERTY_CRUD_TEST_PLAN.md` - Detailed test cases
- `test-property-crud.js` - Automated test script
- `IMPROVEMENTS_SUMMARY.md` - What was optimized
- `SECURITY_RECOMMENDATIONS.md` - Security checklist

---

**Ready to test?** Follow the Quick Start (top of document) 🚀
