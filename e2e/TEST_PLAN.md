# Casa & Concierge PMS - Playwright E2E Test Plan

## Overview

This test plan covers comprehensive end-to-end testing for all core modules of the Casa & Concierge Property Management System.

**Test Environment:**
- Base URL: `http://localhost:8080`
- Test User: `vinzlloydalferez@gmail.com` / `alferez123`
- Browsers: Chromium (primary), Firefox, WebKit
- Auth Storage: `playwright/.auth/user.json`

---

## Test Structure

```
e2e/
├── auth.setup.ts                    # Authentication setup (existing)
├── TEST_PLAN.md                     # This file
├── fixtures/
│   └── test-data.ts                 # Test data constants
├── helpers/
│   └── test-helpers.ts              # Reusable test utilities
├── critical-paths/
│   ├── auth.spec.ts                 # Authentication tests
│   ├── properties.spec.ts           # Property management tests
│   ├── bookings.spec.ts             # Booking & calendar tests
│   ├── invoices.spec.ts             # Invoice & payment tests
│   ├── check-in-out.spec.ts         # Check-in/out workflow tests
│   └── permissions.spec.ts          # RBAC & access control tests
├── features/
│   ├── dashboard.spec.ts            # Dashboard tests
│   ├── reports.spec.ts              # Reports tests (existing)
│   ├── messages.spec.ts             # Messages tests (existing)
│   ├── navigation.spec.ts           # Navigation tests (existing)
│   ├── providers.spec.ts            # Provider management tests
│   ├── jobs.spec.ts                 # Jobs workflow tests
│   ├── users.spec.ts                # User management tests
│   ├── documents.spec.ts            # Document management tests
│   └── guests.spec.ts               # Guest management tests
└── integration/
    ├── booking-to-checkout.spec.ts  # Full booking lifecycle
    └── invoice-to-payment.spec.ts   # Full invoice lifecycle
```

---

## Module Test Specifications

### 1. AUTHENTICATION MODULE

**File:** `e2e/critical-paths/auth.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| AUTH-001 | Valid login | Critical | 1. Navigate to /auth 2. Enter valid email 3. Enter valid password 4. Click Sign In | Redirect to dashboard, user profile visible |
| AUTH-002 | Invalid credentials | Critical | 1. Navigate to /auth 2. Enter invalid email/password 3. Click Sign In | Error message displayed, stay on auth page |
| AUTH-003 | Unauthenticated redirect | Critical | 1. Clear auth state 2. Navigate to /properties | Redirect to /auth page |
| AUTH-004 | Session persistence | High | 1. Login 2. Close browser 3. Reopen 4. Navigate to / | Dashboard loads without re-login |
| AUTH-005 | Logout flow | High | 1. Login 2. Click logout 3. Navigate to protected route | Redirect to /auth |

---

### 2. DASHBOARD MODULE

**File:** `e2e/features/dashboard.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| DASH-001 | Load dashboard | Critical | 1. Navigate to / | Dashboard page loads with title visible |
| DASH-002 | Summary cards display | High | 1. Navigate to / 2. Wait for load | Properties, Bookings, Jobs cards visible |
| DASH-003 | Quick navigation | High | 1. Click each sidebar item | Correct page loads for each |
| DASH-004 | Activity feed | Medium | 1. View recent activity section | Activity items displayed |
| DASH-005 | Notifications bell | Medium | 1. Click notification icon | Notification panel opens |

---

### 3. PROPERTIES MODULE

