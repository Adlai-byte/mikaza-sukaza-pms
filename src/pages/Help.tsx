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

**Additional Sections:**
• Documents - Contract management
• Media - Photos & videos
• User Management - Team administration (Admin only)

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
