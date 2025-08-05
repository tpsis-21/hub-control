// src/lib/database.types.ts
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
      clients: {
        Row: {
          id: string
          name: string
          iptv_username: string
          iptv_user_id: string | null
          iptv_password: string | null
          manager_id: string | null
          email: string | null
          whatsapp: string | null
          start_date: string
          expiration_date: string
          status: 'Ativo' | 'Em teste' | 'Inativo' | 'Bloqueado'
          plan_id: string
          server_id: string | null
          notes: string | null
          payment_history: Json | null
          unique_link: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          iptv_username: string
          iptv_user_id?: string | null
          iptv_password?: string | null
          manager_id?: string | null
          email?: string | null
          whatsapp?: string | null
          start_date: string
          expiration_date: string
          status: 'Ativo' | 'Em teste' | 'Inativo' | 'Bloqueado'
          plan_id: string
          server_id?: string | null
          notes?: string | null
          payment_history?: Json | null
          unique_link?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          iptv_username?: string
          iptv_user_id?: string | null
          iptv_password?: string | null
          manager_id?: string | null
          email?: string | null
          whatsapp?: string | null
          start_date?: string
          expiration_date?: string
          status?: 'Ativo' | 'Em teste' | 'Inativo' | 'Bloqueado'
          plan_id?: string
          server_id?: string | null
          notes?: string | null
          payment_history?: Json | null
          unique_link?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_server_id_fkey"
            columns: ["server_id"]
            referencedRelation: "servers"
            referencedColumns: ["id"]
          }
        ]
      }
      plans: {
        Row: {
          id: string
          name: string
          price: number
          price_before_discount: number | null
          validity: number
          screens: number
          panel_plan_id: string | null
          restrictions: string | null
          send_welcome_message: boolean
          is_public: boolean
          group_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          price_before_discount?: number | null
          validity: number
          screens: number
          panel_plan_id?: string | null
          restrictions?: string | null
          send_welcome_message?: boolean
          is_public?: boolean
          group_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          price_before_discount?: number | null
          validity?: number
          screens?: number
          panel_plan_id?: string | null
          restrictions?: string | null
          send_welcome_message?: boolean
          is_public?: boolean
          group_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "plan_groups"
            referencedColumns: ["id"]
          }
        ]
      }
      plan_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      servers: {
        Row: {
          id: string
          name: string
          url: string | null
          api_key: string | null
          status: 'Online' | 'Offline' | 'Instável'
          integration_type: 'generic' | 'pixbot' | 'natv' | 'none'
          test_automation: boolean
          test_config: Json | null
          renewal_automation: boolean
          payment_gateway: boolean
          send_expiration_reminder: boolean
          send_usage_instructions: boolean
          credits: number | null
          last_credits_sync: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          url?: string | null
          api_key?: string | null
          status: 'Online' | 'Offline' | 'Instável'
          integration_type: 'generic' | 'pixbot' | 'natv' | 'none'
          test_automation?: boolean
          test_config?: Json | null
          renewal_automation?: boolean
          payment_gateway?: boolean
          send_expiration_reminder?: boolean
          send_usage_instructions?: boolean
          credits?: number | null
          last_credits_sync?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string | null
          api_key?: string | null
          status?: 'Online' | 'Offline' | 'Instável'
          integration_type?: 'generic' | 'pixbot' | 'natv' | 'none'
          test_automation?: boolean
          test_config?: Json | null
          renewal_automation?: boolean
          payment_gateway?: boolean
          send_expiration_reminder?: boolean
          send_usage_instructions?: boolean
          credits?: number | null
          last_credits_sync?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      },
      knowledge_base_articles: {
        Row: {
          id: string
          title: string
          content: string
          category: string
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          category: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      },
      settings: {
        Row: {
          id: string
          bot_api_key: string | null
          company_name: string | null
          company_logo: string | null
          primary_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bot_api_key?: string | null
          company_name?: string | null
          company_logo?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bot_api_key?: string | null
          company_name?: string | null
          company_logo?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          type: 'email' | 'whatsapp'
          event: 'welcome' | 'expiration_reminder' | 'payment_confirmation' | 'test_created'
          days_before_expiration: number | null
          subject: string | null
          message: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'email' | 'whatsapp'
          event: 'welcome' | 'expiration_reminder' | 'payment_confirmation' | 'test_created'
          days_before_expiration?: number | null
          subject?: string | null
          message: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'email' | 'whatsapp'
          event?: 'welcome' | 'expiration_reminder' | 'payment_confirmation' | 'test_created'
          days_before_expiration?: number | null
          subject?: string | null
          message?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          client_id: string
          date: string
          amount: number
          status: 'Pago' | 'Pendente' | 'Atrasado'
          plan_id: string
          transaction_id: string | null
          payment_method: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          date: string
          amount: number
          status: 'Pago' | 'Pendente' | 'Atrasado'
          plan_id: string
          transaction_id?: string | null
          payment_method?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          date?: string
          amount?: number
          status?: 'Pago' | 'Pendente' | 'Atrasado'
          plan_id?: string
          transaction_id?: string | null
          payment_method?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            referencedRelation: "plans"
            referencedColumns: ["id"]
          }
        ]
      },
      profiles: {
        Row: {
          id: string // UUID do usuário (igual ao id do auth.users)
          role: 'admin' | 'user'
          approved: boolean // Novo campo para aprovação do usuário
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: 'admin' | 'user'
          approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'user'
          approved?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      },
      marketing_campaigns: {
        Row: {
          id: string
          name: string
          subject: string
          html_content: string
          text_content: string | null
          status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
          segmentation: Json
          metrics: Json
          scheduled_at: string | null
          sent_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          subject: string
          html_content: string
          text_content?: string | null
          status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
          segmentation?: Json
          metrics?: Json
          scheduled_at?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          html_content?: string
          text_content?: string | null
          status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'
          segmentation?: Json
          metrics?: Json
          scheduled_at?: string | null
          sent_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      },
      email_templates: {
        Row: {
          id: string
          name: string
          subject: string
          html_content: string
          text_content: string | null
          variables: string[]
          category: string | null
          is_system: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          subject: string
          html_content: string
          text_content?: string | null
          variables?: string[]
          category?: string | null
          is_system?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          subject?: string
          html_content?: string
          text_content?: string | null
          variables?: string[]
          category?: string | null
          is_system?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      },
      automation_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger: Json
          conditions: Json
          actions: Json
          is_active: boolean
          execution_count: number
          last_executed: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger: Json
          conditions?: Json
          actions: Json
          is_active?: boolean
          execution_count?: number
          last_executed?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          trigger?: Json
          conditions?: Json
          actions?: Json
          is_active?: boolean
          execution_count?: number
          last_executed?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      },
      email_logs: {
        Row: {
          id: string
          campaign_id: string | null
          client_id: string | null
          email: string
          subject: string | null
          status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed'
          sent_at: string | null
          delivered_at: string | null
          opened_at: string | null
          clicked_at: string | null
          bounced_at: string | null
          error_message: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id?: string | null
          client_id?: string | null
          email: string
          subject?: string | null
          status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed'
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          bounced_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string | null
          client_id?: string | null
          email?: string
          subject?: string | null
          status?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed'
          sent_at?: string | null
          delivered_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          bounced_at?: string | null
          error_message?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      },
      smtp_configs: {
        Row: {
          id: string
          name: string
          host: string
          port: number
          secure: boolean
          username: string
          password: string
          from_email: string
          from_name: string | null
          is_default: boolean
          is_active: boolean
          last_tested: string | null
          test_result: Json | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          host: string
          port: number
          secure?: boolean
          username: string
          password: string
          from_email: string
          from_name?: string | null
          is_default?: boolean
          is_active?: boolean
          last_tested?: string | null
          test_result?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          host?: string
          port?: number
          secure?: boolean
          username?: string
          password?: string
          from_email?: string
          from_name?: string | null
          is_default?: boolean
          is_active?: boolean
          last_tested?: string | null
          test_result?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      },
      unsubscribe_records: {
        Row: {
          id: string
          email: string
          campaign_id: string | null
          reason: string | null
          unsubscribed_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          email: string
          campaign_id?: string | null
          reason?: string | null
          unsubscribed_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          email?: string
          campaign_id?: string | null
          reason?: string | null
          unsubscribed_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      },
      deliverability_metrics: {
        Row: {
          id: string
          date: string
          emails_sent: number
          emails_delivered: number
          emails_bounced: number
          emails_opened: number
          emails_clicked: number
          spam_complaints: number
          unsubscribes: number
          delivery_rate: number | null
          open_rate: number | null
          click_rate: number | null
          bounce_rate: number | null
          spam_rate: number | null
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          emails_sent?: number
          emails_delivered?: number
          emails_bounced?: number
          emails_opened?: number
          emails_clicked?: number
          spam_complaints?: number
          unsubscribes?: number
          delivery_rate?: number | null
          open_rate?: number | null
          click_rate?: number | null
          bounce_rate?: number | null
          spam_rate?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          emails_sent?: number
          emails_delivered?: number
          emails_bounced?: number
          emails_opened?: number
          emails_clicked?: number
          spam_complaints?: number
          unsubscribes?: number
          delivery_rate?: number | null
          open_rate?: number | null
          click_rate?: number | null
          bounce_rate?: number | null
          spam_rate?: number | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}