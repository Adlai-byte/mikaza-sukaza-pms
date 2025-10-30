import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Search,
  BookOpen,
  Users,
  Building,
  CalendarDays,
  ClipboardCheck,
  FileText,
  DollarSign,
  Settings,
  Video,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Zap,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Workflow,
  Eye,
  Bug,
  Send,
  X,
} from 'lucide-react';

export default function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSteps, setBugSteps] = useState('');
  const [bugPriority, setBugPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isSendingBugReport, setIsSendingBugReport] = useState(false);
  const { user, profile } = useAuth();

  const handleBugReportSubmit = async () => {
    if (!bugTitle.trim() || !bugDescription.trim()) {
      toast.error('Please fill in bug title and description');
      return;
    }

    setIsSendingBugReport(true);

    try {
      // Call Supabase Edge Function to send bug report email
      const reporterName = profile?.first_name && profile?.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile?.first_name || 'Anonymous User';

      const { data, error } = await supabase.functions.invoke('send-bug-report', {
        body: {
          title: bugTitle,
          description: bugDescription,
          stepsToReproduce: bugSteps,
          priority: bugPriority,
          reporterEmail: user?.email || 'anonymous',
          reporterName: reporterName,
        },
      });

      if (error) {
        console.error('Error sending bug report:', error);
        // Fallback to mailto if edge function fails
        const mailtoLink = `mailto:vinzlloydalferez@gmail.com?subject=Bug Report: ${encodeURIComponent(bugTitle)}&body=${encodeURIComponent(
          `Bug Report\n\n` +
          `Title: ${bugTitle}\n\n` +
          `Priority: ${bugPriority}\n\n` +
          `Description:\n${bugDescription}\n\n` +
          `Steps to Reproduce:\n${bugSteps}\n\n` +
          `Reported by: ${reporterName} (${user?.email || 'N/A'})\n` +
          `Date: ${new Date().toLocaleString()}`
        )}`;
        window.open(mailtoLink, '_blank');
        toast.info('Opening email client as fallback. Please send the pre-filled email.');
      } else {
        toast.success('Bug report sent successfully! Thank you for your feedback.');
      }

      // Reset form
      setBugTitle('');
      setBugDescription('');
      setBugSteps('');
      setBugPriority('medium');
      setBugReportOpen(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Failed to send bug report. Please try again.');
    } finally {
      setIsSendingBugReport(false);
    }
  };

  const helpSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Zap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      topics: [
        {
          question: 'What is Casa & Concierge PMS?',
          answer: `Casa & Concierge is a comprehensive Property Management System designed for vacation rental properties. It helps you manage:

• **Properties & Units** - Organize your rental properties and units
• **Bookings & Calendar** - Track reservations and availability
• **Tasks & Jobs** - Manage cleaning, maintenance, and operations
• **Invoices & Expenses** - Handle billing and financial tracking
• **Guests & Providers** - Maintain relationships with guests and service providers

The system is built to streamline your property management workflow and improve operational efficiency.`,
        },
        {
          question: 'How do I navigate the system?',
          answer: `**Sidebar Navigation:**

The left sidebar contains all main modules organized by function:

**Main Section:**
• Dashboard - Overview of key metrics
• Bookings - Manage reservations
• Calendar - Visual booking calendar
• Properties - Property management
• Active Jobs - Track ongoing work
• To-Do List - Your personal tasks

**Finance Section:**
• Invoices - Billing management
• Expenses - Track costs
• Financial Dashboard - Revenue analytics
• Owner Statement - Generate owner reports
• Service Pipeline - Track service requests
• My Commissions - View your earnings
• Bill Templates - Recurring billing

**Operations Section:**
• Check-In/Check-Out - Property inspections
• Checklist Templates - Reusable checklists
• Vendor COIs - Insurance certificates
• Access Authorizations - Property access control

**Documents Section:**
• Contracts - Contract management
• Service Documents - Vendor documentation
• Employee Documents - HR files
• Message Templates - Guest communications

**Additional Sections:**
• Media - Photos & videos (with tree view)
• User Management - Team administration (Admin only)
• Activity Logs - System audit trail (Admin only)

Click any menu item to navigate to that module. The active page is highlighted in green.`,
        },
        {
          question: 'What are the different user roles?',
          answer: `The system supports 4 user roles with different permissions:

**1. Admin** 🛡️
• Full system access
• Manage users and settings
• Access all financial data
• Delete records and configure system

**2. Ops (Operations/Internal Team)** ⚙️
• Manage properties and bookings
• Create jobs and tasks
• Handle invoices and expenses
• Cannot manage users or system settings

**3. Property Manager** 🏢
• View and manage assigned properties only
• Create bookings and jobs
• Limited financial access
• Cannot access system-wide data

**4. Cleaner/Maintenance** 🧹
• View assigned tasks only
• Update task status
• Read-only property access
• No financial or admin access

Your role is displayed in the top-right corner with your profile.`,
        },
      ],
    },
    {
      id: 'properties',
      title: 'Properties Management',
      icon: Building,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      topics: [
        {
          question: 'How do I add a new property?',
          answer: `**Step-by-Step: Adding a Property**

1. **Navigate to Properties**
   • Click "Properties" in the sidebar

2. **Click "Add Property" Button**
   • Located at the top-right of the properties table

3. **Fill in Required Information:**
   • Property Name (required)
   • Property Type (House, Apartment, Condo, etc.)
   • Address and Location
   • Number of Bedrooms
   • Number of Bathrooms

4. **Add Optional Details:**
   • Amenities (WiFi, Pool, Parking, etc.)
   • House Rules
   • Check-in/Check-out instructions
   • Property photos

5. **Click "Save"**
   • Property will appear in your properties list
   • You can now create bookings for this property

**Pro Tip:** Add all property details upfront to avoid incomplete booking information later.`,
        },
        {
          question: 'How do I manage multi-unit properties?',
          answer: `For properties with multiple units (e.g., apartment buildings):

**Option 1: Create Separate Properties**
• Create each unit as a separate property
• Example: "Sunset Apartments - Unit 101", "Sunset Apartments - Unit 102"
• Good for units with different amenities or pricing

**Option 2: Use the Units Feature**
1. Create the main property (e.g., "Sunset Apartments")
2. Navigate to property details
3. Click "Add Unit" button
4. Enter unit-specific details:
   • Unit Name/Number
   • Floor
   • Bedrooms/Bathrooms
   • Unit-specific amenities
5. Link bookings to specific units

**When to use Units:**
• Building with multiple identical units
• Easier bulk management
• Shared amenities and rules`,
        },
        {
          question: 'How do I edit or deactivate a property?',
          answer: `**Editing a Property:**
1. Go to Properties page
2. Click on the property name or Edit icon
3. Modify the information
4. Click "Update" to save changes

**Deactivating a Property:**
1. Edit the property
2. Toggle the "Active" switch to OFF
3. Save changes
• Inactive properties won't show in booking dropdowns
• Existing bookings remain unaffected
• You can reactivate anytime

**Deleting a Property:**
⚠️ **Warning:** Only admins can delete properties
• Cannot delete if there are active bookings
• Use deactivate instead of delete to preserve history`,
        },
      ],
    },
    {
      id: 'bookings',
      title: 'Bookings & Calendar',
      icon: CalendarDays,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      topics: [
        {
          question: 'How do I create a new booking?',
          answer: `**Creating a Booking (Step-by-Step):**

1. **Navigate to Bookings**
   • Click "Bookings" in sidebar OR
   • Use Calendar view and click "New Booking"

2. **Select Property**
   • Choose from dropdown
   • System checks availability automatically

3. **Enter Guest Information:**
   • Guest Name (required)
   • Email Address
   • Phone Number
   • Number of Guests

4. **Set Dates:**
   • Check-in Date
   • Check-out Date
   • System prevents double-booking automatically

5. **Enter Pricing:**
   • Total Amount
   • Payment Status
   • Booking Source (Airbnb, Direct, etc.)

6. **Click "Save"**
   • Invoice auto-generated (if configured)
   • Booking appears on calendar
   • Guest record created

**What Happens Next:**
✅ Calendar updated with booking
✅ Invoice created automatically
✅ Cleaning/turnover tasks can be scheduled
✅ Notifications sent (if enabled)`,
        },
        {
          question: 'How do I check property availability?',
          answer: `**3 Ways to Check Availability:**

**Method 1: Calendar View** 📅
1. Click "Calendar" in sidebar
2. View all bookings in monthly/weekly view
3. Vacant dates appear empty
4. Booked dates show booking details
5. Color-coded by booking status

**Method 2: When Creating Booking** 🔍
1. Start creating a new booking
2. Select property
3. Choose dates
4. System shows error if dates overlap existing booking
5. Suggests alternative dates

**Method 3: Property Details** 🏠
1. Go to Properties
2. Click on a property
3. View "Upcoming Bookings" section
4. See all current and future bookings

**Booking Status Colors:**
🟢 Confirmed - Green
🟡 Pending - Yellow
🔴 Cancelled - Red
🔵 Checked-in - Blue`,
        },
        {
          question: 'How do I modify or cancel a booking?',
          answer: `**Modifying a Booking:**

1. **Find the Booking:**
   • Bookings page → Click on booking OR
   • Calendar → Click on booked date

2. **Click "Edit" Button**

3. **Make Changes:**
   • Update dates (checks availability)
   • Change guest information
   • Modify pricing
   • Update booking status

4. **Save Changes**
   • Related invoice updated automatically
   • Calendar refreshed

**Cancelling a Booking:**

1. **Open Booking Details**

2. **Click "Cancel Booking" Button**

3. **Confirm Cancellation:**
   • Booking status → Cancelled
   • Property becomes available
   • Invoice status updated
   • Optionally process refund

4. **What Happens:**
   ❌ Booking marked as cancelled
   ✅ Dates freed for new bookings
   📧 Optional notification to guest
   💰 Refund processed (if applicable)

**Important Notes:**
⚠️ Cannot modify past bookings
⚠️ Cancelled bookings remain in history
⚠️ Always check refund policy before cancelling`,
        },
      ],
    },
    {
      id: 'tasks-jobs',
      title: 'Tasks & Jobs',
      icon: ClipboardCheck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      topics: [
        {
          question: 'What is the difference between Tasks and Jobs?',
          answer: `**Jobs vs Tasks - Understanding the Difference:**

**Jobs** 🎯 (Higher Level)
• A collection of related tasks
• Represents a complete work project
• Example: "Spring Cleaning - Villa #5"
• Has overall status and deadline
• Can contain multiple tasks

**Tasks** ✅ (Individual Actions)
• Specific action items
• Can be standalone OR part of a job
• Example: "Clean kitchen", "Replace air filter"
• Assigned to specific person
• Has its own due date and status

**Example Workflow:**

**Job:** "Guest Turnover - Sunset Villa"
  └─ Task 1: Strip and wash linens
  └─ Task 2: Deep clean bathrooms
  └─ Task 3: Restock amenities
  └─ Task 4: Final walkthrough inspection

**When to Use:**
• **Job** → Complex project with multiple steps
• **Task** → Simple, single-step action`,
        },
        {
          question: 'How do I create and assign tasks?',
          answer: `**Creating a Task (Step-by-Step):**

**Method 1: Standalone Task**
1. Go to "To-Do List" page
2. Click "Add Task" button
3. Fill in details:
   • Task Title (required)
   • Description
   • Assigned To (select team member)
   • Due Date
   • Priority (Low/Medium/High/Critical)
4. Click "Save"

**Method 2: Task as Part of Job**
1. Go to "Active Jobs" page
2. Open a job or create new one
3. Click "Add Task" within the job
4. Fill in task details (linked to job automatically)
5. Save

**Task Information:**
📝 **Title** - What needs to be done
👤 **Assigned To** - Who does it
📅 **Due Date** - When it's due
🎯 **Priority** - How urgent
🔗 **Job Link** - Parent job (optional)

**What Happens After Creation:**
✅ Assignee receives notification
✅ Task appears in their To-Do List
✅ Shows in job details (if linked)
✅ Tracked in dashboard metrics`,
        },
        {
          question: 'How do I track task completion?',
          answer: `**Task Lifecycle & Status Updates:**

**Task Statuses:**
1. **Pending** ⏸️ - Not started
2. **In Progress** 🔄 - Currently working
3. **Completed** ✅ - Finished

**Updating Task Status:**

**As Task Owner:**
1. Go to "To-Do List"
2. View your assigned tasks
3. Click on task to open details
4. Update status dropdown
5. Add completion notes (optional)
6. Click "Mark Complete"

**As Job Manager:**
1. Go to "Active Jobs"
2. Open the job
3. View all tasks in job
4. See real-time status of each task
5. Job auto-completes when all tasks done

**Tracking & Reporting:**
📊 Dashboard shows:
   • Total tasks assigned to you
   • Tasks due today
   • Overdue tasks
   • Completion rate

🔔 **Notifications:**
   • Task assigned to you
   • Task due soon (24hrs before)
   • Task completed by team member
   • Job completed`,
        },
      ],
    },
    {
      id: 'invoices',
      title: 'Invoices & Billing',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      topics: [
        {
          question: 'How are invoices generated?',
          answer: `**Invoice Generation - Two Methods:**

**Method 1: Automatic (Recommended)** ⚡
• Invoice auto-created when booking is saved
• Invoice number auto-generated (INV-2025-001234)
• Linked to booking automatically
• Guest information populated from booking
• Total amount matches booking amount

**Method 2: Manual Creation** 📝
1. Go to "Invoices" page
2. Click "Create Invoice"
3. Fill in details:
   • Guest information
   • Property (optional - for booking invoices)
   • Line items (services/charges)
   • Due date
   • Payment terms
4. System calculates totals
5. Click "Save"

**Invoice Information Includes:**
• Invoice Number (unique)
• Issue Date & Due Date
• Guest Details
• Property Information
• Line Items with Descriptions
• Subtotal, Tax, Total
• Payment Status
• Terms & Notes`,
        },
        {
          question: 'How do I send an invoice to a guest?',
          answer: `**Sending Invoices (Step-by-Step):**

1. **Navigate to Invoices**
   • Click "Invoices" in Finance section

2. **Find the Invoice**
   • Search by guest name or invoice number
   • Click on invoice to open details

3. **Verify Invoice is Complete:**
   ✅ All line items correct
   ✅ Guest email address present
   ✅ Total amount accurate
   ✅ Payment terms included

4. **Send Invoice:**
   • Click "Send Invoice" button
   • System generates PDF automatically
   • Email sent to guest email address
   • Copy sent to your records

5. **Email Contains:**
   📧 Professional email message
   📎 PDF invoice attachment
   💳 Payment instructions (if configured)
   🔗 Payment link (if enabled)

**Tracking:**
• "Sent" timestamp recorded
• View in invoice history
• Resend anytime if needed

**Pro Tip:** Always preview the invoice PDF before sending to ensure accuracy.`,
        },
        {
          question: 'How do I record payments?',
          answer: `**Recording Invoice Payments:**

**Step 1: Open Invoice**
1. Go to Invoices page
2. Find unpaid/pending invoice
3. Click to open details

**Step 2: Mark as Paid**
1. Click "Mark as Paid" button
2. Enter payment details:
   • Payment Date (defaults to today)
   • Payment Method (Cash, Credit Card, Bank Transfer, etc.)
   • Amount Paid
   • Payment Reference/Transaction ID
   • Notes (optional)

3. Click "Confirm Payment"

**What Happens:**
✅ Invoice status → "Paid"
✅ Paid date recorded
✅ Balance due → $0.00
✅ Payment method saved
✅ Cannot edit paid invoices (protection)
✅ Appears in financial reports

**Partial Payments:**
If guest pays in installments:
1. Record first payment
2. Balance due auto-calculated
3. Invoice status shows "Partially Paid"
4. Record remaining payments when received
5. Status updates to "Paid" when balance = $0

**Payment Dashboard:**
View all payments in:
• Financial Dashboard
• Owner Statements
• Revenue Reports`,
        },
      ],
    },
    {
      id: 'expenses',
      title: 'Expense Tracking',
      icon: FileText,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      topics: [
        {
          question: 'How do I record an expense?',
          answer: `**Recording Expenses (Step-by-Step):**

1. **Navigate to Expenses**
   • Click "Expenses" in Finance section

2. **Click "Add Expense"**

3. **Fill in Expense Details:**
   📝 **Description** - What was purchased
   💰 **Amount** - Cost (required)
   🏷️ **Category** - Select from:
      • Maintenance
      • Cleaning Supplies
      • Utilities (Water, Electric, Gas)
      • Marketing & Advertising
      • Property Taxes & Fees
      • Insurance
      • Supplies & Equipment
      • Other

   🏠 **Property** - Which property (optional)
   📅 **Date** - When expense occurred
   📎 **Receipt** - Upload photo/PDF

4. **Click "Save"**

**What Happens:**
✅ Expense recorded in system
✅ Shows in expense reports
✅ Deducted from profit calculations
✅ Available for owner statements
✅ Receipt stored securely

**Best Practices:**
📸 Always upload receipts
🏷️ Use correct categories for reports
🏠 Link to property when possible
📅 Record expenses promptly`,
        },
        {
          question: 'How do I approve expenses?',
          answer: `**Expense Approval Workflow:**

**For Admins/Managers:**

**Step 1: View Pending Expenses**
1. Go to Expenses page
2. Filter by Status: "Pending"
3. See all expenses awaiting approval

**Step 2: Review Expense**
1. Click on expense to view details
2. Check:
   ✅ Amount is reasonable
   ✅ Receipt attached
   ✅ Correct category
   ✅ Valid property link
   ✅ Description clear

**Step 3: Approve or Reject**

**To Approve:**
1. Click "Approve" button
2. Add approval notes (optional)
3. Confirm
   • Status → "Approved"
   • Timestamp recorded
   • Submitter notified
   • Included in reports

**To Reject:**
1. Click "Reject" button
2. Enter rejection reason (required)
3. Confirm
   • Status → "Rejected"
   • Reason saved
   • Submitter notified
   • Can be resubmitted

**Approval Rules:**
• Only Admins can approve
• Approved expenses are final
• Rejected expenses can be edited and resubmitted`,
        },
        {
          question: 'How do I view expense reports?',
          answer: `**Viewing Expense Reports:**

**Method 1: Expense Page**
1. Go to Expenses
2. Use filters:
   • Date Range (Last 30 days, This Month, Custom)
   • Category (Filter by expense type)
   • Property (Filter by property)
   • Status (Pending, Approved, Rejected)
3. View totals at top of page
4. Export to Excel for analysis

**Method 2: Financial Dashboard**
1. Go to Financial Dashboard
2. View "Expenses" section:
   • Total expenses this month
   • Expenses by category (chart)
   • Expense trends over time
   • Comparison to previous periods

**Method 3: Owner Statements**
1. Go to Owner Statement
2. Select property owner
3. Select date range
4. View detailed breakdown:
   • All expenses for period
   • Grouped by category
   • Linked receipts
   • Net profit after expenses

**Export Options:**
📊 **Excel** - Full data export
📄 **PDF** - Formatted report
📈 **Charts** - Visual analytics

**Common Reports:**
• Monthly expense summary
• Category breakdown
• Property-specific expenses
• Year-over-year comparison`,
        },
      ],
    },
    {
      id: 'users',
      title: 'User Management',
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      topics: [
        {
          question: 'How do I add a new user? (Admin Only)',
          answer: `**Adding New Team Members:**

⚠️ **Admin Access Required**

**Step 1: Navigate to Users**
1. Click "User Management" in sidebar
   (Only visible to Admins)

**Step 2: Click "Add User"**

**Step 3: Enter User Information:**

**Required Fields:**
• First Name
• Last Name
• Email Address (used for login)
• Password (must meet requirements):
  ✅ At least 8 characters
  ✅ One uppercase letter
  ✅ One lowercase letter
  ✅ One number
  ✅ One special character

• Confirm Password
• User Type (Select role):
  🛡️ Admin
  ⚙️ Ops (Operations)
  🏢 Property Manager
  🧹 Cleaner/Maintenance

**Optional Fields:**
• Date of Birth
• Company
• Phone Numbers
• Address
• Profile Photo

**Step 4: Set Status**
• Active: User can log in immediately
• Inactive: User account created but cannot log in

**Step 5: Click "Create User"**

**What Happens:**
✅ User account created
✅ Credentials saved securely
✅ User can log in with email/password
✅ Permissions applied based on role
✅ Profile photo uploaded (if provided)`,
        },
        {
          question: 'How do I reset a user password?',
          answer: `**Resetting User Passwords:**

**Method 1: User Self-Service (Recommended)**
1. User goes to login page
2. Clicks "Forgot Password"
3. Enters email address
4. Receives password reset email
5. Clicks link in email
6. Sets new password
7. Can log in with new password

**Method 2: Admin Reset**
1. Admin goes to User Management
2. Clicks on user account
3. Clicks "Edit"
4. Enters new password
5. Confirms new password
6. Saves changes
7. Inform user of new password securely

**Password Requirements:**
🔒 Must contain:
   • Minimum 8 characters
   • At least one uppercase letter (A-Z)
   • At least one lowercase letter (a-z)
   • At least one number (0-9)
   • At least one special character (!@#$%^&*)

**Security Best Practices:**
✅ Change default passwords immediately
✅ Use unique, strong passwords
✅ Don't share passwords
✅ Change passwords regularly
✅ Don't write passwords down`,
        },
        {
          question: 'How do I change user roles and permissions?',
          answer: `**Managing User Roles:**

**Changing a User's Role:**
1. Go to User Management (Admin only)
2. Find the user
3. Click "Edit"
4. Change "User Type" dropdown to new role
5. Click "Update User"
6. **Changes take effect immediately**
   • User gets new permissions on next page load
   • Old permissions removed
   • New menu items appear/disappear

**Role Permissions Summary:**

**Admin** 🛡️
✅ All system access
✅ Manage all users
✅ Delete any record
✅ System settings
✅ All financial data
✅ Audit logs

**Ops (Operations)** ⚙️
✅ Manage properties
✅ Create bookings
✅ Manage jobs/tasks
✅ Handle invoices
✅ Track expenses
❌ Cannot manage users
❌ Cannot access system settings

**Property Manager** 🏢
✅ View assigned properties only
✅ Create bookings for their properties
✅ Manage jobs for their properties
✅ Limited financial access
❌ Cannot see other managers' properties
❌ No user management

**Cleaner/Maintenance** 🧹
✅ View assigned tasks only
✅ Update task status
✅ View property details (read-only)
❌ Cannot create bookings
❌ No financial access
❌ No user or property management

**Deactivating Users:**
Instead of deleting, toggle "Active" to OFF:
• User cannot log in
• All data preserved
• Can reactivate anytime`,
        },
      ],
    },
    {
      id: 'financial-procedures',
      title: 'Financial Procedures',
      icon: BarChart3,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      topics: [
        {
          question: 'Monthly financial closing procedure',
          answer: `**Month-End Financial Close:**

**Week 1 of Month - Data Collection:**
1. Verify all bookings for previous month are invoiced
2. Check all expenses are recorded with receipts
3. Reconcile payments received vs invoices sent
4. Update commission calculations

**Week 2 - Review & Reconciliation:**
1. Review A/R aging report (30/60/90 days)
2. Send payment reminders for overdue invoices
3. Match bank deposits to invoices
4. Verify all expense categories are correct
5. Check for any missing documentation

**Week 3 - Reports Generation:**
1. Generate monthly revenue report by property
2. Create expense summary by category
3. Calculate net profit per property
4. Prepare owner statements
5. Generate commission reports

**Week 4 - Distribution & Follow-up:**
1. Send owner statements via email
2. Process commission payments to staff
3. Follow up on outstanding A/R
4. Archive month's financial documents
5. Update financial dashboard

**Best Practices:**
✅ Keep all receipts digital and organized
✅ Enter expenses same day they occur
✅ Reconcile daily if possible
✅ Use consistent categorization
✅ Review reports before sending to owners`,
        },
        {
          question: 'How to process invoice payments and track receivables?',
          answer: `**Payment Processing Workflow:**

**Step 1: Invoice Creation**
1. Go to Invoices → New Invoice
2. Link to booking or create manual invoice
3. Add all line items (rent, fees, services)
4. Set payment terms (Net 15, Net 30)
5. Generate PDF and payment link
6. Send to customer

**Step 2: Payment Received**
1. Customer pays via link (credit card/ACH)
2. OR manually record check/cash payment:
   • Open invoice
   • Click "Record Payment"
   • Enter amount, date, method
   • Upload deposit receipt
3. System auto-updates invoice status to "Paid"

**Step 3: Reconciliation**
1. Daily: Match payments to invoices
2. Weekly: Review A/R aging report
3. Monthly: Bank reconciliation

**A/R Management:**

**30 Days Past Due:**
• Send friendly payment reminder
• Check if payment was sent but not received

**60 Days Past Due:**
• Phone call to customer
• Offer payment plan if needed
• Update notes in invoice

**90+ Days Past Due:**
• Final notice letter
• Consider collection agency
• Flag customer account

**Reports to Monitor:**
📊 A/R Aging Report (30/60/90)
📊 Payment Collection Rate
📊 Average Days to Payment
📊 Outstanding Balance by Customer`,
        },
        {
          question: 'Commission calculation and payment procedures',
          answer: `**Commission Structure:**

**Staff Roles & Commission Rates:**
• **Property Manager:** 10% of booking revenue
• **Sales/Booking Agent:** 5% of first booking, 2% renewals
• **Service Coordinator:** $50 flat per job completed
• **Referral Bonus:** $100 per new owner signed

**Calculation Process:**

**Step 1: Verify Completion (First week of month)**
1. Booking must be completed (check-out occurred)
2. Payment must be received from customer
3. No major issues/complaints
4. Service quality verified

**Step 2: Calculate Commission**
1. Go to Finance → Commissions
2. System auto-calculates based on:
   • Booking revenue (after taxes/fees)
   • Commission rate for staff role
   • Completion date
3. Review calculated amounts
4. Adjust for any exceptions

**Step 3: Approval**
1. Manager reviews all commissions
2. Verifies completion criteria met
3. Approves commission batch
4. Generates payment report

**Step 4: Payment (15th of month)**
1. Export commission report
2. Process payroll/direct deposit
3. Mark commissions as "Paid"
4. Send payment confirmations
5. Update staff commission history

**Split Commissions:**
If multiple people involved:
• List all contributors
• Specify split percentages
• System calculates individual amounts

**Bonus Structures:**
• SLA Bonus: +$25 for same-day service completion
• Quality Bonus: +10% for 5-star customer rating
• Volume Bonus: +5% if >10 bookings/month

**Tracking:**
📈 Commission by Staff Member
📈 Commission by Property
📈 Commission Trends (monthly)
📈 Pending vs Paid Commissions`,
        },
      ],
    },
    {
      id: 'operational-workflows',
      title: 'Operational Workflows',
      icon: Workflow,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      topics: [
        {
          question: 'Daily operations checklist',
          answer: `**Morning Routine (8:00 AM - 10:00 AM):**

**1. Check Calendar & Arrivals**
✅ Review today's arrivals (green highlights)
✅ Review today's departures (orange highlights)
✅ Verify cleaning scheduled for all departures

**2. Dashboard Review**
✅ Check pending tasks (overdue shown in red)
✅ Review active jobs status
✅ Check notification bell for urgent items
✅ Review any issues flagged overnight

**3. Confirm Cleaning Assignments**
✅ Call/message cleaners to confirm schedule
✅ Verify cleaning supplies stocked
✅ Send access codes for properties
✅ Confirm estimated completion times

**Midday Tasks (10:00 AM - 2:00 PM):**

**4. Handle Service Requests**
✅ Review new service pipeline requests
✅ Request quotes from vendors
✅ Send access authorizations
✅ Verify vendor COIs are valid
✅ Track job progress

**5. Guest Communications**
✅ Respond to booking inquiries
✅ Send check-in instructions
✅ Address any guest issues
✅ Coordinate early check-in/late check-out

**Afternoon Tasks (2:00 PM - 6:00 PM):**

**6. Check-in Preparation**
✅ Final walkthrough of units
✅ Verify cleaning completed
✅ Check all amenities working
✅ Upload photos to system
✅ Send welcome message to guests

**7. Quality Control**
✅ Review cleaner checklists
✅ Inspect problem properties
✅ Update maintenance logs
✅ Document any issues found

**8. Tomorrow's Planning**
✅ Review tomorrow's schedule
✅ Assign tasks for next day
✅ Confirm vendor appointments
✅ Prepare supplies needed

**End of Day (6:00 PM - 7:00 PM):**

**9. Status Updates**
✅ Update all job statuses
✅ Mark completed tasks
✅ Add notes for overnight team
✅ Close any resolved issues

**10. Reporting**
✅ Daily completion summary
✅ Flag any urgent items for tomorrow
✅ Update calendar with changes
✅ Archive completed work orders`,
        },
        {
          question: 'Service request workflow from quote to completion',
          answer: `**Complete Service Pipeline Workflow:**

**STAGE 1: REQUEST QUOTE** 🔵

**Actions:**
1. Go to Finance → Service Pipeline
2. Click "New Service Request"
3. Fill in details:
   • Property/Unit
   • Service type (plumbing, electrical, HVAC, etc.)
   • Description of issue
   • Priority level
   • Photos of problem
   • Preferred completion date
4. Select vendors to request quotes from
5. System sends quote request emails

**Requirements:**
⚠️ Vendor must have valid COI to be selected
⚠️ Include detailed description for accurate quotes

**STAGE 2: RECEIVE QUOTES** 🟡

**Actions:**
1. Vendors submit quotes through portal
2. Review quotes side-by-side:
   • Price comparison
   • Estimated completion time
   • COI coverage verification
   • Vendor ratings/reviews
   • Scope of work
3. Add internal notes
4. Flag preferred vendor

**Compare:**
📊 Price vs Budget
📊 Timeline vs Urgency
📊 Vendor Reliability Score
📊 Insurance Coverage

**STAGE 3: SEND TO CLIENT** 🟠

**Actions:**
1. Select best 2-3 quotes
2. Add markup (if applicable)
3. Create client approval package
4. Send for approval via email
5. Client reviews and approves online

**Include:**
• Detailed scope of work
• Price breakdown
• Timeline
• Terms & conditions
• Digital signature field

**STAGE 4: APPROVED** 🟢

**Actions:**
1. Receive client digital approval
2. Confirm vendor availability
3. Schedule service date/time
4. Generate access authorization:
   • Building access code/QR
   • Unit keys arrangement
   • Contact person
   • COI valid through date
5. Send authorization to vendor
6. Send to building management
7. Notify property manager

**STAGE 5: SERVICE EXECUTED** ✅

**Actions:**
1. Vendor completes work
2. Vendor uploads:
   • Completion photos
   • Work checklist
   • Materials used
   • Any additional findings
3. Ops team verifies:
   • Quality inspection
   • Work completed per scope
   • Unit clean and secure
4. Customer approval/signature
5. Move to payment stage

**STAGE 6: PAYMENT RECEIVED** 💰

**Actions:**
1. Generate invoice from job
2. Send to customer
3. Track payment
4. Upon payment:
   • Pay vendor
   • Calculate commission
   • Close job
   • Archive documentation

**STAGE 7: COMMISSION CALCULATED** 💵

**Actions:**
1. Auto-calculate commission
2. Assign to staff members
3. Apply any bonuses (SLA, quality)
4. Queue for payment
5. Update staff records

**Validation Gates:**
🚫 Cannot advance without valid COI
🚫 Cannot execute without client approval
🚫 Cannot close without completion photos
🚫 Cannot pay commission without customer payment`,
        },
        {
          question: 'Managing vendor relationships and COI compliance',
          answer: `**Vendor Management Best Practices:**

**Onboarding New Vendors:**

**Step 1: Initial Vetting**
1. Request company information
2. Verify business license
3. Check references (minimum 3)
4. Review online ratings
5. Conduct trial service

**Step 2: Insurance Setup**
1. Request Certificate of Insurance (COI)
2. Verify coverage requirements:
   • General Liability: Min $1M
   • Workers Comp: Min $500K
   • Auto Liability: $1M (if applicable)
3. Add expiration to system
4. Set alert for 30 days before expiry

**Step 3: Agreement & Terms**
1. Service agreement signed
2. Payment terms established
3. SLA expectations documented
4. Quality standards defined
5. Communication protocols set

**Ongoing Management:**

**Monthly Reviews:**
✅ Check COI expiration dates
✅ Review vendor performance scores
✅ Track average response times
✅ Monitor customer feedback
✅ Compare pricing to market rates

**COI Compliance Process:**

**30 Days Before Expiration:**
• Auto-email to vendor requesting renewal
• Mark vendor as "COI Expiring Soon"
• Flag in system dashboard

**15 Days Before Expiration:**
• Second reminder email
• Phone call to vendor
• Cannot book new jobs

**At Expiration:**
• Vendor auto-deactivated in system
• Cannot be assigned to any jobs
• In-progress jobs flagged for review

**Upon Renewal:**
• Upload new COI
• Verify coverage amounts
• Update expiration date
• Re-activate vendor
• Resume job assignments

**Performance Tracking:**

**Quality Metrics:**
📊 Customer satisfaction score
📊 On-time completion rate
📊 Quote accuracy (actual vs estimated)
📊 Issue resolution time
📊 Repeat service needs

**Red Flags:**
⚠️ 3+ late completions
⚠️ 2+ customer complaints
⚠️ Expired insurance
⚠️ Inaccurate quotes
⚠️ Poor communication

**Vendor Tiers:**
🌟 **Preferred:** Fast, reliable, fair pricing
⭐ **Approved:** Good service, acceptable pricing
⚪ **Trial:** New, under evaluation
🚫 **Suspended:** Performance issues

**Best Practices:**
✅ Maintain 3+ vendors per service type
✅ Rotate jobs to prevent dependency
✅ Pay promptly for good service
✅ Provide constructive feedback
✅ Build long-term relationships
✅ Keep backup vendors ready`,
        },
      ],
    },
    {
      id: 'property-visits',
      title: 'Property Visits & Inspections',
      icon: Eye,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      topics: [
        {
          question: 'Conducting property inspections and walkthroughs',
          answer: `**Types of Inspections:**

**1. MOVE-IN INSPECTION** 🏠

**Timing:** Before tenant arrival
**Duration:** 30-45 minutes

**Checklist:**
✅ Clean and sanitized
✅ All appliances functioning
✅ No maintenance issues
✅ Keys and access codes work
✅ Welcome materials placed
✅ Safety equipment checked

**Photo Documentation:**
📸 Each room (wide angle)
📸 Appliances
📸 Existing damage/wear
📸 Meter readings
📸 Access points

**2. ROUTINE INSPECTION** 🔍

**Frequency:** Quarterly or per lease
**Duration:** 20-30 minutes

**Areas to Check:**
**Kitchen:**
• Appliances operational
• No leaks under sink
• Filter condition
• Cleanliness maintained

**Bathrooms:**
• Plumbing functional
• No mold/moisture issues
• Ventilation working
• Fixtures secure

**Living Areas:**
• Walls/floors condition
• Windows/doors functioning
• HVAC performance
• Smoke detectors working

**Exterior:**
• No unauthorized changes
• Balcony/patio condition
• Entry security
• Common area impact

**3. MOVE-OUT INSPECTION** 🚪

**Timing:** Within 24 hours of departure
**Duration:** 45-60 minutes

**Damage Assessment:**
✓ Normal wear vs damage
✓ Cleaning required
✓ Repairs needed
✓ Missing items
✓ Security deposit deductions

**Comparison:**
• Reference move-in photos
• Document all changes
• Estimate repair costs
• Create punch list

**4. EMERGENCY INSPECTION** 🚨

**Triggers:**
• Water leak reported
• Electrical issue
• Safety hazard
• Tenant complaint
• Weather damage

**Actions:**
1. Schedule within 2-4 hours
2. Notify tenant if occupied
3. Document issue thoroughly
4. Assess immediate risks
5. Coordinate emergency repairs

**Inspection Workflow in System:**

**Before Visit:**
1. Go to Issues & Photos
2. Create new inspection
3. Select property/unit
4. Choose inspection type
5. Review previous reports
6. Print checklist

**During Visit:**
1. Use mobile device for:
   • Photo capture (auto-timestamp)
   • Checklist completion
   • Voice notes
   • Issue flagging
2. Mark items as:
   • ✅ Pass
   • ⚠️ Minor issue
   • ❌ Major issue
   • 🔧 Repair needed

**After Visit:**
1. Upload all photos
2. Complete inspection report
3. Generate PDF summary
4. Create maintenance tasks
5. Send report to owner
6. Schedule follow-up if needed

**Best Practices:**
✅ Always notify in advance (except emergencies)
✅ Take 20+ photos minimum
✅ Document everything, even minor items
✅ Be objective and detailed in notes
✅ Follow up on all issues found
✅ Keep historical comparison photos
✅ Share reports with owners within 48 hours`,
        },
        {
          question: 'Check-in/Check-out procedures and documentation',
          answer: `**CHECK-IN PROCEDURE** 📥

**24 Hours Before:**
1. Final cleaning verification
2. Quality control inspection
3. Amenity setup
4. Welcome materials prepared
5. Access codes generated

**Day of Check-in:**

**Step 1: Pre-Arrival Prep (Morning)**
• Final walkthrough
• Temperature set to comfort level
• All lights tested
• Remove any maintenance signs
• Place welcome basket
• Take final photos for records

**Step 2: Guest Contact (2-3 hours before)**
• Send welcome message:
  - Access codes
  - Wi-Fi password
  - Parking instructions
  - Emergency contacts
  - House rules reminder
• Confirm arrival time
• Offer early check-in if available

**Step 3: Arrival Support**
• Be available by phone
• Monitor for any issues
• Quick check-in call after arrival
• Ensure satisfaction

**Step 4: System Documentation**
1. Go to Operations → Check-in/Check-out
2. Select unit
3. Create check-in record:
   • Date/time of arrival
   • Number of guests
   • Condition verification
   • Photos uploaded
   • Notes for any issues
4. Update calendar status to "Occupied"
5. Set checkout reminder

**CHECK-OUT PROCEDURE** 📤

**Day Before Checkout:**
• Send checkout reminder:
  - Checkout time (usually 11 AM)
  - Key return instructions
  - Trash disposal
  - Checkout checklist
• Confirm checkout time
• Schedule cleaning

**Day of Checkout:**

**Step 1: Guest Departure**
• Receive confirmation of departure
• Verify keys/access returned
• Thank you message sent
• Request review

**Step 2: Initial Inspection (Within 1 hour)**
• Walk through entire unit
• Use checklist:
  ✓ All items present
  ✓ No damage beyond normal wear
  ✓ Reasonably clean
  ✓ All keys/remotes present
  ✓ Appliances off
  ✓ Windows/doors secured

**Step 3: Photo Documentation**
📸 Each room - wide angle
📸 Any damage found
📸 Cleanliness issues
📸 Missing items
📸 Meter readings

**Step 4: Create Checkout Report**
1. Go to Operations → Check-in/Check-out
2. Select unit
3. Create checkout record:
   • Departure time
   • Condition assessment
   • Issues found
   • Photos attached
   • Cleaning level needed
   • Any damages noted
4. Generate PDF report
5. Send to property owner

**Step 5: Action Items**
• Create maintenance tasks for any issues
• Notify cleaning team of special needs
• Schedule any repairs needed
• Process security deposit (if damages)
• Update unit availability

**Quick Turnaround (Same-Day Checkout/Check-in):**

**Critical Timeline:**
11:00 AM - Guest checks out
11:15 AM - Inspection complete
11:30 AM - Cleaning team arrives
2:30 PM - Cleaning complete
3:00 PM - Final inspection
3:30 PM - Ready for next guest
4:00 PM - Next check-in

**System Features:**
• Digital checklists
• Photo upload (auto-timestamp)
• Digital signatures (if in-person)
• PDF generation
• Automatic email to stakeholders
• Links to calendar & bookings
• History of all check-ins/outs

**Damage Handling:**
1. Document with photos
2. Get repair estimates
3. Compare to move-in photos
4. Calculate deduction
5. Notify guest with evidence
6. Process security deposit
7. Schedule repairs`,
        },
        {
          question: 'Coordinating cleaning and turnovers between bookings',
          answer: `**Turnover Coordination Workflow:**

**SCHEDULING PHASE:**

**When Booking Confirmed:**
1. Check calendar for turnover window:
   • Checkout: 11 AM
   • Check-in: 4 PM
   • **Turnover window: 5 hours**
2. Calculate cleaning time needed:
   • Studio/1BR: 2-3 hours
   • 2BR: 3-4 hours
   • 3+BR: 4-5 hours
3. Assign cleaning team in system
4. Set automatic reminders

**Day Before Turnover:**
• Confirm cleaner availability
• Send unit details & special notes
• Verify supplies stocked
• Check for any maintenance pending
• Prepare access codes

**DAY OF TURNOVER:**

**Phase 1: Checkout & Assessment (11:00 AM - 11:30 AM)**
1. Guest departs
2. Ops team does quick inspection
3. Photos of condition
4. Create punch list:
   • Standard cleaning
   • Deep cleaning needs
   • Repairs required
   • Restocking needs
5. Send punch list to cleaner

**Phase 2: Cleaning Execution (11:30 AM - 3:00 PM)**

**Cleaner arrives with:**
✓ Cleaning supplies
✓ Fresh linens
✓ Amenity restocks
✓ Checklist from system

**Cleaning Order:**
1. Bathrooms (sanitize & disinfect)
2. Kitchen (appliances & counters)
3. Bedrooms (linens & surfaces)
4. Living areas (dust & vacuum)
5. Floors (vacuum/mop all)
6. Final touches (trash, air freshening)

**Cleaner uploads to system:**
• Progress photos every 30 mins
• Before/after photos
• Issues found
• Completion confirmation
• Time log

**Phase 3: Quality Control (3:00 PM - 3:30 PM)**
1. Ops team final inspection
2. Use quality checklist:
   ✓ All surfaces clean
   ✓ No spots/stains missed
   ✓ All amenities restocked
   ✓ Linens fresh & properly made
   ✓ Floors spotless
   ✓ Bathrooms sparkling
   ✓ Kitchen sanitized
   ✓ Trash removed
   ✓ Temperature comfortable
3. Take final approval photos
4. Mark unit "Ready" in system

**Phase 4: Pre-Arrival Setup (3:30 PM - 4:00 PM)**
• Welcome materials placed
• Temperature adjusted
• Lights set
• Music/ambiance (if applicable)
• Final walkthrough
• Send "ready" notification to arrival team

**SAME-DAY TURNOVERS** (High Risk):**

**Modified Timeline:**
• Checkout: 10 AM (1 hour early)
• Cleaning start: 10:15 AM
• Cleaning complete: 1:45 PM
• QC inspection: 2:00 PM
• Ready by: 2:30 PM
• Check-in: 3:00 PM (1 hour early access OK)

**Requirements:**
⚠️ Need backup cleaner on standby
⚠️ Pre-stocked cleaning cart ready
⚠️ Manager available for emergency decisions
⚠️ Buffer room available if delays occur

**CLEANING QUALITY STANDARDS:**

**Bedrooms:**
✓ Bed linens crisp & wrinkle-free
✓ No dust on surfaces or fans
✓ Closets organized & empty
✓ Windows/mirrors streak-free
✓ Floors vacuumed/mopped

**Bathrooms:**
✓ Toilets sanitized & sparkling
✓ Showers/tubs scrubbed
✓ Sinks & faucets polished
✓ Mirrors spotless
✓ Fresh towels arranged
✓ Toiletries stocked

**Kitchen:**
✓ Appliances cleaned inside/out
✓ Counters sanitized
✓ Sink scrubbed & shining
✓ Floors mopped
✓ Fridge cleaned
✓ Dishes/utensils clean & organized

**Living Areas:**
✓ Furniture dusted & arranged
✓ Floors vacuumed/mopped
✓ Windows clean
✓ TV remote sanitized
✓ Cushions fluffed

**SYSTEM TRACKING:**

**In To-Do List:**
• Each turnover is a task
• Status: To Do → In Progress → Completed
• Assigned to specific cleaner
• Due time set
• Linked to both bookings

**In Calendar:**
• Cleaning shown in blue
• Between checkout (orange) and check-in (green)
• Time blocks visible
• Conflicts highlighted

**Notifications:**
• Cleaner: Task assigned
• Ops: Cleaning started
• Ops: Cleaning completed
• Manager: QC needed
• Guest: Unit ready

**ISSUE HANDLING:**

**If Cleaning Delayed:**
1. Immediate notification to manager
2. Assess delay (15 min vs 1 hour)
3. Options:
   • Rush current cleaner with bonus
   • Call backup cleaner
   • Delay guest check-in
   • Offer upgrade to different unit
   • Compensate guest

**If Quality Issues Found:**
1. Document with photos
2. Send back to cleaner for fixes
3. Extend timeline
4. Notify affected parties
5. Prevent same issue next time

**CLEANING TEAM MANAGEMENT:**

**Performance Metrics:**
📊 Average cleaning time
📊 Quality score (QC pass rate)
📊 On-time completion rate
📊 Guest cleanliness ratings
📊 Issues found after cleaning

**Payment:**
• Per cleaning (studio $80, 1BR $100, 2BR $140, etc.)
• Bonus for same-day turnovers (+$30)
• Bonus for 5-star rating from guest (+$20)
• Deduction for failed QC (-$25)

**Top Performer Benefits:**
• First choice of assignments
• Higher per-cleaning rate
• Preferred scheduling
• Recognition in team meetings`,
        },
      ],
    },
    {
      id: 'media',
      title: 'Media Management',
      icon: Video,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      topics: [
        {
          question: 'How do I upload property photos and videos?',
          answer: `**Uploading Media to Properties:**

**Step 1: Navigate to Media Module**
1. Click "Media" in the main sidebar
2. Or access via property details page

**Step 2: Upload Files**
1. Click "Upload Media" button
2. Select property from dropdown
3. Choose files:
   • **Photos:** JPG, PNG, WEBP (max 10MB each)
   • **Videos:** MP4, MOV (max 100MB each)
   • **360° Tours:** Special panoramic format
4. Drag & drop or click to browse
5. Add captions/descriptions
6. Set visibility (Public/Private)
7. Click "Upload"

**Bulk Upload:**
• Select multiple files at once
• Up to 50 files per batch
• Progress bar shows upload status
• Auto-thumbnail generation

**Organization:**
📁 **By Property** - All media grouped by property
📁 **By Type** - Photos, Videos, Documents
📁 **By Date** - Chronological view
📁 **Featured** - Highlighted images

**Best Practices:**
✅ Use high-resolution photos (min 1920x1080)
✅ Take photos in good lighting
✅ Show all rooms and amenities
✅ Include exterior and neighborhood shots
✅ Keep videos under 2 minutes
✅ Add descriptive captions for SEO`,
        },
        {
          question: 'How do I organize media with tree view?',
          answer: `**Tree View Navigation:**

The Media module uses a hierarchical tree structure for easy organization.

**Folder Structure:**
🗂️ **All Properties**
  └─ 📁 Sunset Villa
      ├─ 📸 Photos (45)
      │   ├─ Living Room (8)
      │   ├─ Bedrooms (12)
      │   ├─ Kitchen (6)
      │   ├─ Bathrooms (5)
      │   └─ Exterior (14)
      ├─ 🎥 Videos (3)
      └─ 📄 Virtual Tours (1)

**How to Use Tree View:**
1. Click folder icons to expand/collapse
2. See file counts in badges
3. Filter by property or media type
4. Search across all media
5. Quick actions on hover

**Benefits:**
✓ Visual organization
✓ Easy navigation
✓ Quick file location
✓ Batch operations
✓ Drag-and-drop support`,
        },
        {
          question: 'How do I link media to bookings and listings?',
          answer: `**Connecting Media to Bookings:**

**Method 1: From Media Module**
1. Select photo/video
2. Click "Link to Booking"
3. Choose booking from list
4. Media appears in booking details

**Method 2: From Booking**
1. Open booking details
2. Go to "Attached Media" section
3. Click "Add Media"
4. Select from property media library
5. Or upload new media directly

**Use Cases:**
• Guest check-in photos
• Move-in condition documentation
• Issue reporting with photos
• Guest experience highlights
• Damage documentation

**Linking to Listings:**
**External Platforms:**
• Generate public links
• Copy media URLs
• Sync with Airbnb/VRBO
• Auto-resize for platforms
• SEO-optimized names

**Public Gallery:**
• Create guest-facing galleries
• Share via link
• Embed in website
• No login required
• Watermark option`,
        },
        {
          question: 'How do I manage media storage and compression?',
          answer: `**Storage Management:**

**Storage Limits:**
• **Free Tier:** 5GB
• **Standard:** 50GB
• **Premium:** 500GB
• **Enterprise:** Unlimited

**Check Usage:**
1. Go to Media dashboard
2. View storage meter
3. See breakdown by property
4. View largest files
5. Export usage report

**Compression Options:**

**Automatic Compression:**
• Enabled by default
• Reduces file size by 60-80%
• Maintains visual quality
• Faster loading times
• Saves storage space

**Manual Optimization:**
1. Select large files
2. Click "Optimize"
3. Choose quality level:
   • High (minimal compression)
   • Medium (balanced)
   • Low (maximum compression)
4. Preview before/after
5. Apply changes

**Cleanup Tools:**
• Find duplicate files
• Remove unused media
• Archive old media
• Bulk delete options
• Recycle bin (30-day recovery)

**Best Practices:**
✅ Compress before upload
✅ Delete duplicates monthly
✅ Archive old booking photos
✅ Use external links for large videos
✅ Enable auto-cleanup`,
        },
        {
          question: 'How do I share media with guests and owners?',
          answer: `**Sharing Options:**

**1. PUBLIC GALLERIES** 📸
Create shareable photo galleries:
1. Select photos to share
2. Click "Create Gallery"
3. Add title and description
4. Set expiration (optional)
5. Generate public link
6. Share via email or copy link

**Features:**
• No login required
• Mobile-friendly
• Download options
• Password protection available
• View tracking

**2. OWNER PORTALS** 👤
Share media with property owners:
1. Tag photos for owner
2. Set visibility to "Owner"
3. Owner receives notification
4. Accessible in their portal
5. Download full resolution

**Types:**
• Monthly property reports
• Maintenance updates
• Inspection photos
• Turnover documentation
• Upgrade progress

**3. GUEST CHECK-IN PACKAGES** 🗝️
Send arrival information:
• Property exterior photo
• Parking instructions image
• Entry door close-up
• Keypad/lockbox photo
• Welcome guide PDF
• Area map

**4. EMAIL ATTACHMENTS** 📧
Direct sharing:
1. Select media
2. Click "Share via Email"
3. Enter recipient email
4. Add message
5. Send

**Limits:**
• Max 25MB per email
• Use gallery links for large batches

**5. DOWNLOAD PACKAGES** 📦
Create ZIP downloads:
1. Select multiple files
2. Click "Download All"
3. System creates ZIP
4. Download link generated
5. Link expires in 7 days`,
        },
        {
          question: 'How do I use media for marketing and listings?',
          answer: `**Marketing Use Cases:**

**1. LISTING OPTIMIZATION** 🏠
**Professional Photos:**
• First photo is most important
• Show best room first
• Natural lighting preferred
• Wide-angle lenses
• Staging and decluttering

**Photo Order Strategy:**
1. Hero shot (best exterior/room)
2. Living room
3. Kitchen
4. Master bedroom
5. Bathrooms
6. Other bedrooms
7. Amenities (pool, gym, etc.)
8. View/outdoor spaces
9. Neighborhood highlights

**2. SOCIAL MEDIA** 📱
**Quick Sharing:**
1. Select property photo
2. Click "Share to Social"
3. Choose platform:
   • Instagram (1:1 square)
   • Facebook (16:9)
   • Pinterest (2:3 vertical)
4. Auto-sized for platform
5. Add caption template
6. Schedule or post now

**Content Ideas:**
• Guest testimonials with photos
• Before/after renovations
• Seasonal decorations
• Local attractions
• Behind-the-scenes
• Special offers

**3. WEBSITE INTEGRATION** 🌐
**Embed Options:**
• Property slideshow widget
• Featured properties carousel
• Availability calendar with photos
• Guest testimonial gallery

**Export Formats:**
• HTML embed code
• WordPress plugin
• Wix/Squarespace compatible
• Custom API access

**4. VIDEO TOURS** 🎥
**Virtual Walkthroughs:**
• Record property tour
• Add narration
• Include key features
• 2-3 minutes ideal
• Share on YouTube/Vimeo
• Embed in listings

**5. EMAIL CAMPAIGNS** 📧
**Template Integration:**
• Property showcase emails
• Seasonal promotions
• Last-minute deals
• Owner updates

**Analytics:**
📊 Track media performance:
• Views per photo
• Click-through rates
• Conversion from media
• Most viewed properties
• Engagement metrics`,
        },
      ],
    },
    {
      id: 'documents',
      title: 'Document Management',
      icon: FileText,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      topics: [
        {
          question: 'How do I manage contracts and agreements?',
          answer: `**Contract Management System:**

**CONTRACT TYPES:**
• **Property Management Agreements** - Owner contracts
• **Service Provider Agreements** - Vendor contracts
• **Lease Agreements** - Long-term tenant contracts
• **Guest Rental Agreements** - Short-term booking terms
• **Employment Contracts** - Staff agreements
• **Partnership Agreements** - Business partnerships

**Creating a New Contract:**

**Step 1: Navigate to Contracts**
1. Go to Documents → Contracts
2. Click "Add Contract"

**Step 2: Enter Contract Details**
📝 **Required Information:**
• Contract Type (select from dropdown)
• Contract Title
• Parties Involved (names)
• Effective Date
• Expiration Date
• Contract Value (if applicable)
• Renewal Terms

**Step 3: Upload Contract File**
• Click "Upload Document"
• Supported: PDF, DOCX, DOC
• Max file size: 25MB
• System auto-extracts key dates

**Step 4: Set Reminders**
• Expiration alerts (30/60/90 days)
• Renewal reminders
• Payment due dates
• Review milestones

**Tree View Organization:**
📁 **Contracts**
  ├─ 📂 Property Management (12)
  ├─ 📂 Service Providers (24)
  ├─ 📂 Leases (8)
  ├─ 📂 Guest Agreements (156)
  ├─ 📂 Employment (6)
  └─ 📂 Partnerships (3)

**Contract Tracking:**
🟢 **Active** - Currently in effect
🟡 **Expiring Soon** - Within 90 days
🔴 **Expired** - Past expiration
⚪ **Draft** - Not yet signed
✅ **Completed** - Term fulfilled

**Features:**
✓ Digital signatures
✓ Version control
✓ Auto-reminders
✓ Audit trail
✓ Quick search
✓ Export to PDF`,
        },
        {
          question: 'How do I organize service and employee documents?',
          answer: `**Service Documents Management:**

**Purpose:**
Store and organize vendor-related documentation.

**Document Types:**
• Service quotes and proposals
• Work orders and invoices
• Insurance certificates (COIs)
• Business licenses
• Safety certifications
• Warranty documents
• Product manuals
• Inspection reports

**Organization:**

**By Service Type:**
📁 Plumbing
  └─ ABC Plumbing
      ├─ Business License
      ├─ Insurance (COI)
      ├─ Service Agreement
      └─ Past Invoices (24)

📁 HVAC
📁 Electrical
📁 Cleaning
📁 Landscaping

**Tree View:**
• Group by vendor
• Filter by document type
• Quick search
• Status indicators
• Expiration tracking

**Employee Documents Management:**

**Purpose:**
Maintain all staff HR documentation.

**Document Categories:**

**1. ONBOARDING DOCUMENTS:**
• Employment application
• Resume/CV
• Background check results
• Drug test results (if required)
• Signed offer letter
• Employee handbook acknowledgment

**2. PERSONAL INFORMATION:**
• Photo ID copy
• Social Security card (encrypted)
• Emergency contact form
• Direct deposit authorization
• Tax forms (W-4, I-9)

**3. TRAINING & CERTIFICATIONS:**
• Safety training certificates
• Specialized skills certifications
• License copies (if required)
• Training completion records
• Continuing education

**4. PERFORMANCE & REVIEWS:**
• Performance evaluations
• Disciplinary notices
• Commendations and awards
• Attendance records
• Time-off requests

**5. TERMINATION DOCUMENTS:**
• Resignation letters
• Termination notices
• Exit interview forms
• Final pay stubs
• COBRA notices

**Access Control:**
⚠️ **Highly Sensitive**
• Only admins can access
• Encrypted storage
• Audit log of all views
• Automatic redaction of SSN
• GDPR/privacy compliant

**Organization by Employee:**
👤 **John Smith**
  ├─ 📄 Onboarding (6 docs)
  ├─ 📄 Personal Info (5 docs)
  ├─ 📄 Certifications (3 docs)
  ├─ 📄 Performance (8 docs)
  └─ 📄 Payroll (24 docs)

**Retention Policies:**
• Active employees: Keep all
• Terminated: 7 years
• Auto-archive after termination
• Secure deletion after retention period`,
        },
        {
          question: 'How do I use message templates for guest communication?',
          answer: `**Message Template System:**

**Purpose:**
Create reusable message templates for consistent, professional guest communications.

**TEMPLATE CATEGORIES:**

**1. PRE-ARRIVAL MESSAGES** ✈️
• Booking confirmation
• Pre-arrival checklist (1 week out)
• Check-in instructions (24 hours)
• Parking and access details
• Wi-Fi and amenity information

**2. DURING-STAY MESSAGES** 🏠
• Welcome message (after check-in)
• Mid-stay check-in
• Service reminder (trash, cleaning)
• Upsell opportunities
• Issue response templates

**3. POST-DEPARTURE MESSAGES** 🚪
• Thank you and review request
• Feedback survey
• Return guest discount
• Referral program
• Holiday greetings

**4. OPERATIONAL MESSAGES** ⚙️
• Maintenance notifications
• Emergency communications
• Policy reminders
• Late checkout options
• Early check-in confirmations

**Creating a Template:**

**Step 1: Access Templates**
1. Go to Documents → Message Templates
2. Click "Create Template"

**Step 2: Template Details**
📝 **Required Fields:**
• Template Name (internal use)
• Category (select from dropdown)
• Subject Line (for emails)
• Message Body

**Step 3: Use Variables**
Insert dynamic content:
\`\`\`
Hi {{guest_name}},

Your reservation at {{property_name}} is confirmed!

Check-in: {{checkin_date}} at {{checkin_time}}
Check-out: {{checkout_date}} at {{checkout_time}}
Confirmation #: {{booking_id}}

Address:
{{property_address}}

Access Code: {{access_code}}
Wi-Fi Password: {{wifi_password}}

...
\`\`\`

**Available Variables:**
• {{guest_name}}
• {{property_name}}
• {{property_address}}
• {{checkin_date}}
• {{checkout_date}}
• {{checkin_time}}
• {{checkout_time}}
• {{booking_id}}
• {{access_code}}
• {{wifi_password}}
• {{total_amount}}
• {{guest_count}}
• {{parking_instructions}}

**Step 4: Formatting**
• Rich text editor
• Add images/logos
• Bullet points and lists
• Bold/italic/underline
• Hyperlinks
• Buttons (call-to-action)

**Using Templates:**

**Manual Send:**
1. Go to booking details
2. Click "Send Message"
3. Select template
4. Preview with actual data
5. Edit if needed
6. Send via email/SMS

**Automated Sending:**
1. Go to Settings → Automation
2. Create trigger:
   • Event: "24 hours before check-in"
   • Action: "Send template"
   • Template: "Check-in Instructions"
3. System auto-sends when triggered

**Best Practices:**
✅ Keep messages concise
✅ Use friendly, professional tone
✅ Include all essential info
✅ Proofread carefully
✅ Test with real data
✅ Update seasonally
✅ Personalize when possible`,
        },
        {
          question: 'How does the tree view help organize documents?',
          answer: `**Tree View Document Organization:**

**What is Tree View?**
A hierarchical, folder-based system for organizing documents visually.

**Visual Structure:**
\`\`\`
📁 All Documents
├─ 📂 Contracts
│  ├─ 📂 Property Management Agreements (12)
│  │  ├─ 📄 Sunset Villa Agreement.pdf
│  │  ├─ 📄 Beach House Contract.pdf
│  │  └─ ...
│  ├─ 📂 Service Provider Agreements (24)
│  ├─ 📂 Lease Agreements (8)
│  └─ 📂 Guest Agreements (156)
├─ 📂 Service Documents
│  ├─ 📂 Plumbing (18)
│  ├─ 📂 HVAC (12)
│  ├─ 📂 Electrical (9)
│  └─ 📂 Cleaning (34)
├─ 📂 Employee Documents
│  ├─ 👤 John Smith (23 docs)
│  ├─ 👤 Jane Doe (19 docs)
│  └─ ...
└─ 📂 Message Templates
   ├─ 📂 Pre-Arrival (8)
   ├─ 📂 During Stay (12)
   └─ 📂 Post-Departure (6)
\`\`\`

**How to Use Tree View:**

**1. EXPAND/COLLAPSE FOLDERS**
• Click folder icon to expand
• See all documents inside
• Click again to collapse
• Maintains your view preference

**2. FOLDER BADGES**
• Number in parentheses = document count
• Color coding:
  🟢 All current
  🟡 Some expiring soon
  🔴 Expired items present

**3. QUICK ACTIONS**
Hover over documents for:
• 👁️ Preview
• 📥 Download
• ✏️ Edit details
• 🗑️ Delete
• 🔗 Share link

**4. FILTERING**
• Search within tree
• Filter by date
• Filter by status
• Filter by type

**5. BULK OPERATIONS**
• Select multiple documents
• Checkbox selection
• Bulk download
• Bulk delete
• Bulk move to folder

**Benefits of Tree View:**

✅ **Visual Organization** - See structure at a glance
✅ **Easy Navigation** - Click to drill down
✅ **Intuitive** - Familiar folder metaphor
✅ **Scalable** - Works with 1000s of documents
✅ **Fast** - Quick folder expansion
✅ **Mobile Friendly** - Touch-friendly interface

**vs. List View:**
• Tree View: Better for browsing
• List View: Better for searching
• Switch between views anytime
• Preference saved per user

**Customization:**
• Create custom folders
• Rename folders
• Reorder folders
• Set default view
• Pin frequently used folders`,
        },
        {
          question: 'How do I set document expiration reminders?',
          answer: `**Document Expiration Management:**

**Why Track Expirations?**
Critical for:
• Insurance certificates (COIs)
• Business licenses
• Employee certifications
• Contract renewals
• Permits and approvals

**Setting Up Expiration Tracking:**

**Step 1: Add Expiration Date**
When uploading document:
1. Enter "Expiration Date" field
2. System calculates days until expiry
3. Auto-categorizes status

**Step 2: Configure Reminders**
1. Go to document details
2. Click "Reminders"
3. Set alert schedule:
   • 90 days before (Yellow alert)
   • 30 days before (Orange alert)
   • 7 days before (Red alert)
   • On expiration day (Critical)
   • Daily after expiration
4. Choose notification method:
   ✓ Email notification
   ✓ In-app notification
   ✓ SMS alert (for critical docs)

**Step 3: Assign Responsibility**
• Set "responsible person"
• They receive all reminders
• Escalate to manager if no action

**Expiration Status Indicators:**

🟢 **CURRENT** (>90 days)
• Document is valid
• No action needed
• Regular review

🟡 **EXPIRING SOON** (30-90 days)
• Yellow highlight
• Email reminder sent
• Begin renewal process

🟠 **CRITICAL** (<30 days)
• Orange highlight
• Daily email reminders
• Urgent action required

🔴 **EXPIRED**
• Red highlight
• Cannot use vendor/service
• Immediate action required
• Auto-flags related records

**Automated Actions:**

**When Document Expires:**
• Email to responsible person
• Manager notification
• Related services suspended
• Dashboard alert
• Report added to weekly summary

**Example: Vendor COI Expiration**
• 30 days out: Email to vendor
• 15 days: Second reminder
• 7 days: Phone call recommended
• Expiration: Vendor deactivated
• Cannot book new jobs
• In-progress jobs flagged

**Dashboard View:**

**Expirations Widget:**
• Shows all expiring docs
• Grouped by urgency
• Click to take action
• Sort by date or type

**Reports:**
• Weekly expiration report
• Monthly compliance report
• Vendor compliance status
• Employee certification status

**Renewal Workflow:**

**Step 1: Receive Reminder**
• Email notification with details

**Step 2: Request Renewal**
• Contact vendor/employee
• Request updated document
• Set follow-up date

**Step 3: Upload New Document**
• Upload replacement
• Old document archived
• New expiration date set
• Reminders reset

**Step 4: Verify & Approve**
• Review new document
• Verify coverage/validity
• Approve and activate
• Notify relevant parties

**Best Practices:**
✅ Set 90-day advance reminders
✅ Assign clear responsibility
✅ Track renewal progress
✅ Keep renewal notes
✅ Archive old versions
✅ Verify before approval
✅ Update all related records`,
        },
        {
          question: 'How do I search and filter documents?',
          answer: `**Document Search & Filtering:**

**SEARCH METHODS:**

**1. QUICK SEARCH** 🔍
• Search bar at top
• Searches across all fields:
  - Document name
  - Description
  - File contents (PDF text)
  - Tags
  - Uploader name
• Real-time results
• Highlights matching text

**2. ADVANCED FILTERS** 🎯

**Filter by Document Type:**
☑️ Contracts
☑️ Service Documents
☑️ Employee Documents
☑️ Message Templates
☑️ Certificates
☑️ Licenses
☑️ Invoices

**Filter by Date Range:**
• Upload date
• Expiration date
• Last modified
• Custom range picker

**Filter by Status:**
☑️ Current/Active
☑️ Expiring Soon (< 90 days)
☑️ Expired
☑️ Pending Approval
☑️ Archived

**Filter by Property:**
• Select specific property
• Or "All Properties"
• Shows property-linked docs

**Filter by Uploader:**
• See who uploaded
• Filter by team member
• Track document source

**Filter by File Type:**
• PDF
• Word (DOCX, DOC)
• Excel (XLSX, XLS)
• Images (JPG, PNG)
• Other

**3. SAVED FILTERS** 💾
Create reusable filter combinations:

**Example: "Expiring Insurance"**
• Type: COI/Insurance
• Status: Expiring Soon
• Sort: Expiration date (ascending)

**How to Save:**
1. Set your filters
2. Click "Save Filter"
3. Name it
4. Access from dropdown

**Common Saved Filters:**
• "Contracts Expiring This Quarter"
• "Employee Certifications Due"
• "Pending Service Documents"
• "Recently Uploaded"

**4. SORTING OPTIONS** ⬆️⬇️
Sort results by:
• Name (A-Z, Z-A)
• Upload date (Newest, Oldest)
• Expiration date (Soonest, Latest)
• File size (Largest, Smallest)
• Relevance (search results)

**5. BULK ACTIONS** ✅
After filtering:
• Select all results
• Download as ZIP
• Bulk delete
• Bulk tag
• Bulk move to folder
• Export list to Excel

**SEARCH OPERATORS:**

**Exact Phrase:**
"Property Management Agreement"
• Must match exactly

**Exclude Terms:**
COI -expired
• COIs that are NOT expired

**Date Ranges:**
uploaded:2025-01
• Uploaded in January 2025

**File Type:**
type:pdf plumbing
• PDFs containing "plumbing"

**TREE VIEW WITH SEARCH:**

**Combined Power:**
1. Use tree view for browsing
2. Use search for specific docs
3. Results highlight tree location
4. Click to see in context

**Example:**
• Search: "Sunset Villa lease"
• Results show document
• Tree highlights: Contracts → Leases → Sunset Villa
• One-click to folder location

**EXPORT SEARCH RESULTS:**
• Export to Excel
• CSV format
• Includes metadata:
  - File name
  - Type
  - Upload date
  - Uploader
  - Expiration date
  - File size
• Use for reporting`,
        },
      ],
    },
    {
      id: 'access-control',
      title: 'Access Control & Security',
      icon: ShieldCheck,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50',
      topics: [
        {
          question: 'How do I manage vendor COIs (Certificates of Insurance)?',
          answer: `**COI Management System:**

**Why COIs Matter:**
Certificates of Insurance (COI) protect your business by ensuring vendors have adequate insurance coverage before accessing properties.

**Required Coverage Types:**
• **General Liability:** Min $1,000,000
• **Workers' Compensation:** Min $500,000
• **Auto Liability:** $1,000,000 (if applicable)
• **Property Damage:** Included in general liability

**Adding a COI:**

**Step 1: Navigate to COIs**
1. Go to Operations → Vendor COIs
2. Click "Add COI"

**Step 2: Enter COI Details**
📋 **Required Information:**
• Vendor Name (from service providers list)
• Policy Number
• Insurance Provider
• Policy Type (General Liability, Workers Comp, Auto)
• Coverage Amount
• Effective Date
• Expiration Date
• Certificate Holder (your company)

**Step 3: Upload Certificate**
• Click "Upload Certificate"
• Supported: PDF, JPG, PNG
• System auto-reads dates (OCR)
• Preview before saving

**Tree View Organization:**
📁 **Vendor COIs**
  ├─ 🟢 Current (45)
  │   ├─ ABC Plumbing - Exp: Dec 2025
  │   ├─ XYZ HVAC - Exp: Nov 2025
  │   └─ ...
  ├─ 🟡 Expiring Soon (8)
  │   ├─ Clean Team - Exp: Feb 2025
  │   └─ ...
  └─ 🔴 Expired (3)
      ├─ Old Vendor - EXPIRED
      └─ ...

**Automatic Tracking:**

**90 Days Before Expiration:**
• Yellow status indicator
• Email reminder to vendor
• Dashboard notification

**30 Days Before Expiration:**
• Orange status indicator
• Second email reminder
• Phone call recommended
• Booking restrictions enabled

**On Expiration Date:**
• Red status indicator
• Vendor automatically deactivated
• Cannot assign to new jobs
• In-progress jobs flagged for review

**Compliance Dashboard:**
View all vendor compliance at a glance:
• Total vendors: 45
• Compliant: 37 (82%)
• Expiring soon: 8 (18%)
• Expired: 0 (0%)

**Reports:**
• Weekly COI status report
• Vendor compliance summary
• Expiration calendar
• Non-compliant vendors list`,
        },
        {
          question: 'How do I create and manage access authorizations?',
          answer: `**Access Authorization System:**

**Purpose:**
Control and track who has access to which properties and when, ensuring security and accountability.

**Creating an Access Authorization:**

**Step 1: Navigate to Access Authorizations**
1. Go to Operations → Access Authorizations
2. Click "Create Authorization"

**Step 2: Authorization Details**
📝 **Required Information:**
• **Property/Unit:** Select from dropdown
• **Vendor/Person:** Who needs access
• **Purpose:** Reason for access
  - Maintenance/Repair
  - Cleaning/Turnover
  - Inspection
  - Showing/Tour
  - Emergency
  - Other
• **Date:** When access is granted
• **Time Window:** Start and end time
• **Access Type:**
  - One-time
  - Recurring (specify days)
  - Duration-based

**Step 3: Access Method**
• Physical key pickup
• Digital access code (auto-generated)
• Building management escort
• Property manager meeting
• Lockbox combination

**Step 4: Special Instructions**
• Parking location
• Entry procedures
• Alarm code (if applicable)
• Pet instructions
• Emergency contacts

**Step 5: Requirements**
☑️ Valid COI attached
☑️ Background check (if required)
☑️ Building approval (if needed)
☑️ Resident notification sent

**Tree View Organization:**
📁 **Access Authorizations**
  ├─ 📅 Today's Access (5)
  │   ├─ 🟢 ABC Plumbing @ Sunset Villa - 9 AM-12 PM
  │   ├─ 🟢 Clean Team @ Beach House - 11 AM-3 PM
  │   └─ ...
  ├─ 📅 Upcoming (12)
  │   ├─ HVAC Tech @ Condo 201 - Tomorrow 2 PM
  │   └─ ...
  ├─ 📅 Recurring (8)
  │   ├─ Weekly Cleaning - Every Monday
  │   └─ ...
  └─ 📁 Past Authorizations (Archive)

**Digital Access Codes:**

**Auto-Generation:**
• System creates unique codes
• Valid only during authorized time
• Auto-expires after window
• Can extend remotely if needed

**Smart Lock Integration:**
• Sync with August, Yale, Schlage
• Create temporary access
• Track entry/exit times
• Remote lock/unlock

**Notification System:**

**Upon Authorization Creation:**
📧 **To Vendor:**
• Property address
• Access date/time
• Entry instructions
• Access code (if digital)
• Contact info
• Map/directions

📧 **To Building Management:**
• Vendor details
• COI proof attached
• Purpose of visit
• Expected duration

📧 **To Resident (if applicable):**
• Service notification
• Vendor credentials
• Expected completion time

**Access Log:**
Track all property access:
• Who accessed
• Date and time
• Duration of stay
• Entry method used
• Work completed
• Departure confirmation

**Security Features:**

**Verification:**
✓ Photo ID required
✓ COI must be current
✓ Background check (optional)
✓ Reference check
✓ Company credentials

**Monitoring:**
• Real-time entry notifications
• GPS check-in (mobile app)
• Departure confirmation required
• Property condition photos
• Incident reporting

**Emergency Overrides:**
• Manager can grant emergency access
• 24-hour access codes
• Remote unlock capability
• Security contacted if needed`,
        },
        {
          question: 'What security measures protect sensitive data?',
          answer: `**Data Security & Privacy:**

**Encryption:**

**Data at Rest:**
• AES-256 encryption for all stored data
• Encrypted backups
• Secure database storage
• Encrypted file uploads

**Data in Transit:**
• TLS 1.3 encryption
• HTTPS for all connections
• Secure API endpoints
• Encrypted email communications

**Access Control:**

**Role-Based Permissions:**
• Admins: Full access
• Ops: Operational data only
• Property Managers: Assigned properties only
• Cleaners/Maintenance: Task-specific access

**Two-Factor Authentication (2FA):**
• SMS verification
• Authenticator app support
• Backup codes provided
• Required for admins
• Optional for other roles

**Session Management:**
• Auto-logout after 30 minutes inactivity
• Concurrent session limits
• Device tracking
• Remote logout capability

**Data Privacy:**

**Personal Information Protection:**
• SSN automatic redaction
• Credit card tokenization
• Password hashing (bcrypt)
• PII data minimization
• Right to be forgotten (GDPR)

**Access Logs:**
Track all data access:
• Who viewed what
• When it was viewed
• What changes were made
• IP address tracking
• Device information

**Compliance:**

**Standards:**
✓ GDPR compliant
✓ CCPA compliant
✓ SOC 2 Type II
✓ PCI DSS (payment data)

**Regular Audits:**
• Quarterly security audits
• Penetration testing
• Vulnerability scanning
• Code security reviews

**Data Backup:**

**Automatic Backups:**
• Daily full backups
• Hourly incremental backups
• 30-day retention
• Multiple geographic locations
• Point-in-time recovery

**Disaster Recovery:**
• Recovery Time Objective (RTO): 4 hours
• Recovery Point Objective (RPO): 1 hour
• Tested quarterly
• Documented procedures

**Vendor Security:**

**Third-Party Requirements:**
• COI verification required
• Background checks available
• Data sharing agreements
• Limited data access
• Audit trail of vendor access

**API Security:**
• API key authentication
• Rate limiting
• IP whitelisting option
• Request signing
• Webhook verification

**Best Practices:**

**For Users:**
✅ Use strong, unique passwords
✅ Enable 2FA
✅ Don't share credentials
✅ Log out on shared devices
✅ Report suspicious activity
✅ Regular password changes
✅ Review access logs`,
        },
        {
          question: 'How do background checks work for vendors?',
          answer: `**Vendor Background Check System:**

**When Required:**
• Access to occupied units
• Work in sensitive areas
• Handling valuable property
• Recurring access
• High-security properties
• Client requirement

**Background Check Levels:**

**LEVEL 1: BASIC** ($25)
Duration: 1-2 business days
Includes:
• Identity verification
• Social Security trace
• National criminal database
• Sex offender registry
• Driving record (if applicable)

**LEVEL 2: STANDARD** ($50)
Duration: 3-5 business days
Includes all Level 1, plus:
• County criminal search (7 years)
• Federal criminal search
• Civil court records
• Credit report (basic)
• Employment verification

**LEVEL 3: COMPREHENSIVE** ($100)
Duration: 7-10 business days
Includes all Level 2, plus:
• Multi-state criminal search
• Professional license verification
• Education verification
• Reference checks (3)
• Credit report (full)
• International records (if applicable)

**Process:**

**Step 1: Request Background Check**
1. Go to Service Providers
2. Select vendor
3. Click "Request Background Check"
4. Choose level
5. Vendor receives consent form

**Step 2: Vendor Consent**
• Vendor fills out authorization
• Provides required information:
  - Full name
  - Date of birth
  - Social Security number
  - Current address
  - 7-year address history
• Digital signature required

**Step 3: Processing**
• Third-party service processes
• System monitors status
• Updates shown in real-time

**Step 4: Results**
• Admin receives notification
• Review results in system
• Make approval decision
• Document decision rationale

**Results Interpretation:**

**CLEAR** 🟢
• No negative findings
• Approved for property access
• Valid for 12 months

**CONSIDER** 🟡
• Minor findings require review
• Case-by-case decision
• Manager approval needed
• Possible restrictions

**FLAGGED** 🔴
• Serious concerns found
• Denied property access
• Cannot assign to jobs
• Must resolve or find alternate vendor

**Red Flags:**
⚠️ Violent criminal history
⚠️ Theft/property crimes
⚠️ Sex offender status
⚠️ Multiple DUIs (for drivers)
⚠️ Fraud convictions
⚠️ Recent convictions (<3 years)

**Privacy & Compliance:**

**Fair Credit Reporting Act (FCRA):**
• Written consent required
• Adverse action notice if denied
• Copy of report provided
• Dispute process available

**Data Protection:**
• Results encrypted
• Access restricted to admins
• Cannot share with third parties
• Secure document storage
• Auto-delete after retention period

**Renewal:**
• Background checks expire after 12 months
• Renewal reminder at 11 months
• Continuous access requires current check
• More frequent for high-risk roles

**Alternative Verification:**

**For Established Companies:**
• Company-wide blanket check
• Individual employee checks
• Insurance as substitute
• Trade association membership
• Professional certifications

**International Vendors:**
• Country-specific checks
• Interpol database search
• Passport verification
• Work authorization check`,
        },
        {
          question: 'How does the access authorization workflow integrate with jobs?',
          answer: `**Integrated Access Management Workflow:**

**Automatic Authorization Creation:**

**When Job is Assigned:**
1. Service job created in pipeline
2. Vendor assigned to job
3. System checks:
   ✓ Vendor has current COI
   ✓ Background check is valid
   ✓ No access restrictions
4. If all checks pass:
   • Access authorization auto-created
   • Time window based on job schedule
   • Property info auto-populated
   • Entry instructions attached

**Manual Approval Process:**

**If Checks Fail:**
⚠️ **Expired COI:**
• Job blocked until renewal
• Notification to vendor
• Cannot proceed

⚠️ **No Background Check:**
• Admin approval required
• Must be escorted
• Or substitute vendor

⚠️ **Building Approval Needed:**
• Form sent to building management
• Job on hold until approved
• Estimated 24-48 hour delay

**Access Code Management:**

**Smart Lock Integration:**
1. Job scheduled for Tuesday, 2-4 PM
2. System creates code: #4829
3. Code active: Tue 1:55 PM - 4:30 PM
4. Vendor receives SMS with code
5. Entry logged: 2:03 PM
6. Exit logged: 3:47 PM
7. Code auto-expires: 4:30 PM

**Traditional Keys:**
1. Key pickup location specified
2. Vendor signs key log
3. Photo ID verified
4. Deposit collected (if required)
5. Return by specified time
6. Late fee if not returned

**Service Pipeline Integration:**

**STAGE 1: Quote Requested**
• Check vendor COI status
• Flag if expiring soon
• Cannot proceed if expired

**STAGE 2: Quote Approved**
• System verifies all requirements
• Pre-creates authorization draft
• Vendor receives preliminary notice

**STAGE 3: Job Scheduled**
• Finalize authorization
• Generate access codes
• Send all notifications
• Building approval (if needed)

**STAGE 4: Day Before Service**
• Reminder to vendor with access info
• Verification checks repeated
• Weather/scheduling confirmations

**STAGE 5: Service Day**
• Morning: Access code activated
• Entry: GPS check-in notification
• During: Available for support
• Exit: GPS checkout + completion photos

**STAGE 6: Completion**
• Access code deactivated
• Access log closed
• Review vendor notes
• Archive authorization

**Real-Time Monitoring:**

**Dashboard View:**
📍 **Active Right Now:**
• ABC Plumbing @ Sunset Villa (entered 2:03 PM)
• Clean Team @ Beach House (entered 11:15 AM)

📅 **Expected Today:**
• HVAC Tech @ Condo 201 (2:00-5:00 PM) - Not yet arrived
• Inspector @ Villa 5 (3:00-4:00 PM) - Not yet arrived

⚠️ **Issues:**
• Late arrival: Painter @ Unit 3B (expected 9 AM, now 10:30 AM)

**Notifications:**

**To Operations:**
• "ABC Plumbing has entered Sunset Villa"
• "Clean Team has not checked in (30 min late)"
• "HVAC Tech completed work at Condo 201"

**To Vendor:**
• Reminder 2 hours before
• Access instructions
• Completion checklist
• "Please confirm departure"

**To Residents:**
• "Service scheduled tomorrow"
• "Vendor has arrived"
• "Work completed, please review"

**Security Escalation:**

**If Issues Detected:**
🚨 Entry outside authorized window
🚨 No exit confirmation after 2 hours past window
🚨 Multiple failed code attempts
🚨 Suspicious activity reported

**Actions:**
1. Alert operations team
2. Attempt contact with vendor
3. Check property cameras (if available)
4. Send someone to verify
5. Contact authorities if needed
6. Document incident
7. Review vendor status

**Reporting:**
• Daily access summary
• Weekly vendor activity report
• Monthly compliance report
• Incident logs
• Property access history`,
        },
        {
          question: 'How do I audit and review access logs?',
          answer: `**Access Log Auditing:**

**Access to Audit Logs:**
• Admins: Full access to all logs
• Ops: Property-specific logs
• Property Managers: Their properties only

**What's Logged:**

**Every Property Access:**
• Vendor/person name
• Property address
• Date and time of entry
• Date and time of exit
• Access method (code, key, escort)
• Authorization reference
• Purpose of visit
• Duration of stay
• GPS coordinates (if available)
• Entry photos
• Exit photos
• Work completed summary
• Any issues reported

**Every System Access:**
• User login/logout
• Pages viewed
• Data accessed
• Changes made
• Downloads
• Exports
• Failed login attempts
• IP addresses
• Device information

**Viewing Access Logs:**

**Step 1: Navigate to Logs**
1. Go to System → Access Logs
   OR
2. Go to property details → Access History

**Step 2: Filter Logs**
📊 **Filter Options:**
• Date range (custom picker)
• Property (specific or all)
• Vendor (specific or all)
• Access type (authorized, emergency, staff)
• Time of day
• Duration (< 1 hr, 1-3 hrs, > 3 hrs)
• Status (completed, ongoing, incident)

**Step 3: Review Entries**
Each log shows:
✓ Entry card with all details
✓ Timeline view
✓ Map location (if GPS)
✓ Attached photos
✓ Related job/authorization
✓ Vendor rating for this visit

**Advanced Analytics:**

**Property Access Patterns:**
• Most accessed properties
• Peak access times
• Average visit duration
• Vendor frequency
• Unauthorized attempts

**Vendor Performance:**
• On-time arrival rate
• Average duration vs estimated
• Completion rate
• Issue frequency
• Client ratings

**Security Metrics:**
• Failed access attempts
• After-hours access (with reason)
• Emergency accesses
• Key/code issues
• Incident rate

**Anomaly Detection:**

**System Alerts:**
🚨 Access during unusual hours
🚨 Extended stay beyond window
🚨 Multiple properties same day
🚨 Pattern deviations
🚨 High-frequency access

**Automatic Flagging:**
• Access >1 hour past window
• Entry without authorization
• No exit recorded
• Multiple failed attempts
• GPS mismatch with property

**Audit Reports:**

**Daily Access Report:**
• All property entries today
• Currently on-site vendors
• Completed vs ongoing
• Any issues or delays
• Tomorrow's schedule

**Weekly Summary:**
• Total property visits
• Unique vendors
• Average visit duration
• Incidents/issues
• Compliance rate

**Monthly Compliance:**
• COI status all vendors
• Background check renewals
• Authorization compliance
• Security incidents
• Recommendations

**Quarterly Security Audit:**
• Full access pattern review
• Vendor risk assessment
• System security review
• Policy compliance check
• Improvement recommendations

**Export Options:**
📄 **PDF Report** - Formatted for presentation
📊 **Excel/CSV** - Data analysis
🗂️ **Archive** - Long-term storage
📧 **Email** - Schedule automatic sending

**Incident Investigation:**

**If Issue Occurs:**
1. Pull relevant logs
2. Review timeline
3. Check photos/documentation
4. Contact vendor for statement
5. Review authorization
6. Assess damage/impact
7. Determine liability
8. Document resolution
9. Update vendor record
10. Adjust procedures if needed

**Compliance & Retention:**

**Log Retention:**
• Active logs: Indefinite
• Archived logs: 7 years
• Incident logs: 10 years
• Compliance with regulations
• Searchable archive

**Privacy:**
• Logs encrypted at rest
• Access logged (who viewed logs)
• Cannot be altered
• Blockchain verification (optional)
• GDPR data export available

**Best Practices:**
✅ Review logs weekly
✅ Investigate anomalies promptly
✅ Document all incidents
✅ Share reports with property owners
✅ Use data to improve security
✅ Train staff on log review
✅ Automate routine monitoring`,
        },
      ],
    },
    {
      id: 'advanced-features',
      title: 'Advanced Features',
      icon: Settings,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      topics: [
        {
          question: 'How do I create and use checklist templates for check-in/check-out?',
          answer: `**Checklist Template System:**

**Purpose:**
Create reusable checklists for property inspections, check-ins, check-outs, and quality control.

**Creating a Template:**

**Step 1: Navigate to Templates**
1. Go to Operations → Checklist Templates
2. Click "Create Template"

**Step 2: Template Details**
📝 **Basic Information:**
• Template Name (e.g., "Standard Check-In", "Deep Clean Inspection")
• Template Type:
  - Check-In
  - Check-Out
  - Inspection
  - Maintenance
  - Quality Control
• Property (specific or all)
• Description/Purpose

**Step 3: Build Checklist Items**
Add checklist items with different types:

**Checkbox Items:**
☑️ All lights working
☑️ No visible damage
☑️ Appliances functioning
☑️ Keys present

**Text Response:**
📝 Meter reading: _______
📝 Guest count: _______
📝 Special notes: _______

**Photo Required:**
📸 Living room condition
📸 Kitchen appliances
📸 Bathroom cleanliness
📸 Exterior/parking

**Signature:**
✍️ Inspector signature
✍️ Manager approval
✍️ Guest acknowledgment

**Step 4: Set Item Properties**
For each item:
• Required (must complete) vs Optional
• Order/sequence number
• Help text/instructions
• Conditional logic (show if...)

**Using Templates During Check-In/Out:**

**Starting a Check-In:**
1. Go to Operations → Check-In/Check-Out
2. Click "New Check-In"
3. Select property
4. Choose checklist template
5. Enter guest information
6. Begin inspection

**Completing the Checklist:**
• Items shown in order
• Check off completed items
• Add photos inline
• Enter text responses
• Flag issues found
• Add notes for each item

**Photo Capture:**
• Use device camera
• Auto-timestamp
• GPS location embedded
• Compare to previous check-in
• Before/after comparison

**Issue Reporting:**
If issues found during checklist:
• Flag item as "Issue"
• Take photos of damage
• Estimate repair cost
• Create maintenance task automatically
• Notify property manager
• Update property status

**Signature Capture:**
• Digital signature pad
• Touch/mouse drawing
• Name and date auto-added
• Timestamp recorded
• Cannot edit after signing

**PDF Report Generation:**

**Upon Completion:**
1. All responses compiled
2. Photos included
3. Signature embedded
4. PDF auto-generated
5. Stored with record
6. Email to stakeholders
7. Available for download

**Pre-configured Templates:**

**Check-In Inspection (24 items):**
• Exterior condition (5 items)
• Living areas (6 items)
• Kitchen (5 items)
• Bathrooms (4 items)
• Utilities (4 items)

**Check-Out Inspection (28 items):**
• All check-in items
• Damage assessment
• Cleaning level required
• Missing items check
• Meter readings
• Key return confirmation

**Deep Clean Quality Control (35 items):**
• Room-by-room inspection
• Surface cleanliness
• Appliance condition
• Bathroom sanitation
• Floor cleanliness
• Final approval

**Template Benefits:**
✅ Consistency across properties
✅ Nothing forgotten
✅ Photo documentation
✅ Accountability
✅ Quality control
✅ Legal protection
✅ Dispute resolution`,
        },
        {
          question: 'How does tree view improve document organization?',
          answer: `**Tree View Feature Overview:**

**What is Tree View?**
A hierarchical, visual file organization system similar to Windows Explorer or Mac Finder.

**Where Tree View is Available:**
• Document modules (Contracts, Service Docs, Employee Docs)
• Media Management
• Vendor COIs
• Access Authorizations

**Visual Structure:**
\`\`\`
📁 Root Folder
├─ 📂 Category 1 (count)
│  ├─ 📂 Subcategory A
│  │  ├─ 📄 Document 1
│  │  ├─ 📄 Document 2
│  │  └─ 📄 Document 3
│  └─ 📂 Subcategory B
│     └─ 📄 Document 4
├─ 📂 Category 2 (count)
│  └─ 📄 Document 5
└─ 📂 Category 3 (count)
   ├─ 📄 Document 6
   └─ 📄 Document 7
\`\`\`

**How to Use:**

**1. EXPAND/COLLAPSE**
• Click folder icon to expand
• Click again to collapse
• Double-click to expand all children
• Right-click for bulk operations

**2. NAVIGATION**
• Click folder to view contents
• Breadcrumb trail shows path
• Back/forward buttons
• Quick jump to parent

**3. SEARCH WITHIN TREE**
• Search filters tree in real-time
• Highlights matching folders
• Auto-expands to show results
• Preserves tree structure

**4. DRAG & DROP** (if enabled)
• Drag documents to folders
• Drag to reorder
• Multi-select drag
• Visual drop indicator

**Folder Badges:**

**Count Badges:**
📂 Contracts (24) ← 24 documents inside

**Status Indicators:**
🟢 All current/valid
🟡 Some items expiring soon
🔴 Expired items present
⚪ Empty folder

**Smart Badges:**
📊 Has sub-folders
🔒 Restricted access
⭐ Favorite/pinned
📌 Recently accessed

**Actions:**

**Hover Actions:**
• 👁️ Preview first item
• 📥 Download entire folder
• ✏️ Rename folder
• 🎨 Change folder color
• ⭐ Add to favorites

**Right-Click Menu:**
• Open in new tab
• Expand all subfolders
• Collapse all
• Sort contents
• Export folder
• Share folder

**Tree View vs List View:**

**When to Use Tree View:**
• Browsing and exploring
• Understanding structure
• Organizing documents
• Managing categories
• Visual learners

**When to Use List View:**
• Searching for specific files
• Sorting by date/name/size
• Bulk selection
• Quick scanning
• Detailed metadata view

**Toggle between views:**
• Button at top right
• Keyboard shortcut: Ctrl+T
• Preference saved per user

**Advanced Features:**

**Custom Folders:**
• Create your own structure
• Name and nest folders
• Set folder icons/colors
• Reorder folders
• Private vs shared folders

**Auto-Organization:**
• Smart folders (like playlists)
• Auto-sort by rules:
  - Date ranges
  - Document type
  - Property
  - Status
  - Custom criteria

**Favorite/Pin System:**
• Pin frequently used folders to top
• Add to favorites sidebar
• Quick access menu
• Recent folders history

**Keyboard Shortcuts:**
• Arrow keys: Navigate
• Enter: Open folder
• Backspace: Go to parent
• Space: Preview
• Ctrl+Click: Multi-select
• / : Focus search

**Mobile Experience:**
• Touch-friendly spacing
• Swipe to go back
• Long-press for menu
• Pinch to collapse all
• Shake to refresh

**Performance:**
• Lazy loading (load as you expand)
• Virtual scrolling (thousands of items)
• Cached folder states
• Instant search
• Smooth animations

**Benefits Summary:**
✅ Intuitive navigation
✅ Visual organization
✅ Faster file location
✅ Better understanding of structure
✅ Improved user experience
✅ Reduced clicks to find files`,
        },
        {
          question: 'What are bill templates and how do I use them?',
          answer: `**Bill Template System:**

**Purpose:**
Create reusable billing templates for recurring charges, standard services, and consistent invoicing.

**Accessing Bill Templates:**
1. Go to Finance → Bill Templates
2. View all templates
3. Create, edit, or delete

**Creating a Bill Template:**

**Step 1: Template Basics**
📝 **Information:**
• Template Name (e.g., "Standard Cleaning Fee", "Monthly Management")
• Category:
  - Property Management Fee
  - Cleaning & Turnover
  - Maintenance & Repairs
  - Utilities
  - Guest Fees
  - Owner Charges
  - Other
• Description/Notes

**Step 2: Line Items**
Add multiple line items:

**Item Details:**
• Item name/description
• Quantity (default 1)
• Unit price
• Tax rate (if applicable)
• Category code
• GL account (if using accounting integration)

**Pricing Options:**
• Fixed amount: $150
• Percentage: 10% of subtotal
• Per unit: $50 × quantity
• Tiered pricing: Based on property size/type
• Variable: Enter at time of use

**Step 3: Variables & Customization**
Use dynamic variables:
• \{\{property_name\}\}
• \{\{booking_nights\}\}
• \{\{guest_count\}\}
• \{\{property_size\}\} (bedrooms)
• \{\{season\}\} (summer/winter rates)
• \{\{date_range\}\}

**Example:**
"Cleaning Fee for \{\{property_name\}\} (\{\{property_size\}\} bedrooms) - $\{\{base_rate\}\} + $\{\{per_bedroom_rate\}\} per BR"

**Step 4: Tax Configuration**
• Apply sales tax (%)
• Tax-exempt items
• Multi-jurisdiction tax
• Tax included vs added

**Step 5: Terms & Notes**
• Payment terms (Net 15, Net 30, Due on receipt)
• Late fees policy
• Cancellation policy
• Special instructions
• Terms & conditions

**Common Bill Templates:**

**1. CLEANING & TURNOVER**
Template: "Standard Turnover"
• Base cleaning: $100
• Per bedroom: +$25
• Same-day turnover: +$50
• Deep clean add-on: +$75
• Laundry service: $30
→ Total calculated based on property

**2. PROPERTY MANAGEMENT FEE**
Template: "Monthly Management"
• Management fee: 15% of gross rent
• Minimum fee: $200
• Additional services:
  - Inspection: $50
  - Key replacement: $25
  - Guest communication: $15 per booking

**3. GUEST BOOKING CHARGES**
Template: "Guest Invoice"
• Nightly rate: Variable
• Cleaning fee: From template
• Service fee: 10%
• Security deposit: $500
• Pet fee: $100 (if applicable)
• Extra guest fee: $50/person/night (>4 guests)

**4. MAINTENANCE SERVICES**
Template: "HVAC Service"
• Service call: $150
• Hourly rate: $125/hr
• Parts: Actual cost
• Emergency fee (after hours): +$100

**5. OWNER STATEMENT CHARGES**
Template: "Owner Fees"
• Management commission: 20%
• Cleaning coordination: $15 per turnover
• Maintenance markup: 10%
• Platform fees: Actual
• Credit card processing: 2.9% + $0.30

**Using Templates:**

**Method 1: Manual Application**
1. Create new invoice
2. Click "Apply Template"
3. Select template
4. Variables auto-populated
5. Review and adjust
6. Save invoice

**Method 2: Automatic Application**
1. Configure automation rules
2. Trigger: Booking confirmed
3. Action: Create invoice from template
4. Send to guest automatically

**Template Settings:**

**Default Settings:**
• Auto-apply to specific properties
• Auto-apply by booking source
• Auto-apply by season
• Default payment terms
• Default email message

**Approval Workflow:**
• Require manager approval
• Auto-approve under $X
• Notification when created
• Review before sending

**Version Control:**
• Save template versions
• Track changes
• Revert to previous
• Effective date ranges

**Benefits:**

✅ **Consistency** - Same pricing every time
✅ **Speed** - Create invoices in seconds
✅ **Accuracy** - No calculation errors
✅ **Professionalism** - Uniform appearance
✅ **Automation** - Set and forget
✅ **Transparency** - Clear line items
✅ **Scalability** - Works for 1 or 100 properties

**Advanced Features:**

**Conditional Logic:**
• If property has pool → add pool cleaning fee
• If booking > 7 nights → apply weekly discount
• If off-season → reduce rates by 20%

**Multi-Currency:**
• Set primary currency
• Auto-convert for international guests
• Display both currencies
• Update exchange rates

**Discounts & Promotions:**
• Early bird discount
• Last-minute deal
• Repeat guest discount
• Long-term stay discount
• Seasonal promotions

**Integration:**
• QuickBooks sync
• Xero accounting
• Stripe payment processing
• Airbnb pricing sync
• Custom accounting codes`,
        },
        {
          question: 'How do I view my commissions as a team member?',
          answer: `**My Commissions Portal:**

**Accessing Your Commissions:**
1. Go to Finance → My Commissions
   (Available to all staff members)
2. View your personal commission dashboard

**Dashboard Overview:**

**Summary Cards:**
💰 **Current Month Earnings**
• Pending commissions: $1,245
• Approved commissions: $890
• Paid commissions: $0
• Total potential: $2,135

📊 **Year-to-Date**
• Total earned: $18,450
• Average per month: $3,075
• Highest month: $4,200 (July)
• Commission rate: 8.5%

**Commission Breakdown:**

**By Source:**
• Booking commissions: $12,300 (67%)
• Service jobs: $4,150 (22%)
• Referral bonuses: $2,000 (11%)

**By Status:**
• ⏳ Pending: $1,245 (waiting for payment from client)
• ✅ Approved: $890 (ready for payout)
• 💵 Paid: $16,315 (already received)

**Commission Details Table:**

**Columns Shown:**
• Date
• Type (Booking, Service, Referral)
• Description (property/job details)
• Base Amount
• Commission Rate
• Commission Amount
• Status
• Payment Date (if paid)

**Example Entries:**
| Date | Type | Description | Base | Rate | Commission | Status |
|------|------|-------------|------|------|------------|--------|
| 2025-01-15 | Booking | Sunset Villa (7 nights) | $2,100 | 10% | $210 | Pending |
| 2025-01-12 | Service | HVAC Repair - Unit 3B | $850 | 5% | $42.50 | Approved |
| 2025-01-10 | Referral | New Owner: John Smith | $1,000 | — | $1,000 | Paid |

**Filtering & Search:**

**Filter Options:**
• Date range (This Month, Last Month, Custom)
• Commission type (All, Bookings, Services, Referrals)
• Status (Pending, Approved, Paid)
• Property (if applicable)

**Search:**
• Search by property name
• Search by job description
• Search by booking ID

**Payment Schedule:**

**When You Get Paid:**
• Commissions paid on 15th of month
• For all jobs completed previous month
• Payment must be received from client first
• Approved by manager

**Payment Details:**
• View upcoming payment date
• See payment method (direct deposit, check)
• Download payment stubs
• Tax information (1099 at year-end)

**Commission Eligibility:**

**Requirements for Commission:**
✓ Job/booking must be completed
✓ Payment received from client
✓ No major issues or complaints
✓ Quality standards met
✓ Manager approval

**Timeframe:**
• Job completed → Pending (within 24 hrs)
• Client pays → Approved (within 5 days)
• Manager review → Paid (by 15th of month)

**Commission Rates:**

**By Role:**
• Property Manager: 10% of booking revenue
• Sales Agent: 5% first booking, 2% renewals
• Service Coordinator: $50 per completed job
• Maintenance Tech: 15% of labor charges

**Bonus Opportunities:**

**Performance Bonuses:**
• SLA Bonus: +$25 for same-day completion
• Quality Bonus: +10% for 5-star rating
• Volume Bonus: +5% if >10 bookings/month
• Perfect Attendance: +$100/month

**Referral Program:**
• New property owner: $1,000
• New service provider: $250
• New team member: $500

**Tracking Your Performance:**

**Metrics Dashboard:**
📈 **This Month:**
• Bookings closed: 8
• Average booking value: $1,575
• Commission per booking: $157.50
• Total potential: $1,260

📊 **Trends:**
• Month-over-month growth
• Seasonal patterns
• Best performing properties
• Top commission sources

**Goals & Targets:**

**Monthly Goals:**
• Target: $3,000
• Current: $2,135 (71%)
• Remaining: $865
• Days left: 12

**Leaderboard:**
See how you compare:
1. Sarah J. - $4,200
2. Mike T. - $3,850
3. **You** - $3,075
4. Lisa K. - $2,900
5. Tom R. - $2,650

**Disputes & Questions:**

**If You Disagree:**
1. Click commission entry
2. Click "Dispute/Question"
3. Explain the issue
4. Manager reviews
5. Resolution within 3 business days

**Common Issues:**
• Missing commission
• Wrong commission rate
• Not approved yet
• Payment not received

**Exporting & Reports:**

**Download Options:**
📄 **PDF Statement** - Professional summary
📊 **Excel/CSV** - Data for analysis
📧 **Email** - Send to yourself

**Tax Documents:**
• Monthly statements
• Quarterly summaries
• Year-end 1099 form
• Tax withholding info

**Mobile Access:**

**Commission App:**
• Check commissions on-the-go
• Get notifications:
  - New commission earned
  - Commission approved
  - Payment processed
• Quick stats widget
• Payment reminders

**Best Practices:**

✅ **Check Weekly** - Review pending commissions
✅ **Follow Up** - Chase approvals if delayed
✅ **Track Goals** - Monitor your targets
✅ **Quality First** - Better ratings = bonuses
✅ **Document** - Keep records of your work
✅ **Communicate** - Report issues promptly`,
        },
        {
          question: 'What analytics are available in the Financial Dashboard?',
          answer: `**Financial Dashboard Overview:**

**Accessing the Dashboard:**
1. Go to Finance → Financial Dashboard
2. View comprehensive financial analytics

**Dashboard Sections:**

**1. REVENUE OVERVIEW** 💰

**Summary Cards:**
• **This Month Revenue:** $45,280
  ↗️ +15% vs last month
• **Outstanding A/R:** $12,450
  ⚠️ $3,200 overdue >30 days
• **Expenses MTD:** $18,920
  ↗️ +8% vs last month
• **Net Profit:** $26,360
  ↗️ +22% vs last month

**Revenue Trend Chart:**
• Line graph: Last 12 months
• Compare to previous year
• Show booking revenue vs other income
• Highlight seasonal trends
• Monthly average line

**2. BOOKING ANALYSIS** 📊

**Booking Revenue:**
• Total booking revenue: $38,400
• Number of bookings: 24
• Average booking value: $1,600
• Occupancy rate: 78%

**By Property:**
| Property | Bookings | Revenue | Avg Rate |
|----------|----------|---------|----------|
| Sunset Villa | 8 | $15,200 | $1,900 |
| Beach House | 7 | $12,600 | $1,800 |
| Condo 201 | 9 | $10,600 | $1,178 |

**By Source:**
• Airbnb: $18,900 (49%)
• Direct bookings: $12,100 (32%)
• VRBO: $7,400 (19%)

**3. EXPENSE BREAKDOWN** 📉

**Category Pie Chart:**
• Maintenance: $6,200 (33%)
• Cleaning: $4,800 (25%)
• Utilities: $3,900 (21%)
• Supplies: $2,400 (13%)
• Other: $1,620 (8%)

**Expense Trends:**
• Month-over-month comparison
• Budget vs actual
• Identify cost increases
• Flag anomalies

**Top Expenses:**
1. HVAC repair - Unit 3B: $2,450
2. Deep cleaning - Sunset Villa: $850
3. Pool service - All properties: $750

**4. PROPERTY PERFORMANCE** 🏠

**Property Comparison:**
For each property show:
• Revenue generated
• Expenses incurred
• Net profit
• ROI %
• Occupancy rate
• Average nightly rate
• Guest rating

**Best Performers:**
🏆 Sunset Villa: $8,850 net profit (58% margin)
🥈 Beach House: $7,200 net profit (57% margin)
🥉 Condo 201: $5,100 net profit (48% margin)

**5. ACCOUNTS RECEIVABLE** 💳

**A/R Aging Report:**
• Current (0-30 days): $9,250
• 31-60 days: $2,400
• 61-90 days: $800
• 90+ days: $0

**Outstanding Invoices:**
| Invoice | Guest | Amount | Due Date | Days Overdue |
|---------|-------|--------|----------|--------------|
| INV-1234 | John Smith | $2,100 | Jan 15 | 15 days |
| INV-1235 | Jane Doe | $1,800 | Jan 10 | 20 days |

**Collection Rate:**
• Average days to payment: 18
• Collection rate: 96%
• Disputed invoices: 2

**6. OWNER STATEMENTS** 📋

**Owner Summary:**
For each owner:
• Properties managed
• Total revenue
• Total expenses
• Management fees
• Net to owner
• Payment status

**Owner Payout Schedule:**
• Next payout date: February 1
• Total payouts: $32,400
• Pending approval: $8,200

**7. CASH FLOW** 💵

**Cash Flow Chart:**
• Money in (green bars)
• Money out (red bars)
• Net cash flow (line)
• Running balance
• Projected for next 30 days

**Bank Balance:**
• Operating account: $45,280
• Reserve account: $20,000
• Total available: $65,280

**8. COMMISSION TRACKING** 💰

**Commission Summary:**
• Total pending: $4,250
• Total approved: $2,890
• Paid this month: $8,150

**By Team Member:**
| Staff | Pending | Approved | Paid MTD |
|-------|---------|----------|----------|
| Sarah J. | $1,450 | $890 | $4,200 |
| Mike T. | $1,100 | $750 | $3,850 |
| You | $950 | $650 | $3,075 |

**9. BUDGET VS ACTUAL** 📈

**Monthly Budget Comparison:**
| Category | Budget | Actual | Variance | % |
|----------|--------|--------|----------|---|
| Revenue | $42,000 | $45,280 | +$3,280 | +7.8% |
| Expenses | $17,500 | $18,920 | +$1,420 | +8.1% |
| Net Profit | $24,500 | $26,360 | +$1,860 | +7.6% |

**YTD Budget:**
• Annual revenue target: $500,000
• Current pace: $540,000 (108%)
• On track to exceed by: $40,000

**10. KEY METRICS (KPIs)** 🎯

**Profitability:**
• Gross profit margin: 58%
• Net profit margin: 36%
• ROI: 18% annually

**Efficiency:**
• Revenue per property: $4,528/mo
• Cost per booking: $788
• Average booking value: $1,600

**Growth:**
• Revenue growth MoM: +15%
• Revenue growth YoY: +32%
• New properties added: 2

**Quality:**
• Guest satisfaction: 4.8/5.0
• Booking cancellation rate: 3%
• Repeat guest rate: 42%

**Date Range Selection:**

**Preset Ranges:**
• This month
• Last month
• This quarter
• Last quarter
• This year
• Last year
• Custom range

**Compare To:**
• Previous period
• Same period last year
• Budget

**Export & Reporting:**

**Download Options:**
📄 **PDF Report** - Executive summary
📊 **Excel** - Full data export
📧 **Email** - Schedule automatic delivery

**Scheduled Reports:**
• Daily revenue summary (email at 9 AM)
• Weekly performance (email Monday AM)
• Monthly financials (email 1st of month)
• Quarterly board report (PDF)

**Customization:**

**Dashboard Layout:**
• Drag & drop widgets
• Show/hide sections
• Resize charts
• Save custom layouts
• Multiple dashboard views

**Filters:**
• Filter by property
• Filter by owner
• Filter by date range
• Filter by category

**Access Control:**

**Who Can See:**
• Admins: Full dashboard access
• Ops: Revenue and expenses
• Property Managers: Their properties only
• Owners: Their property data only

**Benefits:**

✅ **Real-time insights** - Always up-to-date
✅ **Data-driven decisions** - Based on facts
✅ **Spot trends** - Identify opportunities
✅ **Track goals** - Monitor targets
✅ **Professional reporting** - Impress stakeholders
✅ **Save time** - No manual calculations
✅ **Mobile accessible** - Check anywhere`,
        },
      ],
    },
    {
      id: 'system-admin',
      title: 'System Administration',
      icon: Settings,
      color: 'text-gray-700',
      bgColor: 'bg-gray-50',
      topics: [
        {
          question: 'How do I view and interpret activity logs?',
          answer: `**Activity Log System:**

**Purpose:**
Track all system activities for auditing, troubleshooting, security, and compliance.

**Accessing Activity Logs:**
⚠️ **Admin Access Required**

1. Go to System → Activity Logs
2. View comprehensive activity history

**What's Logged:**

**User Actions:**
• Login/logout events
• Password changes
• Profile updates
• Settings modifications
• Permission changes

**Data Operations:**
• Record created
• Record updated
• Record deleted
• File uploaded
• File downloaded
• Data exported

**Module-Specific:**
• Booking created/modified/cancelled
• Invoice created/sent/paid
• Expense submitted/approved/rejected
• Job created/assigned/completed
• Property added/updated/deactivated
• User created/modified/deactivated

**System Events:**
• Failed login attempts
• API calls
• Email sent
• Notifications delivered
• Background jobs
• System errors

**Log Entry Format:**

**Each Entry Shows:**
• 🕐 **Timestamp:** Exact date and time
• 👤 **User:** Who performed the action
• 📍 **IP Address:** Where from
• 🖥️ **Device:** Browser/device info
• 🎯 **Action:** What was done
• 📄 **Resource:** What was affected
• 📝 **Details:** Additional information
• ✅ **Status:** Success or failure

**Example Entries:**
\`\`\`
2025-01-30 14:23:45 | John Smith | 192.168.1.100 | Chrome/Mac
Action: INVOICE_CREATED
Resource: Invoice #INV-2025-001234
Details: {"property": "Sunset Villa", "amount": "$2,100", "guest": "Jane Doe"}
Status: Success

2025-01-30 14:15:22 | Sarah Johnson | 10.0.1.50 | Mobile Safari
Action: BOOKING_MODIFIED
Resource: Booking #BK-789
Details: {"field": "checkout_date", "old": "2025-02-15", "new": "2025-02-17"}
Status: Success

2025-01-30 13:58:10 | Mike Thompson | 172.16.0.5 | Firefox/Windows
Action: EXPENSE_APPROVED
Resource: Expense #EXP-456
Details: {"amount": "$450", "category": "Maintenance", "property": "Beach House"}
Status: Success

2025-01-30 13:45:33 | Anonymous | 185.220.101.42 | Unknown
Action: LOGIN_FAILED
Details: {"email": "admin@company.com", "reason": "Invalid password", "attempts": 3}
Status: Failed ⚠️
\`\`\`

**Filtering & Search:**

**Filter by Date:**
• Today
• Last 7 days
• Last 30 days
• This month
• Last month
• Custom range

**Filter by User:**
• All users
• Specific user
• User role (Admin, Ops, etc.)
• Anonymous (failed logins)

**Filter by Action Type:**
☑️ All actions
☑️ Logins
☑️ Data modifications
☑️ Deletions (important!)
☑️ Exports
☑️ Failed actions
☑️ System errors

**Filter by Module:**
• Bookings
• Invoices
• Expenses
• Properties
• Users
• Documents
• System

**Search:**
• Full-text search across all logs
• Search by IP address
• Search by resource ID
• Search by keyword

**Security Monitoring:**

**Failed Login Attempts:**
Monitor for:
🚨 Multiple failed attempts from same IP
🚨 Failed attempts for admin accounts
🚨 Attempts from unusual locations
🚨 Brute force attack patterns

**Auto-Actions:**
• Lock account after 5 failed attempts
• Block IP after 10 failed attempts
• Alert admins immediately
• Require password reset

**Suspicious Activity:**
Watch for:
⚠️ Logins from new locations
⚠️ After-hours access
⚠️ Mass data exports
⚠️ Unusual deletion patterns
⚠️ Permission changes

**Audit Reports:**

**Daily Summary:**
• Total activities: 1,245
• Unique users: 12
• Failed actions: 3
• Errors: 1
• Peak activity time: 2-3 PM

**Weekly Activity Report:**
• User activity breakdown
• Most active modules
• Most common actions
• Issues/errors summary
• Security incidents

**Monthly Compliance Report:**
• All data access
• All data modifications
• All deletions
• All exports
• Access by external users

**Quarterly Security Audit:**
• Failed login analysis
• Permission change review
• Data breach check
• Vulnerability assessment
• Compliance verification

**Common Use Cases:**

**1. TROUBLESHOOTING**
"User says booking disappeared"
→ Search logs for booking ID
→ Find delete action
→ See who deleted it and when
→ Can restore if needed

**2. DISPUTE RESOLUTION**
"Who changed the invoice amount?"
→ Search invoice logs
→ See modification history
→ View old vs new values
→ Identify responsible user

**3. SECURITY INVESTIGATION**
"Unusual activity detected"
→ Filter by suspicious IP
→ Review all actions
→ Check for unauthorized access
→ Block if necessary

**4. COMPLIANCE AUDIT**
"Show all GDPR data access"
→ Filter by user data views
→ Export comprehensive report
→ Demonstrate compliance
→ Archive for records

**Data Retention:**

**Retention Policy:**
• Active logs: 90 days (searchable)
• Archived logs: 7 years (long-term storage)
• Compliance logs: 10 years
• Security incidents: Permanent

**Storage:**
• Encrypted at rest
• Immutable (cannot be altered)
• Backed up daily
• Multiple geographic locations

**Privacy Considerations:**

**GDPR Compliance:**
• User can request their data
• Export personal activity log
• Anonymize after user deletion
• Right to explanation

**Access Control:**
• Only admins can view logs
• Some logs restricted to super admins
• Viewing logs is itself logged
• Cannot delete logs

**Export Options:**

📄 **PDF** - Formatted report
📊 **Excel/CSV** - Data analysis
🗄️ **JSON** - Developer format
📧 **Email** - Send to stakeholders

**Best Practices:**

✅ **Review Daily** - Check for anomalies
✅ **Investigate Failures** - Don't ignore errors
✅ **Monitor Trends** - Spot patterns
✅ **Document Incidents** - Keep notes
✅ **Regular Audits** - Monthly reviews
✅ **Train Staff** - On proper usage
✅ **Automate Alerts** - For critical events`,
        },
        {
          question: 'How do I manage system settings and configurations?',
          answer: `**System Settings Overview:**

⚠️ **Admin Access Required** for most settings

**Accessing Settings:**
1. Click profile icon (top right)
2. Select "System Settings"
OR
3. Go to System → Settings

**Settings Categories:**

**1. GENERAL SETTINGS** ⚙️

**Company Information:**
• Company name
• Logo upload
• Address
• Phone numbers
• Email addresses
• Website
• Tax ID / Business registration

**Timezone & Localization:**
• Default timezone
• Date format (MM/DD/YYYY or DD/MM/YYYY)
• Time format (12-hour or 24-hour)
• Currency (USD, EUR, GBP, etc.)
• Language

**Business Hours:**
• Operating hours
• Days of operation
• Holiday schedule
• After-hours support

**2. USER MANAGEMENT** 👥

**Default Settings:**
• Default user role for new users
• Password requirements
  - Minimum length
  - Complexity rules
  - Expiration period
• Session timeout (inactivity)
• Two-factor authentication (required/optional)

**Email Notifications:**
• Welcome email
• Password reset template
• Account locked notification
• Role change notification

**3. BOOKING SETTINGS** 📅

**Booking Rules:**
• Minimum stay (nights)
• Maximum stay (nights)
• Advance notice (hours)
• Cancellation policy
• Security deposit amount
• Cleaning fee

**Check-in/Check-out:**
• Standard check-in time (4:00 PM)
• Standard check-out time (11:00 AM)
• Early check-in fee
• Late checkout fee
• Grace period

**4. FINANCIAL SETTINGS** 💰

**Invoice Configuration:**
• Invoice number format
• Starting invoice number
• Tax rates by location
• Payment terms (Net 15, Net 30)
• Late fee policy
• Currency and exchange rates

**Commission Structure:**
• Commission rates by role
• Bonus structures
• Payment schedule
• Minimum payout threshold

**Payment Integration:**
• Stripe configuration
• PayPal settings
• Bank account info
• Payment methods accepted

**5. NOTIFICATION SETTINGS** 🔔

**Email Notifications:**
Enable/disable:
☑️ Booking confirmations
☑️ Payment received
☑️ Booking reminders
☑️ Check-in instructions
☑️ Review requests
☑️ Owner statements
☑️ Team assignments

**SMS Notifications:**
☑️ Booking confirmations
☑️ Check-in codes
☑️ Task assignments
☑️ Emergency alerts

**In-App Notifications:**
☑️ New bookings
☑️ Task assignments
☑️ Messages
☑️ System alerts

**Frequency:**
• Real-time
• Daily digest
• Weekly summary
• Monthly report

**6. SECURITY SETTINGS** 🔒

**Access Control:**
• IP whitelist/blacklist
• Geographic restrictions
• VPN requirements
• Device limits per user

**Data Protection:**
• Auto-logout after inactivity
• Require re-auth for sensitive actions
• Data encryption level
• Backup frequency

**API Security:**
• API key management
• Rate limiting
• Webhook signatures
• CORS settings

**7. INTEGRATION SETTINGS** 🔗

**Channel Integrations:**
• Airbnb connection
• VRBO/HomeAway sync
• Booking.com integration
• Direct booking widget

**Accounting Integration:**
• QuickBooks connection
• Xero integration
• Custom GL mapping

**Communication:**
• Email provider (SendGrid, Mailgun)
• SMS provider (Twilio)
• Slack notifications
• Zapier webhooks

**8. AUTOMATION RULES** 🤖

**Automatic Actions:**
• Auto-send check-in instructions (24h before)
• Auto-create cleaning tasks (after checkout)
• Auto-generate invoices (on booking)
• Auto-send review requests (after checkout)
• Auto-archive old records

**Triggers:**
• Booking confirmed → Create invoice
• Payment received → Send confirmation
• Checkout tomorrow → Send reminder
• Job assigned → Notify team member
• COI expiring → Alert vendor

**9. DOCUMENT SETTINGS** 📄

**Templates:**
• Invoice template design
• Owner statement template
• Contract templates
• Email signatures

**Storage:**
• Default storage location
• File size limits
• Allowed file types
• Retention policies

**10. APPEARANCE** 🎨

**Branding:**
• Primary color
• Secondary color
• Logo placement
• Favicon
• Custom CSS (advanced)

**Dashboard Layout:**
• Default dashboard view
• Widget arrangement
• Default date ranges
• Chart preferences

**Saving Changes:**

**Important:**
• Click "Save" after each section
• Some changes require page refresh
• Critical changes show confirmation dialog
• Changes logged in activity log

**Backup Settings:**
• Export all settings to JSON
• Import settings from backup
• Version control
• Restore to previous version

**Testing Changes:**

**Test Mode:**
• Enable test mode
• Make changes safely
• Preview before applying
• Revert if issues found

**Best Practices:**

✅ **Document Changes** - Keep notes on why
✅ **Test Thoroughly** - Before going live
✅ **Backup First** - Export current settings
✅ **Communicate** - Notify team of changes
✅ **Review Regularly** - Quarterly settings audit
✅ **Stay Updated** - Check for new features
✅ **Train Staff** - On setting impacts`,
        },
        {
          question: 'How do I troubleshoot common issues?',
          answer: `**Troubleshooting Guide:**

**Common Issues & Solutions:**

**1. LOGIN ISSUES** 🔐

**Problem: Can't log in**

**Solutions:**
✅ Check email spelling
✅ Verify Caps Lock is off
✅ Try password reset
✅ Clear browser cache/cookies
✅ Try different browser
✅ Check if account is active
✅ Contact admin if locked out

**Error: "Account Locked"**
• Too many failed attempts
• Wait 30 minutes OR
• Contact admin to unlock

**Error: "Invalid Credentials"**
• Email or password wrong
• Use "Forgot Password"
• Check for typos
• Verify account exists

**2. PAGE NOT LOADING** 🔄

**Symptoms:**
• Blank page
• Spinning loader never stops
• Error message

**Solutions:**
1. **Hard refresh:**
   • Windows: Ctrl + F5
   • Mac: Cmd + Shift + R
2. **Clear cache:**
   • Browser settings → Clear data
   • Last hour or last 24 hours
3. **Try incognito mode:**
   • Rules out extension conflicts
4. **Check internet connection:**
   • Load other websites
   • Run speed test
5. **Try different browser:**
   • Chrome, Firefox, Edge, Safari
6. **Contact support:**
   • Include screenshot
   • Mention browser & OS

**3. DATA NOT SAVING** 💾

**Problem: Changes don't persist**

**Common Causes:**
• Network timeout
• Form validation errors
• Permission issues
• Browser issues

**Solutions:**
✅ Look for red error messages
✅ Check all required fields filled
✅ Check internet connection
✅ Wait for "Saved successfully" message
✅ Try refreshing and re-entering
✅ Check console for errors (F12)

**4. MISSING DATA** 🔍

**Problem: Record disappeared**

**Investigation Steps:**
1. **Check filters:**
   • Reset all filters
   • Check date range
   • Check status filters
2. **Search for it:**
   • Use search bar
   • Try partial match
3. **Check permissions:**
   • Can you see this data?
   • Contact admin
4. **Check activity logs:**
   • Was it deleted?
   • Who deleted it?
   • Can it be restored?

**5. UPLOAD FAILURES** 📤

**Problem: File won't upload**

**Common Issues:**

**File Too Large:**
• Max size: 25MB (documents), 100MB (videos)
• Compress large files
• Use cloud link instead

**Wrong File Type:**
• Check allowed types
• Convert file format
• Rename extension correctly

**Network Issue:**
• Check connection
• Try again later
• Use wired connection if possible

**Browser Issue:**
• Try different browser
• Disable extensions
• Clear cache

**6. SYNC ISSUES** 🔄

**Problem: Data not syncing with integrations**

**Airbnb/VRBO Sync:**
1. Check connection status
2. Re-authorize if needed
3. Check sync logs for errors
4. Verify calendar permissions
5. Contact support with error codes

**Accounting Sync:**
1. Verify credentials
2. Check API limits
3. Review error logs
4. Manual sync as backup
5. Check account permissions

**7. NOTIFICATION PROBLEMS** 🔔

**Not Receiving Emails:**

**Check:**
✅ Spam/junk folder
✅ Email settings in profile
✅ Notification preferences
✅ Email address correct
✅ Email server not blocking

**Solutions:**
• Whitelist sender email
• Add to contacts
• Check filters/rules
• Try different email address

**8. SLOW PERFORMANCE** 🐌

**System Feels Slow:**

**Quick Fixes:**
1. **Clear browser cache**
2. **Close unnecessary tabs**
3. **Check internet speed:**
   • Run speedtest.net
   • Need >10 Mbps
4. **Check device resources:**
   • Close other programs
   • Restart computer
5. **Try off-peak hours:**
   • Less traffic = faster

**Still Slow?**
• Use List View instead of Tree View
• Reduce date range in reports
• Filter to fewer items
• Contact support

**9. MOBILE ISSUES** 📱

**Problems on Mobile:**

**Common Issues:**
• Buttons too small
• Layout broken
• Features missing

**Solutions:**
✅ Use landscape mode
✅ Zoom in/out
✅ Update browser app
✅ Clear mobile cache
✅ Use desktop version if needed

**10. PERMISSION ERRORS** 🚫

**Error: "You don't have permission"**

**Solutions:**
1. **Check your role:**
   • Profile → View role
2. **Verify feature access:**
   • Some features are Admin-only
3. **Contact admin:**
   • Request access
   • Explain need
4. **Check property assignment:**
   • Property Managers: Limited to assigned properties

**Getting Help:**

**Self-Service:**
1. **Search Help Center** (this page)
2. **Check video tutorials**
3. **Read user manual PDF**

**Contact Support:**
📧 **Email:** support@casaandconcierge.com
• Include:
  - Your name and email
  - What you were trying to do
  - Error message (exact text)
  - Screenshot if possible
  - Browser and OS
  - Steps to reproduce

**Bug Reports:**
Use "Report a Bug" button:
• Describe the issue
• Steps to reproduce
• Expected vs actual behavior
• Priority level

**Emergency Support:**
For critical issues:
• System completely down
• Data loss
• Security breach

→ Call emergency line (from account settings)

**Diagnostic Information:**

**To Help Support:**
Press F12 (Developer Console)
→ Check "Console" tab
→ Screenshot any red errors
→ Include in support ticket

**System Status:**
Check status page:
• System uptime
• Known issues
• Scheduled maintenance
• Performance metrics

**Preventive Measures:**

✅ **Keep browser updated**
✅ **Use supported browsers:**
   • Chrome 90+
   • Firefox 88+
   • Safari 14+
   • Edge 90+
✅ **Stable internet connection**
✅ **Regular cache clearing**
✅ **Save work frequently**
✅ **Test in staging (if available)**
✅ **Report bugs promptly**`,
        },
      ],
    },
  ];

  const quickLinks = [
    { icon: Video, title: 'Video Tutorials', description: 'Watch step-by-step guides', badge: 'Coming Soon', onClick: null },
    { icon: BookOpen, title: 'User Manual', description: 'Download PDF guide', badge: 'PDF', onClick: () => window.open('/user-manual.pdf', '_blank') },
    { icon: Bug, title: 'Report a Bug', description: 'Submit bug reports to our team', badge: 'Email', onClick: () => setBugReportOpen(true) },
  ];

  const filteredSections = searchQuery
    ? helpSections.map(section => ({
        ...section,
        topics: section.topics.filter(
          topic =>
            topic.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            topic.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(section => section.topics.length > 0)
    : helpSections;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Help Center</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive guides and documentation for Casa & Concierge PMS
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search for help articles, guides, or topics..."
            className="pl-10 py-6 text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {quickLinks.map((link, index) => (
          <Card
            key={index}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={link.onClick || undefined}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <link.icon className="h-6 w-6 text-primary" />
                <Badge variant="secondary" className="text-xs">
                  {link.badge}
                </Badge>
              </div>
              <h3 className="font-semibold mb-1">{link.title}</h3>
              <p className="text-sm text-muted-foreground">{link.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content - Tabs by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Documentation & Guides
          </CardTitle>
          <CardDescription>
            Browse comprehensive guides organized by module. Click any section to learn more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="getting-started" className="w-full">
            <div className="w-full overflow-x-auto mb-6">
              <TabsList className="inline-flex w-auto min-w-full h-auto flex-wrap gap-2 p-2">
                {helpSections.map((section) => (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="flex items-center gap-2 whitespace-nowrap px-4 py-2"
                  >
                    <section.icon className={`h-4 w-4 ${section.color}`} />
                    <span>{section.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {filteredSections.map((section) => (
              <TabsContent key={section.id} value={section.id}>
                <div className={`p-6 rounded-lg ${section.bgColor} mb-6`}>
                  <div className="flex items-center gap-3 mb-3">
                    <section.icon className={`h-8 w-8 ${section.color}`} />
                    <h2 className="text-2xl font-bold">{section.title}</h2>
                  </div>
                  <p className="text-muted-foreground">
                    {section.topics.length} article{section.topics.length !== 1 ? 's' : ''} in this section
                  </p>
                </div>

                <Accordion type="single" collapsible className="w-full">
                  {section.topics.map((topic, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left hover:no-underline">
                        <div className="flex items-start gap-3 pr-4">
                          <CheckCircle2 className={`h-5 w-5 mt-0.5 ${section.color} flex-shrink-0`} />
                          <span className="font-medium">{topic.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="pl-8 pr-4 pt-2 pb-4">
                          <div className="prose prose-sm max-w-none">
                            {topic.answer.split('\n').map((paragraph, i) => {
                              if (paragraph.trim().startsWith('•')) {
                                return (
                                  <div key={i} className="flex items-start gap-2 my-2">
                                    <ArrowRight className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                                    <span>{paragraph.replace('•', '').trim()}</span>
                                  </div>
                                );
                              }
                              if (paragraph.trim().startsWith('**') && paragraph.trim().endsWith('**')) {
                                const text = paragraph.replace(/\*\*/g, '');
                                return (
                                  <h4 key={i} className="font-semibold text-lg mt-4 mb-2 flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    {text}
                                  </h4>
                                );
                              }
                              if (paragraph.trim()) {
                                return (
                                  <p key={i} className="mb-3 text-foreground leading-relaxed whitespace-pre-wrap">
                                    {paragraph}
                                  </p>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center">
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-8">
            <h3 className="text-xl font-semibold mb-2">Still need help?</h3>
            <p className="text-muted-foreground mb-4">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <div className="flex gap-3 justify-center">
              <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground">
                📧 support@casaandconcierge.com
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bug Report Dialog */}
      <Dialog open={bugReportOpen} onOpenChange={setBugReportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-500" />
              Report a Bug
            </DialogTitle>
            <DialogDescription>
              Help us improve Casa & Concierge by reporting bugs. Your feedback is valuable!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Bug Title */}
            <div className="space-y-2">
              <Label htmlFor="bugTitle">
                Bug Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bugTitle"
                type="text"
                placeholder="Brief description of the bug"
                value={bugTitle}
                onChange={(e) => setBugTitle(e.target.value)}
                required
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="bugPriority">Priority</Label>
              <Select value={bugPriority} onValueChange={(value: any) => setBugPriority(value)}>
                <SelectTrigger id="bugPriority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue, workaround available</SelectItem>
                  <SelectItem value="medium">Medium - Affects functionality but not critical</SelectItem>
                  <SelectItem value="high">High - Significant impact on usage</SelectItem>
                  <SelectItem value="critical">Critical - System unusable or data loss</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bug Description */}
            <div className="space-y-2">
              <Label htmlFor="bugDescription">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="bugDescription"
                placeholder="Describe what happened, what you expected to happen, and any error messages you saw..."
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                rows={6}
                className="resize-none"
                required
              />
            </div>

            {/* Steps to Reproduce */}
            <div className="space-y-2">
              <Label htmlFor="bugSteps">Steps to Reproduce (Optional)</Label>
              <Textarea
                id="bugSteps"
                placeholder="1. Go to...\n2. Click on...\n3. See error..."
                value={bugSteps}
                onChange={(e) => setBugSteps(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Help us reproduce the bug by listing the exact steps you took
              </p>
            </div>

            {/* Reporter Info Display */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Your information:</strong> This report will be sent from{' '}
                <strong>
                  {profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile?.first_name || 'Anonymous'}
                </strong>{' '}
                ({user?.email || 'No email'}) to the development team at{' '}
                <strong>vinzlloydalferez@gmail.com</strong>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setBugReportOpen(false)}
              disabled={isSendingBugReport}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleBugReportSubmit}
              disabled={!bugTitle.trim() || !bugDescription.trim() || isSendingBugReport}
            >
              {isSendingBugReport ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Bug Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
