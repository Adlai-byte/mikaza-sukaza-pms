# Booking Management Module Migration Guide

## Overview
This guide walks you through upgrading your booking management system to include industry-standard features like channel tracking, payment status, and enhanced financial reporting.

**Estimated Time:** 4-6 hours across 3 days
**Downtime:** ZERO (all phases are live migrations)
**Risk Level:** Low (phased approach with rollback support)

---

## Prerequisites

### Before You Start
- [ ] **Backup database**: `pg_dump your_database > backup_$(date +%Y%m%d).sql`
- [ ] **Test on staging environment first** (if available)
- [ ] **Have rollback scripts ready** (included in this package)
- [ ] **Verify current system is stable** (no active bugs)
- [ ] **Schedule during low-traffic period** (optional but recommended)

### Files Included
```
supabase/migrations/
├── 20251017_phase1_add_booking_fields.sql        # Phase 1: Add columns
├── 20251017_phase2_add_booking_constraints.sql   # Phase 2: Add constraints
├── rollback_phase1.sql                            # Rollback Phase 1
├── rollback_phase2.sql                            # Rollback Phase 2
└── verify_migration.sql                           # Verification script
```

---

## Migration Phases

### **Phase 1: Add Columns (Day 1 - ~30 minutes)**

#### What It Does
- Adds 22 new columns to `property_bookings` table
- Creates 6 performance indexes
- **100% backward compatible** - existing code continues to work

#### New Fields Added
- **Channel Tracking**: `booking_channel`, `booking_source`, `channel_commission`, `external_booking_id`
- **Payment Status**: `payment_status`
- **Financial Breakdown**: `base_amount`, `extras_amount`, `tax_amount`, `cleaning_fee`, `security_deposit`
- **Guest Demographics**: `guest_count_adults`, `guest_count_children`, `guest_count_infants`
- **Timing**: `check_in_time`, `check_out_time`, `checked_in_at`, `checked_out_at`
- **Cancellation**: `cancellation_policy`, `cancelled_at`, `cancelled_by`, `cancellation_reason`
- **Identifiers**: `confirmation_code`

#### Execution Steps

**1. Connect to your database:**
```bash
# Using Supabase CLI
npx supabase db reset --db-url "your-connection-string"

# Or using psql
psql "your-connection-string"
```

**2. Run Phase 1 migration:**
```bash
psql "your-connection-string" -f supabase/migrations/20251017_phase1_add_booking_fields.sql
```

**3. Verify migration:**
```bash
psql "your-connection-string" -f supabase/migrations/verify_migration.sql
```

**Expected Output:**
```
✅ SUCCESS: All 22 new columns added successfully
✅ SUCCESS: All 6 indexes created successfully
```

**4. Test existing functionality:**
- [ ] Load Calendar page - should work normally
- [ ] Create a new booking - should work
- [ ] Update an existing booking - should work
- [ ] Delete a booking - should work
- [ ] Check Dashboard stats - should display correctly

**5. If anything fails:**
```bash
# Rollback Phase 1
psql "your-connection-string" -f supabase/migrations/rollback_phase1.sql
```

#### Success Criteria
- ✅ All 22 columns exist
- ✅ All 6 indexes created
- ✅ Existing bookings still load
- ✅ Can create/update/delete bookings
- ✅ No errors in application logs

---

### **Phase 2: Update Application Code (Day 2-3 - ~4 hours)**

#### What To Update

**1. Update TypeScript Schemas**

**File: `src/lib/schemas.ts`**

