export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number;
          checksum: string;
          finished_at: string | null;
          id: string;
          logs: string | null;
          migration_name: string;
          rolled_back_at: string | null;
          started_at: string;
        };
        Insert: {
          applied_steps_count?: number;
          checksum: string;
          finished_at?: string | null;
          id: string;
          logs?: string | null;
          migration_name: string;
          rolled_back_at?: string | null;
          started_at?: string;
        };
        Update: {
          applied_steps_count?: number;
          checksum?: string;
          finished_at?: string | null;
          id?: string;
          logs?: string | null;
          migration_name?: string;
          rolled_back_at?: string | null;
          started_at?: string;
        };
        Relationships: [];
      };
      allowed_emails: {
        Row: {
          created_at: string;
          email: string;
        };
        Insert: {
          created_at?: string;
          email: string;
        };
        Update: {
          created_at?: string;
          email?: string;
        };
        Relationships: [];
      };
      "AU-Rooms": {
        Row: {
          Building: string;
          Campus: string | null;
          Capacity: number | null;
          EquipmentTier: string | null;
          FrontImage: string | null;
          RearImage: string | null;
          RoomType: string | null;
          SimilarVenues: string | null;
          SpecialFeatures: string | null;
          id: number;
          Name: string;
          RoomNumber: string;
        };
        Insert: {
          Building: string;
          Campus?: string | null;
          Capacity?: number | null;
          EquipmentTier?: string | null;
          FrontImage?: string | null;
          RearImage?: string | null;
          RoomType?: string | null;
          SimilarVenues?: string | null;
          SpecialFeatures?: string | null;
          id?: number;
          Name: string;
          RoomNumber?: string;
        };
        Update: {
          Building?: string;
          Campus?: string | null;
          Capacity?: number | null;
          EquipmentTier?: string | null;
          FrontImage?: string | null;
          RearImage?: string | null;
          RoomType?: string | null;
          SimilarVenues?: string | null;
          SpecialFeatures?: string | null;
          id?: number;
          Name?: string;
          RoomNumber?: string;
        };
        Relationships: [];
      };
      SignInLog: {
        Row: {
          authProvider: Database["public"]["Enums"]["AuthProvider"];
          email: string;
          id: string;
          name: string | null;
          success: boolean;
          timestamp: string;
        };
        Insert: {
          authProvider: Database["public"]["Enums"]["AuthProvider"];
          email: string;
          id: string;
          name?: string | null;
          success: boolean;
          timestamp: string;
        };
        Update: {
          authProvider?: Database["public"]["Enums"]["AuthProvider"];
          email?: string;
          id?: string;
          name?: string | null;
          success?: boolean;
          timestamp?: string;
        };
        Relationships: [];
      };
      "AU-Timings": {
        Row: {
          Campus: string;
          Class: string;
          Date: string;
          Day: string;
          EndTime: string;
          id: number;
          Room: string;
          StartTime: string;
          SubCode: string;
        };
        Insert: {
          Campus?: string;
          Class: string;
          Date?: string;
          Day: string;
          EndTime: string;
          id?: number;
          Room: string;
          StartTime: string;
          SubCode: string;
        };
        Update: {
          Campus?: string;
          Class?: string;
          Date?: string;
          Day?: string;
          EndTime?: string;
          id?: number;
          Room?: string;
          StartTime?: string;
          SubCode?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      AuthProvider: "GOOGLE" | "GITHUB" | "UNDETERMINED";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof Database },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof Database },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof Database },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof Database },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      AuthProvider: ["GOOGLE", "GITHUB", "UNDETERMINED"],
    },
  },
} as const;
