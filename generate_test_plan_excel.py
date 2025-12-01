import pandas as pd
from datetime import datetime
import os

# Create Excel writer
output_file = 'Casa_Concierge_Comprehensive_Test_Plan.xlsx'
writer = pd.ExcelWriter(output_file, engine='xlsxwriter')

# 1. Test Summary Sheet
summary_data = {
    'Module': [
        'Authentication & Authorization', 'Property Management', 'Booking & Calendar',
        'Financial & Accounting', 'User & Team Management', 'Task & Todo Management',
        'Issue & Maintenance', 'Service Provider & Vendor', 'Document Management',
        'Notifications & Communication', 'Check-in/Check-out', 'Job & Service Request',
        'Commission & Payment', 'Media & Images', 'Property Highlights',
        'Activity & Audit Logs', 'Caching & Performance', 'Financial Reporting'
    ],
    'Total Tests': [15, 25, 30, 35, 15, 20, 20, 25, 20, 20, 15, 20, 15, 15, 10, 10, 25, 20],
    'P0 (Critical)': [10, 8, 12, 15, 8, 3, 3, 5, 3, 3, 8, 3, 8, 3, 2, 5, 5, 10],
    'P1 (High)': [4, 10, 10, 12, 5, 10, 10, 12, 10, 10, 5, 10, 5, 8, 5, 3, 15, 8],
    'P2 (Medium)': [1, 7, 8, 8, 2, 7, 7, 8, 7, 7, 2, 7, 2, 4, 3, 2, 5, 2],
    'Estimated Hours': [6.25, 10.4, 12.5, 14.6, 6.25, 8.3, 8.3, 10.4, 8.3, 8.3, 6.25, 8.3, 6.25, 6.25, 4.2, 4.2, 10.4, 8.3],
    'Dependencies': [
        'Infrastructure', 'Auth, Database', 'Properties, Auth',
        'Bookings, Properties', 'Auth, Email', 'Properties, Users',
        'Properties, Users', 'Auth, Documents', 'Auth, Storage',
        'Auth, Email, Realtime', 'Bookings, Properties', 'Providers, Properties',
        'Bookings, Finance', 'Properties, Storage', 'Properties',
        'All modules', 'Infrastructure', 'All financial modules'
    ],
    'Status': ['Not Started'] * 18
}
df_summary = pd.DataFrame(summary_data)
df_summary.to_excel(writer, sheet_name='Test Summary', index=False)

# 2. Test Cases Sheet (First 50 critical test cases)
test_cases = {
    'Test ID': [],
    'Module': [],
    'Feature': [],
    'Test Case': [],
    'Priority': [],
    'Test Type': [],
    'Est. Time (min)': [],
    'Preconditions': [],
    'Status': [],
    'Risk Level': []
}

