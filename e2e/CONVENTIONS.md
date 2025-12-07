# E2E Test Conventions

## Test Naming Convention

All tests should follow this standardized naming pattern:

### Format
```
[MODULE]-[NUMBER]: [Action] [Target] [Condition?]
```

### Components

1. **MODULE** - 3-5 character uppercase abbreviation
   - `PROP` - Properties
   - `BOOK` - Bookings
   - `INV` - Invoices
   - `USER` - Users
   - `LOG` - Activity Logs
   - `GUEST` - Guests
   - `JOB` - Jobs
   - `TASK` - Tasks
   - `DOC` - Documents
   - `CHK` - Check-in/Out
   - `CAL` - Calendar
   - `DASH` - Dashboard
   - `RPT` - Reports
   - `VAL` - Validation

2. **NUMBER** - 3-digit sequential number (001, 002, etc.)

3. **Action** - Use imperative verbs:
   - `Should load` - Page loads correctly
   - `Should list` - Data is displayed in list/table
   - `Should create` - Create operation succeeds
   - `Should update` - Update operation succeeds
   - `Should delete` - Delete operation succeeds
   - `Should search` - Search functionality works
   - `Should filter` - Filter functionality works
   - `Should validate` - Form validation works
   - `Should navigate` - Navigation works correctly
   - `Should display` - UI element is shown
   - `Should prevent` - Negative test (prevents invalid action)
   - `Should reject` - Negative test (rejects invalid input)

### Examples

```typescript
// Good examples
test('PROP-001: Should load properties page', async ({ page }) => {});
test('PROP-002: Should list all properties', async ({ page }) => {});
test('PROP-003: Should filter properties by status', async ({ page }) => {});
test('BOOK-001: Should create new booking', async ({ page }) => {});
test('VAL-001: Should prevent submission with empty required fields', async ({ page }) => {});
test('INV-015: Should reject negative amounts in line items', async ({ page }) => {});

// Bad examples - avoid these patterns
test('test properties', async ({ page }) => {});  // No module prefix, vague
test('it works', async ({ page }) => {});  // Too vague
test('PROPERTIES-1: loading', async ({ page }) => {});  // Wrong format
```

## Test File Organization

### Directory Structure
```
e2e/
├── admin/           # Admin-only features (users, logs)
├── critical-paths/  # Core business flows (bookings, invoices, properties)
├── fixtures/        # Test data and constants
├── helpers/         # Reusable helper functions
├── pages/           # Page Object Model classes
├── validation/      # Form validation and edge case tests
└── CONVENTIONS.md   # This file
```

### File Naming
- Use kebab-case: `booking-crud.spec.ts`, `user-management.spec.ts`
- Group related tests in descriptive files
- Suffix with `.spec.ts` for Playwright detection

## Test Structure

### Use describe blocks for grouping
```typescript
test.describe('Properties Module - CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/properties');
  });

  test('PROP-001: Should list properties', async ({ page }) => {
    // Test implementation
  });
});

test.describe('Properties Module - Filters', () => {
  // Filter-related tests
});
```

### Use Page Objects (Preferred)
```typescript
import { PropertiesPage } from '../pages';

test('PROP-001: Should list properties', async ({ page }) => {
  const propertiesPage = new PropertiesPage(page);
  await propertiesPage.goto();
  await propertiesPage.verifyListDisplayed();
});
```

## Assertions

### Prefer explicit assertions over boolean checks
```typescript
// Good
await expect(page.locator('table')).toBeVisible();
await expect(submitButton).toBeEnabled();

// Avoid
const isVisible = await page.locator('table').isVisible();
expect(isVisible).toBe(true);
```

### Use meaningful timeout messages
```typescript
await expect(page.locator('text=Success'))
  .toBeVisible({ timeout: 5000 });
```

## Wait Strategies

### Always use deterministic waits
```typescript
// Good - wait for specific element
await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

// Avoid - arbitrary timeout
await page.waitForTimeout(1000);
```

### Wait patterns by scenario
1. **Page Load**: Use `waitForPageLoad()` helper
2. **Dialog**: Use `waitFor({ state: 'visible' })`
3. **Form Submit**: Wait for toast or navigation
4. **Search**: Wait for spinner or network idle

## Error Handling

### Let tests fail with clear messages
```typescript
// Helpers should throw descriptive errors
throw new Error(
  `Could not find element: "${selector}"\n` +
  `Current page URL: ${page.url()}`
);
```

### Avoid swallowing errors silently
```typescript
// Bad - hides failures
const isVisible = await element.isVisible().catch(() => false);
if (isVisible) { ... }

// Better - explicit handling
try {
  await element.waitFor({ state: 'visible', timeout: 5000 });
  // proceed with test
} catch (error) {
  throw new Error(`Expected element to be visible: ${selector}`);
}
```

## Test Data

### Use fixtures for test data
```typescript
import { ROUTES, TEST_USERS, TEST_PROPERTIES } from '../fixtures/test-data';

test('PROP-001: Should display property', async ({ page }) => {
  await page.goto(ROUTES.properties);
  // ...
});
```

### Never hardcode credentials
- Use environment variables for sensitive data
- Use fixture files for test user credentials