Replace the existing `bookingSchema` with:
```typescript
export const bookingSchema = z.object({
  property_id: z.string().uuid("Property ID is required"),
  guest_name: z.string().min(1, "Guest name is required"),
  guest_email: z.string().email("Valid email is required").optional().or(z.literal("")),
  guest_phone: z.string().optional(),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  number_of_guests: z.number().min(1, "At least 1 guest required").optional(),

  // Guest count breakdown
  guest_count_adults: z.number().min(0).optional(),
  guest_count_children: z.number().min(0).optional(),
  guest_count_infants: z.number().min(0).optional(),

  // Financial breakdown
  base_amount: z.number().min(0).optional(),
  extras_amount: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  cleaning_fee: z.number().min(0).optional(),
  security_deposit: z.number().min(0).optional(),
  total_amount: z.number().min(0, "Amount must be non-negative").optional(),
  deposit_amount: z.number().min(0, "Deposit must be non-negative").optional(),

  // Payment tracking
  payment_method: z.string().optional(),
  payment_status: z.enum([
    "pending", "paid", "partially_paid", "refunded", "cancelled"
  ]).default("pending").optional(),

  // Booking status - EXPANDED
  booking_status: z.enum([
    "inquiry", "pending", "confirmed", "checked_in",
    "checked_out", "completed", "cancelled", "blocked"
  ]).default("pending").optional(),

  // Channel tracking
  booking_channel: z.enum([
    "airbnb", "booking", "vrbo", "direct",
    "expedia", "homeaway", "tripadvisor", "other"
  ]).optional(),
  booking_source: z.string().optional(),
  channel_commission: z.number().min(0).max(100).optional(),

  // Identifiers
  confirmation_code: z.string().optional(),
  external_booking_id: z.string().optional(),

  // Timing
  check_in_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).default("15:00:00").optional(),
  check_out_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).default("11:00:00").optional(),

  // Cancellation
  cancellation_policy: z.string().optional(),
  cancelled_at: z.string().optional(),
  cancelled_by: z.string().uuid().optional(),
  cancellation_reason: z.string().optional(),

  // Actual check-in/out
  checked_in_at: z.string().optional(),
  checked_out_at: z.string().optional(),

  special_requests: z.string().optional(),
});
```

Update the `Booking` type to include all new fields (see full schema in Phase 2 code comments).

**2. Update UI Components**

**File: `src/components/BookingDialogEnhanced.tsx` (lines 680-683)**

Add missing booking statuses:
```typescript
<SelectContent>
  <SelectItem value="inquiry">Inquiry</SelectItem>
  <SelectItem value="pending">Pending</SelectItem>
  <SelectItem value="confirmed">Confirmed</SelectItem>
  <SelectItem value="checked_in">Checked In</SelectItem>
  <SelectItem value="checked_out">Checked Out</SelectItem>
  <SelectItem value="completed">Completed</SelectItem>
  <SelectItem value="blocked">Blocked (Maintenance)</SelectItem>
  <SelectItem value="cancelled">Cancelled</SelectItem>
</SelectContent>
```

Add channel selection dropdown (after status field):
```typescript
<div className="space-y-2">
  <Label htmlFor="booking_channel">Booking Channel</Label>
  <Select
    value={formData.booking_channel || ''}
    onValueChange={(value) => handleChange('booking_channel', value)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select channel" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="direct">📞 Direct Booking</SelectItem>
      <SelectItem value="airbnb">🏠 Airbnb</SelectItem>
      <SelectItem value="booking">🏨 Booking.com</SelectItem>
      <SelectItem value="vrbo">🏖️ VRBO</SelectItem>
      <SelectItem value="expedia">✈️ Expedia</SelectItem>
      <SelectItem value="homeaway">🏡 HomeAway</SelectItem>
      <SelectItem value="tripadvisor">🔍 TripAdvisor</SelectItem>
      <SelectItem value="other">📋 Other</SelectItem>
    </SelectContent>
  </Select>
</div>

<div className="space-y-2">
  <Label htmlFor="payment_status">Payment Status</Label>
  <Select
    value={formData.payment_status || 'pending'}
    onValueChange={(value) => handleChange('payment_status', value)}
  >
    <SelectTrigger>
      <SelectValue placeholder="Payment status" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="pending">💳 Pending</SelectItem>
      <SelectItem value="paid">✅ Paid</SelectItem>
      <SelectItem value="partially_paid">⏳ Partially Paid</SelectItem>
      <SelectItem value="refunded">↩️ Refunded</SelectItem>
      <SelectItem value="cancelled">❌ Cancelled</SelectItem>
    </SelectContent>
  </Select>
</div>
```

**Also update `src/components/BookingDialog.tsx`** with the same changes.

**3. Update BookingsTable Component**

**File: `src/components/BookingsTable.tsx` (lines 68-74)**

