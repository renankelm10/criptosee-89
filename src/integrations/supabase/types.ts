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
      ai_predictions: {
        Row: {
          action: Database["public"]["Enums"]["ai_action"]
          actual_outcome: string | null
          coin_id: string
          confidence_level: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          indicators: Json | null
          performance_score: number | null
          price_projection: number | null
          reasoning: string
          timeframe: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["ai_action"]
          actual_outcome?: string | null
          coin_id: string
          confidence_level?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          indicators?: Json | null
          performance_score?: number | null
          price_projection?: number | null
          reasoning: string
          timeframe?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["ai_action"]
          actual_outcome?: string | null
          coin_id?: string
          confidence_level?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          indicators?: Json | null
          performance_score?: number | null
          price_projection?: number | null
          reasoning?: string
          timeframe?: string | null
        }
        Relationships: []
      }
      coins: {
        Row: {
          created_at: string | null
          id: string
          image: string | null
          market_cap_rank: number | null
          name: string
          symbol: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          image?: string | null
          market_cap_rank?: number | null
          name: string
          symbol: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image?: string | null
          market_cap_rank?: number | null
          name?: string
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      global_market_data: {
        Row: {
          active_cryptocurrencies: number | null
          created_at: string | null
          id: string
          market_cap_change_percentage_24h: number | null
          markets: number | null
          total_market_cap: number | null
          total_volume: number | null
          updated_at: string | null
        }
        Insert: {
          active_cryptocurrencies?: number | null
          created_at?: string | null
          id?: string
          market_cap_change_percentage_24h?: number | null
          markets?: number | null
          total_market_cap?: number | null
          total_volume?: number | null
          updated_at?: string | null
        }
        Update: {
          active_cryptocurrencies?: number | null
          created_at?: string | null
          id?: string
          market_cap_change_percentage_24h?: number | null
          markets?: number | null
          total_market_cap?: number | null
          total_volume?: number | null
          updated_at?: string | null
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
          created_at: string | null
          current_price: number | null
          id: string
          last_updated: string | null
          market_cap: number | null
          market_cap_rank: number | null
          max_supply: number | null
          price_change_percentage_1h: number | null
          price_change_percentage_24h: number | null
          price_change_percentage_30d: number | null
          price_change_percentage_7d: number | null
          total_supply: number | null
          total_volume: number | null
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
          created_at?: string | null
          current_price?: number | null
          id?: string
          last_updated?: string | null
          market_cap?: number | null
          market_cap_rank?: number | null
          max_supply?: number | null
          price_change_percentage_1h?: number | null
          price_change_percentage_24h?: number | null
          price_change_percentage_30d?: number | null
          price_change_percentage_7d?: number | null
          total_supply?: number | null
          total_volume?: number | null
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
          created_at?: string | null
          current_price?: number | null
          id?: string
          last_updated?: string | null
          market_cap?: number | null
          market_cap_rank?: number | null
          max_supply?: number | null
          price_change_percentage_1h?: number | null
          price_change_percentage_24h?: number | null
          price_change_percentage_30d?: number | null
          price_change_percentage_7d?: number | null
          total_supply?: number | null
          total_volume?: number | null
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
          created_at: string | null
          current_price: number | null
          id: string
          market_cap: number | null
          price_change_percentage_24h: number | null
          timestamp: string | null
          total_volume: number | null
        }
        Insert: {
          coin_id: string
          created_at?: string | null
          current_price?: number | null
          id?: string
          market_cap?: number | null
          price_change_percentage_24h?: number | null
          timestamp?: string | null
          total_volume?: number | null
        }
        Update: {
          coin_id?: string
          created_at?: string | null
          current_price?: number | null
          id?: string
          market_cap?: number | null
          price_change_percentage_24h?: number | null
          timestamp?: string | null
          total_volume?: number | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_prediction_views: {
        Row: {
          created_at: string | null
          id: string
          prediction_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          prediction_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          prediction_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_prediction_views_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "ai_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_today_prediction_views: {
        Args: { user_uuid: string }
        Returns: number
      }
      get_user_plan: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["subscription_plan"]
      }
    }
    Enums: {
      ai_action: "buy" | "sell" | "hold" | "watch" | "alert"
      subscription_plan: "free" | "basic" | "premium"
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
      ai_action: ["buy", "sell", "hold", "watch", "alert"],
      subscription_plan: ["free", "basic", "premium"],
    },
  },
} as const