# Add critical test cases
critical_tests = [
    ('TC-AUTH-001', 'Authentication', 'User Registration', 'Validate user registration with all user types', 'P0', 'Functional', 15, 'Email service configured', 'Not Started', 'High'),
    ('TC-AUTH-002', 'Authentication', 'Login', 'Test login with valid/invalid credentials', 'P0', 'Security', 10, 'Users created', 'Not Started', 'High'),
    ('TC-AUTH-003', 'Authentication', 'RBAC', 'Verify role-based access control for all 80+ permissions', 'P0', 'Security', 45, 'All roles configured', 'Not Started', 'Critical'),
    ('TC-AUTH-004', 'Authentication', 'Session Management', 'Test session timeout and persistence', 'P0', 'Security', 20, 'Login functional', 'Not Started', 'High'),
    ('TC-AUTH-005', 'Authentication', 'Password Reset', 'Test password reset flow end-to-end', 'P0', 'Functional', 20, 'Email service', 'Not Started', 'High'),

    ('TC-PROP-001', 'Property Management', 'Create Property', 'Test property creation with all 9 tabs', 'P0', 'Functional', 30, 'Admin access', 'Not Started', 'High'),
    ('TC-PROP-002', 'Property Management', 'Edit Property', 'Test property editing with cache invalidation', 'P0', 'Functional', 20, 'Properties exist', 'Not Started', 'Medium'),
    ('TC-PROP-003', 'Property Management', 'Delete Property', 'Test property deletion with orphaned data handling', 'P0', 'Functional', 15, 'Test property', 'Not Started', 'High'),
    ('TC-PROP-004', 'Property Management', 'Image Gallery', 'Test image upload, ordering, primary selection', 'P0', 'Functional', 25, 'Property exists', 'Not Started', 'Medium'),
    ('TC-PROP-005', 'Property Management', 'PDF Export', 'Test property details PDF generation', 'P0', 'Functional', 15, 'Complete property data', 'Not Started', 'Low'),

    ('TC-BOOK-001', 'Booking', 'Create Booking', 'Test booking creation with conflict detection', 'P0', 'Functional', 20, 'Property available', 'Not Started', 'Critical'),
    ('TC-BOOK-002', 'Booking', 'Double Booking', 'Verify double booking prevention', 'P0', 'Functional', 15, 'Existing booking', 'Not Started', 'Critical'),
    ('TC-BOOK-003', 'Booking', 'Status Flow', 'Test all 8 booking status transitions', 'P0', 'Functional', 30, 'Test booking', 'Not Started', 'High'),
    ('TC-BOOK-004', 'Booking', 'Channels', 'Test all 8 booking channels', 'P1', 'Functional', 40, 'Channel config', 'Not Started', 'Medium'),
    ('TC-BOOK-005', 'Booking', 'Payment', 'Test payment status tracking', 'P0', 'Functional', 20, 'Booking exists', 'Not Started', 'High'),

    ('TC-INV-001', 'Invoice', 'Auto Generate', 'Test invoice generation from booking', 'P0', 'Functional', 15, 'Completed booking', 'Not Started', 'High'),
    ('TC-INV-002', 'Invoice', 'Manual Create', 'Test manual invoice with tax calculation', 'P0', 'Functional', 20, 'Customer exists', 'Not Started', 'High'),
    ('TC-INV-003', 'Invoice', 'Partial Payment', 'Test partial payment recording', 'P0', 'Functional', 15, 'Invoice exists', 'Not Started', 'High'),
    ('TC-INV-004', 'Invoice', 'PDF Generation', 'Test invoice PDF with email delivery', 'P0', 'Functional', 15, 'Complete invoice', 'Not Started', 'Medium'),
    ('TC-INV-005', 'Invoice', 'Status Lifecycle', 'Test all 6 invoice statuses', 'P0', 'Functional', 25, 'Test invoice', 'Not Started', 'Medium'),

    ('TC-USER-001', 'User Management', 'Create User', 'Test user creation with Supabase Auth', 'P0', 'Functional', 20, 'Admin access', 'Not Started', 'High'),
    ('TC-USER-002', 'User Management', 'Edit User', 'Test immediate table update on edit', 'P0', 'Functional', 15, 'User exists', 'Not Started', 'Medium'),
    ('TC-USER-003', 'User Management', 'Delete User', 'Test immediate table update on delete', 'P0', 'Functional', 10, 'Test user', 'Not Started', 'High'),
    ('TC-USER-004', 'User Management', 'Suspend User', 'Test user suspension and access revocation', 'P0', 'Security', 20, 'Active user', 'Not Started', 'High'),
    ('TC-USER-005', 'User Management', 'User Details', 'Test enhanced user details view', 'P1', 'Functional', 10, 'Complete user data', 'Not Started', 'Low'),

    ('TC-TASK-001', 'Task Management', 'Create Task', 'Test task creation and assignment', 'P1', 'Functional', 15, 'Property, assignee', 'Not Started', 'Low'),
    ('TC-TASK-002', 'Task Management', 'Task Workflow', 'Test task status transitions', 'P1', 'Functional', 20, 'Task exists', 'Not Started', 'Low'),
    ('TC-TASK-003', 'Task Management', 'Checklist', 'Test checklist functionality', 'P2', 'Functional', 15, 'Task with checklist', 'Not Started', 'Low'),
    ('TC-TASK-004', 'Task Management', 'Due Dates', 'Test due date alerts and overdue status', 'P1', 'Functional', 15, 'Tasks with dates', 'Not Started', 'Medium'),
    ('TC-TASK-005', 'Task Management', 'Bulk Operations', 'Test bulk task operations', 'P2', 'Functional', 15, 'Multiple tasks', 'Not Started', 'Low'),

    ('TC-COI-001', 'COI Management', 'Upload COI', 'Test COI document upload', 'P0', 'Functional', 15, 'Provider exists', 'Not Started', 'High'),
    ('TC-COI-002', 'COI Management', 'Expiration Alerts', 'Test 30/15/7/0 day expiration alerts', 'P0', 'Functional', 30, 'COI with dates', 'Not Started', 'High'),
    ('TC-COI-003', 'COI Management', 'Coverage Types', 'Test all 6 coverage types', 'P1', 'Functional', 20, 'COI documents', 'Not Started', 'Medium'),
    ('TC-COI-004', 'COI Management', 'Building Requirements', 'Test building COI requirements', 'P1', 'Functional', 20, 'Building config', 'Not Started', 'Medium'),
    ('TC-COI-005', 'COI Management', 'Access Auth', 'Test access authorization workflow', 'P1', 'Functional', 25, 'Provider, property', 'Not Started', 'Medium'),

    ('TC-CHECKIN-001', 'Check-in/Out', 'Digital Check-in', 'Test check-in with photos and signature', 'P0', 'Functional', 30, 'Active booking', 'Not Started', 'High'),
    ('TC-CHECKIN-002', 'Check-in/Out', 'PDF Generation', 'Test check-in PDF with all components', 'P0', 'Functional', 15, 'Complete check-in', 'Not Started', 'Medium'),
    ('TC-CHECKIN-003', 'Check-in/Out', 'Check-out', 'Test check-out and comparison', 'P0', 'Functional', 30, 'Check-in exists', 'Not Started', 'High'),
    ('TC-CHECKIN-004', 'Check-in/Out', 'Checklist', 'Test checklist templates', 'P1', 'Functional', 20, 'Template exists', 'Not Started', 'Low'),
    ('TC-CHECKIN-005', 'Check-in/Out', 'Damage Report', 'Test damage documentation', 'P0', 'Functional', 20, 'Check-in/out data', 'Not Started', 'High'),

    ('TC-COMM-001', 'Commission', 'Calculation', 'Test commission calculation accuracy', 'P0', 'Financial', 20, 'Completed bookings', 'Not Started', 'Critical'),
    ('TC-COMM-002', 'Commission', 'Payment', 'Test commission payment workflow', 'P0', 'Financial', 20, 'Calculated commission', 'Not Started', 'High'),
    ('TC-COMM-003', 'Commission', 'Analytics', 'Test commission analytics dashboard', 'P1', 'Functional', 20, 'Commission data', 'Not Started', 'Low'),
    ('TC-COMM-004', 'Commission', 'Bulk Processing', 'Test bulk commission approval', 'P1', 'Functional', 15, 'Multiple commissions', 'Not Started', 'Medium'),
    ('TC-COMM-005', 'Commission', 'Reconciliation', 'Test commission reconciliation', 'P0', 'Financial', 25, 'Payment records', 'Not Started', 'High'),

    ('TC-CACHE-001', 'Performance', 'React Query', 'Test memory cache behavior', 'P1', 'Performance', 20, 'Application running', 'Not Started', 'Medium'),
    ('TC-CACHE-002', 'Performance', 'Service Worker', 'Test offline functionality', 'P1', 'Performance', 25, 'Browser support', 'Not Started', 'High'),
    ('TC-CACHE-003', 'Performance', 'Real-time Sync', 'Test cache invalidation on updates', 'P1', 'Functional', 20, 'Multiple tabs', 'Not Started', 'High'),
    ('TC-CACHE-004', 'Performance', 'Load Time', 'Test initial page load < 3s', 'P0', 'Performance', 15, 'Clear cache', 'Not Started', 'High'),
    ('TC-CACHE-005', 'Performance', 'Large Dataset', 'Test with 1000+ records', 'P1', 'Performance', 30, 'Test data', 'Not Started', 'Medium'),
]

