/**
 * Security Headers Testing Script
 * Tests that all security headers are properly configured
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Define expected security headers
const REQUIRED_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': /max-age=\d+/,
  'Content-Security-Policy': /default-src/,
  'X-DNS-Prefetch-Control': 'on',
  'X-Download-Options': 'noopen',
  'Permissions-Policy': /camera=\(\)/,
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

interface TestResult {
  header: string;
  expected: string | RegExp;
  actual: string | undefined;
  passed: boolean;
}

/**
 * Test headers from a URL
 */
async function testHeaders(url: string): Promise<TestResult[]> {
  console.log(`${colors.blue}Testing headers from: ${url}${colors.reset}\n`);

  try {
    // Fetch headers using curl
    const { stdout } = await execAsync(`curl -sI "${url}"`);

    // Parse headers
    const headers: Record<string, string> = {};
    stdout.split('\n').forEach(line => {
      const match = line.match(/^([^:]+):\s*(.+)\r?$/);
      if (match) {
        headers[match[1].toLowerCase()] = match[2];
      }
    });

    // Test each required header
    const results: TestResult[] = [];
    for (const [header, expected] of Object.entries(REQUIRED_HEADERS)) {
      const actualHeader = headers[header.toLowerCase()];
      let passed = false;

      if (expected instanceof RegExp) {
        passed = actualHeader ? expected.test(actualHeader) : false;
      } else {
        passed = actualHeader === expected;
      }

      results.push({
        header,
        expected: expected instanceof RegExp ? expected.toString() : expected,
        actual: actualHeader,
        passed,
      });
    }

    return results;
  } catch (error) {
    console.error(`${colors.red}Error testing headers:${colors.reset}`, error);
    return [];
  }
}

/**
 * Print test results
 */
function printResults(results: TestResult[], title: string) {
  console.log(`\n${colors.blue}=== ${title} ===${colors.reset}\n`);

  let passedCount = 0;
  let failedCount = 0;

  results.forEach(result => {
    const status = result.passed
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`;

    console.log(`${status} ${result.header}`);

    if (!result.passed) {
      console.log(`  Expected: ${colors.yellow}${result.expected}${colors.reset}`);
      console.log(`  Actual:   ${colors.yellow}${result.actual || 'Not set'}${colors.reset}`);
    } else {
      console.log(`  Value: ${colors.green}${result.actual}${colors.reset}`);
    }

    if (result.passed) passedCount++;
    else failedCount++;
  });

  console.log(`\n${colors.blue}Summary:${colors.reset}`);
  console.log(`  ${colors.green}Passed: ${passedCount}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${failedCount}${colors.reset}`);

  return { passedCount, failedCount };
}

/**
 * Test Content Security Policy
 */
function testCSP(csp: string | undefined): void {
  console.log(`\n${colors.blue}=== Content Security Policy Analysis ===${colors.reset}\n`);

  if (!csp) {
    console.log(`${colors.red}✗ No CSP header found${colors.reset}`);
    return;
  }

  const directives = csp.split(';').map(d => d.trim());
  const requiredDirectives = [
    'default-src',
    'script-src',
    'style-src',
    'img-src',
    'connect-src',
    'form-action',
    'frame-ancestors',
  ];

  requiredDirectives.forEach(directive => {
    const hasDirective = directives.some(d => d.startsWith(directive));
    const status = hasDirective
      ? `${colors.green}✓${colors.reset}`
      : `${colors.yellow}⚠${colors.reset}`;

    console.log(`${status} ${directive}`);

    if (hasDirective) {
      const value = directives.find(d => d.startsWith(directive));
      console.log(`  ${colors.green}${value}${colors.reset}`);
    }
  });

  // Check for unsafe directives
  console.log(`\n${colors.yellow}Security Warnings:${colors.reset}`);

  if (csp.includes("'unsafe-inline'")) {
    console.log(`  ⚠ 'unsafe-inline' is present (reduces XSS protection)`);
  }

  if (csp.includes("'unsafe-eval'")) {
    console.log(`  ⚠ 'unsafe-eval' is present (allows code execution)`);
  }

  if (csp.includes('*')) {
    console.log(`  ⚠ Wildcard (*) sources detected (overly permissive)`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║    Security Headers Test Suite         ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);

  const environments = [
    {
      name: 'Development Server',
      url: 'http://localhost:8080',
      command: 'npm run dev',
    },
    {
      name: 'Preview Server',
      url: 'http://localhost:4173',
      command: 'npm run preview',
    },
  ];

  for (const env of environments) {
    console.log(`\n${colors.blue}Testing ${env.name}...${colors.reset}`);
    console.log(`Run '${colors.yellow}${env.command}${colors.reset}' and then test ${env.url}\n`);

    // Check if server is running
    try {
      await execAsync(`curl -f -s -o /dev/null "${env.url}"`);
      const results = await testHeaders(env.url);
      const { passedCount, failedCount } = printResults(results, env.name);

      // Test CSP specifically
      const cspResult = results.find(r => r.header === 'Content-Security-Policy');
      testCSP(cspResult?.actual);

      // Overall result
      if (failedCount === 0) {
        console.log(`\n${colors.green}✅ All security headers are properly configured!${colors.reset}`);
      } else {
        console.log(`\n${colors.red}❌ Some security headers are missing or misconfigured.${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ Server not running at ${env.url}${colors.reset}`);
      console.log(`  Run '${colors.yellow}${env.command}${colors.reset}' first, then re-run this test\n`);
    }
  }

  // Production configuration check
  console.log(`\n${colors.blue}=== Production Configuration Check ===${colors.reset}\n`);

  console.log('Checking vercel.json...');
  try {
    const vercelConfig = require('../vercel.json');
    const hasHeaders = vercelConfig.headers && vercelConfig.headers.length > 0;

    if (hasHeaders) {
      console.log(`${colors.green}✓ Vercel configuration has security headers${colors.reset}`);

      // Check specific headers
      const globalHeaders = vercelConfig.headers.find((h: any) => h.source === '/(.*)');
      if (globalHeaders) {
        const headerNames = globalHeaders.headers.map((h: any) => h.key);
        Object.keys(REQUIRED_HEADERS).forEach(header => {
          const hasHeader = headerNames.includes(header);
          const status = hasHeader
            ? `${colors.green}✓${colors.reset}`
            : `${colors.red}✗${colors.reset}`;
          console.log(`  ${status} ${header}`);
        });
      }
    } else {
      console.log(`${colors.red}✗ No security headers in Vercel configuration${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Could not read vercel.json${colors.reset}`);
  }

  // Recommendations
  console.log(`\n${colors.blue}=== Recommendations ===${colors.reset}\n`);
  console.log(`1. ${colors.yellow}Test in production:${colors.reset}`);
  console.log('   After deployment, run: npx securityheaders.com <production-url>\n');

  console.log(`2. ${colors.yellow}Monitor CSP violations:${colors.reset}`);
  console.log('   Consider adding report-uri or report-to directives\n');

  console.log(`3. ${colors.yellow}Regular audits:${colors.reset}`);
  console.log('   Run this test before each deployment\n');

  console.log(`4. ${colors.yellow}Online tools:${colors.reset}`);
  console.log('   - https://securityheaders.com');
  console.log('   - https://observatory.mozilla.org');
  console.log('   - https://csp-evaluator.withgoogle.com\n');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { testHeaders, testCSP, runTests };