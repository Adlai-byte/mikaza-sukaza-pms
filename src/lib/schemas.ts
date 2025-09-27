import { z } from "zod";

export const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required").optional().or(z.string().min(8, "Password must be at least 8 characters")),
  user_type: z.enum(["admin", "ops"], {
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
  password?: string;
  user_type: "admin" | "ops";
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