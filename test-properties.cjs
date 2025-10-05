#!/usr/bin/env node

/**
 * Comprehensive Automated Test Suite for Properties Module
 * This script tests database operations, component functionality, and data integrity
 */

const { exec } = require('child_process');
const https = require('https');
const fs = require('fs');

// Test configuration
const config = {
  baseUrl: 'http://localhost:8084',
  supabaseUrl: 'https://ihzkamfnctfreylyzgid.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloemthbWZuY3RmcmV5bHl6Z2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5OTI4MjksImV4cCI6MjA3NDU2ODgyOX0.MBMAqte7iI49GTE3gnFVhdsHCVb2viA6qPjftwp3RtY',
  testPropertyId: null, // Will be set during testing
  logFile: './test-results.log'
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Logging function
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level}: ${message}`;
  console.log(logMessage);

  // Write to log file
  if (!fs.existsSync(config.logFile)) {
    fs.writeFileSync(config.logFile, '');
  }
  fs.appendFileSync(config.logFile, logMessage + '\n');
}

// Test assertion helper
function assert(condition, testName, expectedValue, actualValue) {
  if (condition) {
    testResults.passed++;
    log(`✅ PASS: ${testName}`, 'TEST');
    testResults.details.push({
      status: 'PASS',
      test: testName,
      expected: expectedValue,
      actual: actualValue
    });
  } else {
    testResults.failed++;
    const errorMsg = `❌ FAIL: ${testName} - Expected: ${expectedValue}, Got: ${actualValue}`;
    log(errorMsg, 'TEST');
    testResults.errors.push(errorMsg);
    testResults.details.push({
      status: 'FAIL',
      test: testName,
      expected: expectedValue,
      actual: actualValue
    });
  }
}

// Supabase client helper
async function supabaseRequest(method, table, data = null, filter = null) {
  return new Promise((resolve, reject) => {
    let url = `${config.supabaseUrl}/rest/v1/${table}`;
    if (filter) {
      url += `?${filter}`;
    }

    const options = {
      method: method,
      headers: {
        'apikey': config.supabaseKey,
        'Authorization': `Bearer ${config.supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    if (data && (method === 'POST' || method === 'PATCH')) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      log(`Sending ${method} request with data: ${jsonData}`, 'DEBUG');
    }

    const req = https.request(url, options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : null;
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data && (method === 'POST' || method === 'PATCH')) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test 1: Database Connection Test
async function testDatabaseConnection() {
  log('🔌 Testing database connection...', 'TEST');

  try {
    const response = await supabaseRequest('GET', 'properties', null, 'limit=1');
    assert(
      response.status === 200,
      'Database connection successful',
      '200 status code',
      response.status
    );

    assert(
      Array.isArray(response.data),
      'Database returns array response',
      'array',
      typeof response.data
    );

  } catch (error) {
    assert(false, 'Database connection test', 'successful connection', `Connection failed: ${error.message}`);
  }
}

// Test 2: Properties Table Structure Validation
async function testPropertiesTableStructure() {
  log('🏗️ Testing properties table structure...', 'TEST');

  try {
    // Get a property to validate structure
    const response = await supabaseRequest('GET', 'properties', null, 'limit=1');

    if (response.data && response.data.length > 0) {
      const property = response.data[0];
      config.testPropertyId = property.property_id;

      // Check required fields
      const requiredFields = ['property_id', 'property_name', 'created_at'];
      requiredFields.forEach(field => {
        assert(
          property.hasOwnProperty(field),
          `Properties table has ${field} field`,
          'field exists',
          property.hasOwnProperty(field) ? 'field exists' : 'field missing'
        );
      });

      // Check field types
      log(`Property sample data: ${JSON.stringify(property, null, 2)}`, 'DEBUG');

      assert(
        typeof property.property_id === 'string',
        'property_id is string type',
        'string',
        typeof property.property_id
      );

      // property_name can be null in the database, so we need to handle that
      const propertyNameType = property.property_name === null ? 'null' : typeof property.property_name;
      assert(
        property.property_name === null || typeof property.property_name === 'string',
        'property_name is string type or null',
        'string or null',
        `${propertyNameType} - Value: ${JSON.stringify(property.property_name)}`
      );
    }

  } catch (error) {
    assert(false, 'Properties table structure test', 'valid structure', `Error: ${error.message}`);
  }
}

