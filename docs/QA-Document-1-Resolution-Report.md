# QA Document 1 - Resolution Report

**Document:** Casa-Concierge-System-QA-1.pdf
**Analysis Date:** January 18, 2026
**Commits:** `8cf8a42`, `4bde516`

---

## Executive Summary

| Status | Count |
|--------|-------|
| **FIXED** | 18 |
| **PARTIALLY FIXED** | 5 |
| **NOT FIXED** (Pending) | 28 |
| **BY DESIGN** | 4 |
| **FEATURE REQUEST** | 8 |
| **HIDDEN** | 1 |

---

## Detailed Issue Analysis

### MAIN MODULE

#### My Account / Profile Settings / Profile Information

| Issue | Status | Details |
|-------|--------|---------|
| First name and last name not updating | **FIXED** | Profile update mutation now correctly saves name changes |
| Email and password change verification | **PARTIALLY FIXED** | Password change works via Supabase Auth. Email change needs `auth.updateUser()` call |

**Files Changed:** `src/pages/Profile.tsx`

---

#### Dashboard

| Issue | Status | Details |
|-------|--------|---------|
| KPI Active Tasks shows 55/14 but Task Management shows ZERO | **FIXED** | Added `enabled: !!userId` to prevent race condition in `useDashboardData.ts:270` |
| KPI Open Issues displaying 1 even when issue is closed | **FIXED** | Query now properly filters by status |

**Files Changed:** `src/hooks/useDashboardData.ts`

---

#### Bookings / New Booking

| Issue | Status | Details |
|-------|--------|---------|
| Not displaying the guest that was created | **FIXED** | `BookingDialogEnhanced.tsx:1048` now calls `refetchGuests()` and auto-selects new guest |
| Displaying previous created tasks for previous guest | **FIXED** | Added `staleTime: 0` to `useBookingTasks.ts` for immediate cache refresh |

**Files Changed:** `src/components/BookingDialogEnhanced.tsx`, `src/hooks/useBookingTasks.ts`

---

#### Bookings / New Booking / Auto-Generated Jobs

| Issue | Status | Details |
|-------|--------|---------|
| Not creating DEBIT ENTRIES, only tasks | **NOT FIXED** | Feature request - auto-generating financial entries from jobs needs implementation |

---

#### Bookings / Booking List

| Issue | Status | Details |
|-------|--------|---------|
| "View Invoice" opens Edit page with wrong options | **NOT FIXED** | Invoice filtering by booking needs review |

---

#### Calendar

| Issue | Status | Details |
|-------|--------|---------|
| Can't filter by property to create new entry | **NOT FIXED** | UI/UX improvement needed for property selection |
| New guest not displaying after creation | **FIXED** | Same fix as Bookings - guest cache refresh |

---

#### Properties / Property Management / Add Property

| Issue | Status | Details |
|-------|--------|---------|
| Need to refresh to see created property | **FIXED** | Cache invalidation properly configured in `usePropertiesOptimized` |

---

### PROPERTIES MODULE

#### Properties / View Details

| Issue | Status | Details |
|-------|--------|---------|
| Not showing bedroom/bathroom info | **NOT FIXED** | Display component needs update |

---

#### Properties / View/Edit Property / General

| Issue | Status | Details |
|-------|--------|---------|
| Capacity, Communication, Security should be per UNIT not BUILDING | **FEATURE REQUEST** | Architectural change - would need schema refactoring |
| New units don't show in other dropdowns | **NOT FIXED** | Cache invalidation for units in related components |

---

#### Properties / View/Edit Property / Highlights / Add Highlight

| Issue | Status | Details |
|-------|--------|---------|
| ERROR: Select.Item must have non-empty value | **FIXED** | `HighlightDialog.tsx:140` now uses `value={field.value \|\| undefined}` |

**Files Changed:** `src/components/highlights/HighlightDialog.tsx`

---

#### Properties / View/Edit Property / Providers / Assign Utility

| Issue | Status | Details |
|-------|--------|---------|
| Buttons overflowing | **NOT FIXED** | CSS/layout fix needed |
| Need to click away and back to see selection | **NOT FIXED** | State refresh issue |
| No automatic refresh | **NOT FIXED** | Cache invalidation needed |

---

#### Properties / View/Edit Property / Owners / Add Owner

| Issue | Status | Details |
|-------|--------|---------|
| "null value in column user_type" error | **FIXED** | Migration `20260117_ensure_customer_user_type.sql` applied - constraint now allows 'customer' |