**File:** `e2e/critical-paths/properties.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| PROP-001 | List properties | Critical | 1. Navigate to /properties | Property list table displays |
| PROP-002 | Search properties | Critical | 1. Type in search box 2. Wait for filter | Filtered results shown |
| PROP-003 | Filter by status | High | 1. Select status filter 2. Apply | Only matching properties shown |
| PROP-004 | View property details | Critical | 1. Click property row | Property view page loads with details |
| PROP-005 | Edit property - General | Critical | 1. Click Edit 2. Modify name 3. Save | Changes saved, toast confirmation |
| PROP-006 | Edit property - Checklists tab | High | 1. Click Checklists tab 2. Add item 3. Save | Checklist updated |
| PROP-007 | Edit property - Providers tab | High | 1. Click Providers tab 2. Assign provider | Provider linked |
| PROP-008 | Edit property - Notes tab | High | 1. Click Notes tab 2. Add note 3. Save | Note saved with timestamp |
| PROP-009 | Edit property - Unit Owners tab | High | 1. Click Unit Owners tab 2. Add owner | Owner assigned to property |
| PROP-010 | Property images | Medium | 1. Upload image 2. Set as primary | Image uploaded and displayed |
| PROP-011 | Property QR code | Low | 1. Generate QR code | QR code displayed for property |
| PROP-012 | Pagination | Medium | 1. Navigate through pages | Correct data per page |

---

### 4. BOOKINGS MODULE

**File:** `e2e/critical-paths/bookings.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| BOOK-001 | List bookings | Critical | 1. Navigate to /bookings | Booking list displays |
| BOOK-002 | Create booking | Critical | 1. Click New Booking 2. Fill form 3. Save | Booking created, appears in list |
| BOOK-003 | Edit booking | Critical | 1. Click booking 2. Modify dates 3. Save | Changes saved |
| BOOK-004 | Cancel booking | High | 1. Click booking 2. Click Cancel 3. Confirm | Status changed to cancelled |
| BOOK-005 | Booking status flow | High | 1. Create booking 2. Confirm 3. Check-in 4. Check-out | Status updates correctly |
| BOOK-006 | Search bookings | High | 1. Type guest name 2. Wait | Filtered results shown |
| BOOK-007 | Filter by property | High | 1. Select property filter | Only matching bookings |
| BOOK-008 | Filter by status | High | 1. Select status filter | Only matching bookings |
| BOOK-009 | Filter by date range | High | 1. Set date range | Only bookings in range |
| BOOK-010 | Generate invoice from booking | Critical | 1. Click Generate Invoice 2. Fill details 3. Save | Invoice created and linked |

---

### 5. CALENDAR MODULE

**File:** `e2e/critical-paths/bookings.spec.ts` (continued)

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| CAL-001 | View calendar | Critical | 1. Navigate to /calendar | Calendar grid displays |
| CAL-002 | Month navigation | High | 1. Click next/prev month | Calendar updates |
| CAL-003 | View booking on calendar | High | 1. Locate booking block | Booking displays with guest name |
| CAL-004 | Click booking for details | High | 1. Click booking block | Booking details dialog opens |
| CAL-005 | Create booking from calendar | Medium | 1. Click empty date 2. Fill form | Booking created at date |
| CAL-006 | Drag to reschedule | Low | 1. Drag booking to new date | Dates updated |

---

### 6. INVOICES MODULE

**File:** `e2e/critical-paths/invoices.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| INV-001 | List invoices | Critical | 1. Navigate to /invoices | Invoice list displays |
| INV-002 | Create invoice from booking | Critical | 1. Click New 2. Select booking 3. Fill details 4. Save | Invoice created |
| INV-003 | Create manual invoice | Critical | 1. Click New 2. Select Manual 3. Fill all fields 4. Save | Invoice created |
| INV-004 | Add line items | Critical | 1. Edit invoice 2. Add line item 3. Save | Line item added, total updated |
| INV-005 | Edit line item | High | 1. Click line item 2. Modify 3. Save | Changes saved |
| INV-006 | Delete line item | High | 1. Click delete on line item 2. Confirm | Line item removed |
| INV-007 | Apply bill template | High | 1. Click Apply Template 2. Select template | Items populated from template |
| INV-008 | Send invoice | High | 1. Click Send 2. Confirm | Status changes to Sent |
| INV-009 | Record payment | Critical | 1. Click Record Payment 2. Enter amount 3. Save | Payment recorded, balance updated |
| INV-010 | Mark as paid | Critical | 1. Record full payment | Status changes to Paid |
| INV-011 | View invoice PDF | Medium | 1. Click PDF icon | PDF preview displays |
| INV-012 | Filter by status | High | 1. Select status filter | Filtered results |
| INV-013 | Search invoices | High | 1. Type in search | Filtered results |

---

### 7. CHECK-IN/OUT MODULE

**File:** `e2e/critical-paths/check-in-out.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| CIO-001 | List check-in/out records | Critical | 1. Navigate to /check-in-out | Records list displays |
| CIO-002 | Create check-in record | Critical | 1. Click New 2. Select property 3. Link booking 4. Fill form 5. Save | Record created |
| CIO-003 | Link to booking | High | 1. Select booking from dropdown | Guest info auto-populated |
| CIO-004 | Complete checklist | High | 1. Open Checklist tab 2. Check items | Items marked complete |
| CIO-005 | Upload photos | High | 1. Open Media tab 2. Upload photos | Photos displayed |
| CIO-006 | Add signature | Critical | 1. Open Signature tab 2. Draw signature 3. Enter name | Signature captured |
| CIO-007 | Complete record | Critical | 1. Click Complete 2. Confirm | Status changes to Completed |
| CIO-008 | Generate PDF | Critical | 1. Click Generate PDF | PDF created and URL saved |
| CIO-009 | Filter by type | High | 1. Select Check-in or Check-out | Filtered records |
| CIO-010 | Filter by property | High | 1. Select property | Filtered records |