Update status badge config:
```typescript
const statusConfig = {
  inquiry: { label: 'Inquiry', variant: 'secondary' as const, className: 'bg-purple-100 text-purple-800' },
  pending: { label: 'Pending', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', variant: 'default' as const, className: 'bg-green-100 text-green-800' },
  checked_in: { label: 'Checked In', variant: 'default' as const, className: 'bg-blue-100 text-blue-800' },
  checked_out: { label: 'Checked Out', variant: 'outline' as const, className: 'bg-gray-100 text-gray-800' },
  completed: { label: 'Completed', variant: 'outline' as const, className: 'bg-blue-100 text-blue-800' },
  blocked: { label: 'Blocked', variant: 'secondary' as const, className: 'bg-gray-400 text-white' },
  cancelled: { label: 'Cancelled', variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
};
```

**4. Test Code Changes**

Build and test locally:
```bash
npm run build
npm run dev
```

Test checklist:
- [ ] TypeScript compiles without errors
- [ ] Create booking with new statuses (inquiry, checked_in, blocked)
- [ ] Select booking channel (Airbnb, Direct, etc.)
- [ ] Set payment status
- [ ] All status badges display correctly
- [ ] Form validation works

**5. Deploy Code**

```bash
# Commit changes
git add .
git commit -m "feat: Add booking channel and payment status tracking"
git push

# Or deploy directly to Vercel
vercel --prod
```

#### Success Criteria
- ✅ TypeScript compiles without errors
- ✅ Can select all 8 booking statuses in UI
- ✅ Can select booking channels
- ✅ Can set payment status
- ✅ All badges display correctly

---

### **Phase 3: Add Constraints (Day 4 - ~30 minutes)**

#### What It Does
- Adds CHECK constraints for data validation
- Adds unique constraints for confirmation codes
- Enforces business rules at database level

#### Execution Steps

**1. Verify Phase 1 & 2 are working:**
```bash
# Check that bookings can be created with new fields
# Verify UI shows new options
# Confirm no errors in logs
```

**2. Run Phase 2 migration:**
```bash
psql "your-connection-string" -f supabase/migrations/20251017_phase2_add_booking_constraints.sql
```

**Expected Output:**
```
✅ Updated booking_status constraint to include 8 statuses
✅ Added booking_channel constraint (8 channels)
✅ Added payment_status constraint (5 statuses)
✅ Added non-negative constraint for financial amounts
✅ Added commission range constraint (0-100%)
✅ Added non-negative constraint for guest counts
✅ Added guest count consistency constraint
✅ Added check-out after check-in constraint
✅ Added check-in/out timestamp validation
✅ Added cancellation consistency constraint
✅ Added unique constraint for confirmation codes
✅ Added unique constraint for external booking IDs per channel
✅ Added blocked booking constraint
```

**3. Verify constraints:**
```bash
psql "your-connection-string" -f supabase/migrations/verify_migration.sql
```

**4. Test constraint enforcement:**

Try creating invalid bookings (should fail):
```sql
-- Should fail: Invalid booking status
INSERT INTO property_bookings (property_id, guest_name, check_in_date, check_out_date, booking_status)
VALUES ('uuid', 'Test', '2025-01-01', '2025-01-05', 'invalid_status');
-- Expected: ERROR: new row violates check constraint "property_bookings_booking_status_check"

-- Should fail: Check-out before check-in
INSERT INTO property_bookings (property_id, guest_name, check_in_date, check_out_date)
VALUES ('uuid', 'Test', '2025-01-05', '2025-01-01');
-- Expected: ERROR: new row violates check constraint "check_out_after_check_in"

-- Should fail: Negative amount
INSERT INTO property_bookings (property_id, guest_name, check_in_date, check_out_date, total_amount)
VALUES ('uuid', 'Test', '2025-01-01', '2025-01-05', -100);
-- Expected: ERROR: new row violates check constraint "financial_amounts_non_negative"
```

**5. If constraints cause issues with existing data:**
```bash
# Rollback Phase 2 only (keeps columns from Phase 1)
psql "your-connection-string" -f supabase/migrations/rollback_phase2.sql
```

#### Success Criteria
- ✅ All constraints created successfully
- ✅ Invalid bookings are rejected
- ✅ Valid bookings are accepted
- ✅ Existing bookings still work
- ✅ No application errors

---

## Verification Checklist

### After Phase 1
- [ ] Run `verify_migration.sql` - all checks pass
- [ ] Calendar page loads without errors
- [ ] Can create new booking
- [ ] Can update existing booking
- [ ] Can delete booking
- [ ] Dashboard stats display correctly
- [ ] CSV export includes new columns (empty for now)