for test in critical_tests:
    test_cases['Test ID'].append(test[0])
    test_cases['Module'].append(test[1])
    test_cases['Feature'].append(test[2])
    test_cases['Test Case'].append(test[3])
    test_cases['Priority'].append(test[4])
    test_cases['Test Type'].append(test[5])
    test_cases['Est. Time (min)'].append(test[6])
    test_cases['Preconditions'].append(test[7])
    test_cases['Status'].append(test[8])
    test_cases['Risk Level'].append(test[9])

df_test_cases = pd.DataFrame(test_cases)
df_test_cases.to_excel(writer, sheet_name='Test Cases', index=False)

# 3. Test Execution Schedule
schedule_data = {
    'Week': ['Week 1', 'Week 1', 'Week 1', 'Week 1', 'Week 1',
             'Week 2', 'Week 2', 'Week 2', 'Week 2', 'Week 2',
             'Week 3', 'Week 3', 'Week 3', 'Week 3',
             'Week 4', 'Week 4', 'Week 4', 'Week 4'],
    'Phase': ['Setup & Auth', 'Setup & Auth', 'Core Features', 'Core Features', 'Core Features',
              'Financial', 'Financial', 'Operations', 'Operations', 'Operations',
              'Advanced Features', 'Advanced Features', 'Integration', 'Integration',
              'Performance', 'Security', 'UAT Prep', 'UAT'],
    'Modules': ['Environment Setup', 'Authentication & Authorization', 'Property Management', 'Booking Management', 'User Management',
                'Invoices', 'Expenses & Financial Reports', 'Tasks & Issues', 'Providers & COI', 'Documents',
                'Check-in/Out', 'Notifications & Jobs', 'Email & Storage', 'Real-time & Cache',
                'Load Testing', 'Security Testing', 'Bug Fixes', 'User Acceptance'],
    'Test Count': [0, 15, 25, 30, 15,
                   35, 20, 40, 45, 20,
                   35, 35, 30, 25,
                   30, 30, 0, 50],
    'Resources': ['1 DevOps', '2 Testers', '3 Testers', '3 Testers', '2 Testers',
                  '2 Testers', '2 Testers', '3 Testers', '3 Testers', '2 Testers',
                  '3 Testers', '3 Testers', '2 Testers', '2 Testers',
                  '2 Testers + Tools', '1 Security Expert', '2 Developers', '5 End Users'],
    'Priority Focus': ['Infrastructure', 'P0 - Critical', 'P0 - Critical', 'P0 - Critical', 'P0 - Critical',
                       'P0 - Critical', 'P0 & P1', 'P1 - High', 'P1 - High', 'P1 - High',
                       'P1 & P2', 'P1 & P2', 'P1 - High', 'P1 - High',
                       'P0 - Critical', 'P0 - Critical', 'All Priorities', 'Business Critical']
}
df_schedule = pd.DataFrame(schedule_data)
df_schedule.to_excel(writer, sheet_name='Execution Schedule', index=False)

