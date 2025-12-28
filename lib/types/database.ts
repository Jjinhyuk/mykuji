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
      profiles: {
        Row: {
          id: string
          display_name: string | null
          role: 'user' | 'seller' | 'admin'
          seller_handle: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          role?: 'user' | 'seller' | 'admin'
          seller_handle?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          role?: 'user' | 'seller' | 'admin'
          seller_handle?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      seller_applications: {
        Row: {
          id: string
          user_id: string
          channel_url: string
          channel_name: string | null
          memo: string | null
          status: 'pending' | 'approved' | 'rejected'
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          channel_url: string
          channel_name?: string | null
          memo?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          channel_url?: string
          channel_name?: string | null
          memo?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
        }
      }
      boards: {
        Row: {
          id: string
          seller_id: string
          title: string
          description: string | null
          status: 'draft' | 'live' | 'paused' | 'closed'
          mode: 'manual' | 'random'
          public_slug: string | null
          overlay_token: string
          sound_enabled: boolean
          theme: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          title: string
          description?: string | null
          status?: 'draft' | 'live' | 'paused' | 'closed'
          mode?: 'manual' | 'random'
          public_slug?: string | null
          overlay_token?: string
          sound_enabled?: boolean
          theme?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          title?: string
          description?: string | null
          status?: 'draft' | 'live' | 'paused' | 'closed'
          mode?: 'manual' | 'random'
          public_slug?: string | null
          overlay_token?: string
          sound_enabled?: boolean
          theme?: Json
          created_at?: string
          updated_at?: string
        }
      }
      prizes: {
        Row: {
          id: string
          board_id: string
          tier: string
          name: string
          description: string | null
          qty_total: number
          qty_left: number
          images: string[]
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          board_id: string
          tier: string
          name: string
          description?: string | null
          qty_total?: number
          qty_left?: number
          images?: string[]
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          tier?: string
          name?: string
          description?: string | null
          qty_total?: number
          qty_left?: number
          images?: string[]
          sort_order?: number
          created_at?: string
        }
      }
      draw_events: {
        Row: {
          id: string
          board_id: string
          prize_id: string | null
          viewer_name: string
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          board_id: string
          prize_id?: string | null
          viewer_name: string
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          board_id?: string
          prize_id?: string | null
          viewer_name?: string
          note?: string | null
          created_at?: string
        }
      }
      overlay_states: {
        Row: {
          board_id: string
          is_modal_open: boolean
          focused_prize_id: string | null
          show_last_result: boolean
          connection_status: string
          updated_at: string
        }
        Insert: {
          board_id: string
          is_modal_open?: boolean
          focused_prize_id?: string | null
          show_last_result?: boolean
          connection_status?: string
          updated_at?: string
        }
        Update: {
          board_id?: string
          is_modal_open?: boolean
          focused_prize_id?: string | null
          show_last_result?: boolean
          connection_status?: string
          updated_at?: string
        }
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
  }
}

// 편의를 위한 타입 별칭
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Board = Database['public']['Tables']['boards']['Row']
export type Prize = Database['public']['Tables']['prizes']['Row']
export type DrawEvent = Database['public']['Tables']['draw_events']['Row']
export type OverlayState = Database['public']['Tables']['overlay_states']['Row']
export type SellerApplication = Database['public']['Tables']['seller_applications']['Row']
