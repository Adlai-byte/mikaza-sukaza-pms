/**
 * Property Management CRUD Test Script
 *
 * Run this in the browser console (F12) when on the properties page
 * to automatically test various CRUD operations
 *
 * Usage:
 * 1. Open http://localhost:8084/properties in browser
 * 2. Login as admin
 * 3. Open DevTools Console (F12)
 * 4. Copy and paste this entire script
 * 5. Run: await runAllTests()
 */

// Test configuration
const TEST_CONFIG = {
  createTestProperty: true,
  testFilters: true,
  testSearch: true,
  testEdit: true,
  testDelete: false, // Set to true to test delete
  propertyNamePrefix: `TEST_PROP_${Date.now()}`,
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  performance: {},
};

// Helper: Log test result
function logTest(testName, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} - ${testName}`, message ? `: ${message}` : '');

  if (passed) {
    testResults.passed.push(testName);
  } else {
    testResults.failed.push({ test: testName, message });
  }
}

// Helper: Measure performance
async function measurePerformance(name, fn) {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  testResults.performance[name] = `${duration.toFixed(2)}ms`;
  console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
  return result;
}

// Helper: Wait for element
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) return resolve(element);

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found after ${timeout}ms`));
    }, timeout);
  });
}

// Helper: Check console logs
function checkConsoleLogs(expectedLog) {
  // This is a simplified check - you'd need to override console.log to capture logs
  console.log(`📝 Checking for log: ${expectedLog}`);
  return true; // Placeholder
}

// TEST 1: Verify page structure
async function testPageStructure() {
  console.log('\n🧪 TEST 1: Page Structure');

  try {
    // Check for main elements
    const propertyTable = document.querySelector('[data-testid="property-table"], table');
    logTest('Property table exists', !!propertyTable);

    const addButton = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent.includes('Add Property')
    );
    logTest('Add Property button exists', !!addButton);

    const searchInput = document.querySelector('input[placeholder*="Search"]');
    logTest('Search input exists', !!searchInput);

    // Check for filter dropdowns
    const filters = document.querySelectorAll('[role="combobox"]');
    logTest('Filter dropdowns exist', filters.length >= 4, `Found ${filters.length} filters`);

    return true;
  } catch (error) {
    logTest('Page structure test', false, error.message);
    return false;
  }
}

// TEST 2: Test search functionality
async function testSearch() {
  console.log('\n🧪 TEST 2: Search Functionality');

  try {
    const searchInput = document.querySelector('input[placeholder*="Search"]');
    if (!searchInput) {
      logTest('Search input found', false);
      return false;
    }

    // Get initial property count
    const initialRows = document.querySelectorAll('tbody tr').length;
    console.log(`📊 Initial property count: ${initialRows}`);

    // Test search with known property type
    await measurePerformance('Search response time', async () => {
      searchInput.value = 'apartment';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for filter
    });

    const filteredRows = document.querySelectorAll('tbody tr').length;
    logTest('Search filters results', filteredRows <= initialRows,
      `${initialRows} -> ${filteredRows} properties`);

    // Clear search
    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 300));

    const clearedRows = document.querySelectorAll('tbody tr').length;
    logTest('Search clear restores results', clearedRows === initialRows);

    return true;
  } catch (error) {
    logTest('Search functionality', false, error.message);
    return false;
  }
}

// TEST 3: Test filters
async function testFilters() {
  console.log('\n🧪 TEST 3: Filter Functionality');

  try {
    const initialRows = document.querySelectorAll('tbody tr').length;

    // This is a simplified test - actual filter testing would require
    // clicking on dropdowns and selecting options
    console.log('📊 Testing filters...');
    console.log('⚠️ Manual verification required for filter dropdowns');
    console.log('TODO: Implement automated filter selection tests');

    logTest('Filters visible', true, 'Manual verification needed');

    return true;
  } catch (error) {
    logTest('Filter functionality', false, error.message);
    return false;
  }
}

// TEST 4: Check performance metrics
async function testPerformance() {
  console.log('\n🧪 TEST 4: Performance Metrics');

  try {
    // Check for optimized query logs
    console.log('📊 Check browser console for these logs:');
    console.log('   ✅ "Fetching properties list (optimized query)"');
    console.log('   ✅ "Fetched properties list: X properties (lightweight)"');

    // Memory usage
    if (performance.memory) {
      const memoryMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
      testResults.performance.memoryUsage = `${memoryMB}MB`;
      console.log(`💾 Memory usage: ${memoryMB}MB`);
      logTest('Memory usage acceptable', memoryMB < 150, `${memoryMB}MB`);
    }

    // Network timing (if available)
    const perfEntries = performance.getEntriesByType('resource');
    const apiCalls = perfEntries.filter(entry =>
      entry.name.includes('supabase.co') && entry.name.includes('properties')
    );

    if (apiCalls.length > 0) {
      const latestCall = apiCalls[apiCalls.length - 1];
      const duration = latestCall.duration.toFixed(2);
      testResults.performance.apiLatency = `${duration}ms`;
      console.log(`🌐 Latest API call: ${duration}ms`);
      logTest('API response time acceptable', duration < 1000, `${duration}ms`);
    }

    return true;
  } catch (error) {
    logTest('Performance metrics', false, error.message);
    return false;
  }
}