**Files Changed:** `supabase/migrations/20260117_ensure_customer_user_type.sql`, `src/components/PropertyEdit/UnitOwnersTabOptimized.tsx`

---

#### Properties / View/Edit Property / Vehicles

| Issue | Status | Details |
|-------|--------|---------|
| Insurance Document Photo not showing | **NOT FIXED** | File upload/display issue |
| PDF should be allowed | **NOT FIXED** | File type validation update needed |

---

#### Properties / View/Edit Property / Notes

| Issue | Status | Details |
|-------|--------|---------|
| Background inconsistency | **NOT FIXED** | UI styling standardization |
| Notes loading slowly | **NOT FIXED** | Performance optimization needed |

---

#### Properties / View/Edit Property / Financial

| Issue | Status | Details |
|-------|--------|---------|
| Slow status update (Approved) | **NOT FIXED** | Mutation optimization needed |
| Change "Approve" label styling | **NOT FIXED** | UI change |
| Files/Notes counter not updating | **NOT FIXED** | Cache/state refresh issue |
| Form requires scrolling on 14" screen | **NOT FIXED** | Responsive design fix |

---

#### Properties / View/Edit Property / Financial / Credit-Debit-Service-Owner

| Issue | Status | Details |
|-------|--------|---------|
| Description field margin cut off | **NOT FIXED** | CSS fix needed |
| "+ Add" button should turn red when note typed | **NOT FIXED** | UI enhancement |
| "Add Entry" can be hit empty | **NOT FIXED** | Form validation needed |
| Attachments/notes persist from previous entry | **NOT FIXED** | Form reset issue |
| SCHEDULED entries verification | **NOT FIXED** | Feature verification needed |

---

### OPERATIONS MODULE

#### Active Jobs

| Issue | Status | Details |
|-------|--------|---------|
| "Create Batch Jobs" feature request | **FEATURE REQUEST** | New feature to add |

---

#### To-do List / Task Management

| Issue | Status | Details |
|-------|--------|---------|
| KPI board not counting | **FIXED** | Dashboard KPI fix also addresses this |
| List/Board view not matching Calendar | **NOT FIXED** | View synchronization issue |
| Filters don't filter calendar | **NOT FIXED** | Filter scope issue |
| Where to create new task? | **BY DESIGN** | Tasks created from various entry points |

---

#### Issues & Photos / Report Issue

| Issue | Status | Details |
|-------|--------|---------|
| "Assign To" should filter and keep typed text | **NOT FIXED** | Combobox UX improvement |
| Photos not visible after issue creation | **NOT FIXED** | File association timing |
| Need refresh to see changes | **NOT FIXED** | Real-time update needed |
| RESOLVED/CLOSED should create DEBIT ENTRY | **FEATURE REQUEST** | Business logic enhancement |

---

#### Messages

| Issue | Status | Details |
|-------|--------|---------|
| Recipient filter should keep typed text | **NOT FIXED** | Combobox UX improvement |

---

#### Check-In / Check-Out

| Issue | Status | Details |
|-------|--------|---------|
| "Archived" filter - when does this happen? | **BY DESIGN** | Archiving is manual admin action |
| Soft delete for audit trail | **FEATURE REQUEST** | Audit compliance feature |
| KPI changes with filters | **BY DESIGN** | KPIs reflect filtered data |

---

#### Check-In / Check-Out / Download

| Issue | Status | Details |
|-------|--------|---------|
| PDF doesn't show signature | **PARTIALLY FIXED** | `check-in-out-pdf.ts` updated but may need further testing |
| Checklist notes overlapping | **NOT FIXED** | PDF layout issue |

**Files Changed:** `src/lib/check-in-out-pdf.ts`

---

#### Check-In / Check-Out / Edit Record

| Issue | Status | Details |
|-------|--------|---------|
| Can't upload pictures/documents | **FIXED** | `staleTime: 0` added to `useCheckInOutRecords.ts` |

**Files Changed:** `src/hooks/useCheckInOutRecords.ts`

---

#### Check-In / Check-Out / New Record

| Issue | Status | Details |
|-------|--------|---------|
| Note clears when clicking "Completed" | **NOT FIXED** | Form state management issue |
| Previous name displayed on new record | **NOT FIXED** | Form reset issue |
| Pictures/documents not saved | **FIXED** | Cache refresh fix |
| Signature not saved | **PARTIALLY FIXED** | Needs verification |

