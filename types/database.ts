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
          name: string
          price: number
          rating: number
          review_count: number
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
          name: string
          price: number
          rating?: number
          review_count?: number
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
          name?: string
          price?: number
          rating?: number
          review_count?: number
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
      product_status: ["active", "draft", "out_of_stock"],
      user_role: ["customer", "vendor", "admin", "support"],
      verification_status: ["verified", "pending", "unverified"],
    },
  },
} as const