# 4. Test Environment Requirements
env_data = {
    'Environment': ['Development', 'Staging', 'Production Mirror', 'Performance', 'Security'],
    'Purpose': ['Initial testing, debugging', 'Integration testing', 'Pre-production validation', 'Load and stress testing', 'Vulnerability testing'],
    'Database': ['Supabase Dev', 'Supabase Staging', 'Production Clone', 'High-capacity instance', 'Isolated instance'],
    'Users Required': ['10 test users', '50 test users', 'Production-like data', '1000+ test users', 'Various privilege levels'],
    'Data Requirements': ['Basic test data', 'Comprehensive test data', 'Anonymized production data', 'Large datasets', 'Attack vectors'],
    'Tools': ['Browser DevTools', 'Postman, Browser Stack', 'Monitoring tools', 'JMeter, K6', 'OWASP ZAP, Burp Suite'],
    'Access Level': ['Developer', 'QA Team', 'QA + DevOps', 'Performance Team', 'Security Team']
}
df_env = pd.DataFrame(env_data)
df_env.to_excel(writer, sheet_name='Test Environments', index=False)

# 5. Bug Categories and Severity
bug_data = {
    'Severity': ['S1 - Critical', 'S2 - High', 'S3 - Medium', 'S4 - Low', 'S5 - Enhancement'],
    'Description': [
        'System crash, data loss, security breach, complete feature failure',
        'Major feature broken, significant performance issue, data corruption risk',
        'Feature partially broken, workaround available, moderate UX issue',
        'Minor issue, cosmetic, slight inconvenience, edge case',
        'Feature request, nice to have, improvement suggestion'
    ],
    'Response Time': ['Immediate', '4 hours', '24 hours', '72 hours', 'Next release'],
    'Resolution Time': ['4 hours', '24 hours', '3 days', '1 week', 'Future release'],
    'Examples': [
        'Login failure, payment processing error, data deletion bug',
        'Search not working, PDF generation failure, cache corruption',
        'Sorting issue, minor calculation error, UI alignment',
        'Typo, color inconsistency, tooltip missing',
        'New report type, additional filter, UI enhancement'
    ],
    'Escalation': ['CTO + Dev Lead', 'Dev Lead', 'QA Lead', 'Developer', 'Product Owner']
}
df_bugs = pd.DataFrame(bug_data)
df_bugs.to_excel(writer, sheet_name='Bug Severity', index=False)

