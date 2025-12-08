/**
 * Database Types - Re-exports and utilities for type-safe Supabase operations
 * These types are derived from the auto-generated Supabase types
 */

import { Database } from "@/integrations/supabase/types";

// Table row types
export type PropertyRow = Database["public"]["Tables"]["properties"]["Row"];
export type PropertyInsertRow = Database["public"]["Tables"]["properties"]["Insert"];
export type PropertyUpdateRow = Database["public"]["Tables"]["properties"]["Update"];

export type PropertyLocationRow = Database["public"]["Tables"]["property_location"]["Row"];
export type PropertyLocationInsert = Database["public"]["Tables"]["property_location"]["Insert"];

export type PropertyCommunicationRow = Database["public"]["Tables"]["property_communication"]["Row"];
export type PropertyCommunicationInsert = Database["public"]["Tables"]["property_communication"]["Insert"];

export type PropertyAccessRow = Database["public"]["Tables"]["property_access"]["Row"];
export type PropertyAccessInsert = Database["public"]["Tables"]["property_access"]["Insert"];

export type PropertyExtrasRow = Database["public"]["Tables"]["property_extras"]["Row"];
export type PropertyExtrasInsert = Database["public"]["Tables"]["property_extras"]["Insert"];

export type UnitRow = Database["public"]["Tables"]["units"]["Row"];
export type UnitInsert = Database["public"]["Tables"]["units"]["Insert"];

export type PropertyImageRow = Database["public"]["Tables"]["property_images"]["Row"];
export type PropertyImageInsert = Database["public"]["Tables"]["property_images"]["Insert"];

export type AmenityRow = Database["public"]["Tables"]["amenities"]["Row"];
export type RuleRow = Database["public"]["Tables"]["rules"]["Row"];

export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

export type BookingRow = Database["public"]["Tables"]["property_bookings"]["Row"];
export type BookingInsert = Database["public"]["Tables"]["property_bookings"]["Insert"];

export type InvoiceRow = Database["public"]["Tables"]["invoices"]["Row"];
export type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];

export type GuestRow = Database["public"]["Tables"]["guests"]["Row"];
export type GuestInsert = Database["public"]["Tables"]["guests"]["Insert"];

export type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
export type ExpenseInsert = Database["public"]["Tables"]["expenses"]["Insert"];

export type JobRow = Database["public"]["Tables"]["jobs"]["Row"];
export type JobInsert = Database["public"]["Tables"]["jobs"]["Insert"];

export type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];

// Property with related data - for list views
export interface PropertyWithRelations extends PropertyRow {
  owner?: Pick<UserRow, "user_id" | "first_name" | "last_name" | "email"> | null;
  location?: Pick<PropertyLocationRow, "city" | "address"> | null;
  images?: Pick<PropertyImageRow, "image_id" | "image_url" | "image_title" | "is_primary">[];
}

// Property with full details - for detail/edit views
export interface PropertyFull extends PropertyRow {
  owner?: Pick<UserRow, "user_id" | "first_name" | "last_name" | "email"> | null;
  location?: PropertyLocationRow | null;
  communication?: PropertyCommunicationRow | null;
  access?: PropertyAccessRow | null;
  extras?: PropertyExtrasRow | null;
  units?: UnitRow[];
  images?: PropertyImageRow[];
  amenities?: AmenityRow[];
  rules?: RuleRow[];
}

// Property mutation input types
export interface PropertyCreateInput {
  // Main property fields
  owner_id: string;
  property_name?: string | null;
  property_type?: string | null;
  is_active?: boolean;
  is_booking?: boolean;
  is_pets_allowed?: boolean;
  capacity?: number | null;
  max_capacity?: number | null;
  num_bedrooms?: number | null;
  num_bathrooms?: number | null;
  num_half_bath?: number | null;
  num_wcs?: number | null;
  num_kitchens?: number | null;
  num_living_rooms?: number | null;
  size_sqf?: number | null;

  // Related data
  location?: Omit<PropertyLocationInsert, "property_id" | "location_id">;
  communication?: Omit<PropertyCommunicationInsert, "property_id" | "communication_id">;
  access?: Omit<PropertyAccessInsert, "property_id" | "access_id">;
  extras?: Omit<PropertyExtrasInsert, "property_id" | "extras_id">;
  units?: Omit<UnitInsert, "property_id" | "unit_id">[];
  amenity_ids?: string[];
  rule_ids?: string[];
  images?: { url: string; title?: string; is_primary?: boolean }[];
}

export interface PropertyUpdateInput extends Partial<PropertyCreateInput> {}

// Nested property amenity/rule types from Supabase joins
export interface PropertyAmenityJoin {
  amenities: AmenityRow;
}

export interface PropertyRuleJoin {
  rules: RuleRow;
}

// Generic Supabase response wrapper type
export interface SupabaseResponse<T> {
  data: T | null;
  error: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
  } | null;
}

// Utility type for extracting table names
export type TableName = keyof Database["public"]["Tables"];

// Type guard for checking Supabase errors
export function isSupabaseError(error: unknown): error is { message: string; code?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}
