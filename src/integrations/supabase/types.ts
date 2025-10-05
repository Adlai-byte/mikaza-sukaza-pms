export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action_details: Json | null
          action_type: string
          created_at: string
          log_id: string
          performed_by: string | null
          user_id: string | null
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          created_at?: string
          log_id?: string
          performed_by?: string | null
          user_id?: string | null
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          created_at?: string
          log_id?: string
          performed_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      amenities: {
        Row: {
          amenity_id: string
          amenity_name: string
          created_at: string
        }
        Insert: {
          amenity_id?: string
          amenity_name: string
          created_at?: string
        }
        Update: {
          amenity_id?: string
          amenity_name?: string
          created_at?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder: string
          account_number: string
          bank_account_id: string
          bank_name: string
          created_at: string | null
          ein: string | null
          observations: string | null
          routing_number: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_holder: string
          account_number: string
          bank_account_id?: string
          bank_name: string
          created_at?: string | null
          ein?: string | null
          observations?: string | null
          routing_number: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          bank_account_id?: string
          bank_name?: string
          created_at?: string | null
          ein?: string | null
          observations?: string | null
          routing_number?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          card_number: string
          card_type: string
          cardholder_name: string
          created_at: string | null
          credit_card_id: string
          due_date: string
          security_code: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_number: string
          card_type: string
          cardholder_name: string
          created_at?: string | null
          credit_card_id?: string
          due_date: string
          security_code: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_number?: string
          card_type?: string
          cardholder_name?: string
          created_at?: string | null
          credit_card_id?: string
          due_date?: string
          security_code?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean
          last_name?: string | null
          updated_at?: string
          user_id: string
          user_type?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          capacity: number | null
          created_at: string
          is_active: boolean
          is_booking: boolean
          is_pets_allowed: boolean
          max_capacity: number | null
          num_bathrooms: number | null
          num_bedrooms: number | null
          num_half_bath: number | null
          num_kitchens: number | null
          num_living_rooms: number | null
          num_wcs: number | null
          owner_id: string
          property_id: string
          property_name: string | null
          property_type: string
          size_sqf: number | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          is_active?: boolean
          is_booking?: boolean
          is_pets_allowed?: boolean
          max_capacity?: number | null
          num_bathrooms?: number | null
          num_bedrooms?: number | null
          num_half_bath?: number | null
          num_kitchens?: number | null
          num_living_rooms?: number | null
          num_wcs?: number | null
          owner_id: string
          property_id?: string
          property_name?: string | null
          property_type: string
          size_sqf?: number | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          is_active?: boolean
          is_booking?: boolean
          is_pets_allowed?: boolean
          max_capacity?: number | null
          num_bathrooms?: number | null
          num_bedrooms?: number | null
          num_half_bath?: number | null
          num_kitchens?: number | null
          num_living_rooms?: number | null
          num_wcs?: number | null
          owner_id?: string
          property_id?: string
          property_name?: string | null
          property_type?: string
          size_sqf?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      property_access: {
        Row: {
          access_id: string
          alarm_passcode: string | null
          created_at: string
          door_lock_password: string | null
          gate_code: string | null
          property_id: string
          updated_at: string
        }
        Insert: {
          access_id?: string
          alarm_passcode?: string | null
          created_at?: string
          door_lock_password?: string | null
          gate_code?: string | null
          property_id: string
          updated_at?: string
        }
        Update: {
          access_id?: string
          alarm_passcode?: string | null
          created_at?: string
          door_lock_password?: string | null
          gate_code?: string | null
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_access_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_amenities: {
        Row: {
          amenity_id: string
          created_at: string
          property_id: string
        }
        Insert: {
          amenity_id: string
          created_at?: string
          property_id: string
        }
        Update: {
          amenity_id?: string
          created_at?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["amenity_id"]
          },
          {
            foreignKeyName: "property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_booking_rates: {
        Row: {
          cash_payment: boolean | null
          created_at: string
          credit_card_payment: boolean | null
          debit_card_payment: boolean | null
          deposit_payment: boolean | null
          extra_guest_price: number | null
          high_season_rate: number | null
          holiday_rate: number | null
          low_season_rate: number | null
          medium_season_rate: number | null
          pm_commission: number | null
          property_id: string
          rate_id: string
          stripe_payment: boolean | null
          updated_at: string
        }
        Insert: {
          cash_payment?: boolean | null
          created_at?: string
          credit_card_payment?: boolean | null
          debit_card_payment?: boolean | null
          deposit_payment?: boolean | null
          extra_guest_price?: number | null
          high_season_rate?: number | null
          holiday_rate?: number | null
          low_season_rate?: number | null
          medium_season_rate?: number | null
          pm_commission?: number | null
          property_id: string
          rate_id?: string
          stripe_payment?: boolean | null
          updated_at?: string
        }
        Update: {
          cash_payment?: boolean | null
          created_at?: string
          credit_card_payment?: boolean | null
          debit_card_payment?: boolean | null
          deposit_payment?: boolean | null
          extra_guest_price?: number | null
          high_season_rate?: number | null
          holiday_rate?: number | null
          low_season_rate?: number | null
          medium_season_rate?: number | null
          pm_commission?: number | null
          property_id?: string
          rate_id?: string
          stripe_payment?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      property_bookings: {
        Row: {
          booking_id: string
          booking_status: string | null
          check_in_date: string
          check_out_date: string
          created_at: string
          deposit_amount: number | null
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          number_of_guests: number | null
          payment_method: string | null
          property_id: string
          special_requests: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          booking_id?: string
          booking_status?: string | null
          check_in_date: string
          check_out_date: string
          created_at?: string
          deposit_amount?: number | null
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          number_of_guests?: number | null
          payment_method?: string | null
          property_id: string
          special_requests?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          booking_status?: string | null
          check_in_date?: string
          check_out_date?: string
          created_at?: string
          deposit_amount?: number | null
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          number_of_guests?: number | null
          payment_method?: string | null
          property_id?: string
          special_requests?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      property_checklists: {
        Row: {
          assigned_to: string | null
          checklist_id: string
          checklist_name: string
          created_at: string
          description: string | null
          due_date: string | null
          is_completed: boolean | null
          priority: string | null
          property_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          checklist_id?: string
          checklist_name: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          is_completed?: boolean | null
          priority?: string | null
          property_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          checklist_id?: string
          checklist_name?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          is_completed?: boolean | null
          priority?: string | null
          property_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_communication: {
        Row: {
          comm_id: string
          created_at: string
          phone_number: string | null
          property_id: string
          updated_at: string
          wifi_name: string | null
          wifi_password: string | null
        }
        Insert: {
          comm_id?: string
          created_at?: string
          phone_number?: string | null
          property_id: string
          updated_at?: string
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Update: {
          comm_id?: string
          created_at?: string
          phone_number?: string | null
          property_id?: string
          updated_at?: string
          wifi_name?: string | null
          wifi_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_communication_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_extras: {
        Row: {
          created_at: string
          extras_id: string
          front_desk: string | null
          garage_number: string | null
          mailing_box: string | null
          pool_access_code: string | null
          property_id: string
          storage_code: string | null
          storage_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          extras_id?: string
          front_desk?: string | null
          garage_number?: string | null
          mailing_box?: string | null
          pool_access_code?: string | null
          property_id: string
          storage_code?: string | null
          storage_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          extras_id?: string
          front_desk?: string | null
          garage_number?: string | null
          mailing_box?: string | null
          pool_access_code?: string | null
          property_id?: string
          storage_code?: string | null
          storage_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_extras_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_financial_entries: {
        Row: {
          balance: number | null
          created_at: string
          credit: number | null
          debit: number | null
          description: string
          entry_date: string
          entry_id: string
          entry_type: string | null
          property_id: string
          scheduled_balance: number | null
          updated_at: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description: string
          entry_date: string
          entry_id?: string
          entry_type?: string | null
          property_id: string
          scheduled_balance?: number | null
          updated_at?: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string
          entry_date?: string
          entry_id?: string
          entry_type?: string | null
          property_id?: string
          scheduled_balance?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      property_images: {
        Row: {
          created_at: string
          image_id: string
          image_title: string | null
          image_url: string
          is_primary: boolean | null
          property_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          image_id?: string
          image_title?: string | null
          image_url: string
          is_primary?: boolean | null
          property_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          image_id?: string
          image_title?: string | null
          image_url?: string
          is_primary?: boolean | null
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_location: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          latitude: number | null
          location_id: string
          longitude: number | null
          postal_code: string | null
          property_id: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          latitude?: number | null
          location_id?: string
          longitude?: number | null
          postal_code?: string | null
          property_id: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          latitude?: number | null
          location_id?: string
          longitude?: number | null
          postal_code?: string | null
          property_id?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_location_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["property_id"]
          },
        ]
      }
      property_notes: {
        Row: {
          created_at: string
          is_pinned: boolean | null
          note_content: string
          note_id: string
          note_title: string | null
          note_type: string | null
          property_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_pinned?: boolean | null
          note_content: string
          note_id?: string
          note_title?: string | null
          note_type?: string | null
          property_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_pinned?: boolean | null
          note_content?: string
          note_id?: string
          note_title?: string | null
          note_type?: string | null
          property_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_providers: {
        Row: {
          account_number: string | null
          billing_name: string | null
          created_at: string
          observations: string | null
          password: string | null
          phone_number: string | null
          property_id: string
          provider_id: string
          provider_name: string
          provider_type: string | null
          updated_at: string
          username: string | null
          website: string | null
        }
        Insert: {
          account_number?: string | null
          billing_name?: string | null
          created_at?: string
          observations?: string | null
          password?: string | null
          phone_number?: string | null
          property_id: string
          provider_id?: string
          provider_name: string
          provider_type?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Update: {
          account_number?: string | null
          billing_name?: string | null
          created_at?: string
          observations?: string | null
          password?: string | null
          phone_number?: string | null
          property_id?: string
          provider_id?: string
          provider_name?: string
          provider_type?: string | null
          updated_at?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      property_qr_codes: {
        Row: {
          created_at: string
          description: string | null
          is_active: boolean | null
          property_id: string
          qr_code_data: string
          qr_code_image_url: string | null
          qr_id: string
          qr_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_active?: boolean | null
          property_id: string
          qr_code_data: string
          qr_code_image_url?: string | null
          qr_id?: string
          qr_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          is_active?: boolean | null
          property_id?: string
          qr_code_data?: string
          qr_code_image_url?: string | null
          qr_id?: string
          qr_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      property_rules: {
        Row: {
          created_at: string
          property_id: string
          rule_id: string
        }
        Insert: {
          created_at?: string
          property_id: string
          rule_id: string
        }
        Update: {
          created_at?: string
          property_id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["property_id"]
          },
          {
            foreignKeyName: "property_rules_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "rules"
            referencedColumns: ["rule_id"]
          },
        ]
      }
      property_vehicles: {
        Row: {
          color: string | null
          created_at: string
          insurance_info: string | null
          license_plate: string | null
          make: string | null
          model: string | null
          owner_name: string | null
          property_id: string
          registration_info: string | null
          updated_at: string
          vehicle_id: string
          vin: string | null
          year: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          insurance_info?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          owner_name?: string | null
          property_id: string
          registration_info?: string | null
          updated_at?: string
          vehicle_id?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          insurance_info?: string | null
          license_plate?: string | null
          make?: string | null
          model?: string | null
          owner_name?: string | null
          property_id?: string
          registration_info?: string | null
          updated_at?: string
          vehicle_id?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
      rules: {
        Row: {
          created_at: string
          rule_id: string
          rule_name: string
        }
        Insert: {
          created_at?: string
          rule_id?: string
          rule_name: string
        }
        Update: {
          created_at?: string
          rule_id?: string
          rule_name?: string
        }
        Relationships: []
      }
      units: {
        Row: {
          created_at: string
          folio: string | null
          license_number: string | null
          property_id: string
          property_name: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          folio?: string | null
          license_number?: string | null
          property_id: string
          property_name?: string | null
          unit_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          folio?: string | null
          license_number?: string | null
          property_id?: string
          property_name?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["property_id"]
          },
        ]
      }
      users: {
        Row: {
          address: string | null
          cellphone_primary: string | null
          cellphone_usa: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          first_name: string
          is_active: boolean | null
          last_name: string
          password: string
          photo_url: string | null
          relationship_to_main_owner: string | null
          state: string | null
          updated_at: string | null
          user_id: string
          user_type: string
          whatsapp: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          cellphone_primary?: string | null
          cellphone_usa?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          first_name: string
          is_active?: boolean | null
          last_name: string
          password: string
          photo_url?: string | null
          relationship_to_main_owner?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
          user_type: string
          whatsapp?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          cellphone_primary?: string | null
          cellphone_usa?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          first_name?: string
          is_active?: boolean | null
          last_name?: string
          password?: string
          photo_url?: string | null
          relationship_to_main_owner?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
          user_type?: string
          whatsapp?: string | null
          zip?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