### After Phase 2
- [ ] TypeScript compiles
- [ ] UI shows all 8 booking statuses
- [ ] UI shows all 8 booking channels
- [ ] Can select payment status
- [ ] Create booking with status="checked_in" works
- [ ] Create booking with channel="airbnb" works
- [ ] Status badges display correctly

### After Phase 3
- [ ] Try invalid status - rejected ✅
- [ ] Try invalid channel - rejected ✅
- [ ] Try negative amount - rejected ✅
- [ ] Try check_out < check_in - rejected ✅
- [ ] Create valid booking - accepted ✅
- [ ] Update existing booking - works ✅

---

## Rollback Procedures

### If Phase 1 Fails
```bash
psql "your-connection-string" -f supabase/migrations/rollback_phase1.sql
```
**Impact**: Removes all new columns, returns to original schema

### If Phase 2 Fails
```bash
psql "your-connection-string" -f supabase/migrations/rollback_phase2.sql
```
**Impact**: Removes constraints, keeps columns (Phase 1 intact)

### If Phase 3 Fails
```bash
psql "your-connection-string" -f supabase/migrations/rollback_phase2.sql
```
**Impact**: Same as Phase 2 rollback

### Complete Rollback (All Phases)
```bash
psql "your-connection-string" -f supabase/migrations/rollback_phase2.sql
psql "your-connection-string" -f supabase/migrations/rollback_phase1.sql
```
**Impact**: Complete revert to pre-migration state

---

## Troubleshooting

### Issue: "Column already exists"
**Solution**: Phase 1 was already run. Skip to Phase 2.

### Issue: "Constraint already exists"
**Solution**: Phase 2 was already run. Migration is complete.

### Issue: "Check constraint violated"
**Solution**: Existing data has invalid values. Clean data before Phase 2:
```sql
-- Find invalid booking statuses
SELECT booking_id, booking_status
FROM property_bookings
WHERE booking_status NOT IN ('pending', 'confirmed', 'cancelled', 'completed')
  AND booking_status IS NOT NULL;

-- Update to valid status
UPDATE property_bookings
SET booking_status = 'pending'
WHERE booking_status NOT IN ('inquiry', 'pending', 'confirmed', 'checked_in', 'checked_out', 'completed', 'cancelled', 'blocked');
```

### Issue: TypeScript errors after update
**Solution**:
1. Delete `node_modules` and reinstall: `npm install`
2. Restart TypeScript server in VS Code
3. Clear build cache: `rm -rf dist` or `npm run build`

### Issue: UI not showing new fields
**Solution**:
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Verify deployment completed
4. Check browser console for errors

---

## Post-Migration Tasks

### Immediate (Week 1)
- [ ] Monitor application logs for errors
- [ ] Watch for constraint violations
- [ ] Verify booking creation flow
- [ ] Test calendar sync (if applicable)
- [ ] Update documentation

### Short-term (Month 1)
- [ ] Start using booking channels in new bookings
- [ ] Set payment statuses
- [ ] Generate confirmation codes
- [ ] Train staff on new fields
- [ ] Create reports using new data

### Long-term (Quarter 1)
- [ ] Implement dynamic pricing engine (see main evaluation report)
- [ ] Add guest communication automation
- [ ] Integrate channel managers (Airbnb, Booking.com APIs)
- [ ] Build revenue analytics dashboard
- [ ] Implement booking history tracking

---

## Support

### Questions or Issues?
1. Review this guide carefully
2. Check the verification script output
3. Review application logs
4. Test on staging first if available
5. Keep rollback scripts ready

### Need Help?
- Database issues: Check PostgreSQL logs
- Application issues: Check browser console and network tab
- TypeScript issues: Run `npm run build` for detailed errors

---

## Summary

**Total Time**: 4-6 hours across 3-4 days
**Downtime**: Zero
**Risk**: Low (phased with rollback)

**Migration is complete when**:
- ✅ All 22 columns exist
- ✅ All 6 indexes created
- ✅ All constraints added (if Phase 3 complete)
- ✅ TypeScript compiles
- ✅ UI shows new options
- ✅ Can create/update/delete bookings
- ✅ Verification script passes

**You're ready for production when**:
- ✅ All phases complete
- ✅ All tests pass
- ✅ No errors in logs
- ✅ Tested on staging
- ✅ Rollback scripts ready

Good luck! 🚀
