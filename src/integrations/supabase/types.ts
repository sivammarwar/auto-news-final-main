export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      analytics: {
        Row: {
          ad_revenue: number | null
          date: string
          id: number
          page_views: number | null
          unique_visitors: number | null
        }
        Insert: {
          ad_revenue?: number | null
          date: string
          id?: number
          page_views?: number | null
          unique_visitors?: number | null
        }
        Update: {
          ad_revenue?: number | null
          date?: string
          id?: number
          page_views?: number | null
          unique_visitors?: number | null
        }
        Relationships: []
      }
      article_images: {
        Row: {
          alt_text: string | null
          article_id: number
          created_at: string | null
          height: number | null
          id: number
          image_source: string | null
          image_url: string
          photographer: string | null
          photographer_url: string | null
          position: number
          size_kb: number | null
          updated_at: string | null
          width: number | null
          wiki_attribution: string | null
          wiki_license: string | null
          wiki_license_url: string | null
        }
        Insert: {
          alt_text?: string | null
          article_id: number
          created_at?: string | null
          height?: number | null
          id?: number
          image_source?: string | null
          image_url: string
          photographer?: string | null
          photographer_url?: string | null
          position?: number
          size_kb?: number | null
          updated_at?: string | null
          width?: number | null
          wiki_attribution?: string | null
          wiki_license?: string | null
          wiki_license_url?: string | null
        }
        Update: {
          alt_text?: string | null
          article_id?: number
          created_at?: string | null
          height?: number | null
          id?: number
          image_source?: string | null
          image_url?: string
          photographer?: string | null
          photographer_url?: string | null
          position?: number
          size_kb?: number | null
          updated_at?: string | null
          width?: number | null
          wiki_attribution?: string | null
          wiki_license?: string | null
          wiki_license_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_images_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          deleted_at: string | null        // ── added: soft-delete timestamp
          difficulty: string | null
          era: string | null
          fts: unknown | null              // ── added: tsvector full-text search index
          id: number
          image_url: string | null
          is_draft: boolean | null
          is_published: boolean | null
          published_date: string
          raw_content: string | null
          scheduled_publish_date: string | null
          score: number | null
          slug: string | null              // ── added: SEO-friendly URL slug
          source_name: string
          source_url: string | null
          subcategory: string | null
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          deleted_at?: string | null
          difficulty?: string | null
          era?: string | null
          // fts is GENERATED ALWAYS — never insert/update directly
          id?: number
          image_url?: string | null
          is_draft?: boolean | null
          is_published?: boolean | null
          published_date: string
          raw_content?: string | null
          scheduled_publish_date?: string | null
          score?: number | null
          slug?: string | null
          source_name: string
          source_url?: string | null
          subcategory?: string | null
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          difficulty?: string | null
          era?: string | null
          // fts is GENERATED ALWAYS — never insert/update directly
          id?: number
          image_url?: string | null
          is_draft?: boolean | null
          is_published?: boolean | null
          published_date?: string
          raw_content?: string | null
          scheduled_publish_date?: string | null
          score?: number | null
          slug?: string | null
          source_name?: string
          source_url?: string | null
          subcategory?: string | null
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      topic_pool: {
        Row: {
          created_at: string
          id: number
          is_used: boolean
          subcategory: string
          topic: string
          topic_key: string
          updated_at: string               // ── added: was missing, added in migration
        }
        Insert: {
          created_at?: string
          id?: number
          is_used?: boolean
          subcategory: string
          topic: string
          topic_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          is_used?: boolean
          subcategory?: string
          topic?: string
          topic_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      topic_registry: {
        Row: {
          article_id: number | null
          created_at: string | null
          id: number
          subcategory: string
          title: string | null
          topic_key: string
        }
        Insert: {
          article_id?: number | null
          created_at?: string | null
          id?: number
          subcategory: string
          title?: string | null
          topic_key: string
        }
        Update: {
          article_id?: number | null
          created_at?: string | null
          id?: number
          subcategory?: string
          title?: string | null
          topic_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_registry_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_is_admin: {
        Args: { p_token: string }
        Returns: boolean
      }
      generate_unique_slug: {
        Args: { p_title: string; p_exclude_id?: number }
        Returns: string
      }
      increment_rate_limit: {
        Args: { p_identifier: string; p_action: string; p_max?: number }
        Returns: boolean
      }
      purge_deleted_articles: {
        Args: Record<string, never>
        Returns: number
      }
      refresh_category_counts: {
        Args: Record<string, never>
        Returns: undefined
      }
      soft_delete_article: {
        Args: { p_id: number }
        Returns: undefined
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