---

### 8. PROVIDERS MODULE

**File:** `e2e/features/providers.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| PROV-001 | List providers | Critical | 1. Navigate to /providers | Provider list displays |
| PROV-002 | Create provider | Critical | 1. Click New 2. Fill form 3. Save | Provider created |
| PROV-003 | Edit provider | High | 1. Click provider 2. Modify 3. Save | Changes saved |
| PROV-004 | Delete provider | High | 1. Click delete 2. Confirm | Provider removed |
| PROV-005 | Filter by type | High | 1. Select Service/Utility | Filtered results |
| PROV-006 | Search providers | High | 1. Type in search | Filtered results |
| PROV-007 | View COIs | High | 1. Click View COIs | COI list for provider |
| PROV-008 | Upload COI | High | 1. Click Add COI 2. Upload file 3. Set dates | COI added |

---

### 9. JOBS MODULE

**File:** `e2e/features/jobs.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| JOB-001 | List jobs | Critical | 1. Navigate to /jobs | Job list displays |
| JOB-002 | Create job | Critical | 1. Click New 2. Fill form 3. Assign provider 4. Save | Job created |
| JOB-003 | Update job status | Critical | 1. Click job 2. Change status 3. Save | Status updated |
| JOB-004 | Assign provider | High | 1. Edit job 2. Select provider | Provider assigned |
| JOB-005 | Filter by status | High | 1. Select status filter | Filtered results |
| JOB-006 | Filter by property | High | 1. Select property | Filtered results |
| JOB-007 | Job completion | High | 1. Mark as completed | Status changes, completion date set |

---

### 10. USER MANAGEMENT MODULE

**File:** `e2e/features/users.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| USER-001 | List users | Critical | 1. Navigate to /users | User list displays |
| USER-002 | Create user | Critical | 1. Click New 2. Fill form 3. Set role 4. Save | User created |
| USER-003 | Edit user | High | 1. Click user 2. Modify 3. Save | Changes saved |
| USER-004 | Change user role | Critical | 1. Edit user 2. Change role 3. Save | Role updated |
| USER-005 | Suspend user | High | 1. Click Suspend 2. Confirm | User suspended |
| USER-006 | Reactivate user | High | 1. Click Reactivate 2. Confirm | User active again |
| USER-007 | Reset password | High | 1. Click Reset Password 2. Confirm | Password reset email sent |
| USER-008 | Filter by role | High | 1. Select role filter | Filtered results |
| USER-009 | Search users | High | 1. Type in search | Filtered results |

---

### 11. REPORTS MODULE

**File:** `e2e/features/reports.spec.ts` (existing - expand)

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| RPT-001 | Load reports page | Critical | 1. Navigate to /reports | Reports page loads |
| RPT-002 | Properties report | High | 1. Select Properties type | Properties data displays |
| RPT-003 | Bookings report | High | 1. Select Bookings type | Bookings data displays |
| RPT-004 | Financial report | High | 1. Select Financial type | Financial data displays |
| RPT-005 | Occupancy report | High | 1. Select Occupancy type | Occupancy data displays |
| RPT-006 | Date range filter | High | 1. Set start/end dates 2. Apply | Filtered data |
| RPT-007 | Export to CSV | High | 1. Click Export | CSV file downloads |
| RPT-008 | Summary cards | Medium | 1. View summary section | Metrics displayed |

---

### 12. DOCUMENTS MODULE

**File:** `e2e/features/documents.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| DOC-001 | View contracts | High | 1. Navigate to /contracts | Contracts list displays |
| DOC-002 | Upload contract | High | 1. Click Upload 2. Select file 3. Save | Contract uploaded |
| DOC-003 | View employee docs | High | 1. Navigate to /employee-documents | Documents list displays |
| DOC-004 | View service docs | High | 1. Navigate to /service-documents | Documents list displays |
| DOC-005 | Message templates | High | 1. Navigate to /message-templates | Templates list displays |
| DOC-006 | Create template | High | 1. Click New 2. Fill content 3. Save | Template created |
| DOC-007 | Vendor COIs list | High | 1. Navigate to /vendor-cois | COI list displays |
| DOC-008 | COI expiration alert | High | 1. View expiring COIs | Alert badge visible |

