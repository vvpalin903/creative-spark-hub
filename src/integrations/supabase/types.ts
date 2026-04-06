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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      client_applications: {
        Row: {
          category: Database["public"]["Enums"]["lot_category"] | null
          client_name: string
          client_phone: string
          comment: string | null
          created_at: string
          desired_date: string | null
          id: string
          lot_id: string | null
          status: Database["public"]["Enums"]["client_app_status"]
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["lot_category"] | null
          client_name: string
          client_phone: string
          comment?: string | null
          created_at?: string
          desired_date?: string | null
          id?: string
          lot_id?: string | null
          status?: Database["public"]["Enums"]["client_app_status"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["lot_category"] | null
          client_name?: string
          client_phone?: string
          comment?: string | null
          created_at?: string
          desired_date?: string | null
          id?: string
          lot_id?: string | null
          status?: Database["public"]["Enums"]["client_app_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_applications_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      host_applications: {
        Row: {
          access_mode: Database["public"]["Enums"]["access_mode"]
          address: string
          category: Database["public"]["Enums"]["lot_category"]
          created_at: string
          host_name: string
          host_phone: string
          id: string
          lat: number | null
          lng: number | null
          photos: string[] | null
          place_type: string | null
          schedule: string | null
          status: Database["public"]["Enums"]["host_app_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_mode?: Database["public"]["Enums"]["access_mode"]
          address: string
          category?: Database["public"]["Enums"]["lot_category"]
          created_at?: string
          host_name: string
          host_phone: string
          id?: string
          lat?: number | null
          lng?: number | null
          photos?: string[] | null
          place_type?: string | null
          schedule?: string | null
          status?: Database["public"]["Enums"]["host_app_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_mode?: Database["public"]["Enums"]["access_mode"]
          address?: string
          category?: Database["public"]["Enums"]["lot_category"]
          created_at?: string
          host_name?: string
          host_phone?: string
          id?: string
          lat?: number | null
          lng?: number | null
          photos?: string[] | null
          place_type?: string | null
          schedule?: string | null
          status?: Database["public"]["Enums"]["host_app_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lots: {
        Row: {
          access_mode: Database["public"]["Enums"]["access_mode"]
          address: string
          area_sqm: number | null
          category: Database["public"]["Enums"]["lot_category"]
          created_at: string
          description: string | null
          host_id: string | null
          id: string
          is_mytishchi: boolean
          lat: number | null
          lng: number | null
          photos: string[] | null
          price_monthly: number
          rules: string | null
          schedule: string | null
          status: Database["public"]["Enums"]["lot_status"]
          title: string
          updated_at: string
        }
        Insert: {
          access_mode?: Database["public"]["Enums"]["access_mode"]
          address: string
          area_sqm?: number | null
          category?: Database["public"]["Enums"]["lot_category"]
          created_at?: string
          description?: string | null
          host_id?: string | null
          id?: string
          is_mytishchi?: boolean
          lat?: number | null
          lng?: number | null
          photos?: string[] | null
          price_monthly: number
          rules?: string | null
          schedule?: string | null
          status?: Database["public"]["Enums"]["lot_status"]
          title: string
          updated_at?: string
        }
        Update: {
          access_mode?: Database["public"]["Enums"]["access_mode"]
          address?: string
          area_sqm?: number | null
          category?: Database["public"]["Enums"]["lot_category"]
          created_at?: string
          description?: string | null
          host_id?: string | null
          id?: string
          is_mytishchi?: boolean
          lat?: number | null
          lng?: number | null
          photos?: string[] | null
          price_monthly?: number
          rules?: string | null
          schedule?: string | null
          status?: Database["public"]["Enums"]["lot_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_documents: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          slug: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_documents: {
        Row: {
          created_at: string
          document_type: string
          file_url: string
          id: string
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["verification_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_url: string
          id?: string
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_url?: string
          id?: string
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      access_mode: "24/7" | "scheduled"
      app_role: "admin" | "user"
      client_app_status: "new" | "sent_to_host" | "completed" | "rejected"
      host_app_status: "new" | "verified" | "rejected"
      lot_category: "tires" | "bikes" | "other"
      lot_status: "draft" | "published" | "archived"
      verification_status: "pending" | "approved" | "rejected"
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
      access_mode: ["24/7", "scheduled"],
      app_role: ["admin", "user"],
      client_app_status: ["new", "sent_to_host", "completed", "rejected"],
      host_app_status: ["new", "verified", "rejected"],
      lot_category: ["tires", "bikes", "other"],
      lot_status: ["draft", "published", "archived"],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