// Test 3: Related Tables Test
async function testRelatedTables() {
  log('🔗 Testing related tables...', 'TEST');

  const relatedTables = [
    'property_location',
    'property_communication',
    'property_access',
    'property_extras',
    'property_images',
    'property_providers',
    'property_financial_entries'
  ];

  for (const table of relatedTables) {
    try {
      const response = await supabaseRequest('GET', table, null, 'limit=1');
      assert(
        response.status === 200,
        `${table} table accessible`,
        '200 status code',
        response.status
      );
    } catch (error) {
      assert(false, `${table} table test`, 'table accessible', `Error: ${error.message}`);
    }
  }
}

// Test 4: Property CRUD Operations
async function testPropertyCRUD() {
  log('🔄 Testing property CRUD operations...', 'TEST');

  // First, get a valid owner_id from an existing property
  let ownerId = null;
  try {
    const existingPropertiesResponse = await supabaseRequest('GET', 'properties', null, 'limit=1');
    if (existingPropertiesResponse.data && existingPropertiesResponse.data.length > 0) {
      ownerId = existingPropertiesResponse.data[0].owner_id;
      log(`Using existing owner_id for tests: ${ownerId}`, 'DEBUG');
    }
  } catch (error) {
    log(`Warning: Could not get existing owner_id: ${error.message}`, 'WARN');
  }

  // Test data - include owner_id if we found one
  const testProperty = {
    property_name: `Test Property ${Date.now()}`,
    property_type: 'Apartment',
    is_active: true,
    is_booking: false,
    is_pets_allowed: true,
    ...(ownerId && { owner_id: ownerId })
  };

  let createdPropertyId = null;

  try {
    // CREATE test
    log('Testing property creation...', 'TEST');
    const createResponse = await supabaseRequest('POST', 'properties', testProperty);

    log(`Create response: Status ${createResponse.status}, Data: ${JSON.stringify(createResponse.data)}`, 'DEBUG');

    assert(
      createResponse.status === 201,
      'Property creation successful',
      '201 status code',
      `${createResponse.status} - ${JSON.stringify(createResponse.data)}`
    );

    if (createResponse.data && createResponse.data.length > 0) {
      createdPropertyId = createResponse.data[0].property_id;

      assert(
        createResponse.data[0].property_name === testProperty.property_name,
        'Created property has correct name',
        testProperty.property_name,
        createResponse.data[0].property_name
      );
    }

    // READ test
    if (createdPropertyId) {
      log('Testing property read...', 'TEST');
      const readResponse = await supabaseRequest('GET', 'properties', null, `property_id=eq.${createdPropertyId}`);

      assert(
        readResponse.status === 200,
        'Property read successful',
        '200 status code',
        readResponse.status
      );

      assert(
        readResponse.data.length === 1,
        'Property found by ID',
        '1 record',
        `${readResponse.data.length} records`
      );
    }

    // UPDATE test
    if (createdPropertyId) {
      log('Testing property update...', 'TEST');
      const updateData = { property_name: `Updated Test Property ${Date.now()}` };
      const updateResponse = await supabaseRequest('PATCH', 'properties', updateData, `property_id=eq.${createdPropertyId}`);

      assert(
        updateResponse.status === 200,
        'Property update successful',
        '200 status code',
        updateResponse.status
      );
    }

    // DELETE test
    if (createdPropertyId) {
      log('Testing property deletion...', 'TEST');
      const deleteResponse = await supabaseRequest('DELETE', 'properties', null, `property_id=eq.${createdPropertyId}`);

      // Supabase may return 200 or 204 for successful deletion
      assert(
        deleteResponse.status === 204 || deleteResponse.status === 200,
        'Property deletion successful',
        '200 or 204 status code',
        deleteResponse.status
      );
    }

  } catch (error) {
    assert(false, 'Property CRUD operations', 'all operations successful', `Error: ${error.message}`);
  }
}