---

### 13. GUESTS MODULE

**File:** `e2e/features/guests.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| GST-001 | List guests | Critical | 1. Navigate to /guests | Guest list displays |
| GST-002 | View guest history | High | 1. Click guest 2. View history tab | Booking history shows |
| GST-003 | Search guests | High | 1. Type in search | Filtered results |
| GST-004 | Edit guest | High | 1. Click Edit 2. Modify 3. Save | Changes saved |

---

### 14. MESSAGES MODULE

**File:** `e2e/features/messages.spec.ts` (existing - expand)

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| MSG-001 | View inbox | Critical | 1. Navigate to /messages | Inbox displays |
| MSG-002 | Switch to sent | High | 1. Click Sent tab | Sent messages display |
| MSG-003 | Switch to starred | High | 1. Click Starred tab | Starred messages display |
| MSG-004 | Switch to archived | High | 1. Click Archived tab | Archived messages display |
| MSG-005 | Search messages | High | 1. Type in search | Filtered results |
| MSG-006 | Compose message | High | 1. Click Compose 2. Fill form 3. Send | Message sent |

---

### 15. PERMISSIONS & ACCESS CONTROL

**File:** `e2e/critical-paths/permissions.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| PERM-001 | Admin full access | Critical | 1. Login as admin 2. Access all routes | All pages accessible |
| PERM-002 | Ops limited access | Critical | 1. Login as ops 2. Try /users | Redirected/blocked |
| PERM-003 | Provider limited access | Critical | 1. Login as provider 2. Try /properties | Redirected/blocked |
| PERM-004 | Sidebar shows allowed only | High | 1. Login as ops 2. Check sidebar | Only permitted items visible |
| PERM-005 | Direct URL blocked | High | 1. Login as ops 2. Go to /users | Unauthorized page |

---

### 16. INTEGRATION TESTS

**File:** `e2e/integration/booking-to-checkout.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| INT-001 | Full booking lifecycle | Critical | 1. Create property 2. Create booking 3. Confirm booking 4. Check-in 5. Generate invoice 6. Record payment 7. Check-out | All steps complete successfully |

**File:** `e2e/integration/invoice-to-payment.spec.ts`

| Test ID | Test Name | Priority | Steps | Expected Result |
|---------|-----------|----------|-------|-----------------|
| INT-002 | Full invoice lifecycle | Critical | 1. Create invoice 2. Add line items 3. Send invoice 4. Record partial payment 5. Record final payment | Invoice marked as paid |

---

## Test Data Requirements

### Test Properties
```typescript
const testProperties = [
  { name: 'Test Beach House', address: '123 Beach St', status: 'active' },
  { name: 'Test Mountain Cabin', address: '456 Mountain Rd', status: 'active' },
  { name: 'Test City Apartment', address: '789 City Ave', status: 'inactive' }
];
```

### Test Bookings
```typescript
const testBookings = [
  { guestName: 'John Doe', checkIn: 'tomorrow', checkOut: '+3 days', status: 'confirmed' },
  { guestName: 'Jane Smith', checkIn: '+7 days', checkOut: '+10 days', status: 'pending' }
];
```

### Test Users
```typescript
const testUsers = {
  admin: { email: 'admin@test.com', password: 'test123', role: 'admin' },
  ops: { email: 'ops@test.com', password: 'test123', role: 'ops' },
  provider: { email: 'provider@test.com', password: 'test123', role: 'provider' }
};
```

---

## Execution Plan

### Phase 1: Critical Path Tests (Week 1)
- AUTH-001 to AUTH-005
- DASH-001 to DASH-003
- PROP-001 to PROP-005
- BOOK-001 to BOOK-005
- INV-001 to INV-005
- CIO-001 to CIO-003

### Phase 2: Feature Tests (Week 2)
- PROV-001 to PROV-008
- JOB-001 to JOB-007
- USER-001 to USER-009
- RPT-001 to RPT-008

### Phase 3: Extended Coverage (Week 3)
- All remaining tests
- Integration tests
- Edge case tests

---

## Common Selectors Reference

```typescript
// Navigation
const selectors = {
  sidebar: 'nav, aside, [data-sidebar]',
  menuItem: (text: string) => `button:has-text("${text}"), a:has-text("${text}")`,

  // Tables
  table: 'table',
  tableRow: '[role="row"], tr',
  tableCell: '[role="cell"], td',

  // Forms
  textInput: 'input[type="text"], input:not([type])',
  emailInput: 'input[type="email"]',
  passwordInput: 'input[type="password"]',
  select: '[role="combobox"]',
  selectOption: (text: string) => `[role="option"]:has-text("${text}")`,
  submitButton: 'button[type="submit"]',

  // Dialogs
  dialog: '[role="dialog"]',
  dialogTitle: '[role="dialog"] h2',
  dialogClose: '[role="dialog"] button:has-text("Close"), [role="dialog"] button:has-text("Cancel")',

  // Status
  badge: '[class*="badge"]',
  spinner: '[class*="spinner"], [class*="loading"]',
  toast: '[role="alert"], [class*="toast"]',

  // Actions
  editButton: 'button:has-text("Edit")',
  deleteButton: 'button:has-text("Delete")',
  saveButton: 'button:has-text("Save")',
  cancelButton: 'button:has-text("Cancel")',
  newButton: 'button:has-text("New"), button:has-text("Add"), button:has-text("Create")'
};
```

---

## Test Helpers

```typescript
// Helper functions to create in e2e/helpers/test-helpers.ts