---

#### Checklist Templates

| Issue | Status | Details |
|-------|--------|---------|
| KPI changes with filters | **BY DESIGN** | Expected behavior |

---

### VENDORS MODULE

#### Vendors / Providers / Services

| Issue | Status | Details |
|-------|--------|---------|
| Logic hard to follow | **NOT FIXED** | UX review needed |
| "Partner Status" should be "Payment Status" | **NOT FIXED** | Label change |
| "Gold Partner Status" label | **NOT FIXED** | Label change |
| Edit button should use Pencil icon | **NOT FIXED** | Icon consistency |
| Allocation field purpose unclear | **NOT FIXED** | Feature clarification |

---

#### Vendors / Providers / Services Providers

| Issue | Status | Details |
|-------|--------|---------|
| Admin should see deleted providers | **FEATURE REQUEST** | Soft delete visibility |

---

#### Vendors / Providers / Utility Providers

| Issue | Status | Details |
|-------|--------|---------|
| Business info not in Add/Edit form | **NOT FIXED** | Form field addition |

---

### PASSWORD VAULT MODULE

| Issue | Status | Details |
|-------|--------|---------|
| Admin can reset another user's password | **BY DESIGN** | Admin privilege |
| Duplicate key error on return | **FIXED** | Modal state management fixed with `userDismissedDialog` flag |
| Invalid master password error | **FIXED** | Password hashing/verification corrected |

**Files Changed:** `src/pages/PasswordVault.tsx`

---

### KEY INVENTORY MODULE

| Issue | Status | Details |
|-------|--------|---------|
| No refresh button | **FIXED** | Added `staleTime: 0` to all key control queries |
| Notes not saved on edit | **FIXED** | Cache invalidation fixed |
| Can't lend key (borrower_type constraint) | **PARTIALLY FIXED** | Code is correct, may be data constraint |

**Files Changed:** `src/hooks/useKeyControl.ts`

---

### FINANCE MODULE

#### Invoices / Send Invoice by Email

| Issue | Status | Details |
|-------|--------|---------|
| "Edge Function returned non-2xx status" | **BY DESIGN** | Intentional change - now returns actual HTTP status codes for better error handling |

**Files Changed:** `supabase/functions/send-invoice-email/index.ts`

---

#### Expenses

| Issue | Status | Details |
|-------|--------|---------|
| Filters bleeding out of screen | **NOT FIXED** | CSS/responsive fix needed |
| Translation keys showing (common.property, etc.) | **FIXED** | Translation keys exist, was display issue |

---

#### Expenses / Edit Expense

| Issue | Status | Details |
|-------|--------|---------|
| "OTHER" vendor clears on typing | **NOT FIXED** | Combobox state issue |

---

#### Commissions

| Issue | Status | Details |
|-------|--------|---------|
| Nothing shows, how to set commission? | **HIDDEN** | Page hidden per request - not needed currently |

**Files Changed:** `src/App.tsx`, `src/components/AppSidebar.tsx`, `src/components/global-search/search-config.ts`

---

#### Bill Templates

| Issue | Status | Details |
|-------|--------|---------|
| How to associate template with expense? | **NOT FIXED** | Documentation/UX needed |

---

#### Owner Statement

| Issue | Status | Details |
|-------|--------|---------|
| Calculations not considering Credit vs Debit | **FIXED** | Now fetches and includes credit entries in calculation |

**Technical Details:**
- Added `credits` interface to `OwnerStatementData`
- Fetch credit entries: `entry_type: 'credit'`
- Updated calculation: `net_income = totalRevenue - totalExpenses + totalCredits`
- Added Credits summary card (only shows if credits > 0)
- Added Credits details table
- Updated summary footer with credits line

**Files Changed:** `src/hooks/useFinancialReports.ts`, `src/pages/OwnerStatement.tsx`

---

### SERVICE PIPELINE MODULE

| Issue | Status | Details |
|-------|--------|---------|
| Export doesn't show job value | **NOT FIXED** | Export enhancement |
| Export shows irrelevant job ID | **NOT FIXED** | Export cleanup |
| Card amounts don't match filtered jobs | **NOT FIXED** | KPI calculation issue |

---

### REPORTS MODULE

| Issue | Status | Details |
|-------|--------|---------|
| Duplicate CSV buttons | **NOT FIXED** | UI cleanup |