// Test 5: Related Tables CRUD with Property
async function testRelatedTablesCRUD() {
  log('🏢 Testing related tables CRUD operations...', 'TEST');

  // First, get a valid owner_id
  let ownerId = null;
  try {
    const existingPropertiesResponse = await supabaseRequest('GET', 'properties', null, 'limit=1');
    if (existingPropertiesResponse.data && existingPropertiesResponse.data.length > 0) {
      ownerId = existingPropertiesResponse.data[0].owner_id;
    }
  } catch (error) {
    log(`Warning: Could not get existing owner_id: ${error.message}`, 'WARN');
  }

  // Create a test property first
  const testProperty = {
    property_name: `Test Property for Relations ${Date.now()}`,
    property_type: 'House',
    is_active: true,
    ...(ownerId && { owner_id: ownerId })
  };

  let propertyId = null;

  try {
    const createPropertyResponse = await supabaseRequest('POST', 'properties', testProperty);
    if (createPropertyResponse.data && createPropertyResponse.data.length > 0) {
      propertyId = createPropertyResponse.data[0].property_id;

      // Test property_location
      const locationData = {
        property_id: propertyId,
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        postal_code: '12345',
        latitude: 40.7128,
        longitude: -74.0060
      };

      const locationResponse = await supabaseRequest('POST', 'property_location', locationData);
      assert(
        locationResponse.status === 201,
        'Property location creation successful',
        '201 status code',
        locationResponse.status
      );

      // Test property_communication
      const commData = {
        property_id: propertyId,
        phone_number: '+1234567890',
        wifi_name: 'TestWiFi',
        wifi_password: 'testpass123'
      };

      const commResponse = await supabaseRequest('POST', 'property_communication', commData);
      assert(
        commResponse.status === 201,
        'Property communication creation successful',
        '201 status code',
        commResponse.status
      );

      // Test property_access
      const accessData = {
        property_id: propertyId,
        gate_code: '1234',
        door_lock_password: '5678',
        alarm_passcode: '9999'
      };

      const accessResponse = await supabaseRequest('POST', 'property_access', accessData);
      assert(
        accessResponse.status === 201,
        'Property access creation successful',
        '201 status code',
        accessResponse.status
      );

      // Cleanup - delete the test property and related data
      await supabaseRequest('DELETE', 'property_location', null, `property_id=eq.${propertyId}`);
      await supabaseRequest('DELETE', 'property_communication', null, `property_id=eq.${propertyId}`);
      await supabaseRequest('DELETE', 'property_access', null, `property_id=eq.${propertyId}`);
      await supabaseRequest('DELETE', 'properties', null, `property_id=eq.${propertyId}`);
    }

  } catch (error) {
    assert(false, 'Related tables CRUD test', 'all operations successful', `Error: ${error.message}`);
  }
}

// Test 6: Data Validation Tests
async function testDataValidation() {
  log('✅ Testing data validation...', 'TEST');

  // First, get a valid owner_id
  let ownerId = null;
  try {
    const existingPropertiesResponse = await supabaseRequest('GET', 'properties', null, 'limit=1');
    if (existingPropertiesResponse.data && existingPropertiesResponse.data.length > 0) {
      ownerId = existingPropertiesResponse.data[0].owner_id;
    }
  } catch (error) {
    log(`Warning: Could not get existing owner_id: ${error.message}`, 'WARN');
  }

  try {
    // Test invalid property creation (missing required fields)
    const invalidProperty = {
      property_type: 'Apartment'
      // Missing property_name and owner_id
    };

    const invalidResponse = await supabaseRequest('POST', 'properties', invalidProperty);

    // This should fail due to missing required fields
    assert(
      invalidResponse.status >= 400,
      'Invalid property creation properly rejected',
      'error status code (>=400)',
      invalidResponse.status
    );

    // Test valid property with all required fields
    const validProperty = {
      property_name: `Valid Test Property ${Date.now()}`,
      property_type: 'Apartment',
      is_active: true,
      ...(ownerId && { owner_id: ownerId })
    };

    const validResponse = await supabaseRequest('POST', 'properties', validProperty);

    if (ownerId) {
      assert(
        validResponse.status === 201,
        'Valid property creation successful',
        '201 status code',
        validResponse.status
      );
    } else {
      // If no owner_id available, we expect it to fail
      assert(
        validResponse.status >= 400,
        'Property creation properly rejected without owner_id',
        'error status code (>=400)',
        validResponse.status
      );
    }

    // Cleanup
    if (validResponse.data && validResponse.data.length > 0) {
      const propertyId = validResponse.data[0].property_id;
      await supabaseRequest('DELETE', 'properties', null, `property_id=eq.${propertyId}`);
    }

  } catch (error) {
    assert(false, 'Data validation test', 'proper validation behavior', `Error: ${error.message}`);
  }
}

