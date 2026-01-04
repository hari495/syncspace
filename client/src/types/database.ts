export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workspaces: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          joined_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: 'owner' | 'editor' | 'viewer'
          joined_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: 'owner' | 'editor' | 'viewer'
          joined_at?: string
        }
      }
      invite_tokens: {
        Row: {
          id: string
          workspace_id: string
          token: string
          created_by: string
          expires_at: string | null
          max_uses: number | null
          current_uses: number
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          token: string
          created_by: string
          expires_at?: string | null
          max_uses?: number | null
          current_uses?: number
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          token?: string
          created_by?: string
          expires_at?: string | null
          max_uses?: number | null
          current_uses?: number
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      use_invite_token: {
        Args: {
          token_value: string
        }
        Returns: string
      }
    }
    Enums: {}
  }
}
