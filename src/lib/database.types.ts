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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      tasks: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string
          date: string
          done: boolean
          done_at: string | null
          done_by: string | null
          id: string
          restaurant_id: string
          section: string
          source: string
          station: string
          template_id: string | null
          text: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by: string
          date?: string
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          restaurant_id: string
          section?: string
          source?: string
          station?: string
          template_id?: string | null
          text: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string
          date?: string
          done?: boolean
          done_at?: string | null
          done_by?: string | null
          id?: string
          restaurant_id?: string
          section?: string
          source?: string
          station?: string
          template_id?: string | null
          text?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]