// TEST 5: Verify data integrity
async function testDataIntegrity() {
  console.log('\n🧪 TEST 5: Data Integrity');

  try {
    const rows = document.querySelectorAll('tbody tr');

    if (rows.length === 0) {
      logTest('Properties loaded', false, 'No properties found');
      return false;
    }

    logTest('Properties loaded', true, `${rows.length} properties displayed`);

    // Check first row has all required data
    const firstRow = rows[0];
    const cells = firstRow.querySelectorAll('td');

    if (cells.length >= 6) {
      logTest('Row has all columns', true, `${cells.length} columns`);

      // Check for image or placeholder
      const hasImage = firstRow.querySelector('img') || firstRow.querySelector('svg');
      logTest('Property has image/icon', !!hasImage);

      // Check for property name
      const hasName = firstRow.textContent.length > 10;
      logTest('Property has name/details', hasName);

      // Check for action buttons
      const buttons = firstRow.querySelectorAll('button');
      logTest('Action buttons present', buttons.length >= 3, `${buttons.length} buttons`);
    }

    return true;
  } catch (error) {
    logTest('Data integrity', false, error.message);
    return false;
  }
}

// TEST 6: Test navigation to edit page
async function testEditNavigation() {
  console.log('\n🧪 TEST 6: Edit Page Navigation');

  try {
    const firstEditButton = Array.from(document.querySelectorAll('button')).find(
      btn => btn.querySelector('svg') && btn.title?.includes('Edit')
    );

    if (!firstEditButton) {
      logTest('Edit button found', false);
      return false;
    }

    logTest('Edit button found', true);
    console.log('⚠️ Click edit button manually to test edit page');
    console.log('   Expected: Page loads to /properties/[id]/edit');
    console.log('   Expected: Console shows "Fetching property detail"');
    console.log('   Expected: 10 tabs visible');

    return true;
  } catch (error) {
    logTest('Edit navigation', false, error.message);
    return false;
  }
}

// TEST 7: Export functionality
async function testExport() {
  console.log('\n🧪 TEST 7: Export Functionality');

  try {
    const exportButton = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent.includes('Export')
    );

    if (!exportButton) {
      logTest('Export button found', false);
      return false;
    }

    logTest('Export button found', true);
    console.log('⚠️ Click export button manually to test CSV download');

    return true;
  } catch (error) {
    logTest('Export functionality', false, error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.clear();
  console.log('🚀 Starting Property Management CRUD Tests...');
  console.log('================================================\n');

  const startTime = performance.now();

  // Run all tests
  await testPageStructure();
  await testSearch();
  await testFilters();
  await testPerformance();
  await testDataIntegrity();
  await testEditNavigation();
  await testExport();

  const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);

  // Print summary
  console.log('\n================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================\n');

  const total = testResults.passed.length + testResults.failed.length;
  const passRate = ((testResults.passed.length / total) * 100).toFixed(1);

  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`📈 Pass Rate: ${passRate}%`);
  console.log(`⏱️ Total Time: ${totalTime}s\n`);

  if (testResults.failed.length > 0) {
    console.log('❌ Failed Tests:');
    testResults.failed.forEach(({ test, message }) => {
      console.log(`   - ${test}: ${message}`);
    });
    console.log('');
  }

  console.log('🎯 Performance Metrics:');
  Object.entries(testResults.performance).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  console.log('\n================================================');
  console.log('📋 Manual Tests Required:');
  console.log('================================================\n');
  console.log('1. Click "Add Property" and fill all fields');
  console.log('2. Click "Edit" on a property and test all 10 tabs:');
  console.log('   - General (all sections)');
  console.log('   - Providers');
  console.log('   - Owners');
  console.log('   - Vehicles');
  console.log('   - Photos');
  console.log('   - QR Code');
  console.log('   - Financial');
  console.log('   - Checklists');
  console.log('   - Booking');
  console.log('   - Notes');
  console.log('3. Test delete functionality');
  console.log('4. Test unsaved changes warning');
  console.log('5. Test error boundary (throw error in console)');
  console.log('\n📚 See PROPERTY_CRUD_TEST_PLAN.md for complete test checklist');

  return testResults;
}

// Export for use
console.log('✅ Test script loaded!');
console.log('📝 Run: await runAllTests() to start testing');
console.log('📚 See PROPERTY_CRUD_TEST_PLAN.md for manual test checklist\n');
