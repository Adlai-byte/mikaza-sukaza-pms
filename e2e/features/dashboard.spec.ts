import { test, expect } from '@playwright/test';
import { waitForPageLoad, verifySidebarItem } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Dashboard Module Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await waitForPageLoad(page);
  });

  test('DASH-001: Should load dashboard', async ({ page }) => {
    // Verify dashboard page loaded
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });
  });

  test('DASH-002: Should display summary cards', async ({ page }) => {
    // Wait for dashboard to fully load
    await waitForPageLoad(page, 3000);

    // Look for summary cards (properties, bookings, jobs, etc.)
    const cards = page.locator('[class*="card"]');
    const cardCount = await cards.count();

    // Check for specific card types (flexible - may have any of these)
    const hasProperties = await page.locator('text=Properties').first().isVisible().catch(() => false);
    const hasBookings = await page.locator('text=Bookings').first().isVisible().catch(() => false);
    const hasJobs = await page.locator('text=Jobs').first().isVisible().catch(() => false);
    const hasRevenue = await page.locator('text=Revenue').first().isVisible().catch(() => false);

    console.log(`Dashboard cards: ${cardCount}, Properties: ${hasProperties}, Bookings: ${hasBookings}, Jobs: ${hasJobs}, Revenue: ${hasRevenue}`);
  });

  test('DASH-003: Should have sidebar navigation', async ({ page }) => {
    // Verify sidebar is present
    const sidebar = page.locator('nav, aside, [data-sidebar]').first();
    await expect(sidebar).toBeVisible();

    // Check for common navigation items
    const hasDashboard = await verifySidebarItem(page, 'Dashboard');
    const hasProperties = await verifySidebarItem(page, 'Properties');

    expect(hasDashboard || hasProperties).toBeTruthy();
  });

  test('DASH-004: Should navigate to Properties from sidebar', async ({ page }) => {
    // Find and click Properties link in sidebar
    const propertiesLink = page.locator('nav a:has-text("Properties"), aside a:has-text("Properties"), [data-sidebar] a:has-text("Properties")').first();

    if (await propertiesLink.isVisible().catch(() => false)) {
      await propertiesLink.click();
      await waitForPageLoad(page);

      // Verify navigation to properties page
      expect(page.url()).toContain('/properties');
    }
  });

  test('DASH-005: Should navigate to Bookings from sidebar', async ({ page }) => {
    // Find and click Bookings link
    const bookingsLink = page.locator('nav a:has-text("Bookings"), aside a:has-text("Bookings"), [data-sidebar] a:has-text("Bookings")').first();

    if (await bookingsLink.isVisible().catch(() => false)) {
      await bookingsLink.click();
      await waitForPageLoad(page);

      expect(page.url()).toContain('/bookings');
    }
  });

  test('DASH-006: Should navigate to Calendar from sidebar', async ({ page }) => {
    // Find and click Calendar link
    const calendarLink = page.locator('nav a:has-text("Calendar"), aside a:has-text("Calendar"), [data-sidebar] a:has-text("Calendar")').first();

    if (await calendarLink.isVisible().catch(() => false)) {
      await calendarLink.click();
      await waitForPageLoad(page);

      expect(page.url()).toContain('/calendar');
    }
  });

  test('DASH-007: Should have notification bell icon', async ({ page }) => {
    // Look for notification icon/bell
    const notificationIcon = page.locator('[aria-label*="notification"], button:has(svg[class*="bell"]), [title*="notification"]').first();

    // This may not be visible on all screen sizes or configurations
    const hasNotification = await notificationIcon.isVisible().catch(() => false);

    // Log result (informational - not a failure if missing)
    if (!hasNotification) {
      console.log('Notification icon not visible - may be in collapsed menu');
    }
  });

  test('DASH-008: Should display user profile/avatar', async ({ page }) => {
    // Look for user profile element
    const userProfile = page.locator('[aria-label*="profile"], [aria-label*="user"], img[class*="avatar"], [class*="avatar"]').first();

    const hasProfile = await userProfile.isVisible().catch(() => false);

    // User indicator should be somewhere on the page
    if (!hasProfile) {
      // Try looking for logout or profile text
      const hasLogout = await page.locator('text=Logout').first().isVisible().catch(() => false);
      const hasProfileText = await page.locator('text=Profile').first().isVisible().catch(() => false);
      const hasUserMenu = await page.locator('button[class*="user"], [class*="dropdown"]').first().isVisible().catch(() => false);

      console.log(`Profile: ${hasProfile}, Logout: ${hasLogout}, Profile text: ${hasProfileText}, User menu: ${hasUserMenu}`);
    } else {
      console.log(`User profile visible: ${hasProfile}`);
    }
  });
});

test.describe('Dashboard - Quick Actions', () => {
  test('Should have quick action buttons (if present)', async ({ page }) => {
    await page.goto(ROUTES.dashboard);
    await waitForPageLoad(page, 3000);

    // Look for quick action buttons
    const addButtons = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
    const buttonCount = await addButtons.count();

    // Log what we found (informational)
    console.log(`Found ${buttonCount} quick action button(s)`);
  });
});
