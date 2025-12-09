import { z } from "zod";

// Password validation regex patterns
const passwordRegex = {
  minLength: /.{8,}/,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
};

export const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(passwordRegex.hasUpperCase, "Password must contain at least one uppercase letter")
    .regex(passwordRegex.hasLowerCase, "Password must contain at least one lowercase letter")
    .regex(passwordRegex.hasNumber, "Password must contain at least one number")
    .regex(passwordRegex.hasSpecialChar, "Password must contain at least one special character (!@#$%^&*...)"),
  confirmPassword: z.string().min(1, "Please confirm your password").optional(),
  user_type: z.enum(["admin", "ops", "provider", "customer"], {
    required_error: "Please select a user type",
  }),
  is_active: z.boolean().default(true),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.string().optional().refine((val) => !val || val.length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: "Date must be in YYYY-MM-DD format or empty"
  }),
  company: z.string().optional(),
  cellphone_primary: z.string().optional(),
  cellphone_usa: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default("USA"),
  photo_url: z.string().optional(),
}).refine((data) => {
  // If confirmPassword is provided, it must match password
  if (data.confirmPassword !== undefined && data.confirmPassword !== '') {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const bankAccountSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  ein: z.string().optional(),
  account_holder: z.string().min(1, "Account holder name is required"),
  bank_name: z.string().min(1, "Bank name is required"),
  routing_number: z.string().regex(/^\d{9}$/, "Routing number must be 9 digits"),
  account_number: z.string().min(1, "Account number is required"),
  observations: z.string().optional(),
});

export const creditCardSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  card_type: z.enum(["visa", "mastercard", "amex", "discover"], {
    required_error: "Please select a card type",
  }),
  cardholder_name: z.string().min(1, "Cardholder name is required"),
  card_number: z.string().regex(/^\d{13,19}$/, "Invalid card number"),
  due_date: z.string().regex(/^\d{2}\/\d{2}$/, "Date must be in MM/YY format"),
  security_code: z.string().regex(/^\d{3,4}$/, "Security code must be 3-4 digits"),
});

// Guest credit card schema - for storing credit cards linked to guests
export const guestCreditCardSchema = z.object({
  guest_id: z.string().uuid("Invalid guest ID"),
  card_type: z.enum(["visa", "mastercard", "amex", "discover"], {
    required_error: "Please select a card type",
  }),
  cardholder_name: z.string().min(1, "Cardholder name is required"),
  card_number: z.string().regex(/^\d{13,19}$/, "Invalid card number"),
  due_date: z.string().regex(/^\d{2}\/\d{2}$/, "Date must be in MM/YY format"),
  security_code: z.string().regex(/^\d{3,4}$/, "Security code must be 3-4 digits"),
});

// Activity log schema
export const activityLogSchema = z.object({
  user_id: z.string().uuid().optional(),
  action_type: z.string().min(1, "Action type is required"),
  action_details: z.record(z.any()).optional(),
  performed_by: z.string().optional(),
});

// Property schemas
export const propertySchema = z.object({
  owner_id: z.string().min(1, "Owner is required"),
  property_name: z.string().min(1, "Property name is required"),
  is_active: z.boolean().default(true),
  is_booking: z.boolean().default(false),
  is_pets_allowed: z.boolean().default(false),
  property_type: z.string().min(1, "Property type is required"),
  size_sqf: z.number().optional(),
  capacity: z.number().optional(),
  max_capacity: z.number().optional(),
  num_bedrooms: z.number().optional(),
  num_bathrooms: z.number().optional(),
  num_half_bath: z.number().optional(),
  num_wcs: z.number().optional(),
  num_kitchens: z.number().optional(),
  num_living_rooms: z.number().optional(),
});