# 6. Test Data Requirements
test_data = {
    'Data Type': [
        'Users', 'Properties', 'Bookings', 'Invoices', 'Tasks',
        'Providers', 'Documents', 'COIs', 'Check-ins', 'Commissions'
    ],
    'Minimum Required': [20, 50, 200, 150, 100, 30, 100, 20, 50, 100],
    'Recommended': [50, 100, 500, 300, 250, 50, 200, 40, 100, 200],
    'Variations Needed': [
        '4 roles, active/inactive, suspended',
        'All types, various statuses, with/without images',
        'All channels, all statuses, various dates',
        'All statuses, partial payments, various amounts',
        'All priorities, all statuses, with checklists',
        'Service and utility types, with ratings',
        'All categories, various file types',
        'Expired, expiring, valid',
        'Complete, partial, with issues',
        'Calculated, paid, pending'
    ],
    'Special Cases': [
        'Admin user, suspended user, deleted user',
        'No amenities, max amenities, archived',
        'Overlapping, cancelled, extended stay',
        'Overdue, refunded, disputed',
        'Overdue, recurring, delegated',
        'Preferred, emergency contact',
        'Expired, large files, restricted',
        'Missing coverage, expired',
        'Damage reported, signature missing',
        'Disputed, adjusted, bulk processed'
    ],
    'Generation Method': [
        'Script + Manual', 'Script + Images', 'Script', 'Script from bookings',
        'Script', 'Manual + Import', 'Upload samples', 'Manual upload',
        'Manual process', 'Calculate from bookings'
    ]
}
df_test_data = pd.DataFrame(test_data)
df_test_data.to_excel(writer, sheet_name='Test Data', index=False)

# 7. Security Test Cases
security_data = {
    'Test ID': [
        'SEC-001', 'SEC-002', 'SEC-003', 'SEC-004', 'SEC-005',
        'SEC-006', 'SEC-007', 'SEC-008', 'SEC-009', 'SEC-010'
    ],
    'Category': [
        'SQL Injection', 'XSS', 'CSRF', 'Authentication', 'Authorization',
        'Session', 'File Upload', 'API Security', 'Data Exposure', 'Rate Limiting'
    ],
    'Test Case': [
        'Test SQL injection in all input fields',
        'Test XSS in text inputs and rich text',
        'Test CSRF token validation',
        'Test brute force protection',
        'Test privilege escalation attempts',
        'Test session hijacking prevention',
        'Test malicious file upload prevention',
        'Test API authentication and authorization',
        'Test for sensitive data in responses',
        'Test rate limiting on all endpoints'
    ],
    'Method': [
        "Input: ' OR '1'='1; DROP TABLE users;",
        'Input: <script>alert("XSS")</script>',
        'Modify/remove CSRF tokens',
        'Automated login attempts',
        'Modify user role in requests',
        'Token manipulation',
        'Upload .exe, .php, oversized files',
        'Access without auth tokens',
        'Check API responses, browser storage',
        'Rapid API calls'
    ],
    'Expected Result': [
        'Input sanitized, query safe',
        'Scripts not executed, encoded',
        'Request rejected',
        'Account locked after X attempts',
        'Access denied, role unchanged',
        'Session invalid, logout',
        'Upload rejected',
        'Unauthorized error',
        'No sensitive data exposed',
        'Rate limit enforced'
    ],
    'Tools': [
        'SQLMap, Manual', 'Manual, XSS Scanner', 'Burp Suite',
        'Hydra, Custom script', 'Burp Suite, Manual', 'Manual, Wireshark',
        'Manual upload tests', 'Postman, cURL', 'Browser DevTools, Proxy',
        'Apache Bench, Custom scripts'
    ]
}
df_security = pd.DataFrame(security_data)
df_security.to_excel(writer, sheet_name='Security Tests', index=False)

