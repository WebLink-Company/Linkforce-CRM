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
          full_name: string | null
          role: 'admin' | 'manager' | 'user'
          status: 'active' | 'inactive' | 'pending'
          phone_number: string | null
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'user'
          status?: 'active' | 'inactive' | 'pending'
          phone_number?: string | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          role?: 'admin' | 'manager' | 'user'
          status?: 'active' | 'inactive' | 'pending'
          phone_number?: string | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      inventory_items: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          category_id: string | null
          unit_measure: string
          min_stock: number
          current_stock: number
          reorder_point: number
          last_restock_date: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          category_id?: string | null
          unit_measure: string
          min_stock?: number
          current_stock?: number
          reorder_point?: number
          last_restock_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          category_id?: string | null
          unit_measure?: string
          min_stock?: number
          current_stock?: number
          reorder_point?: number
          last_restock_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
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
      user_role: 'admin' | 'manager' | 'user'
      user_status: 'active' | 'inactive' | 'pending'
      movement_type: 'in' | 'out' | 'adjustment'
    }
  }
}