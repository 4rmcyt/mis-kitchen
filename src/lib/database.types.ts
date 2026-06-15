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
      allergens: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      clock_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          push_entry_id: string | null
          restaurant_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          push_entry_id?: string | null
          restaurant_id: string
          timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          push_entry_id?: string | null
          restaurant_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clock_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clock_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clock_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          completed_count: number | null
          completed_pct: number | null
          created_at: string | null
          date: string
          experiment_note: string | null
          experiment_outcome: string | null
          experiment_text: string | null
          id: string
          next_shift: Json | null
          restaurant_id: string
          sections: Json | null
          total_count: number | null
          user_id: string
        }
        Insert: {
          completed_count?: number | null
          completed_pct?: number | null
          created_at?: string | null
          date?: string
          experiment_note?: string | null
          experiment_outcome?: string | null
          experiment_text?: string | null
          id?: string
          next_shift?: Json | null
          restaurant_id: string
          sections?: Json | null
          total_count?: number | null
          user_id: string
        }
        Update: {
          completed_count?: number | null
          completed_pct?: number | null
          created_at?: string | null
          date?: string
          experiment_note?: string | null
          experiment_outcome?: string | null
          experiment_text?: string | null
          id?: string
          next_shift?: Json | null
          restaurant_id?: string
          sections?: Json | null
          total_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      day_templates: {
        Row: {
          created_at: string
          created_by: string
          entries: Json
          id: string
          is_default: boolean | null
          name: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          entries?: Json
          id?: string
          is_default?: boolean | null
          name: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          entries?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "day_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "day_templates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      deferred_tasks: {
        Row: {
          carried: boolean | null
          created_at: string | null
          deferred_from: string
          id: string
          restaurant_id: string
          station: string | null
          text: string
          user_id: string
        }
        Insert: {
          carried?: boolean | null
          created_at?: string | null
          deferred_from?: string
          id?: string
          restaurant_id: string
          station?: string | null
          text: string
          user_id: string
        }
        Update: {
          carried?: boolean | null
          created_at?: string | null
          deferred_from?: string
          id?: string
          restaurant_id?: string
          station?: string | null
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deferred_tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deferred_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deferred_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      improvement_logs: {
        Row: {
          author_id: string
          created_at: string
          id: string
          restaurant_id: string
          text: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          restaurant_id: string
          text: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          restaurant_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "improvement_logs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_logs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "improvement_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string
          invited_by: string
          restaurant_id: string
          role: string
          source: string | null
          station: string | null
          token: string
          used: boolean | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invited_by: string
          restaurant_id: string
          role?: string
          source?: string | null
          station?: string | null
          token?: string
          used?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string
          restaurant_id?: string
          role?: string
          source?: string | null
          station?: string | null
          token?: string
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      prep_items: {
        Row: {
          active: boolean
          created_at: string
          default_quantity: number | null
          id: string
          name: string
          restaurant_id: string
          station: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_quantity?: number | null
          id?: string
          name: string
          restaurant_id: string
          station?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_quantity?: number | null
          id?: string
          name?: string
          restaurant_id?: string
          station?: string
        }
        Relationships: [
          {
            foreignKeyName: "prep_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          email: string | null
          id: string
          joined_at: string | null
          last_seen: string | null
          name: string | null
          on_shift_today: boolean | null
          password_set: boolean
          push_employee_id: string | null
          restaurant_id: string | null
          role: string
          secondary_stations: string[]
          station: string | null
        }
        Insert: {
          active?: boolean | null
          email?: string | null
          id: string
          joined_at?: string | null
          last_seen?: string | null
          name?: string | null
          on_shift_today?: boolean | null
          password_set?: boolean
          push_employee_id?: string | null
          restaurant_id?: string | null
          role?: string
          secondary_stations?: string[]
          station?: string | null
        }
        Update: {
          active?: boolean | null
          email?: string | null
          id?: string
          joined_at?: string | null
          last_seen?: string | null
          name?: string | null
          on_shift_today?: boolean | null
          password_set?: boolean
          push_employee_id?: string | null
          restaurant_id?: string | null
          role?: string
          secondary_stations?: string[]
          station?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_shifts: {
        Row: {
          date: string
          end_time: string | null
          id: string
          published: boolean | null
          push_employee_id: string
          push_shift_id: string
          start_time: string | null
          station: string | null
          synced_at: string | null
        }
        Insert: {
          date: string
          end_time?: string | null
          id?: string
          published?: boolean | null
          push_employee_id: string
          push_shift_id: string
          start_time?: string | null
          station?: string | null
          synced_at?: string | null
        }
        Update: {
          date?: string
          end_time?: string | null
          id?: string
          published?: boolean | null
          push_employee_id?: string
          push_shift_id?: string
          start_time?: string | null
          station?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          restaurant_id: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          restaurant_id: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_webhook_log: {
        Row: {
          event_type: string | null
          id: string
          payload: Json | null
          received_at: string | null
        }
        Insert: {
          event_type?: string | null
          id?: string
          payload?: Json | null
          received_at?: string | null
        }
        Update: {
          event_type?: string | null
          id?: string
          payload?: Json | null
          received_at?: string | null
        }
        Relationships: []
      }
      recipe_allergens: {
        Row: {
          allergen_id: string
          note: string | null
          recipe_id: string
        }
        Insert: {
          allergen_id: string
          note?: string | null
          recipe_id: string
        }
        Update: {
          allergen_id?: string
          note?: string | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_allergens_allergen_id_fkey"
            columns: ["allergen_id"]
            isOneToOne: false
            referencedRelation: "allergens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_allergens_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          ingredients: Json | null
          is_shared: boolean | null
          name: string
          portions: number | null
          restaurant_id: string
          station: string | null
          steps: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          ingredients?: Json | null
          is_shared?: boolean | null
          name: string
          portions?: number | null
          restaurant_id: string
          station?: string | null
          steps?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          ingredients?: Json | null
          is_shared?: boolean | null
          name?: string
          portions?: number | null
          restaurant_id?: string
          station?: string | null
          steps?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "recipes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          push_company_uuid: string | null
          shift_experiment: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          push_company_uuid?: string | null
          shift_experiment?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          push_company_uuid?: string | null
          shift_experiment?: string | null
        }
        Relationships: []
      }
      shifts: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          id: string
          restaurant_id: string
          start_time: string | null
          station: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          id?: string
          restaurant_id: string
          start_time?: string | null
          station?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          id?: string
          restaurant_id?: string
          start_time?: string | null
          station?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          comment: string | null
          created_at: string
          created_by: string
          date: string
          day_template_id: string | null
          done: boolean
          done_at: string | null
          done_by: string | null
          id: string
          prep_item_id: string | null
          quantity: number | null
          restaurant_id: string
          section: string
          source: string
          station: string
          template_id: string | null
          text: string
        }
        Insert: {
          assigned_to?: string | null
          comment?: string | null
          created_at?: string
          created_by: string
          date?: string
          day_template_id?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          prep_item_id?: string | null
          quantity?: number | null
          restaurant_id: string
          section?: string
          source?: string
          station?: string
          template_id?: string | null
          text: string
        }
        Update: {
          assigned_to?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string
          date?: string
          day_template_id?: string | null
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          prep_item_id?: string | null
          quantity?: number | null
          restaurant_id?: string
          section?: string
          source?: string
          station?: string
          template_id?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tasks_day_template_id_fkey"
            columns: ["day_template_id"]
            isOneToOne: false
            referencedRelation: "day_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "tasks_prep_item_id_fkey"
            columns: ["prep_item_id"]
            isOneToOne: false
            referencedRelation: "prep_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      temp_logs: {
        Row: {
          id: string
          recorded_at: string
          restaurant_id: string
          station: string
          temperature: number
          user_id: string
        }
        Insert: {
          id?: string
          recorded_at?: string
          restaurant_id: string
          station: string
          temperature: number
          user_id: string
        }
        Update: {
          id?: string
          recorded_at?: string
          restaurant_id?: string
          station?: string
          temperature?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "temp_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temp_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      templates: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string
          id: string
          is_shared: boolean | null
          items: Json | null
          name: string
          restaurant_id: string
          station: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          is_shared?: boolean | null
          items?: Json | null
          name: string
          restaurant_id: string
          station?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          is_shared?: boolean | null
          items?: Json | null
          name?: string
          restaurant_id?: string
          station?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "todays_schedule"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "templates_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      station_velocity: {
        Row: {
          completed_count: number | null
          dow: number | null
          station: string | null
        }
        Relationships: []
      }
      todays_schedule: {
        Row: {
          email: string | null
          end_time: string | null
          name: string | null
          on_shift_today: boolean | null
          profile_id: string | null
          push_shift_id: string | null
          role: string | null
          start_time: string | null
          station: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_restaurant: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
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
