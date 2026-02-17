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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          created_at: string
          due_date: string | null
          id: string
          is_read: boolean | null
          message: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          due_date?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          target_id: string | null
          target_table: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_table?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      buildings: {
        Row: {
          address: string
          category: string | null
          city: string | null
          created_at: string
          created_by: string
          floors: number | null
          id: string
          name: string
          notes: string | null
          total_units: number | null
          updated_at: string
        }
        Insert: {
          address: string
          category?: string | null
          city?: string | null
          created_at?: string
          created_by: string
          floors?: number | null
          id?: string
          name: string
          notes?: string | null
          total_units?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          category?: string | null
          city?: string | null
          created_at?: string
          created_by?: string
          floors?: number | null
          id?: string
          name?: string
          notes?: string | null
          total_units?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          client_type: string | null
          created_at: string
          created_by: string
          document_number: string | null
          document_type: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_type?: string | null
          created_at?: string
          created_by: string
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_type?: string | null
          created_at?: string
          created_by?: string
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          agent_id: string
          agent_role: string
          company_amount: number
          company_pct: number
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_type"] | null
          deal_id: string
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          paid_date: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          agent_role: string
          company_amount: number
          company_pct?: number
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          deal_id: string
          gross_amount: number
          id?: string
          net_amount: number
          notes?: string | null
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          agent_role?: string
          company_amount?: number
          company_pct?: number
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          deal_id?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          paid_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_id: string | null
          contract_data: Json | null
          contract_type: Database["public"]["Enums"]["deal_type"]
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_type"] | null
          deal_id: string | null
          deposit_amount: number | null
          end_date: string | null
          expenses_included: boolean | null
          garage_details: string | null
          has_garage: boolean | null
          id: string
          inventory_notes: string | null
          landlord_document: string | null
          landlord_name: string | null
          monthly_rent: number | null
          nis_ande: string | null
          notes: string | null
          periodicity: string | null
          previous_contract_id: string | null
          property_address: string | null
          property_id: string
          renewal_terms: string | null
          responsible_agent_id: string | null
          services_included: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"] | null
          tenant_document: string | null
          tenant_name: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          contract_data?: Json | null
          contract_type: Database["public"]["Enums"]["deal_type"]
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          deal_id?: string | null
          deposit_amount?: number | null
          end_date?: string | null
          expenses_included?: boolean | null
          garage_details?: string | null
          has_garage?: boolean | null
          id?: string
          inventory_notes?: string | null
          landlord_document?: string | null
          landlord_name?: string | null
          monthly_rent?: number | null
          nis_ande?: string | null
          notes?: string | null
          periodicity?: string | null
          previous_contract_id?: string | null
          property_address?: string | null
          property_id: string
          renewal_terms?: string | null
          responsible_agent_id?: string | null
          services_included?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"] | null
          tenant_document?: string | null
          tenant_name?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          contract_data?: Json | null
          contract_type?: Database["public"]["Enums"]["deal_type"]
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          deal_id?: string | null
          deposit_amount?: number | null
          end_date?: string | null
          expenses_included?: boolean | null
          garage_details?: string | null
          has_garage?: boolean | null
          id?: string
          inventory_notes?: string | null
          landlord_document?: string | null
          landlord_name?: string | null
          monthly_rent?: number | null
          nis_ande?: string | null
          notes?: string | null
          periodicity?: string | null
          previous_contract_id?: string | null
          property_address?: string | null
          property_id?: string
          renewal_terms?: string | null
          responsible_agent_id?: string | null
          services_included?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"] | null
          tenant_document?: string | null
          tenant_name?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_previous_contract_id_fkey"
            columns: ["previous_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          amount: number
          captor_agent_id: string
          client_id: string
          closer_agent_id: string | null
          closing_date: string | null
          commission_total: number | null
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_type"] | null
          deal_date: string | null
          deal_type: Database["public"]["Enums"]["deal_type"]
          deposit_amount: number | null
          end_date: string | null
          id: string
          notes: string | null
          property_id: string
          start_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          captor_agent_id: string
          client_id: string
          closer_agent_id?: string | null
          closing_date?: string | null
          commission_total?: number | null
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          deal_date?: string | null
          deal_type: Database["public"]["Enums"]["deal_type"]
          deposit_amount?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          property_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          captor_agent_id?: string
          client_id?: string
          closer_agent_id?: string | null
          closing_date?: string | null
          commission_total?: number | null
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          deal_date?: string | null
          deal_type?: Database["public"]["Enums"]["deal_type"]
          deposit_amount?: number | null
          end_date?: string | null
          id?: string
          notes?: string | null
          property_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          actual_cost: number | null
          completed_date: string | null
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_type"] | null
          description: string
          estimated_cost: number | null
          id: string
          notes: string | null
          priority: string | null
          property_id: string
          provider_id: string | null
          requested_by: string
          scheduled_date: string | null
          status: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          completed_date?: string | null
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          description: string
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          property_id: string
          provider_id?: string | null
          requested_by: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          completed_date?: string | null
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          description?: string
          estimated_cost?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          property_id?: string
          provider_id?: string | null
          requested_by?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          document_number: string | null
          document_type: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          document_number?: string | null
          document_type?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          commission_id: string | null
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_type"] | null
          deal_id: string | null
          description: string
          due_date: string | null
          id: string
          notes: string | null
          owner_id: string | null
          payment_date: string
          payment_method: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          property_id: string | null
          reference_number: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          client_id?: string | null
          commission_id?: string | null
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          deal_id?: string | null
          description: string
          due_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          property_id?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          commission_id?: string | null
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          deal_id?: string | null
          description?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          property_id?: string | null
          reference_number?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          area_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captor_agent_id: string
          city: string | null
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_type"] | null
          description: string | null
          garage_details: string | null
          has_garage: boolean | null
          id: string
          management_fee_pct: number | null
          neighborhood: string | null
          nis_ande: string | null
          owner_id: string | null
          property_code: string
          property_type: Database["public"]["Enums"]["property_type"]
          rental_period: Database["public"]["Enums"]["rental_period"] | null
          rental_price: number | null
          sale_price: number | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captor_agent_id: string
          city?: string | null
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          description?: string | null
          garage_details?: string | null
          has_garage?: boolean | null
          id?: string
          management_fee_pct?: number | null
          neighborhood?: string | null
          nis_ande?: string | null
          owner_id?: string | null
          property_code: string
          property_type?: Database["public"]["Enums"]["property_type"]
          rental_period?: Database["public"]["Enums"]["rental_period"] | null
          rental_price?: number | null
          sale_price?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captor_agent_id?: string
          city?: string | null
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          description?: string | null
          garage_details?: string | null
          has_garage?: boolean | null
          id?: string
          management_fee_pct?: number | null
          neighborhood?: string | null
          nis_ande?: string | null
          owner_id?: string | null
          property_code?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          rental_period?: Database["public"]["Enums"]["rental_period"] | null
          rental_price?: number | null
          sale_price?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          address: string | null
          category: string
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          rating: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          category: string
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      unit_owners: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          ownership_percentage: number | null
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          ownership_percentage?: number | null
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          ownership_percentage?: number | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_owners_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_owners_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          area_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          building_id: string
          created_at: string
          created_by: string
          floor: number | null
          id: string
          notes: string | null
          unit_code: string
          updated_at: string
        }
        Insert: {
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_id: string
          created_at?: string
          created_by: string
          floor?: number | null
          id?: string
          notes?: string | null
          unit_code: string
          updated_at?: string
        }
        Update: {
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_id?: string
          created_at?: string
          created_by?: string
          floor?: number | null
          id?: string
          notes?: string | null
          unit_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_contract_alerts: { Args: never; Returns: undefined }
      generate_property_code: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_accounting: { Args: never; Returns: boolean }
      is_admin_or_superadmin: { Args: never; Returns: boolean }
      is_agent: { Args: never; Returns: boolean }
      update_contract_statuses: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "agent" | "accounting"
      contract_status:
        | "draft"
        | "active"
        | "expired"
        | "cancelled"
        | "renewed"
        | "near_expiration"
        | "terminated"
      currency_type: "PYG" | "USD"
      deal_type:
        | "rental"
        | "temporary_rental"
        | "sale"
        | "property_management"
        | "exclusivity"
      maintenance_status: "open" | "in_progress" | "completed" | "cancelled"
      payment_status: "pending" | "paid" | "overdue" | "cancelled"
      payment_type: "income" | "expense"
      property_status:
        | "draft"
        | "available"
        | "reserved"
        | "rented"
        | "sold"
        | "archived"
      property_type:
        | "apartment"
        | "house"
        | "land"
        | "office"
        | "commercial"
        | "other"
      rental_period: "daily" | "weekly" | "monthly"
      user_status: "active" | "suspended" | "blocked"
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
    Enums: {
      app_role: ["superadmin", "admin", "agent", "accounting"],
      contract_status: [
        "draft",
        "active",
        "expired",
        "cancelled",
        "renewed",
        "near_expiration",
        "terminated",
      ],
      currency_type: ["PYG", "USD"],
      deal_type: [
        "rental",
        "temporary_rental",
        "sale",
        "property_management",
        "exclusivity",
      ],
      maintenance_status: ["open", "in_progress", "completed", "cancelled"],
      payment_status: ["pending", "paid", "overdue", "cancelled"],
      payment_type: ["income", "expense"],
      property_status: [
        "draft",
        "available",
        "reserved",
        "rented",
        "sold",
        "archived",
      ],
      property_type: [
        "apartment",
        "house",
        "land",
        "office",
        "commercial",
        "other",
      ],
      rental_period: ["daily", "weekly", "monthly"],
      user_status: ["active", "suspended", "blocked"],
    },
  },
} as const