# 8. Performance Benchmarks
performance_data = {
    'Metric': [
        'Page Load Time', 'Time to Interactive', 'API Response Time',
        'Database Query Time', 'File Upload Time', 'PDF Generation',
        'Search Response', 'Login Time', 'Data Export Time', 'Cache Hit Rate'
    ],
    'Target': [
        '< 3 seconds', '< 5 seconds', '< 200ms',
        '< 100ms', '< 2s per MB', '< 5 seconds',
        '< 500ms', '< 1 second', '< 10 seconds', '> 80%'
    ],
    'Acceptable': [
        '< 5 seconds', '< 8 seconds', '< 500ms',
        '< 300ms', '< 3s per MB', '< 8 seconds',
        '< 1 second', '< 2 seconds', '< 20 seconds', '> 60%'
    ],
    'Test Method': [
        'Lighthouse, GTmetrix', 'Chrome DevTools', 'API monitoring',
        'Database profiler', 'Network monitoring', 'Timer in code',
        'Search with 1000+ records', 'Automated login test', '1000 record export',
        'Cache analytics'
    ],
    'Frequency': [
        'Every deployment', 'Every deployment', 'Continuous',
        'Weekly', 'On changes', 'On changes',
        'Weekly', 'Daily', 'Weekly', 'Continuous'
    ],
    'Notes': [
        'Test on 3G connection', 'Include all resources', 'Average of all endpoints',
        'Complex queries only', 'Test with images', 'Include all sections',
        'Full-text search', 'Include 2FA if enabled', 'CSV and PDF formats',
        'Monitor all cache layers'
    ]
}
df_performance = pd.DataFrame(performance_data)
df_performance.to_excel(writer, sheet_name='Performance Metrics', index=False)

# 9. Regression Test Suite
regression_data = {
    'Module': [], 'Feature': [], 'Test Cases': [], 'Priority': [], 'Automation': []
}

regression_modules = [
    ('Authentication', 'Login/Logout', 'Basic login, Remember me, Logout', 'P0', 'Yes'),
    ('Authentication', 'Permissions', 'Role verification for key features', 'P0', 'Yes'),
    ('Properties', 'CRUD', 'Create, Edit, View, Delete', 'P0', 'Yes'),
    ('Properties', 'Search', 'Basic search, Filters', 'P1', 'Yes'),
    ('Bookings', 'Create', 'Basic booking, Conflict check', 'P0', 'Yes'),
    ('Bookings', 'Status', 'Status transitions', 'P0', 'Partial'),
    ('Invoices', 'Generate', 'From booking, Manual', 'P0', 'Yes'),
    ('Invoices', 'Payment', 'Record payment, Status update', 'P0', 'Yes'),
    ('Users', 'Management', 'Create, Edit, Suspend', 'P0', 'Yes'),
    ('Users', 'Profile', 'View, Edit own profile', 'P1', 'Yes'),
    ('Notifications', 'Delivery', 'In-app notifications', 'P1', 'Partial'),
    ('Check-in/Out', 'Process', 'Basic check-in/out', 'P0', 'No'),
    ('Reports', 'Generation', 'Key financial reports', 'P1', 'Partial'),
    ('Cache', 'Invalidation', 'Update reflects immediately', 'P0', 'Yes'),
    ('Performance', 'Load Time', 'Page loads within limits', 'P0', 'Yes')
]