// Test 7: Performance Test
async function testPerformance() {
  log('⚡ Testing performance...', 'TEST');

  try {
    const startTime = Date.now();

    // Simulate loading a property with all related data
    if (config.testPropertyId) {
      await Promise.all([
        supabaseRequest('GET', 'properties', null, `property_id=eq.${config.testPropertyId}`),
        supabaseRequest('GET', 'property_location', null, `property_id=eq.${config.testPropertyId}`),
        supabaseRequest('GET', 'property_communication', null, `property_id=eq.${config.testPropertyId}`),
        supabaseRequest('GET', 'property_access', null, `property_id=eq.${config.testPropertyId}`),
        supabaseRequest('GET', 'property_extras', null, `property_id=eq.${config.testPropertyId}`)
      ]);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    assert(
      duration < 5000, // Should complete within 5 seconds
      'Property data loading performance acceptable',
      'under 5000ms',
      `${duration}ms`
    );

  } catch (error) {
    assert(false, 'Performance test', 'acceptable response time', `Error: ${error.message}`);
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting Properties Module Automated Tests', 'SYSTEM');
  log('==========================================', 'SYSTEM');

  // Initialize log file
  fs.writeFileSync(config.logFile, `Properties Module Test Results - ${new Date().toISOString()}\n`);
  fs.appendFileSync(config.logFile, '='.repeat(80) + '\n\n');

  try {
    await testDatabaseConnection();
    await testPropertiesTableStructure();
    await testRelatedTables();
    await testPropertyCRUD();
    await testRelatedTablesCRUD();
    await testDataValidation();
    await testPerformance();

  } catch (error) {
    log(`Unexpected error during testing: ${error.message}`, 'ERROR');
    testResults.failed++;
    testResults.errors.push(`Unexpected error: ${error.message}`);
  }

  // Generate final report
  log('==========================================', 'SYSTEM');
  log('🏁 Test Results Summary', 'SYSTEM');
  log('==========================================', 'SYSTEM');
  log(`✅ Tests Passed: ${testResults.passed}`, 'RESULT');
  log(`❌ Tests Failed: ${testResults.failed}`, 'RESULT');
  log(`📊 Total Tests: ${testResults.passed + testResults.failed}`, 'RESULT');
  log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`, 'RESULT');

  if (testResults.errors.length > 0) {
    log('\n🔍 Failed Tests Details:', 'SYSTEM');
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`, 'ERROR');
    });
  }

  // Write detailed results to file
  fs.appendFileSync(config.logFile, '\n' + '='.repeat(80) + '\n');
  fs.appendFileSync(config.logFile, 'DETAILED TEST RESULTS:\n');
  fs.appendFileSync(config.logFile, '='.repeat(80) + '\n');

  testResults.details.forEach((result, index) => {
    fs.appendFileSync(config.logFile, `${index + 1}. [${result.status}] ${result.test}\n`);
    fs.appendFileSync(config.logFile, `   Expected: ${result.expected}\n`);
    fs.appendFileSync(config.logFile, `   Actual: ${result.actual}\n\n`);
  });

  log(`\n📋 Detailed results saved to: ${config.logFile}`, 'SYSTEM');

  // Return exit code based on test results
  const exitCode = testResults.failed > 0 ? 1 : 0;
  log(`\n🚪 Exiting with code: ${exitCode}`, 'SYSTEM');

  return {
    passed: testResults.passed,
    failed: testResults.failed,
    errors: testResults.errors,
    exitCode: exitCode
  };
}

// Export for module use or run directly
if (require.main === module) {
  runTests().then((results) => {
    process.exit(results.exitCode);
  }).catch((error) => {
    console.error('Fatal error during testing:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testResults, config };