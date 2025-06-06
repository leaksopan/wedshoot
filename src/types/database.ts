export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      availability: {
        Row: {
          booking_type: string | null
          created_at: string | null
          date: string
          id: string
          notes: string | null
          status: string | null
          time_slots: Json | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          booking_type?: string | null
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          status?: string | null
          time_slots?: Json | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          booking_type?: string | null
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: string | null
          time_slots?: Json | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_dates: string[]
          client_email: string | null
          client_id: string
          client_name: string | null
          client_phone: string | null
          created_at: string | null
          event_location: string | null
          guest_count: number | null
          id: string
          notes: string | null
          quantity: number
          service_id: string
          status: string | null
          total_price: number
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          booking_dates: string[]
          client_email?: string | null
          client_id: string
          client_name?: string | null
          client_phone?: string | null
          created_at?: string | null
          event_location?: string | null
          guest_count?: number | null
          id?: string
          notes?: string | null
          quantity?: number
          service_id: string
          status?: string | null
          total_price: number
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          booking_dates?: string[]
          client_email?: string | null
          client_id?: string
          client_name?: string | null
          client_phone?: string | null
          created_at?: string | null
          event_location?: string | null
          guest_count?: number | null
          id?: string
          notes?: string | null
          quantity?: number
          service_id?: string
          status?: string | null
          total_price?: number
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          id: string
          vendor_id: string
          client_id: string
          last_message_at: string | null
          last_message_preview: string | null
          unread_count_vendor: number
          unread_count_client: number
          status: 'active' | 'archived' | 'blocked'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vendor_id: string
          client_id: string
          last_message_at?: string | null
          last_message_preview?: string | null
          unread_count_vendor?: number
          unread_count_client?: number
          status?: 'active' | 'archived' | 'blocked'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vendor_id?: string
          client_id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          unread_count_vendor?: number
          unread_count_client?: number
          status?: 'active' | 'archived' | 'blocked'
          created_at?: string
          updated_at?: string
        }
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          budget_range: string | null
          client_id: string
          created_at: string | null
          event_date: string | null
          event_location: string | null
          guest_count: number | null
          id: string
          message: string
          service_id: string | null
          status: string | null
          updated_at: string | null
          vendor_id: string
          vendor_response: string | null
          vendor_response_at: string | null
        }
        Insert: {
          budget_range?: string | null
          client_id: string
          created_at?: string | null
          event_date?: string | null
          event_location?: string | null
          guest_count?: number | null
          id?: string
          message: string
          service_id?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id: string
          vendor_response?: string | null
          vendor_response_at?: string | null
        }
        Update: {
          budget_range?: string | null
          client_id?: string
          created_at?: string | null
          event_date?: string | null
          event_location?: string | null
          guest_count?: number | null
          id?: string
          message?: string
          service_id?: string | null
          status?: string | null
          updated_at?: string | null
          vendor_id?: string
          vendor_response?: string | null
          vendor_response_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          id: string
          room_id: string
          sender_id: string
          content: string
          message_type: 'text' | 'image' | 'file' | 'service_preview'
          file_url: string | null
          file_name: string | null
          file_size: number | null
          read_at: string | null
          delivered_at: string | null
          reply_to_message_id: string | null
          service_preview: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          sender_id: string
          content: string
          message_type?: 'text' | 'image' | 'file' | 'service_preview'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          read_at?: string | null
          delivered_at?: string | null
          reply_to_message_id?: string | null
          service_preview?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          sender_id?: string
          content?: string
          message_type?: 'text' | 'image' | 'file' | 'service_preview'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          read_at?: string | null
          delivered_at?: string | null
          reply_to_message_id?: string | null
          service_preview?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          alt_text: string | null
          category: string | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          file_size: number | null
          id: string
          image_height: number | null
          image_order: number | null
          image_url: string
          image_width: number | null
          is_active: boolean | null
          service_id: string | null
          tags: Json | null
          title: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          alt_text?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          file_size?: number | null
          id?: string
          image_height?: number | null
          image_order?: number | null
          image_url: string
          image_width?: number | null
          is_active?: boolean | null
          service_id?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          alt_text?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          file_size?: number | null
          id?: string
          image_height?: number | null
          image_order?: number | null
          image_url?: string
          image_width?: number | null
          is_active?: boolean | null
          service_id?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolios_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          rating: number
          review_photos: Json | null
          service_id: string | null
          updated_at: string | null
          vendor_id: string
          vendor_reply: string | null
          vendor_reply_at: string | null
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          rating: number
          review_photos?: Json | null
          service_id?: string | null
          updated_at?: string | null
          vendor_id: string
          vendor_reply?: string | null
          vendor_reply_at?: string | null
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          rating?: number
          review_photos?: Json | null
          service_id?: string | null
          updated_at?: string | null
          vendor_id?: string
          vendor_reply?: string | null
          vendor_reply_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          advance_booking_days: number | null
          cancellation_policy: string | null
          created_at: string | null
          delivery_time: number | null
          description: string | null
          duration: number | null
          excludes: Json | null
          id: string
          images: string[] | null
          includes: Json | null
          is_active: boolean | null
          is_featured: boolean | null
          max_guests: number | null
          max_revisions: number | null
          name: string
          price: number
          service_type: string | null
          slug: string | null
          terms_conditions: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          advance_booking_days?: number | null
          cancellation_policy?: string | null
          created_at?: string | null
          delivery_time?: number | null
          description?: string | null
          duration?: number | null
          excludes?: Json | null
          id?: string
          images?: string[] | null
          includes?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          max_guests?: number | null
          max_revisions?: number | null
          name: string
          price: number
          service_type?: string | null
          slug?: string | null
          terms_conditions?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          advance_booking_days?: number | null
          cancellation_policy?: string | null
          created_at?: string | null
          delivery_time?: number | null
          description?: string | null
          duration?: number | null
          excludes?: Json | null
          id?: string
          images?: string[] | null
          includes?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          max_guests?: number | null
          max_revisions?: number | null
          name?: string
          price?: number
          service_type?: string | null
          slug?: string | null
          terms_conditions?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          full_name: string | null
          id: string
          is_client: boolean | null
          is_vendor: boolean | null
          location: string | null
          onboarding_completed: boolean | null
          phone: string | null
          preferred_role: string | null
          profile_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          id: string
          is_client?: boolean | null
          is_vendor?: boolean | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_role?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          full_name?: string | null
          id?: string
          is_client?: boolean | null
          is_vendor?: boolean | null
          location?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          preferred_role?: string | null
          profile_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendor_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendors: {
        Row: {
          average_rating: number | null
          business_name: string
          category_id: string
          contact_info: Json | null
          created_at: string | null
          description: string | null
          featured_status: boolean | null
          id: string
          is_active: boolean | null
          languages_spoken: Json | null
          location: string | null
          max_price: number | null
          min_price: number | null
          search_tags: Json | null
          service_areas: Json | null
          slug: string | null
          team_size: number | null
          total_reviews: number | null
          updated_at: string | null
          user_id: string
          verification_status: string | null
          years_of_experience: number | null
        }
        Insert: {
          average_rating?: number | null
          business_name: string
          category_id: string
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          featured_status?: boolean | null
          id?: string
          is_active?: boolean | null
          languages_spoken?: Json | null
          location?: string | null
          max_price?: number | null
          min_price?: number | null
          search_tags?: Json | null
          service_areas?: Json | null
          slug?: string | null
          team_size?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id: string
          verification_status?: string | null
          years_of_experience?: number | null
        }
        Update: {
          average_rating?: number | null
          business_name?: string
          category_id?: string
          contact_info?: Json | null
          created_at?: string | null
          description?: string | null
          featured_status?: boolean | null
          id?: string
          is_active?: boolean | null
          languages_spoken?: Json | null
          location?: string | null
          max_price?: number | null
          min_price?: number | null
          search_tags?: Json | null
          service_areas?: Json | null
          slug?: string | null
          team_size?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string | null
          years_of_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vendor_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_booking: {
        Args: {
          p_service_id: string
          p_client_id: string
          p_vendor_id: string
          p_booking_dates: string[]
          p_quantity: number
          p_total_price: number
          p_client_name?: string
          p_client_email?: string
          p_client_phone?: string
        }
        Returns: {
          booking_id: string
          success: boolean
          message: string
        }[]
      }
      ensure_chat_room_exists: {
        Args: { p_vendor_id: string; p_client_id: string }
        Returns: string
      }
      get_booked_dates: {
        Args: { p_service_id: string }
        Returns: {
          booked_date: string
        }[]
      }
      get_featured_services: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          description: string
          price: number
          images: string[]
          service_type: string
          duration: number
          business_name: string
          location: string
          average_rating: number
          total_reviews: number
          category_name: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const 

// Additional types for chat
export interface ChatRoom {
  id: string
  vendor_id: string
  client_id: string
  last_message_at: string | null
  last_message_preview: string | null
  unread_count_vendor: number
  unread_count_client: number
  status: 'active' | 'archived' | 'blocked'
  created_at: string
  updated_at: string
  vendor?: {
    id: string
    business_name: string
    user_id: string
    user_profiles?: {
      full_name: string | null
      avatar_url: string | null
    }
  }
  client?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

export interface Message {
  id: string
  room_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'image' | 'file' | 'service_preview'
  file_url: string | null
  file_name: string | null
  file_size: number | null
  read_at: string | null
  delivered_at: string | null
  reply_to_message_id: string | null
  service_preview: Json | null
  created_at: string
  updated_at: string
  sender?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  reply_to?: Message | null
} 