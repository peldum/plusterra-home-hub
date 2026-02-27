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
      agent_fee_payments: {
        Row: {
          agent_id: string
          amount: number
          created_at: string
          id: string
          marked_by: string
          notes: string | null
          paid_at: string
          paid_month: string
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string
          id?: string
          marked_by: string
          notes?: string | null
          paid_at?: string
          paid_month: string
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          id?: string
          marked_by?: string
          notes?: string | null
          paid_at?: string
          paid_month?: string
        }
        Relationships: []
      }
      agent_goals: {
        Row: {
          agent_id: string
          commission_goal: number
          created_at: string
          id: string
          income_goal: number | null
          month: string
          personal_note: string | null
          rental_goal: number
          sales_goal: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          commission_goal?: number
          created_at?: string
          id?: string
          income_goal?: number | null
          month: string
          personal_note?: string | null
          rental_goal?: number
          sales_goal?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          commission_goal?: number
          created_at?: string
          id?: string
          income_goal?: number | null
          month?: string
          personal_note?: string | null
          rental_goal?: number
          sales_goal?: number
          updated_at?: string
        }
        Relationships: []
      }
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
      blog_posts: {
        Row: {
          author_name: string
          brochure_url: string | null
          content: string
          content_blocks: Json | null
          cover_image_url: string | null
          created_at: string
          created_by: string
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_name?: string
          brochure_url?: string | null
          content?: string
          content_blocks?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_name?: string
          brochure_url?: string | null
          content?: string
          content_blocks?: Json | null
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      brochure_downloads: {
        Row: {
          blog_post_id: string
          created_at: string
          id: string
          visitor_email: string | null
          visitor_name: string
          visitor_phone: string
        }
        Insert: {
          blog_post_id: string
          created_at?: string
          id?: string
          visitor_email?: string | null
          visitor_name: string
          visitor_phone: string
        }
        Update: {
          blog_post_id?: string
          created_at?: string
          id?: string
          visitor_email?: string | null
          visitor_name?: string
          visitor_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "brochure_downloads_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
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
      canon_payments: {
        Row: {
          agent_id: string
          base_amount: number
          created_at: string
          id: string
          interest_amount: number
          marked_by: string
          notes: string | null
          payment_date: string
          period: string
          total_amount: number
        }
        Insert: {
          agent_id: string
          base_amount?: number
          created_at?: string
          id?: string
          interest_amount?: number
          marked_by: string
          notes?: string | null
          payment_date?: string
          period: string
          total_amount?: number
        }
        Update: {
          agent_id?: string
          base_amount?: number
          created_at?: string
          id?: string
          interest_amount?: number
          marked_by?: string
          notes?: string | null
          payment_date?: string
          period?: string
          total_amount?: number
        }
        Relationships: []
      }
      canon_settings: {
        Row: {
          canon_base_amount: number
          daily_interest_amount: number
          due_day: number
          grace_period_days: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canon_base_amount?: number
          daily_interest_amount?: number
          due_day?: number
          grace_period_days?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canon_base_amount?: number
          daily_interest_amount?: number
          due_day?: number
          grace_period_days?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
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
      company_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      inventory_items: {
        Row: {
          category: string
          condition_delivery: string | null
          condition_return: string | null
          contract_id: string | null
          created_at: string
          created_by: string
          id: string
          item_name: string
          notes: string | null
          property_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          condition_delivery?: string | null
          condition_return?: string | null
          contract_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          item_name: string
          notes?: string | null
          property_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition_delivery?: string | null
          condition_return?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          item_name?: string
          notes?: string | null
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      key_movements: {
        Row: {
          agent_id: string | null
          created_at: string
          created_by: string
          direction: string
          external_company: string | null
          external_document: string | null
          external_name: string | null
          external_phone: string | null
          id: string
          motivo: string | null
          movement_type: string
          notes: string | null
          property_id: string
          work_type: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          created_by: string
          direction: string
          external_company?: string | null
          external_document?: string | null
          external_name?: string | null
          external_phone?: string | null
          id?: string
          motivo?: string | null
          movement_type: string
          notes?: string | null
          property_id: string
          work_type?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          created_by?: string
          direction?: string
          external_company?: string | null
          external_document?: string | null
          external_name?: string | null
          external_phone?: string | null
          id?: string
          motivo?: string | null
          movement_type?: string
          notes?: string | null
          property_id?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_movements_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "key_movements_property_id_fkey"
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
      pipeline_deals: {
        Row: {
          agent_id: string
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          contract_id: string | null
          created_at: string
          created_by: string
          estimated_commission: number | null
          follow_up_date: string | null
          id: string
          next_action_date: string | null
          next_step: string | null
          notes: string | null
          opportunity_type: string
          pipeline_type: string
          property_id: string | null
          property_title_snap: string | null
          reservation_deadline: string | null
          service_reason: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          contract_id?: string | null
          created_at?: string
          created_by: string
          estimated_commission?: number | null
          follow_up_date?: string | null
          id?: string
          next_action_date?: string | null
          next_step?: string | null
          notes?: string | null
          opportunity_type?: string
          pipeline_type?: string
          property_id?: string | null
          property_title_snap?: string | null
          reservation_deadline?: string | null
          service_reason?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          client_id?: string | null
          client_name?: string | null
          client_phone?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string
          estimated_commission?: number | null
          follow_up_date?: string | null
          id?: string
          next_action_date?: string | null
          next_step?: string | null
          notes?: string | null
          opportunity_type?: string
          pipeline_type?: string
          property_id?: string | null
          property_title_snap?: string | null
          reservation_deadline?: string | null
          service_reason?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_agent_profiles: {
        Row: {
          agent_id: string
          areas: string | null
          bio: string | null
          created_at: string
          id: string
          is_featured: boolean
          public_email: string | null
          public_name: string
          public_phone_whatsapp: string | null
          public_photo_url_webp: string | null
          show_in_portal: boolean
          updated_at: string
        }
        Insert: {
          agent_id: string
          areas?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          public_email?: string | null
          public_name?: string
          public_phone_whatsapp?: string | null
          public_photo_url_webp?: string | null
          show_in_portal?: boolean
          updated_at?: string
        }
        Update: {
          agent_id?: string
          areas?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          public_email?: string | null
          public_name?: string
          public_phone_whatsapp?: string | null
          public_photo_url_webp?: string | null
          show_in_portal?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      portal_banners: {
        Row: {
          created_at: string
          id: string
          image_url_webp: string
          is_active: boolean
          link_url: string | null
          order_index: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url_webp: string
          is_active?: boolean
          link_url?: string | null
          order_index?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url_webp?: string
          is_active?: boolean
          link_url?: string | null
          order_index?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      portal_leads: {
        Row: {
          captor_agent_id: string
          channel: string
          created_at: string
          email: string | null
          id: string
          last_action_at: string | null
          preferred_schedule: string | null
          property_id: string | null
          status: string
          visitor_message: string | null
          visitor_name: string
          visitor_phone: string
        }
        Insert: {
          captor_agent_id: string
          channel?: string
          created_at?: string
          email?: string | null
          id?: string
          last_action_at?: string | null
          preferred_schedule?: string | null
          property_id?: string | null
          status?: string
          visitor_message?: string | null
          visitor_name: string
          visitor_phone: string
        }
        Update: {
          captor_agent_id?: string
          channel?: string
          created_at?: string
          email?: string | null
          id?: string
          last_action_at?: string | null
          preferred_schedule?: string | null
          property_id?: string | null
          status?: string
          visitor_message?: string | null
          visitor_name?: string
          visitor_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_settings: {
        Row: {
          about_company_image_url: string | null
          about_company_text: string | null
          active_template: string
          blocks_config: Json
          blog_enabled: boolean
          company_address: string | null
          company_email: string | null
          company_phone: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          default_city: string
          default_lat: number | null
          default_lead_assignee_agent_id: string | null
          default_lng: number | null
          default_zoom: number
          facebook_url: string | null
          id: string
          instagram_url: string | null
          logo_url_webp: string | null
          maintenance_mode: boolean
          maintenance_whatsapp: string | null
          meta_description: string
          primary_color: string
          privacy_url: string | null
          secondary_color: string
          show_agents_section: boolean
          show_map: boolean
          site_title: string
          terms_url: string | null
          updated_at: string
        }
        Insert: {
          about_company_image_url?: string | null
          about_company_text?: string | null
          active_template?: string
          blocks_config?: Json
          blog_enabled?: boolean
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_city?: string
          default_lat?: number | null
          default_lead_assignee_agent_id?: string | null
          default_lng?: number | null
          default_zoom?: number
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url_webp?: string | null
          maintenance_mode?: boolean
          maintenance_whatsapp?: string | null
          meta_description?: string
          primary_color?: string
          privacy_url?: string | null
          secondary_color?: string
          show_agents_section?: boolean
          show_map?: boolean
          site_title?: string
          terms_url?: string | null
          updated_at?: string
        }
        Update: {
          about_company_image_url?: string | null
          about_company_text?: string | null
          active_template?: string
          blocks_config?: Json
          blog_enabled?: boolean
          company_address?: string | null
          company_email?: string | null
          company_phone?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          default_city?: string
          default_lat?: number | null
          default_lead_assignee_agent_id?: string | null
          default_lng?: number | null
          default_zoom?: number
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url_webp?: string | null
          maintenance_mode?: boolean
          maintenance_whatsapp?: string | null
          meta_description?: string
          primary_color?: string
          privacy_url?: string | null
          secondary_color?: string
          show_agents_section?: boolean
          show_map?: boolean
          site_title?: string
          terms_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          canon_dias_atraso: number
          canon_estado: string
          canon_interes_acumulado: number
          canon_monto_base: number
          canon_periodo_actual: string | null
          canon_total_adeudado: number
          created_at: string
          email: string
          full_name: string
          id: string
          last_paid_month: string | null
          monthly_fee: number | null
          payment_status: string
          phone: string | null
          plan_agente: string
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          canon_dias_atraso?: number
          canon_estado?: string
          canon_interes_acumulado?: number
          canon_monto_base?: number
          canon_periodo_actual?: string | null
          canon_total_adeudado?: number
          created_at?: string
          email: string
          full_name: string
          id: string
          last_paid_month?: string | null
          monthly_fee?: number | null
          payment_status?: string
          phone?: string | null
          plan_agente?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          canon_dias_atraso?: number
          canon_estado?: string
          canon_interes_acumulado?: number
          canon_monto_base?: number
          canon_periodo_actual?: string | null
          canon_total_adeudado?: number
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_paid_month?: string | null
          monthly_fee?: number | null
          payment_status?: string
          phone?: string | null
          plan_agente?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          amenities: Json | null
          area_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          captor_agent_id: string
          city: string | null
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_type"] | null
          description: string | null
          exact_location_enabled: boolean
          garage_details: string | null
          has_garage: boolean | null
          id: string
          is_featured: boolean
          is_published: boolean
          key_location: string
          management_fee_pct: number | null
          neighborhood: string | null
          nis_ande: string | null
          owner_id: string | null
          property_code: string
          property_type: Database["public"]["Enums"]["property_type"]
          public_description: string | null
          public_lat: number | null
          public_lng: number | null
          public_website_url: string | null
          published_at: string | null
          rental_period: Database["public"]["Enums"]["rental_period"] | null
          rental_price: number | null
          reservation_amount: number | null
          reservation_client_name: string | null
          reservation_confirmed_at: string | null
          reservation_confirmed_by: string | null
          reservation_expires_at: string | null
          reservation_request_amount: number | null
          reservation_request_client_name: string | null
          reservation_requested_at: string | null
          reservation_requested_by: string | null
          reserved_at: string | null
          reserved_by: string | null
          sale_price: number | null
          status: Database["public"]["Enums"]["property_status"]
          title: string
          tour_360_url: string | null
          unit_id: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          address?: string | null
          amenities?: Json | null
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captor_agent_id: string
          city?: string | null
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          description?: string | null
          exact_location_enabled?: boolean
          garage_details?: string | null
          has_garage?: boolean | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          key_location?: string
          management_fee_pct?: number | null
          neighborhood?: string | null
          nis_ande?: string | null
          owner_id?: string | null
          property_code: string
          property_type?: Database["public"]["Enums"]["property_type"]
          public_description?: string | null
          public_lat?: number | null
          public_lng?: number | null
          public_website_url?: string | null
          published_at?: string | null
          rental_period?: Database["public"]["Enums"]["rental_period"] | null
          rental_price?: number | null
          reservation_amount?: number | null
          reservation_client_name?: string | null
          reservation_confirmed_at?: string | null
          reservation_confirmed_by?: string | null
          reservation_expires_at?: string | null
          reservation_request_amount?: number | null
          reservation_request_client_name?: string | null
          reservation_requested_at?: string | null
          reservation_requested_by?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          sale_price?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          title: string
          tour_360_url?: string | null
          unit_id?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          address?: string | null
          amenities?: Json | null
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          captor_agent_id?: string
          city?: string | null
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_type"] | null
          description?: string | null
          exact_location_enabled?: boolean
          garage_details?: string | null
          has_garage?: boolean | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          key_location?: string
          management_fee_pct?: number | null
          neighborhood?: string | null
          nis_ande?: string | null
          owner_id?: string | null
          property_code?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          public_description?: string | null
          public_lat?: number | null
          public_lng?: number | null
          public_website_url?: string | null
          published_at?: string | null
          rental_period?: Database["public"]["Enums"]["rental_period"] | null
          rental_price?: number | null
          reservation_amount?: number | null
          reservation_client_name?: string | null
          reservation_confirmed_at?: string | null
          reservation_confirmed_by?: string | null
          reservation_expires_at?: string | null
          reservation_request_amount?: number | null
          reservation_request_client_name?: string | null
          reservation_requested_at?: string | null
          reservation_requested_by?: string | null
          reserved_at?: string | null
          reserved_by?: string | null
          sale_price?: number | null
          status?: Database["public"]["Enums"]["property_status"]
          title?: string
          tour_360_url?: string | null
          unit_id?: string | null
          updated_at?: string
          video_url?: string | null
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
      property_favorites: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          property_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          property_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          property_id?: string
        }
        Relationships: []
      }
      property_photos: {
        Row: {
          created_at: string
          id: string
          photo_url: string
          property_id: string
          storage_path: string
          thumbnail_path: string | null
          thumbnail_url: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_url: string
          property_id: string
          storage_path: string
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_url?: string
          property_id?: string
          storage_path?: string
          thumbnail_path?: string | null
          thumbnail_url?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_report_comments: {
        Row: {
          agent_id: string
          agent_name: string | null
          comment_date: string
          comment_text: string
          created_at: string
          id: string
          report_id: string
        }
        Insert: {
          agent_id: string
          agent_name?: string | null
          comment_date?: string
          comment_text: string
          created_at?: string
          id?: string
          report_id: string
        }
        Update: {
          agent_id?: string
          agent_name?: string | null
          comment_date?: string
          comment_text?: string
          created_at?: string
          id?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_report_comments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "property_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      property_reports: {
        Row: {
          adjustments: Json
          agent_id: string
          agent_recommendation: string | null
          created_at: string
          diffusion: Json
          final_comment: string | null
          id: string
          period: string
          property_id: string
          updated_at: string
        }
        Insert: {
          adjustments?: Json
          agent_id: string
          agent_recommendation?: string | null
          created_at?: string
          diffusion?: Json
          final_comment?: string | null
          id?: string
          period: string
          property_id: string
          updated_at?: string
        }
        Update: {
          adjustments?: Json
          agent_id?: string
          agent_recommendation?: string | null
          created_at?: string
          diffusion?: Json
          final_comment?: string | null
          id?: string
          period?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      receivables: {
        Row: {
          agent_id: string | null
          amount: number
          building_id: string | null
          client_id: string | null
          concept: string
          confirmed_by: string | null
          contract_id: string | null
          created_at: string
          created_by: string
          currency: string
          debtor_name: string | null
          debtor_role: string
          description: string | null
          descuento: number
          due_date: string
          id: string
          mora_automatica: number
          mora_negociada: number
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_detail: Json | null
          payment_id: string | null
          property_id: string | null
          source_type: string
          status: string
          total_cobrado: number | null
          unit_code: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          amount?: number
          building_id?: string | null
          client_id?: string | null
          concept: string
          confirmed_by?: string | null
          contract_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          debtor_name?: string | null
          debtor_role?: string
          description?: string | null
          descuento?: number
          due_date: string
          id?: string
          mora_automatica?: number
          mora_negociada?: number
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_detail?: Json | null
          payment_id?: string | null
          property_id?: string | null
          source_type?: string
          status?: string
          total_cobrado?: number | null
          unit_code?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          building_id?: string | null
          client_id?: string | null
          concept?: string
          confirmed_by?: string | null
          contract_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          debtor_name?: string | null
          debtor_role?: string
          description?: string | null
          descuento?: number
          due_date?: string
          id?: string
          mora_automatica?: number
          mora_negociada?: number
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_detail?: Json | null
          payment_id?: string | null
          property_id?: string | null
          source_type?: string
          status?: string
          total_cobrado?: number | null
          unit_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receivables_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receivables_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_history: {
        Row: {
          agent_destination_id: string | null
          agent_destination_name: string | null
          agent_origin_id: string | null
          agent_origin_name: string | null
          created_at: string
          event_type: string
          executed_by: string
          executed_by_name: string | null
          executed_by_role: string | null
          id: string
          property_id: string
          reason: string | null
          snapshot_after: Json | null
          snapshot_before: Json | null
        }
        Insert: {
          agent_destination_id?: string | null
          agent_destination_name?: string | null
          agent_origin_id?: string | null
          agent_origin_name?: string | null
          created_at?: string
          event_type: string
          executed_by: string
          executed_by_name?: string | null
          executed_by_role?: string | null
          id?: string
          property_id: string
          reason?: string | null
          snapshot_after?: Json | null
          snapshot_before?: Json | null
        }
        Update: {
          agent_destination_id?: string | null
          agent_destination_name?: string | null
          agent_origin_id?: string | null
          agent_origin_name?: string | null
          created_at?: string
          event_type?: string
          executed_by?: string
          executed_by_name?: string | null
          executed_by_role?: string | null
          id?: string
          property_id?: string
          reason?: string | null
          snapshot_after?: Json | null
          snapshot_before?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "reservation_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_collection_records: {
        Row: {
          building_id: string
          created_at: string
          id: string
          observation: string | null
          payment_status: string
          period: string
          unit_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          observation?: string | null
          payment_status?: string
          period: string
          unit_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          observation?: string | null
          payment_status?: string
          period?: string
          unit_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_collection_records_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_collection_records_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
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
      generate_monthly_receivables: {
        Args: { target_period?: string }
        Returns: number
      }
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
      is_secretaria: { Args: never; Returns: boolean }
      recalculate_canon_states: { Args: never; Returns: undefined }
      update_contract_statuses: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "agent" | "accounting" | "secretaria"
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
        | "reservation_request"
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
      app_role: ["superadmin", "admin", "agent", "accounting", "secretaria"],
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
        "reservation_request",
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
