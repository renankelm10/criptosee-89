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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      coins: {
        Row: {
          created_at: string
          id: string
          image: string | null
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          image?: string | null
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      latest_markets: {
        Row: {
          ath: number | null
          ath_change_percentage: number | null
          ath_date: string | null
          atl: number | null
          atl_change_percentage: number | null
          atl_date: string | null
          circulating_supply: number | null
          coin_id: string
          market_cap: number | null
          market_cap_rank: number | null
          max_supply: number | null
          price: number
          price_change_percentage_1h: number | null
          price_change_percentage_24h: number | null
          price_change_percentage_7d: number | null
          total_supply: number | null
          updated_at: string
          volume_24h: number | null
        }
        Insert: {
          ath?: number | null
          ath_change_percentage?: number | null
          ath_date?: string | null
          atl?: number | null
          atl_change_percentage?: number | null
          atl_date?: string | null
          circulating_supply?: number | null
          coin_id: string
          market_cap?: number | null
          market_cap_rank?: number | null
          max_supply?: number | null
          price: number
          price_change_percentage_1h?: number | null
          price_change_percentage_24h?: number | null
          price_change_percentage_7d?: number | null
          total_supply?: number | null
          updated_at?: string
          volume_24h?: number | null
        }
        Update: {
          ath?: number | null
          ath_change_percentage?: number | null
          ath_date?: string | null
          atl?: number | null
          atl_change_percentage?: number | null
          atl_date?: string | null
          circulating_supply?: number | null
          coin_id?: string
          market_cap?: number | null
          market_cap_rank?: number | null
          max_supply?: number | null
          price?: number
          price_change_percentage_1h?: number | null
          price_change_percentage_24h?: number | null
          price_change_percentage_7d?: number | null
          total_supply?: number | null
          updated_at?: string
          volume_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "latest_markets_coin_id_fkey"
            columns: ["coin_id"]
            isOneToOne: true
            referencedRelation: "coins"
            referencedColumns: ["id"]
          },
        ]
      }
      markets_history: {
        Row: {
          coin_id: string
          id: number
          market_cap: number | null
          price: number
          price_change_percentage_1h: number | null
          price_change_percentage_24h: number | null
          price_change_percentage_7d: number | null
          timestamp: string
          volume_24h: number | null
        }
        Insert: {
          coin_id: string
          id?: number
          market_cap?: number | null
          price: number
          price_change_percentage_1h?: number | null
          price_change_percentage_24h?: number | null
          price_change_percentage_7d?: number | null
          timestamp?: string
          volume_24h?: number | null
        }
        Update: {
          coin_id?: string
          id?: number
          market_cap?: number | null
          price?: number
          price_change_percentage_1h?: number | null
          price_change_percentage_24h?: number | null
          price_change_percentage_7d?: number | null
          timestamp?: string
          volume_24h?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "markets_history_coin_id_fkey"
            columns: ["coin_id"]
            isOneToOne: false
            referencedRelation: "coins"
            referencedColumns: ["id"]
          },
        ]
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
