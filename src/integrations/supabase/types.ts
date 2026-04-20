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
      booking_requests: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string
          client_user_id: string | null
          comment: string | null
          created_at: string
          end_date: string | null
          host_user_id: string | null
          id: string
          object_id: string | null
          request_status: Database["public"]["Enums"]["booking_request_status"]
          slot_id: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone: string
          client_user_id?: string | null
          comment?: string | null
          created_at?: string
          end_date?: string | null
          host_user_id?: string | null
          id?: string
          object_id?: string | null
          request_status?: Database["public"]["Enums"]["booking_request_status"]
          slot_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string
          client_user_id?: string | null
          comment?: string | null
          created_at?: string
          end_date?: string | null
          host_user_id?: string | null
          id?: string
          object_id?: string | null
          request_status?: Database["public"]["Enums"]["booking_request_status"]
          slot_id?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "host_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "storage_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          last_read_at: string | null
          role_in_chat: Database["public"]["Enums"]["chat_role"]
          user_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          role_in_chat: Database["public"]["Enums"]["chat_role"]
          user_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          last_read_at?: string | null
          role_in_chat?: Database["public"]["Enums"]["chat_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          chat_type: Database["public"]["Enums"]["chat_type"]
          created_at: string
          id: string
          last_message_at: string | null
          related_object_id: string | null
          related_request_id: string | null
        }
        Insert: {
          chat_type: Database["public"]["Enums"]["chat_type"]
          created_at?: string
          id?: string
          last_message_at?: string | null
          related_object_id?: string | null
          related_request_id?: string | null
        }
        Update: {
          chat_type?: Database["public"]["Enums"]["chat_type"]
          created_at?: string
          id?: string
          last_message_at?: string | null
          related_object_id?: string | null
          related_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_related_object_id_fkey"
            columns: ["related_object_id"]
            isOneToOne: false
            referencedRelation: "host_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      client_applications: {
        Row: {
          category: Database["public"]["Enums"]["lot_category"] | null
          client_email: string | null
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
          client_email?: string | null
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
          client_email?: string | null
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
          host_email: string | null
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
          host_email?: string | null
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
          host_email?: string | null
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
      host_objects: {
        Row: {
          access_mode: Database["public"]["Enums"]["access_mode_ext"]
          address: string
          area_sqm: number | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          description: string | null
          district: string | null
          hide_token: string | null
          host_user_id: string | null
          id: string
          lat: number | null
          lng: number | null
          object_status: Database["public"]["Enums"]["object_status"]
          photos: string[] | null
          reviewer_notes: string | null
          rules: string | null
          schedule_mode: Database["public"]["Enums"]["schedule_mode"]
          schedule_notes: string | null
          title: string
          updated_at: string
          verification_status: Database["public"]["Enums"]["object_verification_status"]
        }
        Insert: {
          access_mode?: Database["public"]["Enums"]["access_mode_ext"]
          address: string
          area_sqm?: number | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          hide_token?: string | null
          host_user_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          object_status?: Database["public"]["Enums"]["object_status"]
          photos?: string[] | null
          reviewer_notes?: string | null
          rules?: string | null
          schedule_mode?: Database["public"]["Enums"]["schedule_mode"]
          schedule_notes?: string | null
          title: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["object_verification_status"]
        }
        Update: {
          access_mode?: Database["public"]["Enums"]["access_mode_ext"]
          address?: string
          area_sqm?: number | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          hide_token?: string | null
          host_user_id?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          object_status?: Database["public"]["Enums"]["object_status"]
          photos?: string[] | null
          reviewer_notes?: string | null
          rules?: string | null
          schedule_mode?: Database["public"]["Enums"]["schedule_mode"]
          schedule_notes?: string | null
          title?: string
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["object_verification_status"]
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
          hide_token: string | null
          host_email: string | null
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
          hide_token?: string | null
          host_email?: string | null
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
          hide_token?: string | null
          host_email?: string | null
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
      messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          is_read: boolean
          message_text: string
          message_type: Database["public"]["Enums"]["message_type"]
          sender_user_id: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_text: string
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_user_id?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_text?: string
          message_type?: Database["public"]["Enums"]["message_type"]
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      placements: {
        Row: {
          booking_request_id: string
          client_user_id: string | null
          created_at: string
          ended_at: string | null
          host_user_id: string | null
          id: string
          object_id: string | null
          placement_status: Database["public"]["Enums"]["placement_status"]
          slot_id: string | null
          started_at: string | null
          updated_at: string
        }
        Insert: {
          booking_request_id: string
          client_user_id?: string | null
          created_at?: string
          ended_at?: string | null
          host_user_id?: string | null
          id?: string
          object_id?: string | null
          placement_status?: Database["public"]["Enums"]["placement_status"]
          slot_id?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          booking_request_id?: string
          client_user_id?: string | null
          created_at?: string
          ended_at?: string | null
          host_user_id?: string | null
          id?: string
          object_id?: string | null
          placement_status?: Database["public"]["Enums"]["placement_status"]
          slot_id?: string | null
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "placements_booking_request_id_fkey"
            columns: ["booking_request_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "host_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "placements_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "storage_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          district: string | null
          email: string | null
          email_verified: boolean
          id: string
          name: string | null
          phone: string | null
          phone_verified: boolean
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["user_verification_status"]
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          name?: string | null
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["user_verification_status"]
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          name?: string | null
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["user_verification_status"]
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
      storage_slots: {
        Row: {
          category: Database["public"]["Enums"]["storage_category"]
          created_at: string
          description: string | null
          id: string
          object_id: string
          price_monthly: number
          slot_count: number
          slot_status: Database["public"]["Enums"]["slot_status"]
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["storage_category"]
          created_at?: string
          description?: string | null
          id?: string
          object_id: string
          price_monthly?: number
          slot_count?: number
          slot_status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["storage_category"]
          created_at?: string
          description?: string | null
          id?: string
          object_id?: string
          price_monthly?: number
          slot_count?: number
          slot_status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_slots_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "host_objects"
            referencedColumns: ["id"]
          },
        ]
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
      verification_logs: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          object_id: string | null
          user_id: string | null
          verification_status: Database["public"]["Enums"]["verification_log_status"]
          verification_type: Database["public"]["Enums"]["verification_log_type"]
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          object_id?: string | null
          user_id?: string | null
          verification_status: Database["public"]["Enums"]["verification_log_status"]
          verification_type: Database["public"]["Enums"]["verification_log_type"]
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          object_id?: string | null
          user_id?: string | null
          verification_status?: Database["public"]["Enums"]["verification_log_status"]
          verification_type?: Database["public"]["Enums"]["verification_log_type"]
        }
        Relationships: [
          {
            foreignKeyName: "verification_logs_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "host_objects"
            referencedColumns: ["id"]
          },
        ]
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
      is_chat_participant: {
        Args: { _chat_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      access_mode: "24/7" | "scheduled"
      access_mode_ext:
        | "free_by_arrangement"
        | "pre_approval"
        | "host_present_only"
        | "self_access"
        | "rare_seasonal"
        | "weekends_only"
        | "weekdays_only"
        | "specific_hours"
      app_role: "admin" | "user" | "host" | "client"
      booking_request_status:
        | "new"
        | "viewed"
        | "accepted"
        | "rejected"
        | "cancelled"
        | "completed"
        | "expired"
      chat_role: "host" | "client" | "admin"
      chat_type: "host_client" | "admin_host" | "admin_client" | "support"
      client_app_status: "new" | "sent_to_host" | "completed" | "rejected"
      host_app_status: "new" | "verified" | "rejected"
      lot_category: "tires" | "bikes" | "other"
      lot_status: "draft" | "published" | "archived"
      message_type: "text" | "system" | "file"
      object_status:
        | "draft"
        | "pending_review"
        | "needs_changes"
        | "verified"
        | "published"
        | "hidden"
        | "archived"
      object_verification_status:
        | "not_submitted"
        | "pending"
        | "approved"
        | "rejected"
        | "needs_changes"
      placement_status:
        | "upcoming"
        | "active"
        | "completed"
        | "cancelled"
        | "disputed"
      schedule_mode:
        | "daily"
        | "weekdays"
        | "weekends"
        | "by_arrangement"
        | "mornings_only"
        | "daytime_only"
        | "evenings_only"
      slot_status: "available" | "reserved" | "occupied" | "unavailable"
      storage_category:
        | "tires"
        | "bikes"
        | "boxes"
        | "furniture"
        | "sport"
        | "seasonal"
        | "other"
      user_verification_status:
        | "unverified"
        | "pending"
        | "verified"
        | "rejected"
      verification_log_status:
        | "submitted"
        | "approved"
        | "rejected"
        | "needs_changes"
      verification_log_type:
        | "phone"
        | "email"
        | "identity_doc"
        | "ownership_doc"
        | "object_review"
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
      access_mode_ext: [
        "free_by_arrangement",
        "pre_approval",
        "host_present_only",
        "self_access",
        "rare_seasonal",
        "weekends_only",
        "weekdays_only",
        "specific_hours",
      ],
      app_role: ["admin", "user", "host", "client"],
      booking_request_status: [
        "new",
        "viewed",
        "accepted",
        "rejected",
        "cancelled",
        "completed",
        "expired",
      ],
      chat_role: ["host", "client", "admin"],
      chat_type: ["host_client", "admin_host", "admin_client", "support"],
      client_app_status: ["new", "sent_to_host", "completed", "rejected"],
      host_app_status: ["new", "verified", "rejected"],
      lot_category: ["tires", "bikes", "other"],
      lot_status: ["draft", "published", "archived"],
      message_type: ["text", "system", "file"],
      object_status: [
        "draft",
        "pending_review",
        "needs_changes",
        "verified",
        "published",
        "hidden",
        "archived",
      ],
      object_verification_status: [
        "not_submitted",
        "pending",
        "approved",
        "rejected",
        "needs_changes",
      ],
      placement_status: [
        "upcoming",
        "active",
        "completed",
        "cancelled",
        "disputed",
      ],
      schedule_mode: [
        "daily",
        "weekdays",
        "weekends",
        "by_arrangement",
        "mornings_only",
        "daytime_only",
        "evenings_only",
      ],
      slot_status: ["available", "reserved", "occupied", "unavailable"],
      storage_category: [
        "tires",
        "bikes",
        "boxes",
        "furniture",
        "sport",
        "seasonal",
        "other",
      ],
      user_verification_status: [
        "unverified",
        "pending",
        "verified",
        "rejected",
      ],
      verification_log_status: [
        "submitted",
        "approved",
        "rejected",
        "needs_changes",
      ],
      verification_log_type: [
        "phone",
        "email",
        "identity_doc",
        "ownership_doc",
        "object_review",
      ],
      verification_status: ["pending", "approved", "rejected"],
    },
  },
} as const