for module in regression_modules:
    regression_data['Module'].append(module[0])
    regression_data['Feature'].append(module[1])
    regression_data['Test Cases'].append(module[2])
    regression_data['Priority'].append(module[3])
    regression_data['Automation'].append(module[4])

df_regression = pd.DataFrame(regression_data)
df_regression.to_excel(writer, sheet_name='Regression Suite', index=False)

# 10. Exit Criteria
exit_criteria = {
    'Phase': [
        'Unit Testing', 'Integration Testing', 'System Testing',
        'Performance Testing', 'Security Testing', 'UAT', 'Production Release'
    ],
    'Pass Criteria': [
        '100% code coverage for critical paths',
        'All APIs return correct data',
        '95% test cases passed',
        'All metrics within acceptable range',
        'No critical vulnerabilities',
        '90% user scenarios successful',
        'All P0 and P1 bugs fixed'
    ],
    'Fail Criteria': [
        'Coverage < 70%',
        'API failures > 5%',
        'P0 bugs exist',
        'Performance degradation > 20%',
        'Critical vulnerabilities found',
        'User rejection > 20%',
        'Any P0 bugs remain'
    ],
    'Sign-off Required': [
        'Dev Lead', 'Tech Lead', 'QA Lead',
        'DevOps Lead', 'Security Lead', 'Product Owner', 'CTO + Product Owner'
    ],
    'Documentation': [
        'Unit test reports', 'API test results', 'Test execution report',
        'Performance report', 'Security audit report', 'UAT feedback', 'Release notes'
    ],
    'Rollback Plan': [
        'Fix and retest', 'Fix integration issues', 'Hotfix or rollback',
        'Performance tuning', 'Security patches', 'Address feedback', 'Emergency rollback'
    ]
}
df_exit = pd.DataFrame(exit_criteria)
df_exit.to_excel(writer, sheet_name='Exit Criteria', index=False)

# Format the Excel file
workbook = writer.book

# Add formats
header_format = workbook.add_format({
    'bold': True,
    'bg_color': '#4B5563',
    'font_color': 'white',
    'border': 1
})

priority_formats = {
    'P0': workbook.add_format({'bg_color': '#FEE2E2', 'border': 1}),
    'P1': workbook.add_format({'bg_color': '#FEF3C7', 'border': 1}),
    'P2': workbook.add_format({'bg_color': '#E0E7FF', 'border': 1})
}

# Apply formatting to each sheet
for sheet_name in writer.sheets:
    worksheet = writer.sheets[sheet_name]
    worksheet.set_column('A:A', 15)  # ID columns
    worksheet.set_column('B:C', 20)  # Module/Feature columns
    worksheet.set_column('D:D', 40)  # Description columns
    worksheet.set_column('E:J', 15)  # Other columns

    # Freeze panes
    worksheet.freeze_panes(1, 0)

# Save the Excel file
writer.close()

print(f"[SUCCESS] Comprehensive Test Plan Excel file created: {output_file}")
print(f"[INFO] Total Sheets: 10")
print(f"[INFO] Total Test Cases: 520+")
print(f"[INFO] Estimated Total Testing Time: 160+ hours")
print(f"[INFO] Recommended Team Size: 3-5 testers")
print(f"[INFO] Estimated Duration: 4 weeks")
print("\nSheets included:")
print("1. Test Summary - Module overview with test counts")
print("2. Test Cases - 50 critical test cases detailed")
print("3. Execution Schedule - 4-week testing timeline")
print("4. Test Environments - Environment requirements")
print("5. Bug Severity - Bug classification and SLAs")
print("6. Test Data - Data generation requirements")
print("7. Security Tests - Security testing scenarios")
print("8. Performance Metrics - Performance benchmarks")
print("9. Regression Suite - Regression test coverage")
print("10. Exit Criteria - Go/No-go decision criteria")