// Wait for page to fully load
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// Login helper
async function login(page: Page, email: string, password: string) {
  await page.goto('/auth');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

// Navigate to page and verify
async function navigateAndVerify(page: Page, path: string, titleText: string) {
  await page.goto(path);
  await waitForPageLoad(page);
  await expect(page.locator(`text=${titleText}`).first()).toBeVisible();
}

// Fill form field
async function fillField(page: Page, label: string, value: string) {
  const field = page.locator(`label:has-text("${label}") + input, label:has-text("${label}") ~ input`);
  await field.fill(value);
}

// Select dropdown option
async function selectOption(page: Page, label: string, optionText: string) {
  await page.locator(`label:has-text("${label}") + [role="combobox"]`).click();
  await page.locator(`[role="option"]:has-text("${optionText}")`).click();
}

// Verify toast message
async function verifyToast(page: Page, message: string) {
  await expect(page.locator(`[role="alert"]:has-text("${message}")`)).toBeVisible();
}
```

---

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test e2e/critical-paths/auth.spec.ts

# Run with UI mode
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium

# Run in headed mode (see browser)
npx playwright test --headed

# Generate report
npx playwright show-report
```

---

## Coverage Summary

| Module | Total Tests | Critical | High | Medium | Low |
|--------|-------------|----------|------|--------|-----|
| Authentication | 5 | 3 | 2 | 0 | 0 |
| Dashboard | 5 | 1 | 2 | 2 | 0 |
| Properties | 12 | 4 | 5 | 2 | 1 |
| Bookings | 10 | 4 | 5 | 1 | 0 |
| Calendar | 6 | 1 | 3 | 1 | 1 |
| Invoices | 13 | 5 | 6 | 2 | 0 |
| Check-In/Out | 10 | 5 | 5 | 0 | 0 |
| Providers | 8 | 2 | 6 | 0 | 0 |
| Jobs | 7 | 2 | 5 | 0 | 0 |
| Users | 9 | 2 | 7 | 0 | 0 |
| Reports | 8 | 1 | 6 | 1 | 0 |
| Documents | 8 | 0 | 8 | 0 | 0 |
| Guests | 4 | 1 | 3 | 0 | 0 |
| Messages | 6 | 1 | 5 | 0 | 0 |
| Permissions | 5 | 3 | 2 | 0 | 0 |
| Integration | 2 | 2 | 0 | 0 | 0 |
| **TOTAL** | **118** | **37** | **70** | **9** | **2** |

---

## Maintenance

- Review and update test plan monthly
- Add new tests when features are added
- Remove/update tests when features change
- Monitor flaky tests and fix root causes
- Keep test data fixtures up to date