export const propertyLocationSchema = z.object({
  property_id: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const propertyCommunicationSchema = z.object({
  property_id: z.string(),
  phone_number: z.string().optional(),
  wifi_name: z.string().optional(),
  wifi_password: z.string().optional(),
});

export const propertyAccessSchema = z.object({
  property_id: z.string(),
  gate_code: z.string().optional(),
  door_lock_password: z.string().optional(),
  alarm_passcode: z.string().optional(),
});

export const propertyExtrasSchema = z.object({
  property_id: z.string(),
  storage_number: z.string().optional(),
  storage_code: z.string().optional(),
  front_desk: z.string().optional(),
  garage_number: z.string().optional(),
  mailing_box: z.string().optional(),
  pool_access_code: z.string().optional(),
});

export const unitSchema = z.object({
  property_id: z.string(),
  property_name: z.string().optional(),
  license_number: z.string().optional(),
  folio: z.string().optional(),
});

// Insert types (for creating new records)
export type UserInsert = {
  email: string;
  password: string;
  confirmPassword?: string;
  user_type: "admin" | "ops" | "provider" | "customer";
  is_active?: boolean;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  company?: string;
  cellphone_primary?: string;
  cellphone_usa?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  photo_url?: string;
};

export type PropertyInsert = z.infer<typeof propertySchema>;

// Database types (includes all fields from DB)
export type User = z.infer<typeof userSchema> & {
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  account_status?: 'active' | 'suspended' | 'archived';
  suspended_at?: string | null;
  suspended_by?: string | null;
  suspension_reason?: string | null;
  archived_at?: string | null;
  archived_by?: string | null;
  last_login_at?: string | null;
};

export type BankAccount = z.infer<typeof bankAccountSchema> & { 
  bank_account_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type CreditCard = z.infer<typeof creditCardSchema> & {
  credit_card_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type GuestCreditCard = z.infer<typeof guestCreditCardSchema> & {
  guest_credit_card_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ActivityLog = z.infer<typeof activityLogSchema> & {
  log_id?: string;
  created_at?: string;
};

export type Property = {
  property_id?: string;
  owner_id: string;
  property_name?: string;
  is_active: boolean;
  is_booking: boolean;
  is_pets_allowed: boolean;
  property_type: string;
  size_sqf?: number;
  capacity?: number;
  max_capacity?: number;
  num_bedrooms?: number;
  num_bathrooms?: number;
  num_half_bath?: number;
  num_wcs?: number;
  num_kitchens?: number;
  num_living_rooms?: number;
  created_at?: string;
  updated_at?: string;
  owner?: User;
  location?: PropertyLocation;
  communication?: PropertyCommunication;
  access?: PropertyAccess;
  extras?: PropertyExtras;
  units?: Unit[];
  amenities?: Amenity[];
  rules?: Rule[];
  images?: PropertyImage[];
};

export type PropertyLocation = {
  location_id?: string;
  property_id: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
  updated_at?: string;
};

export type PropertyCommunication = {
  comm_id?: string;
  property_id: string;
  phone_number?: string;
  wifi_name?: string;
  wifi_password?: string;
  created_at?: string;
  updated_at?: string;
};

export type PropertyAccess = {
  access_id?: string;
  property_id: string;
  gate_code?: string;
  door_lock_password?: string;
  alarm_passcode?: string;
  created_at?: string;
  updated_at?: string;
};

export type PropertyExtras = {
  extras_id?: string;
  property_id: string;
  storage_number?: string;
  storage_code?: string;
  front_desk?: string;
  garage_number?: string;
  mailing_box?: string;
  pool_access_code?: string;
  created_at?: string;
  updated_at?: string;
};

export type Unit = {
  unit_id?: string;
  property_id: string;
  property_name?: string;
  license_number?: string;
  folio?: string;
  created_at?: string;
  updated_at?: string;
};

export type Amenity = {
  amenity_id?: string;
  amenity_name: string;
  created_at?: string;
};

export type Rule = {
  rule_id?: string;
  rule_name: string;
  created_at?: string;
};

export type PropertyImage = {
  image_id?: string;
  property_id: string;
  image_url: string;
  image_title?: string;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
};

// Booking schemas
export const bookingSchema = z.object({
  property_id: z.string().uuid("Property ID is required"),
  guest_name: z.string().min(1, "Guest name is required"),
  guest_email: z.string().email("Valid email is required").optional().or(z.literal("")),
  guest_phone: z.string().optional(),
  check_in_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  check_out_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  number_of_guests: z.number().min(1, "At least 1 guest required").optional(),

  // Guest count breakdown
  guest_count_adults: z.number().min(0).optional(),
  guest_count_children: z.number().min(0).optional(),
  guest_count_infants: z.number().min(0).optional(),

  // Financial breakdown
  base_amount: z.number().min(0).optional(),
  extras_amount: z.number().min(0).optional(),
  tax_amount: z.number().min(0).optional(),
  cleaning_fee: z.number().min(0).optional(),
  security_deposit: z.number().min(0).optional(),
  total_amount: z.number().min(0, "Amount must be non-negative").optional(),
  deposit_amount: z.number().min(0, "Deposit must be non-negative").optional(),

  // Payment tracking
  payment_method: z.string().optional(),
  payment_status: z.enum([
    "pending",
    "paid",
    "partially_paid",
    "refunded",
    "cancelled"
  ]).default("pending").optional(),

  // Booking status - EXPANDED
  booking_status: z.enum([
    "inquiry",      // Initial inquiry, not confirmed
    "pending",      // Awaiting confirmation
    "confirmed",    // Confirmed booking
    "checked_in",   // Guest has checked in
    "checked_out",  // Guest has checked out
    "completed",    // Booking finished and finalized
    "cancelled",    // Cancelled by guest or admin
    "blocked"       // Dates blocked for maintenance
  ]).default("pending").optional(),

  // Channel tracking
  booking_channel: z.enum([
    "airbnb",
    "booking",
    "vrbo",
    "direct",
    "expedia",
    "homeaway",
    "tripadvisor",
    "other"
  ]).optional(),
  booking_source: z.string().optional(),
  channel_commission: z.number().min(0).max(100).optional(),

  // Identifiers
  confirmation_code: z.string().optional(),
  external_booking_id: z.string().optional(),

  // Timing
  check_in_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).default("15:00:00").optional(),
  check_out_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).default("11:00:00").optional(),

  // Cancellation
  cancellation_policy: z.string().optional(),
  cancelled_at: z.string().optional(),
  cancelled_by: z.string().uuid().optional(),
  cancellation_reason: z.string().optional(),

  // Actual check-in/out timestamps
  checked_in_at: z.string().optional(),
  checked_out_at: z.string().optional(),

  special_requests: z.string().optional(),

  // Bill template reference for pricing consistency
  bill_template_id: z.string().uuid().optional().nullable(),
});

export type Booking = {
  booking_id?: string;
  property_id: string;
  guest_name: string;
  guest_email?: string | null;
  guest_phone?: string | null;
  check_in_date: string;
  check_out_date: string;
  number_of_guests?: number | null;
  guest_count_adults?: number | null;
  guest_count_children?: number | null;
  guest_count_infants?: number | null;
  base_amount?: number | null;
  extras_amount?: number | null;
  tax_amount?: number | null;
  cleaning_fee?: number | null;
  security_deposit?: number | null;
  total_amount?: number | null;
  deposit_amount?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  booking_status?: string | null;
  booking_channel?: string | null;
  booking_source?: string | null;
  channel_commission?: number | null;
  confirmation_code?: string | null;
  external_booking_id?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  cancellation_policy?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  special_requests?: string | null;
  bill_template_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BookingInsert = z.infer<typeof bookingSchema>;

// Guest schemas
export const guestSchema = z.object({
  guest_id: z.string().uuid().optional(),

  // Basic Information (Required)
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Please enter a valid email address").max(255),

  // Contact Information
  phone_primary: z.string().max(50).optional(),
  phone_secondary: z.string().max(50).optional(),

  // Address Information
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).default("USA"),

  // Preferences & Notes
  preferences: z.record(z.any()).optional(), // JSONB field for extensible preferences
  internal_notes: z.string().optional(),

  // Computed/Cached Statistics (Read-only - managed by database triggers)
  total_bookings: z.number().int().optional(),
  total_spent: z.number().optional(),
  last_booking_date: z.string().optional(), // ISO date string

  // Flags
  is_verified: z.boolean().default(false),
  marketing_opt_in: z.boolean().default(true),

  // Metadata
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional().nullable(),
});

// Type for creating a new guest (omit computed and auto-generated fields)
export type GuestInsert = Omit<
  z.infer<typeof guestSchema>,
  'guest_id' | 'total_bookings' | 'total_spent' | 'last_booking_date' | 'created_at' | 'updated_at' | 'created_by'
>;

// Full guest type with joined relations
export type Guest = z.infer<typeof guestSchema> & {
  // Joined relations (when querying with joins)
  bookings?: Booking[];
  invoices?: Invoice[];
};

// Guest search/filter parameters
export interface GuestFilters {
  search?: string; // Search by name or email
  min_bookings?: number;
  max_bookings?: number;
  min_spent?: number;
  max_spent?: number;
  last_booking_from?: string; // ISO date string
  last_booking_to?: string; // ISO date string
  is_verified?: boolean;
  has_email?: boolean;
}

// Task schemas
export const taskSchema = z.object({
  task_id: z.string().uuid().optional(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  property_id: z.string().uuid().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  created_by: z.string().uuid().optional(),
  job_id: z.string().uuid().optional().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  category: z.enum(["cleaning", "maintenance", "check_in_prep", "check_out_prep", "inspection", "repair", "other"]).default("other"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().nullable(),
  due_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be in HH:MM or HH:MM:SS format").optional().nullable(),
  completed_at: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const taskChecklistSchema = z.object({
  checklist_item_id: z.string().uuid().optional(),
  task_id: z.string().uuid(),
  item_text: z.string().min(1, "Checklist item text is required"),
  is_completed: z.boolean().default(false),
  order_index: z.number().int().default(0),
  created_at: z.string().optional(),
});

export const taskCommentSchema = z.object({
  comment_id: z.string().uuid().optional(),
  task_id: z.string().uuid(),
  user_id: z.string().uuid(),
  comment_text: z.string().min(1, "Comment text is required"),
  created_at: z.string().optional(),
});

export const taskAttachmentSchema = z.object({
  attachment_id: z.string().uuid().optional(),
  task_id: z.string().uuid(),
  file_url: z.string().url("Invalid file URL"),
  file_name: z.string().min(1, "File name is required"),
  file_type: z.string().optional(),
  uploaded_by: z.string().uuid().optional().nullable(),
  created_at: z.string().optional(),
});

// Task types
export type Task = z.infer<typeof taskSchema> & {
  property?: Property;
  assigned_user?: User;
  created_user?: User;
  checklists?: TaskChecklist[];
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
};

export type TaskChecklist = z.infer<typeof taskChecklistSchema>;
export type TaskComment = z.infer<typeof taskCommentSchema> & {
  user?: User;
};
export type TaskAttachment = z.infer<typeof taskAttachmentSchema> & {
  uploaded_user?: User;
};

export type TaskInsert = Omit<z.infer<typeof taskSchema>, 'task_id' | 'created_at' | 'updated_at'>;
export type TaskChecklistInsert = Omit<z.infer<typeof taskChecklistSchema>, 'checklist_item_id' | 'created_at'>;
export type TaskCommentInsert = Omit<z.infer<typeof taskCommentSchema>, 'comment_id' | 'created_at'>;
export type TaskAttachmentInsert = Omit<z.infer<typeof taskAttachmentSchema>, 'attachment_id' | 'created_at'>;

// Issue schemas
export const issueSchema = z.object({
  issue_id: z.string().uuid().optional(),
  property_id: z.string().uuid("Property is required"),
  title: z.string().min(1, "Issue title is required"),
  description: z.string().optional(),
  category: z.enum(["maintenance", "damage", "repair_needed", "cleaning", "plumbing", "electrical", "appliance", "hvac", "other"]).default("other"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z.enum(["open", "in_progress", "resolved", "closed", "on_hold"]).default("open"),
  reported_by: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  location: z.string().optional().nullable(),
  estimated_cost: z.number().min(0, "Cost must be non-negative").optional().nullable(),
  actual_cost: z.number().min(0, "Cost must be non-negative").optional().nullable(),
  resolution_notes: z.string().optional().nullable(),
  resolved_at: z.string().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const issuePhotoSchema = z.object({
  photo_id: z.string().uuid().optional(),
  issue_id: z.string().uuid(),
  photo_url: z.string().url("Invalid photo URL"),
  photo_type: z.enum(["before", "after", "progress", "other"]).default("before"),
  caption: z.string().optional().nullable(),
  uploaded_by: z.string().uuid().optional().nullable(),
  created_at: z.string().optional(),
});

// Issue types
export type Issue = z.infer<typeof issueSchema> & {
  property?: Property;
  reported_user?: User;
  assigned_user?: User;
  photos?: IssuePhoto[];
};

export type IssuePhoto = z.infer<typeof issuePhotoSchema> & {
  uploaded_user?: User;
};

export type IssueInsert = Omit<z.infer<typeof issueSchema>, 'issue_id' | 'created_at' | 'updated_at'>;
export type IssuePhotoInsert = Omit<z.infer<typeof issuePhotoSchema>, 'photo_id' | 'created_at'>;

// Notification schemas
export const notificationSchema = z.object({
  notification_id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  type: z.enum([
    'task_assigned',
    'task_status_changed',
    'task_completed',
    'task_due_soon',
    'task_overdue',
    'task_comment',
    'issue_assigned',
    'issue_status_changed',
    'issue_resolved',
    'issue_comment',
    'booking_created',
    'booking_confirmed',
    'booking_cancelled',
    'booking_updated',
    'booking_status_changed',
    'booking_check_in_reminder',
    'booking_check_out_reminder',
    'booking_payment_received',
    'job_assigned',
    'job_status_changed',
    'job_completed',
    'job_comment',
    'mention'
  ]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  link: z.string().optional().nullable(),
  task_id: z.string().uuid().optional().nullable(),
  issue_id: z.string().uuid().optional().nullable(),
  booking_id: z.string().uuid().optional().nullable(),
  job_id: z.string().uuid().optional().nullable(),
  action_by: z.string().uuid().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  is_read: z.boolean().default(false),
  read_at: z.string().optional().nullable(),
  created_at: z.string().optional(),
});

export const notificationPreferencesSchema = z.object({
  user_id: z.string().uuid(),
  email_task_assigned: z.boolean().default(true),
  email_task_due_soon: z.boolean().default(true),
  email_task_completed: z.boolean().default(false),
  email_issue_assigned: z.boolean().default(true),
  email_issue_resolved: z.boolean().default(false),
  email_booking_created: z.boolean().default(true),
  email_booking_confirmed: z.boolean().default(true),
  email_booking_cancelled: z.boolean().default(true),
  email_booking_reminders: z.boolean().default(true),
  email_mentions: z.boolean().default(true),
  app_task_assigned: z.boolean().default(true),
  app_task_status_changed: z.boolean().default(true),
  app_task_due_soon: z.boolean().default(true),
  app_issue_assigned: z.boolean().default(true),
  app_issue_status_changed: z.boolean().default(true),
  app_booking_created: z.boolean().default(true),
  app_booking_confirmed: z.boolean().default(true),
  app_booking_cancelled: z.boolean().default(true),
  app_booking_reminders: z.boolean().default(true),
  app_mentions: z.boolean().default(true),
  browser_enabled: z.boolean().default(false),
  daily_summary: z.boolean().default(false),
  weekly_summary: z.boolean().default(false),
  updated_at: z.string().optional(),
});

// Job type forward declaration (will be properly typed when jobs schema is added)
export type Job = {
  job_id: string;
  title: string;
  status: string;
  priority: string;
  [key: string]: any;
};

// Notification types (renamed to avoid conflict with browser Notification API)
export type AppNotification = z.infer<typeof notificationSchema> & {
  action_user?: User;
  task?: Task;
  issue?: Issue;
  booking?: Booking;
  job?: Job;
};

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export type NotificationInsert = Omit<z.infer<typeof notificationSchema>, 'notification_id' | 'created_at' | 'is_read' | 'read_at'>;
export type NotificationPreferencesInsert = Omit<z.infer<typeof notificationPreferencesSchema>, 'updated_at'>;

// Service Provider schemas
export const serviceProviderSchema = z.object({
  provider_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional().nullable(),
  company_name: z.string().min(1, "Company name is required"),
  contact_person: z.string().optional(),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone_primary: z.string().optional(),
  phone_secondary: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default("USA"),
  service_category: z.enum([
    "Cleaning",
    "Plumbing",
    "Electrical",
    "HVAC",
    "Landscaping",
    "Pool Service",
    "Pest Control",
    "Handyman",
    "Painting",
    "Roofing",
    "Carpentry",
    "Appliance Repair",
    "Locksmith",
    "Security",
    "Moving",
    "Other"
  ]),
  services_offered: z.array(z.string()).optional(),
  hourly_rate: z.number().min(0, "Rate must be non-negative").optional().nullable(),
  business_license: z.string().optional(),
  insurance_certificate: z.string().optional(),
  insurance_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().nullable(),
  tax_id: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  rating: z.number().min(0).max(5).optional().nullable(),
  total_reviews: z.number().int().default(0),
  is_active: z.boolean().default(true),
  is_preferred: z.boolean().default(false),
  payment_terms: z.string().optional(),
  payment_methods: z.array(z.string()).optional(),
  notes: z.string().optional(),
  availability_schedule: z.record(z.any()).optional().nullable(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional().nullable(),
  last_job_date: z.string().optional().nullable(),
});

export const serviceProviderReviewSchema = z.object({
  review_id: z.string().uuid().optional(),
  provider_id: z.string().uuid(),
  property_id: z.string().uuid().optional().nullable(),
  job_id: z.string().uuid().optional().nullable(),
  reviewer_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().optional(),
  work_quality: z.number().int().min(1).max(5).optional().nullable(),
  professionalism: z.number().int().min(1).max(5).optional().nullable(),
  timeliness: z.number().int().min(1).max(5).optional().nullable(),
  value_for_money: z.number().int().min(1).max(5).optional().nullable(),
  would_recommend: z.boolean().optional().nullable(),
  created_at: z.string().optional(),
});

export const serviceProviderDocumentSchema = z.object({
  document_id: z.string().uuid().optional(),
  provider_id: z.string().uuid(),
  document_type: z.enum(["License", "Insurance", "Certificate", "Contract", "W9", "Other"]),
  document_name: z.string().min(1, "Document name is required"),
  document_url: z.string().url("Invalid document URL"),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().nullable(),
  uploaded_at: z.string().optional(),
  uploaded_by: z.string().uuid().optional().nullable(),
});

// Service Provider types
export type ServiceProvider = z.infer<typeof serviceProviderSchema> & {
  properties?: Property[];
  documents?: ServiceProviderDocument[];
  reviews?: ServiceProviderReview[];
};

export type ServiceProviderReview = z.infer<typeof serviceProviderReviewSchema> & {
  reviewer?: User;
  property?: Property;
};

export type ServiceProviderDocument = z.infer<typeof serviceProviderDocumentSchema> & {
  uploaded_user?: User;
};

export type ServiceProviderInsert = Omit<z.infer<typeof serviceProviderSchema>, 'provider_id' | 'created_at' | 'updated_at' | 'rating' | 'total_reviews' | 'last_job_date'>;
export type ServiceProviderReviewInsert = Omit<z.infer<typeof serviceProviderReviewSchema>, 'review_id' | 'created_at'>;
export type ServiceProviderDocumentInsert = Omit<z.infer<typeof serviceProviderDocumentSchema>, 'document_id' | 'uploaded_at'>;
// Utility Provider schemas
export const utilityProviderSchema = z.object({
  provider_id: z.string().uuid().optional(),
  provider_name: z.string().min(1, "Provider name is required"),
  provider_type: z.enum([
    "Electric",
    "Internet",
    "Gas",
    "Water",
    "Cable",
    "Security",
    "Parking",
    "Maintenance",
    "Management",
    "Other"
  ]),
  phone_number: z.string().optional(),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  customer_service_hours: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  service_area: z.array(z.string()).optional(),
  notes: z.string().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional().nullable(),
});

// Utility Provider types
export type UtilityProvider = z.infer<typeof utilityProviderSchema> & {
  properties?: Property[];
};

export type UtilityProviderInsert = Omit<z.infer<typeof utilityProviderSchema>, "provider_id" | "created_at" | "updated_at">;

// ============================================
// UNIFIED PROVIDER SCHEMA (Merges Service & Utility)
// ============================================

export const providerSchema = z.object({
  provider_id: z.string().uuid().optional(),

  // Basic Information
  provider_name: z.string().min(1, "Provider name is required"),
  category: z.enum(["service", "utility"], {
    required_error: "Provider category is required"
  }),
  provider_type: z.string().min(1, "Provider type is required"),

  // Contact Information (unified)
  contact_person: z.string().optional(),
  phone_primary: z.string().optional(),
  phone_secondary: z.string().optional(),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  website: z.string().url("Invalid website URL").optional().or(z.literal("")),

  // Address (for service providers)
  address_street: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),

  // Utility-specific fields
  customer_service_hours: z.string().optional(),
  emergency_contact: z.string().optional(),
  emergency_phone: z.string().optional(),
  service_area: z.array(z.string()).optional(),

  // Service provider-specific fields
  license_number: z.string().optional(),
  insurance_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().nullable(),

  // Ratings & Reviews (for service providers)
  rating: z.number().min(0).max(5).optional().nullable(),
  total_reviews: z.number().int().default(0),

  // Status
  is_active: z.boolean().default(true),
  is_preferred: z.boolean().default(false),
  partner_tier: z.enum(['regular', 'partner', 'gold_partner', 'platinum_partner']).default('regular'),

  // General notes
  notes: z.string().optional(),

  // Metadata
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  created_by: z.string().uuid().optional().nullable(),
});

export const providerDocumentSchema = z.object({
  document_id: z.string().uuid().optional(),
  provider_id: z.string().uuid(),
  document_type: z.enum(["license", "insurance", "certification", "contract", "other"]),
  document_name: z.string().min(1, "Document name is required"),
  document_url: z.string().optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().nullable(),
  notes: z.string().optional(),
  uploaded_at: z.string().optional(),
  uploaded_by: z.string().uuid().optional().nullable(),
});

export const providerReviewSchema = z.object({
  review_id: z.string().uuid().optional(),
  provider_id: z.string().uuid(),
  property_id: z.string().uuid().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  review_text: z.string().optional(),
  work_completed: z.string().optional(),
  would_recommend: z.boolean().default(true),
  reviewed_at: z.string().optional(),
  reviewer_id: z.string().uuid().optional().nullable(),
});

// Unified Provider Types
export type Provider = z.infer<typeof providerSchema> & {
  properties?: Property[];
  documents?: ProviderDocument[];
  reviews?: ProviderReview[];
};

export type ProviderDocument = z.infer<typeof providerDocumentSchema> & {
  uploaded_user?: User;
};

export type ProviderReview = z.infer<typeof providerReviewSchema> & {
  reviewer?: User;
  property?: Property;
};

export type ProviderInsert = Omit<z.infer<typeof providerSchema>, 'provider_id' | 'created_at' | 'updated_at' | 'rating' | 'total_reviews'>;
export type ProviderDocumentInsert = Omit<z.infer<typeof providerDocumentSchema>, 'document_id' | 'uploaded_at'>;
export type ProviderReviewInsert = Omit<z.infer<typeof providerReviewSchema>, 'review_id' | 'reviewed_at'>;

// Helper type for property-provider assignments
export type PropertyProviderAssignment = {
  id: string;
  provider_id: string;
  property_id: string;
  // Service provider fields
  is_preferred_for_property?: boolean;
  assignment_notes?: string;
  // Utility provider fields
  account_number?: string;
  billing_name?: string;
  username?: string;
  password?: string;
  observations?: string;
  // Metadata
  assigned_at: string;
  assigned_by?: string;
  // Joined provider data
  provider: Provider;
};

// ============================================
// ACCOUNTING & BILLING SCHEMAS
// Essential accounting system with complete audit trail
// ============================================

// Invoice schemas
export const invoiceSchema = z.object({
  invoice_id: z.string().uuid().optional(),
  invoice_number: z.string().optional(), // Auto-generated

  // Booking reference
  booking_id: z.string().uuid().optional().nullable(),
  property_id: z.string().uuid("Property is required"),

  // Guest information
  guest_id: z.string().uuid().optional().nullable(),
  guest_name: z.string().min(1, "Guest name is required"),
  guest_email: z.string().email("Valid email is required").optional().or(z.literal("")),
  guest_phone: z.string().optional(),
  guest_address: z.string().optional(),

  // Invoice dates
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  paid_date: z.string().optional().nullable(),

  // Status
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "refunded"]).default("draft"),

  // Amounts (calculated from line items, but can be set manually)
  subtotal: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  total_amount: z.number().min(0).default(0),
  amount_paid: z.number().min(0).default(0),

  // Additional details
  notes: z.string().optional(),
  terms: z.string().optional(),
  payment_method: z.string().optional(),

  // Metadata
  created_by: z.string().uuid().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const invoiceLineItemSchema = z.object({
  line_item_id: z.string().uuid().optional(),
  invoice_id: z.string().uuid(),

  // Line item details
  line_number: z.number().int().min(1),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(0).default(1),
  unit_price: z.number().min(0).default(0),

  // Tax
  tax_rate: z.number().min(0).max(100).default(0),
  tax_amount: z.number().min(0).default(0),

  // Item type for categorization
  item_type: z.enum([
    "accommodation",
    "cleaning",
    "extras",
    "tax",
    "commission",
    "other"
  ]).optional(),

  // Metadata
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Expense schema
export const expenseSchema = z.object({
  expense_id: z.string().uuid().optional(),

  // Property reference
  property_id: z.string().uuid("Property is required"),

  // Job reference (optional - links expense to a specific job)
  job_id: z.string().uuid().optional().nullable(),

  // Expense details
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  vendor_name: z.string().optional(),
  vendor_id: z.string().uuid().optional().nullable(),

  // Category and description
  category: z.enum([
    "maintenance",
    "utilities",
    "cleaning",
    "supplies",
    "marketing",
    "channel_commission",
    "insurance",
    "property_tax",
    "hoa_fees",
    "professional_services",
    "repairs",
    "landscaping",
    "pest_control",
    "other"
  ]),
  subcategory: z.string().optional(),
  description: z.string().min(1, "Description is required"),

  // Amount
  amount: z.number().min(0, "Amount must be non-negative"),
  tax_amount: z.number().min(0).default(0),

  // Payment details
  payment_method: z.enum(["cash", "credit_card", "bank_transfer", "check", "other"]).optional(),
  payment_status: z.enum(["unpaid", "paid", "partially_paid", "refunded"]).default("unpaid"),
  paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().nullable(),

  // References
  reference_number: z.string().optional(),
  receipt_url: z.string().url("Invalid receipt URL").optional().or(z.literal("")),

  // Recurring expense tracking
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(["monthly", "quarterly", "yearly"]).optional(),

  // Financial entry type (for Credit/Debit ledger system)
  entry_type: z.enum(["credit", "debit", "owner_payment"]).default("debit"),

  // Scheduled entry fields
  is_scheduled: z.boolean().default(false),
  scheduled_day: z.number().int().min(1).max(31).optional().nullable(),
  scheduled_months: z.array(z.number().int().min(1).max(12)).optional().nullable(),

  // Payment tracking for financial entries
  is_paid: z.boolean().default(false),
  paid_at: z.string().optional().nullable(),

  // Notes
  notes: z.string().optional(),

  // Metadata
  created_by: z.string().uuid().optional().nullable(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Financial audit log schema (read-only)
export const financialAuditLogSchema = z.object({
  audit_id: z.string().uuid(),
  table_name: z.string(),
  record_id: z.string().uuid(),
  action: z.enum(["INSERT", "UPDATE", "DELETE"]),
  old_values: z.record(z.any()).optional().nullable(),
  new_values: z.record(z.any()).optional().nullable(),
  changed_fields: z.array(z.string()).optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  user_email: z.string().optional().nullable(),
  ip_address: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  created_at: z.string(),
  action_context: z.string().optional().nullable(),
});

// Accounting & Billing Types
export type Invoice = z.infer<typeof invoiceSchema> & {
  property?: Property;
  booking?: Booking;
  line_items?: InvoiceLineItem[];
  balance_due?: number; // Computed: total_amount - amount_paid
  created_user?: User;
};

export type InvoiceLineItem = z.infer<typeof invoiceLineItemSchema> & {
  subtotal?: number; // Computed: quantity * unit_price
  total_amount?: number; // Computed: subtotal + tax_amount
};

// =============================================
// EXPENSE ATTACHMENT SCHEMA
// =============================================
export const expenseAttachmentSchema = z.object({
  attachment_id: z.string().uuid().optional(),
  expense_id: z.string().uuid("Expense ID is required"),
  file_url: z.string().url("Invalid file URL"),
  file_name: z.string().min(1, "File name is required"),
  file_type: z.string().optional(),
  file_size: z.number().optional(),
  caption: z.string().optional(),
  uploaded_by: z.string().uuid().optional(),
  uploaded_at: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type ExpenseAttachment = z.infer<typeof expenseAttachmentSchema> & {
  uploader?: User;
};

export type ExpenseAttachmentInsert = Omit<
  z.infer<typeof expenseAttachmentSchema>,
  'attachment_id' | 'created_at' | 'updated_at' | 'uploaded_at'
>;

// =============================================
// EXPENSE NOTE SCHEMA
// =============================================
export const expenseNoteSchema = z.object({
  note_id: z.string().uuid().optional(),
  expense_id: z.string().uuid("Expense ID is required"),
  note_text: z.string().min(1, "Note text is required"),
  author_id: z.string().uuid().optional(),
  author_name: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type ExpenseNote = z.infer<typeof expenseNoteSchema> & {
  author?: User;
};

export type ExpenseNoteInsert = Omit<
  z.infer<typeof expenseNoteSchema>,
  'note_id' | 'created_at' | 'updated_at'
>;

// =============================================
// EXPENSE TYPE WITH RELATIONS
// =============================================
export type Expense = z.infer<typeof expenseSchema> & {
  property?: Property;
  vendor?: ServiceProvider;
  total_amount?: number; // Computed: amount + tax_amount
  created_user?: User;
  // For financial entries balance calculation
  running_balance?: number;
  schedule_balance?: number;
  // Relations for attachments and notes
  attachments?: ExpenseAttachment[];
  expense_notes?: ExpenseNote[];
  attachment_count?: number;
  note_count?: number;
};

export type FinancialAuditLog = z.infer<typeof financialAuditLogSchema> & {
  user?: User;
};

// Insert types (for creating new records)
export type InvoiceInsert = Omit<z.infer<typeof invoiceSchema>, 'invoice_id' | 'invoice_number' | 'created_at' | 'updated_at'>;
export type InvoiceLineItemInsert = Omit<z.infer<typeof invoiceLineItemSchema>, 'line_item_id' | 'created_at' | 'updated_at'>;
export type ExpenseInsert = Omit<z.infer<typeof expenseSchema>, 'expense_id' | 'created_at' | 'updated_at'>;

// Helper types for financial reporting
export type PropertyFinancialSummary = {
  property_id: string;
  property_name: string;
  period: string; // e.g., "2025-01" for January 2025
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  invoice_count: number;
  expense_count: number;
};

export type ExpenseByCategory = {
  property_id: string;
  category: string;
  month: string;
  expense_count: number;
  total_amount: number;
  total_tax: number;
  grand_total: number;
};

export type InvoiceSummary = Invoice & {
  line_item_count: number;
};

// =============================================
// BILL TEMPLATES SCHEMAS
// =============================================

export const billTemplateSchema = z.object({
  property_id: z.string().uuid().optional().nullable(), // Optional - null for global templates
  template_name: z.string().min(1, "Template name is required").max(255),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  is_global: z.boolean().default(false), // If true, can be assigned to multiple properties
  display_order: z.number().int().default(0),
});

export const billTemplateItemSchema = z.object({
  template_id: z.string().uuid("Template ID is required"),
  line_number: z.number().int().min(1, "Line number must be positive"),
  description: z.string().min(1, "Description is required").max(500),
  quantity: z.number().min(0.01, "Quantity must be positive"),
  unit_price: z.number().min(0, "Unit price cannot be negative"),
  tax_rate: z.number().min(0).max(100, "Tax rate must be between 0 and 100").default(0),
  tax_amount: z.number().min(0).default(0),
  item_type: z.enum(['accommodation', 'cleaning', 'extras', 'tax', 'commission', 'other']).default('other'),
});

// Schema for property assignments
export const billTemplatePropertyAssignmentSchema = z.object({
  template_id: z.string().uuid("Template ID is required"),
  property_id: z.string().uuid("Property ID is required"),
});

export type BillTemplate = z.infer<typeof billTemplateSchema> & {
  template_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  items?: BillTemplateItem[];
  assigned_properties?: Array<{ property_id: string; property_name: string }>; // From view
};

export type BillTemplateItem = z.infer<typeof billTemplateItemSchema> & {
  template_item_id?: string;
  created_at?: string;
};

export interface BillTemplatePropertyAssignment {
  assignment_id: string;
  template_id: string;
  property_id: string;
  created_at: string;
}

export type BillTemplateInsert = Omit<z.infer<typeof billTemplateSchema>, 'template_id' | 'created_at' | 'updated_at'>;
export type BillTemplateItemInsert = Omit<z.infer<typeof billTemplateItemSchema>, 'template_item_id' | 'created_at'>;
export type BillTemplatePropertyAssignmentInsert = z.infer<typeof billTemplatePropertyAssignmentSchema>;

export type BillTemplateWithItems = BillTemplate & {
  items: BillTemplateItem[];
  total_amount: number;
};

// ============================================
// INVOICE PAYMENTS
// ============================================

export const invoicePaymentSchema = z.object({
  invoice_id: z.string().uuid("Invoice is required"),
  payment_date: z.string().min(1, "Payment date is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  payment_method: z.string().min(1, "Payment method is required"),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

export interface InvoicePayment {
  payment_id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type InvoicePaymentInsert = Omit<z.infer<typeof invoicePaymentSchema>, 'payment_id' | 'created_at' | 'updated_at'>;

// ============================================
// DOCUMENTS MANAGEMENT SYSTEM
// Document storage with versioning and approvals
// ============================================

// Document schema
export const documentSchema = z.object({
  category: z.enum(['contracts', 'employee', 'access', 'coi', 'service', 'messages'], {
    required_error: "Document category is required"
  }),
  document_name: z.string().min(1, "Document name is required").max(255),
  description: z.string().optional(),
  file_url: z.string().min(1, "File URL is required"),
  file_name: z.string().min(1, "File name is required").max(255),
  file_type: z.string().min(1, "File type is required"),
  file_size: z.number().positive("File size must be positive"),
  property_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'active', 'archived', 'expired']).default('active'),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional().nullable(),
  tags: z.array(z.string()).optional(),
  contract_type: z.enum([
    'lease_agreement',
    'service_contract',
    'vendor_agreement',
    'employment_contract',
    'nda',
    'maintenance_contract',
    'insurance_policy',
    'partnership_agreement',
    'purchase_agreement',
    'other'
  ]).optional(),
});

// Document approval schema
export const documentApprovalSchema = z.object({
  document_id: z.string().uuid("Document ID is required"),
  requested_by: z.string().uuid().optional(), // Will be set automatically
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  rejection_reason: z.string().optional(),
  notes: z.string().optional(),
});

// Document share schema
export const documentShareSchema = z.object({
  document_id: z.string().uuid("Document ID is required"),
  shared_with: z.string().uuid("User to share with is required"),
  permission_level: z.enum(['view', 'download', 'edit']).default('view'),
  expires_at: z.string().optional().nullable(),
});

// Document access log schema (read-only)
export const documentAccessLogSchema = z.object({
  access_log_id: z.string().uuid(),
  document_id: z.string().uuid(),
  user_id: z.string().uuid().optional().nullable(),
  user_email: z.string().optional().nullable(),
  action: z.enum(['viewed', 'downloaded', 'uploaded', 'deleted', 'updated', 'shared', 'unshared']),
  ip_address: z.string().optional().nullable(),
  user_agent: z.string().optional().nullable(),
  accessed_at: z.string(),
});

// Document types
export type Document = z.infer<typeof documentSchema> & {
  document_id: string;
  version_number: number;
  is_current_version: boolean;
  parent_document_id?: string | null;
  uploaded_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  property?: Property;
  uploaded_user?: User;
};

export type DocumentApproval = z.infer<typeof documentApprovalSchema> & {
  approval_id: string;
  approved_by?: string | null;
  request_date?: string;
  approval_date?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined data
  document?: Document;
  requested_user?: User;
  approved_user?: User;
};

export type DocumentShare = z.infer<typeof documentShareSchema> & {
  share_id: string;
  shared_by?: string | null;
  created_at?: string;
  // Joined data
  document?: Document;
  shared_by_user?: User;
  shared_with_user?: User;
};

export type DocumentAccessLog = z.infer<typeof documentAccessLogSchema> & {
  document?: Document;
  user?: User;
};

// Insert types
export type DocumentInsert = Omit<z.infer<typeof documentSchema>, 'status'>;
export type DocumentApprovalInsert = Omit<z.infer<typeof documentApprovalSchema>, 'status'>;
export type DocumentShareInsert = z.infer<typeof documentShareSchema>;

// Extended document with summary data
export type DocumentSummary = Document & {
  property_name?: string;
  uploaded_by_name?: string;
  share_count?: number;
  expiring_soon?: boolean;
};

// Document stats type
export type DocumentStats = {
  category: string;
  total_documents: number;
  current_versions: number;
  active_documents: number;
  expired_documents: number;
  expiring_soon: number;
  total_storage_bytes: number;
  avg_file_size_bytes: number;
};

// Document category labels for UI
export const DOCUMENT_CATEGORIES = {
  contracts: 'Contracts',
  employee: 'Employee Documents',
  access: 'Access Authorization',
  coi: 'Building COIs',
  service: 'Service Authorization',
  messages: 'Message Templates',
} as const;

// Contract type labels for UI
export const CONTRACT_TYPES = {
  lease_agreement: 'Lease Agreement',
  service_contract: 'Service Contract',
  vendor_agreement: 'Vendor Agreement',
  employment_contract: 'Employment Contract',
  nda: 'NDA / Confidentiality Agreement',
  maintenance_contract: 'Maintenance Contract',
  insurance_policy: 'Insurance Policy',
  partnership_agreement: 'Partnership Agreement',
  purchase_agreement: 'Purchase Agreement',
  other: 'Other',
} as const;

// Document status labels for UI
export const DOCUMENT_STATUS = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
  expired: 'Expired',
} as const;

// File type categories for validation
export const ALLOWED_DOCUMENT_TYPES = {
  pdf: ['application/pdf'],
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  word: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  excel: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  text: ['text/plain', 'text/csv', 'text/html'],
} as const;

// Max file sizes (in bytes)
export const MAX_FILE_SIZES = {
  'property-documents': 52428800, // 50MB
  'employee-documents': 20971520, // 20MB
  'message-templates': 10485760,  // 10MB
} as const;

// =====================================================
// COI (Certificate of Insurance) Management
// =====================================================

// Coverage type options
export const COI_COVERAGE_TYPES = {
  general_liability: 'General Liability',
  workers_compensation: 'Workers Compensation',
  auto_liability: 'Auto Liability',
  professional_liability: 'Professional Liability',
  umbrella: 'Umbrella Coverage',
  other: 'Other',
} as const;

export type CoverageType = keyof typeof COI_COVERAGE_TYPES;

// COI Status options
export const COI_STATUS = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  renewed: 'Renewed',
  cancelled: 'Cancelled',
} as const;

export type COIStatus = keyof typeof COI_STATUS;

// Access Authorization Status
export const ACCESS_AUTH_STATUS = {
  requested: 'Requested',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
} as const;

export type AccessAuthStatus = keyof typeof ACCESS_AUTH_STATUS;

// Vendor COI Schema
export const vendorCOISchema = z.object({
  coi_id: z.string().uuid().optional(),
  vendor_id: z.string().uuid('Vendor is required'),
  property_id: z.string().uuid().optional().nullable(),
  insurance_company: z.string().optional(),
  policy_number: z.string().optional(),
  coverage_type: z.enum([
    'general_liability',
    'workers_compensation',
    'auto_liability',
    'professional_liability',
    'umbrella',
    'other',
  ]),
  coverage_amount: z.number().positive('Coverage amount must be positive'),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  valid_through: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  file_url: z.string().url().optional(),
  file_name: z.string().optional(),
  status: z.enum(['active', 'expiring_soon', 'expired', 'renewed', 'cancelled']).default('active'),
  notes: z.string().optional(),
  verified_by: z.string().uuid().optional().nullable(),
  verified_at: z.string().optional().nullable(),
}).refine((data) => {
  const from = new Date(data.valid_from);
  const through = new Date(data.valid_through);
  return through > from;
}, {
  message: 'Valid through date must be after valid from date',
  path: ['valid_through'],
});

export type VendorCOI = z.infer<typeof vendorCOISchema> & {
  vendor?: any; // Provider type
  uploaded_user?: any; // User type
  verified_user?: any; // User type
  created_at?: string;
  updated_at?: string;
  alert_30_days_sent?: boolean;
  alert_15_days_sent?: boolean;
  alert_7_days_sent?: boolean;
  alert_expired_sent?: boolean;
};

// Building COI Schema
export const buildingCOISchema = z.object({
  building_coi_id: z.string().uuid().optional(),
  property_id: z.string().uuid('Property is required'),
  required_coverages: z.record(z.object({
    min_amount: z.number().positive(),
    required: z.boolean(),
  })).optional(),
  access_policies: z.string().optional(),
  service_elevator_rules: z.string().optional(),
  loading_dock_rules: z.string().optional(),
  parking_instructions: z.string().optional(),
  building_manager_name: z.string().optional(),
  building_manager_email: z.string().email().optional().or(z.literal('')),
  building_manager_phone: z.string().optional(),
  building_management_company: z.string().optional(),
  emergency_contact: z.array(z.object({
    name: z.string(),
    role: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
  })).optional(),
  office_hours: z.string().optional(),
  after_hours_contact: z.string().optional(),
  security_requirements: z.string().optional(),
  notes: z.string().optional(),
});

export type BuildingCOI = z.infer<typeof buildingCOISchema> & {
  property?: any; // Property type
  created_user?: any; // User type
  created_at?: string;
  updated_at?: string;
};

// Access Authorization Schema
export const accessAuthorizationSchema = z.object({
  access_auth_id: z.string().uuid().optional(),
  vendor_id: z.string().uuid('Vendor is required'),
  property_id: z.string().uuid('Property is required'),
  unit_id: z.string().uuid().optional().nullable(),
  job_id: z.string().uuid().optional().nullable(),
  coi_id: z.string().uuid().optional().nullable(),
  access_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  access_time_start: z.string().optional().nullable(),
  access_time_end: z.string().optional().nullable(),
  authorized_areas: z.array(z.string()).optional(),
  status: z.enum(['requested', 'approved', 'in_progress', 'completed', 'cancelled', 'expired']).default('requested'),
  access_code: z.string().optional(),
  qr_code_url: z.string().optional(),
  key_pickup_location: z.string().optional(),
  vendor_contact_name: z.string().optional(),
  vendor_contact_phone: z.string().optional(),
  number_of_personnel: z.number().positive().default(1),
  vehicle_info: z.string().optional(),
  building_contact_notified: z.boolean().default(false),
  building_contact_name: z.string().optional(),
  authorization_message: z.string().optional(),
  special_instructions: z.string().optional(),
  completion_notes: z.string().optional(),
});

export type AccessAuthorization = z.infer<typeof accessAuthorizationSchema> & {
  vendor?: any; // Provider type
  property?: any; // Property type
  unit?: any; // Unit type
  job?: any; // Job type
  coi?: VendorCOI;
  requested_user?: any; // User type
  approved_user?: any; // User type
  completed_user?: any; // User type
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
  actual_arrival_time?: string;
  actual_departure_time?: string;
  building_notification_sent_at?: string;
};

// ============================================
// ACCESS DOCUMENTS (Simplified Document Storage)
// ============================================

// Access Document Types
export const ACCESS_DOCUMENT_TYPES = {
  access_card: 'Access Card',
  code: 'Code',
  key: 'Key',
  permit: 'Permit',
  other: 'Other',
} as const;

export type AccessDocumentType = keyof typeof ACCESS_DOCUMENT_TYPES;

// Access Document Schema
export const accessDocumentSchema = z.object({
  access_document_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  document_type: z.enum(['access_card', 'code', 'key', 'permit', 'other']),
  document_name: z.string().min(1, 'Document name is required'),
  description: z.string().optional().nullable(),
  file_url: z.string().url('Invalid file URL'),
  file_name: z.string().min(1, 'File name is required'),
  file_type: z.string().optional().nullable(),
  file_size: z.number().optional().nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export type AccessDocumentInsert = z.infer<typeof accessDocumentSchema>;

export type AccessDocument = AccessDocumentInsert & {
  access_document_id: string;
  uploaded_by?: string;
  created_at?: string;
  updated_at?: string;
  // Joined fields from view
  property_name?: string;
  property_type?: string;
  vendor_name?: string;
  vendor_type?: string;
  uploaded_by_first_name?: string;
  uploaded_by_last_name?: string;
  status?: 'active' | 'expiring_soon' | 'expired';
};

// COI Dashboard Stats
export type COIDashboardStats = {
  active_cois: number;
  expiring_soon: number;
  expired_cois: number;
  vendors_with_cois: number;
  past_due: number;
};

// Expiring COI Info
export type ExpiringCOI = {
  coi_id: string;
  vendor_id: string;
  vendor_name: string;
  coverage_type: CoverageType;
  valid_through: string;
  days_until_expiry: number;
  alert_sent: boolean;
};

// COI Validation Result
export type COIValidationResult = {
  is_valid: boolean;
  missing_coverages: CoverageType[];
  expiring_soon: CoverageType[];
};

// ============================================
// MEDIA / PROPERTY IMAGES
// ============================================

export const propertyImageSchema = z.object({
  image_id: z.string().uuid().optional(),
  property_id: z.string().uuid("Property is required"),
  image_url: z.string().url("Invalid image URL"),
  image_title: z.string().optional(),
  image_description: z.string().optional(),
  is_primary: z.boolean().default(false),
  display_order: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type PropertyImage = z.infer<typeof propertyImageSchema>;

export type PropertyImageWithDetails = PropertyImage & {
  property?: {
    property_id: string;
    property_name: string;
    property_type: string;
  };
  uploaded_by?: {
    user_id: string;
    first_name: string;
    last_name: string;
  };
};

export const mediaUploadSchema = z.object({
  property_id: z.string().uuid("Please select a property"),
  image_title: z.string().min(1, "Image title is required"),
  image_description: z.string().optional(),
  is_primary: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;

// Media filter options
export type MediaFilters = {
  property_id?: string;
  search?: string;
  is_primary?: boolean;
  tags?: string[];
};

// Media category for organization
export const MEDIA_CATEGORIES = {
  exterior: 'Exterior',
  interior: 'Interior',
  bedroom: 'Bedroom',
  bathroom: 'Bathroom',
  kitchen: 'Kitchen',
  living_room: 'Living Room',
  amenities: 'Amenities',
  pool: 'Pool',
  garden: 'Garden/Yard',
  view: 'View',
  other: 'Other',
} as const;

export type MediaCategory = keyof typeof MEDIA_CATEGORIES;

// ============================================
// CHECK-IN/CHECK-OUT SCHEMAS
// ============================================

// Checklist item structure for templates
export const checklistItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required"),
  type: z.enum(['checkbox', 'text', 'photo', 'number']),
  required: z.boolean().default(false),
  order: z.number().default(0),
  options: z.array(z.string()).optional(), // For select/radio types
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

// Checklist response structure
export const checklistResponseSchema = z.object({
  item_id: z.string(),
  response: z.union([z.string(), z.boolean(), z.number()]),
  notes: z.string().optional(),
  photo_urls: z.array(z.string()).optional(),
});

export type ChecklistResponse = z.infer<typeof checklistResponseSchema>;

// Checklist Template Schema
export const checklistTemplateSchema = z.object({
  property_id: z.string().uuid("Invalid property ID"),
  template_name: z.string().min(1, "Template name is required").max(255),
  template_type: z.enum(['check_in', 'check_out', 'inspection']),
  description: z.string().optional(),
  checklist_items: z.array(checklistItemSchema),
  is_active: z.boolean().default(true),
});

export type ChecklistTemplateInsert = z.infer<typeof checklistTemplateSchema>;

export type ChecklistTemplate = ChecklistTemplateInsert & {
  template_id: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

// Photo/Document attachment structure
export const attachmentSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  size: z.number().optional(),
  timestamp: z.string().optional(),
});

export type Attachment = z.infer<typeof attachmentSchema>;

// Check-in/Out Record Schema
export const checkInOutRecordSchema = z.object({
  property_id: z.string().uuid("Invalid property ID"),
  booking_id: z.string().uuid("Invalid booking ID").optional().nullable(),
  record_type: z.enum(['check_in', 'check_out']),
  record_date: z.string().or(z.date()),
  agent_id: z.string().uuid("Invalid agent ID").optional().nullable(),
  resident_name: z.string().min(1, "Resident name is required").max(255),
  resident_contact: z.string().optional(),
  template_id: z.string().uuid().optional().nullable(),
  checklist_responses: z.array(checklistResponseSchema).default([]),
  photos: z.array(attachmentSchema).default([]),
  documents: z.array(attachmentSchema).default([]),
  signature_data: z.string().optional().nullable(), // Base64 encoded image
  signature_name: z.string().optional(),
  signature_date: z.string().or(z.date()).optional().nullable(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'completed', 'archived']).default('draft'),
  pdf_url: z.string().url().optional().nullable(),
});

export type CheckInOutRecordInsert = z.infer<typeof checkInOutRecordSchema>;

export type CheckInOutRecord = CheckInOutRecordInsert & {
  record_id: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  property?: {
    property_id: string;
    property_name: string;
  };
  booking?: {
    booking_id: string;
    guest_name: string;
    check_in_date: string;
    check_out_date: string;
    booking_status: string;
  };
  agent?: {
    user_id: string;
    first_name: string;
    last_name: string;
    user_type: string;
  };
  template?: ChecklistTemplate;
};

// Check-in/Out filters
export type CheckInOutFilters = {
  property_id?: string;
  booking_id?: string;
  record_type?: 'check_in' | 'check_out';
  agent_id?: string;
  status?: 'draft' | 'completed' | 'archived';
  start_date?: string;
  end_date?: string;
  search?: string;
};

// ============================================
// PROPERTY HIGHLIGHTS SCHEMAS
// ============================================

// Photo structure for highlights
export const highlightPhotoSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  display_order: z.number().default(0),
});

export type HighlightPhoto = z.infer<typeof highlightPhotoSchema>;

// Property Highlight Schema
export const propertyHighlightSchema = z.object({
  property_id: z.string().uuid("Invalid property ID"),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  icon_name: z.string().max(100).optional(), // e.g., 'beach', 'pool', 'wifi'
  highlight_type: z.enum(['feature', 'amenity', 'location', 'access', 'view', 'other']).default('feature'),
  photos: z.array(highlightPhotoSchema).default([]),
  display_order: z.number().default(0),
  is_active: z.boolean().default(true),
});

export type PropertyHighlightInsert = z.infer<typeof propertyHighlightSchema>;

export type PropertyHighlight = PropertyHighlightInsert & {
  highlight_id: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  property?: {
    property_id: string;
    property_name: string;
  };
};

// Property Highlight filters
export type PropertyHighlightFilters = {
  property_id?: string;
  highlight_type?: 'feature' | 'amenity' | 'location' | 'access' | 'view' | 'other';
  is_active?: boolean;
  search?: string;
};

// Common highlight icons
export const HIGHLIGHT_ICONS = {
  // Location & Views
  beach: 'Beach Access',
  ocean_view: 'Ocean View',
  mountain_view: 'Mountain View',
  city_view: 'City View',
  waterfront: 'Waterfront',

  // Amenities
  pool: 'Swimming Pool',
  hot_tub: 'Hot Tub/Jacuzzi',
  gym: 'Fitness Center',
  spa: 'Spa',
  sauna: 'Sauna',

  // Technology
  wifi: 'High-Speed WiFi',
  smart_home: 'Smart Home',
  tv: 'Smart TV',
  sound_system: 'Sound System',

  // Outdoor
  garden: 'Garden',
  patio: 'Patio/Deck',
  bbq: 'BBQ/Grill',
  outdoor_dining: 'Outdoor Dining',
  fire_pit: 'Fire Pit',

  // Parking & Access
  parking: 'Parking',
  garage: 'Garage',
  elevator: 'Elevator',
  wheelchair: 'Wheelchair Accessible',

  // Kitchen & Dining
  kitchen: 'Full Kitchen',
  dining: 'Dining Area',
  bar: 'Bar',
  wine_cellar: 'Wine Cellar',

  // Bedroom & Comfort
  bedroom: 'Luxury Bedrooms',
  bathroom: 'Spa Bathrooms',
  ac: 'Air Conditioning',
  heating: 'Heating',
  fireplace: 'Fireplace',

  // Entertainment
  game_room: 'Game Room',
  theater: 'Home Theater',
  library: 'Library',
  office: 'Home Office',

  // Security & Services
  security: 'Security System',
  concierge: 'Concierge Service',
  housekeeping: 'Housekeeping',

  // Pet-Friendly
  pet_friendly: 'Pet Friendly',

  // Other
  eco_friendly: 'Eco-Friendly',
  luxury: 'Luxury Finishes',
  new: 'Newly Renovated',
} as const;

export type HighlightIconName = keyof typeof HIGHLIGHT_ICONS;

// ============================================================================
// VEHICLE SCHEMAS
// ============================================================================

// Vehicle Photo Schema
export const vehiclePhotoSchema = z.object({
  vehicle_id: z.string().uuid(),
  photo_url: z.string().url("Must be a valid URL"),
  photo_title: z.string().optional(),
  is_primary: z.boolean().default(false),
  display_order: z.number().default(0),
});

export type VehiclePhotoInsert = z.infer<typeof vehiclePhotoSchema>;

export type VehiclePhoto = VehiclePhotoInsert & {
  photo_id: string;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
};

// Property Vehicle Schema
export const propertyVehicleSchema = z.object({
  property_id: z.string().uuid(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().optional(),
  license_plate: z.string().optional(),
  vin: z.string().max(17).optional(),
  owner_name: z.string().optional(),
  registration_info: z.string().optional(),

  // Legacy insurance field (for backward compatibility)
  insurance_info: z.string().optional(),

  // Structured insurance fields
  insurance_company: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  insurance_expiry_date: z.string().optional(), // Format: YYYY-MM-DD
  insurance_coverage_amount: z.number().optional(),
  insurance_contact_phone: z.string().optional(),
  insurance_document_url: z.string().url().optional(),
});

export type PropertyVehicleInsert = z.infer<typeof propertyVehicleSchema>;

export type PropertyVehicle = PropertyVehicleInsert & {
  vehicle_id: string;
  created_at: string;
  updated_at: string;
  photos?: VehiclePhoto[];
};

// Vehicle filters
export type VehicleFilters = {
  property_id?: string;
  make?: string;
  model?: string;
  year?: number;
  search?: string;
};

// Vehicle Document Schema
export const vehicleDocumentSchema = z.object({
  vehicle_id: z.string().uuid(),
  document_type: z.enum(['registration', 'insurance', 'inspection', 'other']),
  document_name: z.string().min(1, "Document name is required"),
  document_url: z.string().url("Must be a valid URL"),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
  expiry_date: z.string().optional(), // Format: YYYY-MM-DD
  notes: z.string().optional(),
});

export type VehicleDocumentInsert = z.infer<typeof vehicleDocumentSchema>;

export type VehicleDocument = VehicleDocumentInsert & {
  document_id: string;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
};

// ==========================================
// SERVICE SCHEDULING SCHEMAS
// ==========================================

// Service Types
export const serviceTypeEnum = z.enum([
  'cleaning',
  'deep_cleaning',
  'maintenance',
  'pool_service',
  'lawn_care',
  'pest_control',
  'hvac_service',
  'plumbing',
  'electrical',
  'appliance_repair',
  'inspection',
  'other'
]);

export type ServiceType = z.infer<typeof serviceTypeEnum>;

// Recurrence Frequency
export const recurrenceFrequencyEnum = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly'
]);

export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencyEnum>;

// Schedule Status
export const scheduleStatusEnum = z.enum([
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
]);

export type ScheduleStatus = z.infer<typeof scheduleStatusEnum>;

// Priority
export const schedulePriorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);
export type SchedulePriority = z.infer<typeof schedulePriorityEnum>;

// Partner Payment Status (Gold Partner Status from legacy)
export const partnerPaymentStatusEnum = z.enum(['pending', 'waiting', 'paid', 'partial', 'overdue']);
export type PartnerPaymentStatus = z.infer<typeof partnerPaymentStatusEnum>;

// Allocation Status
export const allocationStatusEnum = z.enum(['unassigned', 'assigned', 'accepted', 'declined', 'reassigned']);
export type AllocationStatus = z.infer<typeof allocationStatusEnum>;

// Service Category Schema
export const serviceCategorySchema = z.object({
  category_name: z.string().min(1, "Category name is required").max(100),
  category_code: z.string().max(50).optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export type ServiceCategoryInsert = z.infer<typeof serviceCategorySchema>;

export type ServiceCategory = ServiceCategoryInsert & {
  category_id: string;
  created_at: string;
  updated_at: string;
  services?: ServiceTypeCatalog[];
};

// Service Type Catalog Schema (specific services under categories)
export const serviceTypeCatalogSchema = z.object({
  category_id: z.string().uuid("Invalid category ID"),
  service_name: z.string().min(1, "Service name is required").max(100),
  service_code: z.string().max(50).optional(),
  description: z.string().optional().nullable(),
  default_duration_minutes: z.number().int().positive().default(60),
  default_cost: z.number().positive().optional().nullable(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export type ServiceTypeCatalogInsert = z.infer<typeof serviceTypeCatalogSchema>;

export type ServiceTypeCatalog = ServiceTypeCatalogInsert & {
  service_type_id: string;
  created_at: string;
  updated_at: string;
  category?: ServiceCategory;
};

// Service Recurrence Rule Schema
export const serviceRecurrenceRuleSchema = z.object({
  frequency: recurrenceFrequencyEnum,
  interval_value: z.number().int().positive().default(1),
  days_of_week: z.array(z.number().int().min(0).max(6)).optional().nullable(), // 0=Sunday, 6=Saturday
  day_of_month: z.number().int().min(1).max(31).optional().nullable(),
  week_of_month: z.number().int().min(-1).max(4).refine(v => v !== 0, "Week of month cannot be 0").optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format").optional().nullable(),
  max_occurrences: z.number().int().positive().optional().nullable(),
  is_active: z.boolean().default(true),
});

export type ServiceRecurrenceRuleInsert = z.infer<typeof serviceRecurrenceRuleSchema>;

export type ServiceRecurrenceRule = ServiceRecurrenceRuleInsert & {
  rule_id: string;
  created_at: string;
  updated_at: string;
};

// Scheduled Service Schema
export const scheduledServiceSchema = z.object({
  property_id: z.string().uuid("Invalid property ID"),
  unit_id: z.string().uuid("Invalid unit ID").optional().nullable(),
  service_type: serviceTypeEnum,
  custom_service_name: z.string().max(255).optional().nullable(),
  vendor_id: z.string().uuid("Invalid vendor ID").optional().nullable(),

  // Category/Service hierarchy (legacy fields)
  service_category_id: z.string().uuid().optional().nullable(),
  catalog_service_type_id: z.string().uuid().optional().nullable(),

  // Scheduling
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  scheduled_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS format").optional().nullable(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Must be HH:MM or HH:MM:SS format").optional().nullable(),
  duration_minutes: z.number().int().positive().default(60),

  // Recurrence
  recurrence_rule_id: z.string().uuid().optional().nullable(),
  parent_schedule_id: z.string().uuid().optional().nullable(),
  is_recurring_instance: z.boolean().default(false),

  // Status and details
  status: scheduleStatusEnum.default('scheduled'),
  priority: schedulePriorityEnum.default('normal'),
  estimated_cost: z.number().positive().optional().nullable(),
  actual_cost: z.number().positive().optional().nullable(),

  // Partner/Vendor tracking (legacy "Gold Partner Status")
  partner_payment_status: partnerPaymentStatusEnum.default('pending'),
  allocation_status: allocationStatusEnum.default('unassigned'),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  payment_amount: z.number().positive().optional().nullable(),

  // Notes
  notes: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
  special_instructions: z.string().optional().nullable(),

  // Completion
  completed_at: z.string().optional().nullable(),
  completed_by: z.string().uuid().optional().nullable(),
  completion_notes: z.string().optional().nullable(),

  // Property owner for filtering
  property_owner_id: z.string().uuid().optional().nullable(),
});

export type ScheduledServiceInsert = z.infer<typeof scheduledServiceSchema>;

export type ScheduledService = ScheduledServiceInsert & {
  schedule_id: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  assigned_at?: string | null;
  assigned_by?: string | null;
  // Relations (populated by queries)
  property?: {
    property_id: string;
    property_name: string;
    property_code?: string;
  };
  unit?: {
    unit_id: string;
    unit_name: string;
  } | null;
  vendor?: {
    provider_id: string;
    business_name: string;
    contact_email?: string;
    contact_phone?: string;
  } | null;
  recurrence_rule?: ServiceRecurrenceRule | null;
  created_by_user?: {
    user_id: string;
    first_name: string;
    last_name: string;
  } | null;
  assigned_by_user?: {
    user_id: string;
    first_name: string;
    last_name: string;
  } | null;
  service_category?: ServiceCategory | null;
  catalog_service?: ServiceTypeCatalog | null;
  property_owner?: {
    user_id: string;
    first_name: string;
    last_name: string;
  } | null;
};

// Partner Payment Status display config
export const PARTNER_PAYMENT_STATUS_CONFIG: Record<PartnerPaymentStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Pending', color: '#6B7280', bgColor: '#F3F4F6' },
  waiting: { label: 'Waiting', color: '#F59E0B', bgColor: '#FEF3C7' },
  paid: { label: 'Paid', color: '#10B981', bgColor: '#D1FAE5' },
  partial: { label: 'Partial', color: '#8B5CF6', bgColor: '#EDE9FE' },
  overdue: { label: 'Overdue', color: '#EF4444', bgColor: '#FEE2E2' },
};

// Allocation Status display config
export const ALLOCATION_STATUS_CONFIG: Record<AllocationStatus, { label: string; color: string; bgColor: string }> = {
  unassigned: { label: 'Assign', color: '#6B7280', bgColor: '#F3F4F6' },
  assigned: { label: 'Assigned', color: '#F59E0B', bgColor: '#FEF3C7' },
  accepted: { label: 'Accepted', color: '#10B981', bgColor: '#D1FAE5' },
  declined: { label: 'Declined', color: '#EF4444', bgColor: '#FEE2E2' },
  reassigned: { label: 'Reassigned', color: '#8B5CF6', bgColor: '#EDE9FE' },
};

// Partner Tier enum for vendor classification
export const partnerTierEnum = z.enum(['regular', 'partner', 'gold_partner', 'platinum_partner']);
export type PartnerTier = z.infer<typeof partnerTierEnum>;

// Partner Tier display config
export const PARTNER_TIER_CONFIG: Record<PartnerTier, { label: string; color: string; bgColor: string }> = {
  regular: { label: 'Regular', color: '#6B7280', bgColor: '#F3F4F6' },
  partner: { label: 'Partner', color: '#2563EB', bgColor: '#DBEAFE' },
  gold_partner: { label: 'Gold Partner', color: '#D97706', bgColor: '#FEF3C7' },
  platinum_partner: { label: 'Platinum Partner', color: '#7C3AED', bgColor: '#EDE9FE' },
};

// Service Notification Settings Schema
export const serviceNotificationSettingsSchema = z.object({
  schedule_id: z.string().uuid("Invalid schedule ID"),
  notify_vendor_before_hours: z.number().int().min(0).default(24),
  notify_admin_before_hours: z.number().int().min(0).default(48),
  notify_owner_before_hours: z.number().int().min(0).optional().nullable(),
  send_reminder: z.boolean().default(true),
  send_confirmation: z.boolean().default(true),
  send_completion: z.boolean().default(true),
});

export type ServiceNotificationSettingsInsert = z.infer<typeof serviceNotificationSettingsSchema>;

export type ServiceNotificationSettings = ServiceNotificationSettingsInsert & {
  setting_id: string;
  created_at: string;
  updated_at: string;
};

// Service Notification Schema
export const serviceNotificationSchema = z.object({
  schedule_id: z.string().uuid("Invalid schedule ID"),
  notification_type: z.enum(['reminder', 'confirmation', 'completion', 'cancellation', 'reschedule']),
  recipient_type: z.enum(['vendor', 'admin', 'owner', 'ops']),
  recipient_id: z.string().uuid().optional().nullable(),
  recipient_email: z.string().email().optional().nullable(),
  scheduled_for: z.string().datetime(),
  sent_at: z.string().datetime().optional().nullable(),
  status: z.enum(['pending', 'sent', 'failed', 'cancelled']).default('pending'),
  error_message: z.string().optional().nullable(),
  retry_count: z.number().int().min(0).default(0),
});

export type ServiceNotificationInsert = z.infer<typeof serviceNotificationSchema>;

export type ServiceNotification = ServiceNotificationInsert & {
  notification_id: string;
  created_at: string;
  updated_at: string;
};

// Filters for querying scheduled services
export type ScheduledServiceFilters = {
  property_id?: string;
  unit_id?: string;
  vendor_id?: string;
  service_type?: ServiceType;
  status?: ScheduleStatus | ScheduleStatus[];
  priority?: SchedulePriority;
  date_from?: string;
  date_to?: string;
  is_recurring?: boolean;
  search?: string;
};

// Calendar view types
export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  resource: ScheduledService;
  color?: string;
};

// Service type display names and colors
export const SERVICE_TYPE_CONFIG: Record<ServiceType, { label: string; color: string; icon: string }> = {
  cleaning: { label: 'Cleaning', color: '#10B981', icon: 'Sparkles' },
  deep_cleaning: { label: 'Deep Cleaning', color: '#059669', icon: 'Sparkles' },
  maintenance: { label: 'Maintenance', color: '#F59E0B', icon: 'Wrench' },
  pool_service: { label: 'Pool Service', color: '#3B82F6', icon: 'Droplets' },
  lawn_care: { label: 'Lawn Care', color: '#22C55E', icon: 'Leaf' },
  pest_control: { label: 'Pest Control', color: '#EF4444', icon: 'Bug' },
  hvac_service: { label: 'HVAC Service', color: '#8B5CF6', icon: 'Wind' },
  plumbing: { label: 'Plumbing', color: '#06B6D4', icon: 'Droplet' },
  electrical: { label: 'Electrical', color: '#FBBF24', icon: 'Zap' },
  appliance_repair: { label: 'Appliance Repair', color: '#6366F1', icon: 'Settings' },
  inspection: { label: 'Inspection', color: '#14B8A6', icon: 'ClipboardCheck' },
  other: { label: 'Other', color: '#6B7280', icon: 'MoreHorizontal' },
};

// Schedule status display config
export const SCHEDULE_STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string; bgColor: string }> = {
  scheduled: { label: 'Scheduled', color: '#3B82F6', bgColor: '#DBEAFE' },
  confirmed: { label: 'Confirmed', color: '#10B981', bgColor: '#D1FAE5' },
  in_progress: { label: 'In Progress', color: '#F59E0B', bgColor: '#FEF3C7' },
  completed: { label: 'Completed', color: '#059669', bgColor: '#A7F3D0' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bgColor: '#FEE2E2' },
  no_show: { label: 'No Show', color: '#6B7280', bgColor: '#E5E7EB' },
};

// ==========================================
// REPORT EMAIL SCHEDULE SCHEMAS
// ==========================================

// Report Type enum
export const reportTypeEnum = z.enum([
  'current_balance',
  'financial_entries',
  'active_clients',
  'inactive_clients',
  'bookings_enhanced',
  'rental_revenue'
]);

export type ReportType = z.infer<typeof reportTypeEnum>;

// Report type display names
export const REPORT_TYPE_CONFIG: Record<ReportType, { label: string; description: string }> = {
  current_balance: { label: 'Current Balance Report', description: 'Client/Property balances with positive, negative, and current balance' },
  financial_entries: { label: 'Financial Entries Report', description: 'All financial entries for a date range' },
  active_clients: { label: 'Active Clients Report', description: 'List of active clients with their properties' },
  inactive_clients: { label: 'Inactive Clients Report', description: 'List of inactive clients' },
  bookings_enhanced: { label: 'Enhanced Bookings Report', description: 'Detailed booking report with revenue breakdown' },
  rental_revenue: { label: 'Rental Revenue Report', description: 'Revenue analysis by property and period' },
};

// Days of week display
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

// Report Schedule Schema
export const reportScheduleSchema = z.object({
  schedule_name: z.string().min(1, "Schedule name is required").max(200),
  report_type: reportTypeEnum,
  day_of_week: z.number().int().min(0).max(6), // 0=Sunday, 6=Saturday
  hour_of_day: z.number().int().min(0).max(23),
  minute_of_hour: z.number().int().min(0).max(59).default(0),
  timezone: z.string().default('America/New_York'),
  recipient_emails: z.array(z.string().email("Invalid email address")).min(1, "At least one recipient is required"),
  report_filters: z.record(z.any()).optional().default({}),
  is_enabled: z.boolean().default(true),
});

export type ReportScheduleInsert = z.infer<typeof reportScheduleSchema>;

export type ReportSchedule = ReportScheduleInsert & {
  schedule_id: string;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  last_sent_at?: string | null;
  next_run_at?: string | null;
  creator?: {
    user_id: string;
    first_name: string;
    last_name: string;
  };
};

// Report Email History Schema
export const reportEmailHistorySchema = z.object({
  schedule_id: z.string().uuid("Invalid schedule ID"),
  status: z.enum(['pending', 'sending', 'sent', 'failed']).default('pending'),
  recipient_emails: z.array(z.string().email()),
  email_provider_id: z.string().optional().nullable(),
  error_message: z.string().optional().nullable(),
  report_row_count: z.number().int().optional().nullable(),
  report_generation_time_ms: z.number().int().optional().nullable(),
});

export type ReportEmailHistoryInsert = z.infer<typeof reportEmailHistorySchema>;

export type ReportEmailHistory = ReportEmailHistoryInsert & {
  history_id: string;
  sent_at: string;
};

// Report Schedule Filters
export type ReportScheduleFilters = {
  is_enabled?: boolean;
  report_type?: ReportType;
  search?: string;
};

// Common timezones for dropdown
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (Brazil)' },
  { value: 'Europe/London', label: 'London (UK)' },
  { value: 'Europe/Paris', label: 'Paris (France)' },
  { value: 'Europe/Madrid', label: 'Madrid (Spain)' },
  { value: 'UTC', label: 'UTC' },
] as const;

