import { z } from "zod";

export const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  user_type: z.enum(["admin", "ops"], {
    required_error: "Please select a user type",
  }),
  is_active: z.boolean().default(true),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  date_of_birth: z.string().optional(),
  company: z.string().optional(),
  cellphone_primary: z.string().optional(),
  cellphone_usa: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().default("USA"),
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

// Insert types (for creating new records)
export type UserInsert = {
  email: string;
  password: string;
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
};

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