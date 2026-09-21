/**
 * Types for the Supabase schema.
 *
 *   npx supabase gen types typescript --project-id fsjirlviqmzoqpajbosu
 *
 * Regenerate after any migration rather than editing by hand — every query in
 * the app is checked against these types, so schema drift shows up as a build
 * error instead of a runtime surprise.
 *
 * Each table's Insert shape is declared as its own type and the Update shape
 * derived from it. Writing `Partial<Database[...]>` inline would make the
 * Database type self-referential, which quietly collapses supabase-js's
 * inference to `never` at the call sites.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type CharityInsert = {
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

type CharityEventInsert = {
  charity_id: string;
  created_at?: string;
  description?: string | null;
  event_date: string;
  id?: string;
  location?: string | null;
  title: string;
};

type DrawInsert = {
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

type DrawEntryInsert = {
  created_at?: string;
  draw_id: string;
  id?: string;
  match_count?: number;
  numbers: number[];
  user_id: string;
};

type PaymentInsert = {
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

type ProfileInsert = {
  charity_id?: string | null;
  charity_percent?: number;
  created_at?: string;
  full_name?: string | null;
  id: string;
  role?: string;
};

type ScoreInsert = {
  created_at?: string;
  id?: string;
  played_on: string;
  user_id: string;
  value: number;
};

type SubscriptionInsert = {
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

type WinnerInsert = {
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

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
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
        Insert: CharityInsert;
        Update: Partial<CharityInsert>;
        Relationships: [];
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
        Insert: CharityEventInsert;
        Update: Partial<CharityEventInsert>;
        Relationships: [];
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
        Insert: DrawEntryInsert;
        Update: Partial<DrawEntryInsert>;
        Relationships: [];
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
        Insert: DrawInsert;
        Update: Partial<DrawInsert>;
        Relationships: [];
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
        Insert: PaymentInsert;
        Update: Partial<PaymentInsert>;
        Relationships: [];
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
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
        Relationships: [];
      };
      scores: {
        Row: {
          created_at: string;
          id: string;
          played_on: string;
          user_id: string;
          value: number;
        };
        Insert: ScoreInsert;
        Update: Partial<ScoreInsert>;
        Relationships: [];
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
        Insert: SubscriptionInsert;
        Update: Partial<SubscriptionInsert>;
        Relationships: [];
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
        Insert: WinnerInsert;
        Update: Partial<WinnerInsert>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      cancel_subscription: { Args: Record<PropertyKey, never>; Returns: undefined };
      charity_totals: {
        Args: Record<PropertyKey, never>;
        Returns: { charity_id: string; raised_pence: number; supporters: number }[];
      };
      donate: {
        Args: { p_charity_id: string; p_amount_pence: number; p_provider_ref?: string };
        Returns: string;
      };
      expire_lapsed_subscriptions: { Args: Record<PropertyKey, never>; Returns: undefined };
      has_active_subscription: { Args: { uid?: string }; Returns: boolean };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      plan_price: { Args: { p_plan: string }; Returns: number };
      platform_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      prize_pool_share: { Args: Record<PropertyKey, never>; Returns: number };
      publish_draw: { Args: { p_draw_id: string }; Returns: undefined };
      resume_subscription: { Args: Record<PropertyKey, never>; Returns: undefined };
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
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
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
