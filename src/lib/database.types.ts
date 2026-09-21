/**
 * Generated from the live Supabase schema.
 *
 *   npx supabase gen types typescript --project-id fsjirlviqmzoqpajbosu
 *
 * Regenerate after any migration rather than editing by hand — every query in
 * the app is checked against these types, so schema drift shows up as a build
 * error instead of a runtime surprise.
 */

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
      charities: {
        Row: {
          category: string;
          created_at: string;
          description: string;
          id: string;
          image_url: string | null;
          is_active: boolean;
          is_featured: boolean;
          name: string;
          slug: string;
          tagline: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description: string;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          is_featured?: boolean;
          name: string;
          slug: string;
          tagline: string;
        };
        Update: Partial<Database["public"]["Tables"]["charities"]["Insert"]>;
      };
      charity_events: {
        Row: {
          charity_id: string;
          created_at: string;
          description: string | null;
          event_date: string;
          id: string;
          location: string | null;
          title: string;
        };
        Insert: {
          charity_id: string;
          created_at?: string;
          description?: string | null;
          event_date: string;
          id?: string;
          location?: string | null;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["charity_events"]["Insert"]>;
      };
      draw_entries: {
        Row: {
          created_at: string;
          draw_id: string;
          id: string;
          match_count: number;
          numbers: number[];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          draw_id: string;
          id?: string;
          match_count?: number;
          numbers: number[];
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["draw_entries"]["Insert"]>;
      };
      draws: {
        Row: {
          carry_in_pence: number;
          carry_out_pence: number;
          created_at: string;
          entrant_count: number;
          id: string;
          mode: string;
          numbers: number[] | null;
          period: string;
          pool_pence: number;
          published_at: string | null;
          simulated_at: string | null;
          status: string;
        };
        Insert: {
          carry_in_pence?: number;
          carry_out_pence?: number;
          created_at?: string;
          entrant_count?: number;
          id?: string;
          mode?: string;
          numbers?: number[] | null;
          period: string;
          pool_pence?: number;
          published_at?: string | null;
          simulated_at?: string | null;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["draws"]["Insert"]>;
      };
      payments: {
        Row: {
          amount_pence: number;
          charity_id: string | null;
          charity_pence: number;
          id: string;
          kind: string;
          paid_at: string;
          platform_pence: number;
          prize_pool_pence: number;
          provider_ref: string | null;
          status: string;
          subscription_id: string | null;
          user_id: string;
        };
        Insert: {
          amount_pence: number;
          charity_id?: string | null;
          charity_pence?: number;
          id?: string;
          kind?: string;
          paid_at?: string;
          platform_pence?: number;
          prize_pool_pence?: number;
          provider_ref?: string | null;
          status?: string;
          subscription_id?: string | null;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["payments"]["Insert"]>;
      };
      profiles: {
        Row: {
          charity_id: string | null;
          charity_percent: number;
          created_at: string;
          full_name: string | null;
          id: string;
          role: string;
        };
        Insert: {
          charity_id?: string | null;
          charity_percent?: number;
          created_at?: string;
          full_name?: string | null;
          id: string;
          role?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      scores: {
        Row: {
          created_at: string;
          id: string;
          played_on: string;
          user_id: string;
          value: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          played_on: string;
          user_id: string;
          value: number;
        };
        Update: Partial<Database["public"]["Tables"]["scores"]["Insert"]>;
      };
      subscriptions: {
        Row: {
          amount_pence: number;
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string;
          current_period_start: string;
          id: string;
          plan: string;
          status: string;
          user_id: string;
        };
        Insert: {
          amount_pence: number;
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end: string;
          current_period_start?: string;
          id?: string;
          plan: string;
          status: string;
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Insert"]>;
      };
      winners: {
        Row: {
          created_at: string;
          draw_id: string;
          entry_id: string;
          id: string;
          paid_at: string | null;
          payment_status: string;
          prize_pence: number;
          proof_url: string | null;
          tier: number;
          user_id: string;
          verification_note: string | null;
          verification_status: string;
        };
        Insert: {
          created_at?: string;
          draw_id: string;
          entry_id: string;
          id?: string;
          paid_at?: string | null;
          payment_status?: string;
          prize_pence: number;
          proof_url?: string | null;
          tier: number;
          user_id: string;
          verification_note?: string | null;
          verification_status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["winners"]["Insert"]>;
      };
    };
    Views: Record<never, never>;
    Functions: {
      cancel_subscription: { Args: Record<never, never>; Returns: undefined };
      donate: {
        Args: { p_charity_id: string; p_amount_pence: number; p_provider_ref?: string };
        Returns: string;
      };
      expire_lapsed_subscriptions: { Args: Record<never, never>; Returns: undefined };
      platform_stats: { Args: Record<never, never>; Returns: Json };
      charity_totals: {
        Args: Record<never, never>;
        Returns: { charity_id: string; raised_pence: number; supporters: number }[];
      };
      has_active_subscription: { Args: { uid?: string }; Returns: boolean };
      is_admin: { Args: Record<never, never>; Returns: boolean };
      plan_price: { Args: { p_plan: string }; Returns: number };
      prize_pool_share: { Args: Record<never, never>; Returns: number };
      publish_draw: { Args: { p_draw_id: string }; Returns: undefined };
      resume_subscription: { Args: Record<never, never>; Returns: undefined };
      simulate_draw: { Args: { p_period: string; p_mode?: string }; Returns: string };
      subscribe: {
        Args: {
          p_plan: string;
          p_charity_id: string;
          p_charity_percent?: number;
          p_provider_ref?: string;
        };
        Returns: string;
      };
      update_charity_choice: {
        Args: { p_charity_id: string; p_charity_percent: number };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

/** Shorthand: `Tables<"scores">` is a row of the scores table. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

// Domain aliases used across the app.
export type Charity = Tables<"charities">;
export type CharityEvent = Tables<"charity_events">;
export type Draw = Tables<"draws">;
export type DrawEntry = Tables<"draw_entries">;
export type Payment = Tables<"payments">;
export type Profile = Tables<"profiles">;
export type Score = Tables<"scores">;
export type Subscription = Tables<"subscriptions">;
export type Winner = Tables<"winners">;

export type SubscriptionStatus = "active" | "cancelled" | "lapsed";
export type DrawStatus = "draft" | "simulated" | "published";
export type DrawMode = "random" | "weighted";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type PaymentStatus = "pending" | "paid";
