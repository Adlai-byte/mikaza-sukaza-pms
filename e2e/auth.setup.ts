import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

// Test credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'vinzlloydalferez@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'alferez123';

setup('authenticate', async ({ page }) => {
  // Go to login page
  await page.goto('/auth');

  // Wait for the auth page to load
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill in login credentials
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);

  // Click sign in button
  await page.click('button[type="submit"]');

  // Wait for successful login - should redirect to dashboard
  await page.waitForURL('/', { timeout: 30000 });

  // Verify we're logged in by checking for dashboard elements
  await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });

  // Save the authentication state
  await page.context().storageState({ path: authFile });
});
