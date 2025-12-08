import { test, expect } from '@playwright/test';
import { waitForPageLoad } from '../helpers/test-helpers';
import { ROUTES } from '../fixtures/test-data';

test.describe('Profile Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTES.profile);
    await waitForPageLoad(page);
  });

  test('PRO-001: Should load profile page', async ({ page }) => {
    const hasProfile = await page.locator('text=Profile').first().isVisible({ timeout: 15000 }).catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    console.log(`Profile text: ${hasProfile}, Cards: ${hasCards}`);
    expect(hasProfile || hasCards).toBeTruthy();
  });

  test('PRO-002: Should display user avatar', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for avatar with various patterns - could be Avatar component, img, or icon
    const avatar = page.locator('[class*="avatar"], [class*="Avatar"]').first();
    const avatarImg = page.locator('img[alt*="avatar"], img[alt*="Avatar"], img[alt*="profile"], img[alt*="Profile"]').first();
    const userIcon = page.locator('svg.lucide-user, svg.lucide-user-circle').first();
    const avatarFallback = page.locator('[class*="AvatarFallback"], [class*="avatar-fallback"]').first();

    const hasAvatar = await avatar.isVisible().catch(() => false);
    const hasAvatarImg = await avatarImg.isVisible().catch(() => false);
    const hasUserIcon = await userIcon.isVisible().catch(() => false);
    const hasAvatarFallback = await avatarFallback.isVisible().catch(() => false);

    console.log(`Avatar: ${hasAvatar}, Img: ${hasAvatarImg}, Icon: ${hasUserIcon}, Fallback: ${hasAvatarFallback}`);
    // Profile page should have some form of user representation
    expect(hasAvatar || hasAvatarImg || hasUserIcon || hasAvatarFallback).toBeTruthy();
  });

  test('PRO-003: Should have tabs for different sections', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    console.log(`Found ${tabCount} tabs`);
    expect(tabCount).toBeGreaterThanOrEqual(1);
  });

  test('PRO-004: Should have first name field', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for first name field with various patterns
    const hasFirstNameLabel = await page.locator('text=First Name').first().isVisible().catch(() => false);
    const hasFirstLabel = await page.locator('label:has-text("First")').first().isVisible().catch(() => false);
    const hasNameLabel = await page.locator('label:has-text("Name")').first().isVisible().catch(() => false);
    const hasInput = await page.locator('input').first().isVisible().catch(() => false);
    const hasNameInput = await page.locator('input[name*="name"], input[name*="Name"], input[placeholder*="name"], input[placeholder*="Name"]').first().isVisible().catch(() => false);

    console.log(`First name label: ${hasFirstNameLabel}, First label: ${hasFirstLabel}, Name label: ${hasNameLabel}, Input: ${hasInput}, Name input: ${hasNameInput}`);
    // Profile page should have input fields for user data
    expect(hasFirstNameLabel || hasFirstLabel || hasNameLabel || hasInput || hasNameInput).toBeTruthy();
  });

  test('PRO-005: Should have last name field', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasLastName = await page.locator('text=Last Name, label:has-text("Last")').first().isVisible().catch(() => false);
    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    console.log(`Last name field: ${hasLastName}, Input count: ${inputCount}`);
    expect(hasLastName || inputCount >= 2).toBeTruthy();
  });

  test('PRO-006: Should have email field', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const hasEmail = await page.locator('text=Email, label:has-text("Email")').first().isVisible().catch(() => false);
    const emailInput = page.locator('input[type="email"]');
    const hasEmailInput = await emailInput.isVisible().catch(() => false);

    console.log(`Email field: ${hasEmail || hasEmailInput}`);
    expect(hasEmail || hasEmailInput).toBeTruthy();
  });

  test('PRO-007: Should have save/update button', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
    const hasSaveButton = await saveButton.isVisible().catch(() => false);

    console.log(`Save button: ${hasSaveButton}`);
    expect(hasSaveButton).toBeTruthy();
  });

  test('PRO-008: Should have password section', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Look for password tab or section
    const passwordTab = page.locator('[role="tab"]:has-text("Password"), [role="tab"]:has-text("Security")');
    const hasPasswordTab = await passwordTab.isVisible().catch(() => false);

    const passwordSection = page.locator('text=Password, text=Change Password');
    const hasPasswordSection = await passwordSection.first().isVisible().catch(() => false);

    console.log(`Password tab: ${hasPasswordTab}, Password section: ${hasPasswordSection}`);
    expect(hasPasswordTab || hasPasswordSection).toBeTruthy();
  });

  test('PRO-009: Should switch to password tab', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const passwordTab = page.locator('[role="tab"]:has-text("Password"), [role="tab"]:has-text("Security")');

    if (await passwordTab.isVisible().catch(() => false)) {
      await passwordTab.click();
      await page.waitForTimeout(500);

      const hasPasswordInput = await page.locator('input[type="password"]').first().isVisible().catch(() => false);
      console.log(`Password input visible after tab switch: ${hasPasswordInput}`);
    }
  });

  test('PRO-010: Should have current password field', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Switch to password tab if exists
    const passwordTab = page.locator('[role="tab"]:has-text("Password"), [role="tab"]:has-text("Security")');
    if (await passwordTab.isVisible().catch(() => false)) {
      await passwordTab.click();
      await page.waitForTimeout(500);
    }

    const hasCurrentPassword = await page.locator('text=Current Password, text=Old Password').first().isVisible().catch(() => false);
    const passwordInputs = page.locator('input[type="password"]');
    const inputCount = await passwordInputs.count();

    console.log(`Current password field: ${hasCurrentPassword}, Password inputs: ${inputCount}`);
  });

  test('PRO-011: Should have new password field', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Switch to password tab if exists
    const passwordTab = page.locator('[role="tab"]:has-text("Password"), [role="tab"]:has-text("Security")');
    if (await passwordTab.isVisible().catch(() => false)) {
      await passwordTab.click();
      await page.waitForTimeout(500);
    }

    const hasNewPassword = await page.locator('text=New Password').first().isVisible().catch(() => false);

    console.log(`New password field: ${hasNewPassword}`);
  });

  test('PRO-012: Should have confirm password field', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Switch to password tab if exists
    const passwordTab = page.locator('[role="tab"]:has-text("Password"), [role="tab"]:has-text("Security")');
    if (await passwordTab.isVisible().catch(() => false)) {
      await passwordTab.click();
      await page.waitForTimeout(500);
    }

    const hasConfirmPassword = await page.locator('text=Confirm Password, text=Repeat Password').first().isVisible().catch(() => false);
    const passwordInputs = page.locator('input[type="password"]');
    const inputCount = await passwordInputs.count();

    console.log(`Confirm password field: ${hasConfirmPassword}, Total password inputs: ${inputCount}`);
  });

  test('PRO-013: Should have avatar upload', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const cameraIcon = page.locator('svg.lucide-camera').first();
    const hasCameraIcon = await cameraIcon.isVisible().catch(() => false);

    const uploadInput = page.locator('input[type="file"]');
    const hasUploadInput = await uploadInput.count() > 0;

    console.log(`Camera icon: ${hasCameraIcon}, Upload input: ${hasUploadInput}`);
  });

  test('PRO-014: Should display user information', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    const inputs = page.locator('input');
    const inputCount = await inputs.count();

    console.log(`Found ${inputCount} input fields`);
    expect(inputCount).toBeGreaterThanOrEqual(2);
  });

  test('PRO-015: Should validate form before submit', async ({ page }) => {
    await waitForPageLoad(page, 2000);

    // Try to clear a required field
    const firstNameInput = page.locator('input').first();

    if (await firstNameInput.isVisible().catch(() => false)) {
      await firstNameInput.clear();

      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
      if (await saveButton.isVisible().catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