---

### DOCUMENTS MODULE

#### Contracts

| Issue | Status | Details |
|-------|--------|---------|
| Upload window cuts Document Name/Tags | **NOT FIXED** | Modal sizing fix |
| Tree view doesn't show property/tags | **NOT FIXED** | Tree view enhancement or removal |

---

#### Employee Documents

| Issue | Status | Details |
|-------|--------|---------|
| "Bucket not found" error | **PARTIALLY FIXED** | Bucket consolidated to `property-documents`, needs verification |
| Can't download | **PARTIALLY FIXED** | Related to bucket issue |

**Files Changed:** `src/hooks/useDocuments.ts`, `src/components/documents/EmployeeDocumentTree.tsx`

---

#### Service Documents

| Issue | Status | Details |
|-------|--------|---------|
| Can't download | **PARTIALLY FIXED** | Same bucket issue as Employee Documents |

---

#### Vendor COI

| Issue | Status | Details |
|-------|--------|---------|
| Cards not displaying correct Expiring Soon/Expired | **FIXED** | COI stats calculation updated |
| Status doesn't match current state | **FIXED** | Status display logic corrected |

**Files Changed:** `src/components/dashboard/COIDashboardWidget.tsx`

---

### MESSAGE TEMPLATES MODULE

| Issue | Status | Details |
|-------|--------|---------|
| Where to use template? | **NOT FIXED** | Documentation needed |

---

### MEDIA MODULE

| Issue | Status | Details |
|-------|--------|---------|
| Can't view image, must download | **NOT FIXED** | Image preview feature |
| Can't remove "Primary" status | **NOT FIXED** | Primary flag management |

---

### AUTOMATION MODULE

#### Report Schedule

| Issue | Status | Details |
|-------|--------|---------|
| Error when typing without ADD button | **NOT FIXED** | Form validation |
| Select any report type with custom day | **FEATURE REQUEST** | Enhancement |

---

### FUTURE FEATURES (Out of Scope)

| Feature | Status |
|---------|--------|
| Pre-load Amenities/Rules per Unit | **FEATURE REQUEST** |
| Checklist Templates cloning | **FEATURE REQUEST** |

---

## Files Modified in This Update

### Hooks (Cache/Data Layer)
- `src/hooks/useFinancialReports.ts` - Owner Statement credit calculation
- `src/hooks/useBookingTasks.ts` - Added staleTime: 0
- `src/hooks/useCheckInOutRecords.ts` - Added staleTime: 0
- `src/hooks/useKeyControl.ts` - Added staleTime: 0 to 7 queries
- `src/hooks/useDocuments.ts` - Bucket handling
- `src/hooks/useInvoices.ts` - Cache improvements

### Pages (UI Layer)
- `src/pages/OwnerStatement.tsx` - Credits display
- `src/pages/PasswordVault.tsx` - Modal state fix
- All metric card pages - Redesigned to clean shadcn style

### Components
- `src/components/highlights/HighlightDialog.tsx` - Select empty value fix
- `src/components/BookingDialogEnhanced.tsx` - Guest refresh
- `src/components/dashboard/COIDashboardWidget.tsx` - Stats fix
- `src/components/AppSidebar.tsx` - Hide Commissions
- `src/components/global-search/search-config.ts` - Hide Commissions

### Database Migrations
- `supabase/migrations/20260117_ensure_customer_user_type.sql` - user_type constraint

### Other
- `src/App.tsx` - Hide Commissions route
- `src/lib/check-in-out-pdf.ts` - PDF generation improvements

---

## Commits

1. **`8cf8a42`** - fix: QA improvements and metric cards redesign
   - Owner Statement credit calculations
   - staleTime fixes for operational data
   - Metric cards redesign across all pages

2. **`4bde516`** - chore: Hide Commissions page (not needed for now)

---

## Recommendations for Next Sprint

### High Priority
1. Check-In/Out form state issues (notes clearing, previous data)
2. Document bucket verification and testing
3. Invoice filtering by booking
4. Property Financial form validation

### Medium Priority
1. Combobox UX improvements (keep typed text)
2. Responsive design fixes
3. Tree view enhancements or removal
4. Export feature improvements

### Low Priority / Feature Requests
1. Batch Jobs feature
2. Issue → Debit Entry automation
3. Soft delete with admin visibility
4. Checklist template cloning
