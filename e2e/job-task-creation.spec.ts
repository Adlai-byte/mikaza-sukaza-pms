import { test, expect } from '@playwright/test';

test.describe('Job to Task Creation Flow', () => {
  let adminEmail: string;
  let adminPassword: string;
  let opsEmail: string;
  let opsPassword: string;
  let opsUserId: string;

  test.beforeAll(async () => {
    // Set up test credentials
    adminEmail = 'admin@example.com';
    adminPassword = 'admin123';
    opsEmail = 'ops@example.com';
    opsPassword = 'ops123';
  });

  test('should automatically create task when job is created and assigned', async ({ page, context }) => {
    // Step 1: Login as admin
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Step 2: Navigate to Jobs page
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    // Step 3: Open job creation dialog
    await page.click('button:has-text("New Job")');
    await page.waitForSelector('form', { timeout: 5000 });

    // Step 4: Fill in job details
    const jobTitle = `Test Job ${Date.now()}`;
    await page.fill('input[name="title"]', jobTitle);
    await page.fill('textarea[name="description"]', 'Automated test job description');

    // Select job type
    await page.click('select[name="job_type"]');
    await page.selectOption('select[name="job_type"]', 'cleaning');

    // Select priority
    await page.click('select[name="priority"]');
    await page.selectOption('select[name="priority"]', 'high');

    // Select property (first available)
    const propertySelect = await page.locator('select[name="property_id"]');
    const propertyOptions = await propertySelect.locator('option').allTextContents();
    if (propertyOptions.length > 1) {
      await propertySelect.selectOption({ index: 1 });
    }

    // Select assigned user (ops user)
    const userSelect = await page.locator('select[name="assigned_to"]');
    await userSelect.click();

    // Try to find ops user option
    const opsOption = await page.locator('option:has-text("ops")').first();
    if (await opsOption.count() > 0) {
      opsUserId = await opsOption.getAttribute('value') || '';
      await userSelect.selectOption(opsUserId);
    } else {
      // Select second user if ops not found
      await userSelect.selectOption({ index: 1 });
      opsUserId = await userSelect.inputValue();
    }

    // Set due date (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateStr);

    // Step 5: Listen for console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Jobs]') || text.includes('[Todos]')) {
        consoleLogs.push(text);
        console.log('Browser Console:', text);
      }
    });

    // Step 6: Submit the job
    await page.click('button[type="submit"]:has-text("Create Job")');

    // Wait for success message
    await page.waitForSelector('text=/Job.*created successfully/i', { timeout: 10000 });

    // Wait a bit for task creation
    await page.waitForTimeout(3000);

    // Step 7: Check console logs for task creation
    console.log('\n=== Console Logs from Job Creation ===');
    consoleLogs.forEach(log => console.log(log));

    // Verify task creation logs
    const hasJobCreatedLog = consoleLogs.some(log => log.includes('Job created, checking if should create task'));
    const hasTaskCreatingLog = consoleLogs.some(log => log.includes('Creating task for job'));
    const hasTaskCreatedLog = consoleLogs.some(log => log.includes('Task created successfully'));

    console.log('\n=== Task Creation Verification ===');
    console.log('✓ Job created log:', hasJobCreatedLog);
    console.log('✓ Task creating log:', hasTaskCreatingLog);
    console.log('✓ Task created log:', hasTaskCreatedLog);

    // Step 8: Logout admin
    await page.click('[data-sidebar-toggle]'); // Open sidebar if needed
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login', { timeout: 5000 });

    // Step 9: Login as ops user
    await page.fill('input[type="email"]', opsEmail);
    await page.fill('input[type="password"]', opsPassword);

    const opsConsoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Todos]')) {
        opsConsoleLogs.push(text);
        console.log('Ops Browser Console:', text);
      }
    });

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Step 10: Navigate to Todos
    await page.goto('/todos');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Step 11: Check console logs for task filtering
    console.log('\n=== Console Logs from Todos Page ===');
    opsConsoleLogs.forEach(log => console.log(log));

    // Step 12: Look for the task in the list
    const taskExists = await page.locator(`text="${jobTitle}"`).count() > 0;

    console.log('\n=== Final Verification ===');
    console.log('✓ Task appears in ops user Todos:', taskExists);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/job-task-creation-todos.png', fullPage: true });

    // Step 13: Verify the task exists
    if (taskExists) {
      console.log('✅ SUCCESS: Task was created and appears in assigned user\'s Todos');
    } else {
      console.log('❌ FAILURE: Task was NOT found in assigned user\'s Todos');

      // Additional debugging - check if any tasks exist
      const taskCount = await page.locator('[data-task-item]').count();
      console.log('Total tasks visible:', taskCount);

      // Check the results count badge
      const resultsText = await page.locator('text=/\\d+ result/i').textContent();
      console.log('Results count:', resultsText);
    }

    // Assert that task exists
    expect(taskExists).toBeTruthy();
  });
});
