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
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      checkout_errors: {
        Row: {
          amount: number | null
          created_at: string
          customer_cpf: string | null
          customer_email: string | null
          customer_ip: string | null
          customer_name: string | null
          customer_phone: string | null
          error_details: Json | null
          error_message: string | null
          gateway: string | null
          id: string
          is_upsell: boolean
          stage: string | null
          user_agent: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_ip?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          error_details?: Json | null
          error_message?: string | null
          gateway?: string | null
          id?: string
          is_upsell?: boolean
          stage?: string | null
          user_agent?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_ip?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          error_details?: Json | null
          error_message?: string | null
          gateway?: string | null
          id?: string
          is_upsell?: boolean
          stage?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_password: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          error_message: string | null
          id: string
          ip: string | null
          region: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_password?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          error_message?: string | null
          id?: string
          ip?: string | null
          region?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_password?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          error_message?: string | null
          id?: string
          ip?: string | null
          region?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          comprovante_url: string | null
          created_at: string
          customer_address: Json | null
          customer_cpf: string | null
          customer_email: string
          customer_ip: string | null
          customer_name: string
          customer_phone: string | null
          gateway: string | null
          id: string
          items_json: Json | null
          paid_at: string | null
          payment_method: string | null
          status: string
          tracking_json: Json | null
          transaction_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          comprovante_url?: string | null
          created_at?: string
          customer_address?: Json | null
          customer_cpf?: string | null
          customer_email: string
          customer_ip?: string | null
          customer_name: string
          customer_phone?: string | null
          gateway?: string | null
          id?: string
          items_json?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          tracking_json?: Json | null
          transaction_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          comprovante_url?: string | null
          created_at?: string
          customer_address?: Json | null
          customer_cpf?: string | null
          customer_email?: string
          customer_ip?: string | null
          customer_name?: string
          customer_phone?: string | null
          gateway?: string | null
          id?: string
          items_json?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          tracking_json?: Json | null
          transaction_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
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
      visitor_logs: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          device: string | null
          id: string
          ip: string | null
          is_mobile: boolean | null
          isp: string | null
          latitude: number | null
          longitude: number | null
          os: string | null
          path: string | null
          postal: string | null
          referrer: string | null
          region: string | null
          session_id: string | null
          timezone: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip?: string | null
          is_mobile?: boolean | null
          isp?: string | null
          latitude?: number | null
          longitude?: number | null
          os?: string | null
          path?: string | null
          postal?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          timezone?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          id?: string
          ip?: string | null
          is_mobile?: boolean | null
          isp?: string | null
          latitude?: number | null
          longitude?: number | null
          os?: string | null
          path?: string | null
          postal?: string | null
          referrer?: string | null
          region?: string | null
          session_id?: string | null
          timezone?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
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
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
