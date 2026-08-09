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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          accent_color: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          accent_color?: string | null
          description?: string | null
          icon?: string | null
          id: string
          name: string
          slug: string
        }
        Update: {
          accent_color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      commission_settings: {
        Row: {
          default_rate: number
          id: string
          updated_at: string
        }
        Insert: {
          default_rate?: number
          id?: string
          updated_at?: string
        }
        Update: {
          default_rate?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          city: string
          commune: string | null
          country: string
          created_at: string
          customer_profile_id: string
          id: string
          is_default: boolean
          label: string
          landmark: string | null
          line1: string
          line2: string | null
          phone: string
          postal_code: string | null
          recipient_name: string
          region: string
          zone: string | null
        }
        Insert: {
          city: string
          commune?: string | null
          country?: string
          created_at?: string
          customer_profile_id: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          line1: string
          line2?: string | null
          phone: string
          postal_code?: string | null
          recipient_name: string
          region: string
          zone?: string | null
        }
        Update: {
          city?: string
          commune?: string | null
          country?: string
          created_at?: string
          customer_profile_id?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          line1?: string
          line2?: string | null
          phone?: string
          postal_code?: string | null
          recipient_name?: string
          region?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_assignments: {
        Row: {
          assigned_at: string
          completed_at: string | null
          courier_name: string
          courier_phone: string
          id: string
          order_id: string
          picked_up_at: string | null
          status: string
          zone_id: string | null
        }
        Insert: {
          assigned_at?: string
          completed_at?: string | null
          courier_name: string
          courier_phone: string
          id?: string
          order_id: string
          picked_up_at?: string | null
          status?: string
          zone_id?: string | null
        }
        Update: {
          assigned_at?: string
          completed_at?: string | null
          courier_name?: string
          courier_phone?: string
          id?: string
          order_id?: string
          picked_up_at?: string | null
          status?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "delivery_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_zones: {
        Row: {
          active: boolean
          base_fee: number
          city: string
          country: string
          created_at: string
          currency: string
          estimated_days: number
          id: string
          name: string
          region: string
        }
        Insert: {
          active?: boolean
          base_fee?: number
          city: string
          country: string
          created_at?: string
          currency?: string
          estimated_days?: number
          id: string
          name: string
          region: string
        }
        Update: {
          active?: boolean
          base_fee?: number
          city?: string
          country?: string
          created_at?: string
          currency?: string
          estimated_days?: number
          id?: string
          name?: string
          region?: string
        }
        Relationships: []
      }
      dispute_evidence: {
        Row: {
          author_name: string
          author_type: string
          created_at: string
          dispute_id: string
          file_name: string | null
          id: string
          image_preview_url: string | null
          notes: string
          title: string
        }
        Insert: {
          author_name: string
          author_type: string
          created_at?: string
          dispute_id: string
          file_name?: string | null
          id?: string
          image_preview_url?: string | null
          notes: string
          title: string
        }
        Update: {
          author_name?: string
          author_type?: string
          created_at?: string
          dispute_id?: string
          file_name?: string | null
          id?: string
          image_preview_url?: string | null
          notes?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          customer_profile_id: string
          id: string
          order_id: string
          reason: string
          requested_resolution: string
          status: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          customer_profile_id: string
          id?: string
          order_id: string
          reason: string
          requested_resolution: string
          status?: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          customer_profile_id?: string
          id?: string
          order_id?: string
          reason?: string
          requested_resolution?: string
          status?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking_events: {
        Row: {
          created_at: string
          id: string
          label: string
          location: string | null
          message: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          location?: string | null
          message: string
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          location?: string | null
          message?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          currency: string
          customer_profile_id: string
          delivery_city: string | null
          delivery_fee: number
          estimated_delivery_at: string | null
          id: string
          marked_for_review: boolean
          placed_at: string
          refund_issued: boolean
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          total: number
          tracking_number: string | null
        }
        Insert: {
          currency?: string
          customer_profile_id: string
          delivery_city?: string | null
          delivery_fee?: number
          estimated_delivery_at?: string | null
          id: string
          marked_for_review?: boolean
          placed_at?: string
          refund_issued?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          total: number
          tracking_number?: string | null
        }
        Update: {
          currency?: string
          customer_profile_id?: string
          delivery_city?: string | null
          delivery_fee?: number
          estimated_delivery_at?: string | null
          id?: string
          marked_for_review?: boolean
          placed_at?: string
          refund_issued?: boolean
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          subtotal?: number
          total?: number
          tracking_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          account_label: string
          amount: number
          currency: string
          id: string
          method: string
          requested_at: string
          status: string
          store_id: string
        }
        Insert: {
          account_label: string
          amount: number
          currency?: string
          id?: string
          method: string
          requested_at?: string
          status?: string
          store_id: string
        }
        Update: {
          account_label?: string
          amount?: number
          currency?: string
          id?: string
          method?: string
          requested_at?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          body: string
          created_at: string
          customer_profile_id: string
          helpful_count: number
          id: string
          order_id: string | null
          product_id: string
          rating: number
          status: string
          title: string
          vendor_reply: string | null
        }
        Insert: {
          body: string
          created_at?: string
          customer_profile_id: string
          helpful_count?: number
          id?: string
          order_id?: string | null
          product_id: string
          rating: number
          status?: string
          title: string
          vendor_reply?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          customer_profile_id?: string
          helpful_count?: number
          id?: string
          order_id?: string | null
          product_id?: string
          rating?: number
          status?: string
          title?: string
          vendor_reply?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string
          compare_at_price: number | null
          currency: string
          description: string | null
          id: string
          image: string | null
          is_featured: boolean
          is_local_made: boolean
          is_new_arrival: boolean
          is_recommended: boolean
          is_trending: boolean
          metadata: Json
          name: string
          price: number
          rating: number
          review_count: number
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          store_id: string
        }
        Insert: {
          brand?: string | null
          category_id: string
          compare_at_price?: number | null
          currency?: string
          description?: string | null
          id: string
          image?: string | null
          is_featured?: boolean
          is_local_made?: boolean
          is_new_arrival?: boolean
          is_recommended?: boolean
          is_trending?: boolean
          metadata?: Json
          name: string
          price: number
          rating?: number
          review_count?: number
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          store_id: string
        }
        Update: {
          brand?: string | null
          category_id?: string
          compare_at_price?: number | null
          currency?: string
          description?: string | null
          id?: string
          image?: string | null
          is_featured?: boolean
          is_local_made?: boolean
          is_new_arrival?: boolean
          is_recommended?: boolean
          is_trending?: boolean
          metadata?: Json
          name?: string
          price?: number
          rating?: number
          review_count?: number
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          preferred_language: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          phone?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      proof_of_deliveries: {
        Row: {
          assignment_id: string | null
          delivered_at: string
          id: string
          method: string
          note: string | null
          order_id: string
          recipient_name: string
        }
        Insert: {
          assignment_id?: string | null
          delivered_at?: string
          id?: string
          method?: string
          note?: string | null
          order_id: string
          recipient_name: string
        }
        Update: {
          assignment_id?: string | null
          delivered_at?: string
          id?: string
          method?: string
          note?: string | null
          order_id?: string
          recipient_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_deliveries_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "delivery_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proof_of_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_profile_id: string
          id: string
          order_id: string
          reason: string
          status: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_profile_id: string
          id?: string
          order_id: string
          reason: string
          status?: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_profile_id?: string
          id?: string
          order_id?: string
          reason?: string
          status?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reviews: {
        Row: {
          body: string
          created_at: string
          customer_profile_id: string
          id: string
          order_id: string | null
          rating: number
          status: string
          store_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          customer_profile_id: string
          id?: string
          order_id?: string | null
          rating: number
          status?: string
          store_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          customer_profile_id?: string
          id?: string
          order_id?: string | null
          rating?: number
          status?: string
          store_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_reviews_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          banner_color: string | null
          city: string | null
          country: string | null
          description: string | null
          id: string
          logo: string | null
          name: string
          product_count: number
          rating: number
          review_count: number
          settings: Json
          slug: string
          vendor_id: string
          verified: boolean
        }
        Insert: {
          banner_color?: string | null
          city?: string | null
          country?: string | null
          description?: string | null
          id: string
          logo?: string | null
          name: string
          product_count?: number
          rating?: number
          review_count?: number
          settings?: Json
          slug: string
          vendor_id: string
          verified?: boolean
        }
        Update: {
          banner_color?: string | null
          city?: string | null
          country?: string | null
          description?: string | null
          id?: string
          logo?: string | null
          name?: string
          product_count?: number
          rating?: number
          review_count?: number
          settings?: Json
          slug?: string
          vendor_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "stores_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          author_name: string
          author_type: string
          body: string
          created_at: string
          id: string
          ticket_id: string
          visibility: string
        }
        Insert: {
          author_name: string
          author_type: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
          visibility?: string
        }
        Update: {
          author_name?: string
          author_type?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_resolution: string | null
          admin_resolved_at: string | null
          assigned_to: string | null
          assigned_to_name: string | null
          category: string
          created_at: string
          customer_profile_id: string
          escalated_at: string | null
          escalated_by_name: string | null
          escalation_reason: string | null
          escalation_status: string | null
          id: string
          order_id: string | null
          priority: string
          sla_due_at: string | null
          status: string
          store_id: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          admin_resolution?: string | null
          admin_resolved_at?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: string
          created_at?: string
          customer_profile_id: string
          escalated_at?: string | null
          escalated_by_name?: string | null
          escalation_reason?: string | null
          escalation_status?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          sla_due_at?: string | null
          status?: string
          store_id?: string | null
          subject: string
          updated_at?: string
        }
        Update: {
          admin_resolution?: string | null
          admin_resolved_at?: string | null
          assigned_to?: string | null
          assigned_to_name?: string | null
          category?: string
          created_at?: string
          customer_profile_id?: string
          escalated_at?: string | null
          escalated_by_name?: string | null
          escalation_reason?: string | null
          escalation_status?: string | null
          id?: string
          order_id?: string | null
          priority?: string
          sla_due_at?: string | null
          status?: string
          store_id?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_commission_rates: {
        Row: {
          rate: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          rate: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          rate?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_commission_rates_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_promotions: {
        Row: {
          created_at: string
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          name: string
          orders: number
          product_ids: string[]
          revenue: number
          start_date: string
          store_id: string
          usage_status: string
          views: number
        }
        Insert: {
          created_at?: string
          discount_type: string
          discount_value: number
          end_date: string
          id?: string
          name: string
          orders?: number
          product_ids?: string[]
          revenue?: number
          start_date: string
          store_id: string
          usage_status?: string
          views?: number
        }
        Update: {
          created_at?: string
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          name?: string
          orders?: number
          product_ids?: string[]
          revenue?: number
          start_date?: string
          store_id?: string
          usage_status?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_promotions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          city: string | null
          country: string | null
          email: string
          id: string
          joined_at: string
          name: string
          owner_name: string
          owner_profile_id: string | null
          phone: string | null
          rating: number
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          city?: string | null
          country?: string | null
          email: string
          id: string
          joined_at?: string
          name: string
          owner_name: string
          owner_profile_id?: string | null
          phone?: string | null
          rating?: number
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          city?: string | null
          country?: string | null
          email?: string
          id?: string
          joined_at?: string
          name?: string
          owner_name?: string
          owner_profile_id?: string | null
          phone?: string | null
          rating?: number
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "vendors_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_items: {
        Row: {
          created_at: string
          customer_profile_id: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          customer_profile_id: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          customer_profile_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "ready_for_delivery"
        | "out_for_delivery"
        | "shipped"
        | "delivered"
        | "cancelled"
      product_status: "active" | "draft" | "out_of_stock"
      user_role: "customer" | "vendor" | "admin" | "support"
      verification_status: "verified" | "pending" | "unverified"
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
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "ready_for_delivery",
        "out_for_delivery",
        "shipped",
        "delivered",
        "cancelled",
      ],
      product_status: ["active", "draft", "out_of_stock"],
      user_role: ["customer", "vendor", "admin", "support"],
      verification_status: ["verified", "pending", "unverified"],
    },
  },
} as const
