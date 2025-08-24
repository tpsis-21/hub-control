// src/lib/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Tipo para severidade de segurança
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

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
      financial_transactions: {
        Row: {
          id: string
          type: 'income' | 'expense'
          description: string
          amount: number
          category: string
          transaction_date: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: 'income' | 'expense'
          description: string
          amount: number
          category: string
          transaction_date: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: 'income' | 'expense'
          description?: string
          amount?: number
          category?: string
          transaction_date?: string
          notes?: string | null
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
          server_ids: string[] | null
          visible_to_all_servers: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          content: string
          category: string
          is_public?: boolean
          server_ids?: string[] | null
          visible_to_all_servers?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          content?: string
          category?: string
          is_public?: boolean
          server_ids?: string[] | null
          visible_to_all_servers?: boolean
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
          primary_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bot_api_key?: string | null
          company_name?: string | null
          primary_color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bot_api_key?: string | null
          company_name?: string | null
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
          status: 'Pago' | 'Pendente' | 'Atrasado' | 'Aguardando' | 'Confirmado' | 'Recusado' | 'Pendente de ativação manual' | 'Ativado'
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
          status: 'Pago' | 'Pendente' | 'Atrasado' | 'Aguardando' | 'Confirmado' | 'Recusado' | 'Pendente de ativação manual' | 'Ativado'
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
          status?: 'Pago' | 'Pendente' | 'Atrasado' | 'Aguardando' | 'Confirmado' | 'Recusado' | 'Pendente de ativação manual' | 'Ativado'
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
          user_id: string // Referência ao auth.users
          role: 'admin' | 'user'
          approved: boolean // Novo campo para aprovação do usuário
          full_name?: string | null
          phone?: string | null
          company?: string | null
          avatar_url?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_id: string
          role?: 'admin' | 'user'
          approved?: boolean
          full_name?: string | null
          phone?: string | null
          company?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'user'
          approved?: boolean
          full_name?: string | null
          phone?: string | null
          company?: string | null
          avatar_url?: string | null
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
      in_app_notifications: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          type: 'payment_activated' | 'payment_pending' | 'payment_confirmed' | 'system'
          title: string
          message: string
          data: Json | null
          read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id?: string | null
          type: 'payment_activated' | 'payment_pending' | 'payment_confirmed' | 'system'
          title: string
          message: string
          data?: Json | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string | null
          type?: 'payment_activated' | 'payment_pending' | 'payment_confirmed' | 'system'
          title?: string
          message?: string
          data?: Json | null
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string | null
          record_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name?: string | null
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string | null
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh_key: string
          auth_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh_key: string
          auth_key: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh_key?: string
          auth_key?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      integration_configs: {
        Row: {
          id: string
          provider: string
          name: string
          base_url: string | null
          auth_token: string | null
          auth_type: string
          config_data: Json | null
          is_active: boolean
          is_default: boolean
          rate_limit_per_minute: number | null
          rate_limit_per_day: number | null
          last_used_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          provider: string
          name: string
          base_url?: string | null
          auth_token?: string | null
          auth_type?: string
          config_data?: Json | null
          is_active?: boolean
          is_default?: boolean
          rate_limit_per_minute?: number | null
          rate_limit_per_day?: number | null
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          provider?: string
          name?: string
          base_url?: string | null
          auth_token?: string | null
          auth_type?: string
          config_data?: Json | null
          is_active?: boolean
          is_default?: boolean
          rate_limit_per_minute?: number | null
          rate_limit_per_day?: number | null
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          id: string
          type: string
          user_id: string | null
          ip: string | null
          user_agent: string | null
          resource: string | null
          action: string
          details: Json | null
          timestamp: string
          severity: SecuritySeverity
          compliance: Json | null
          data_classification: 'public' | 'internal' | 'confidential' | 'restricted'
          retention_period: number
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          user_id?: string | null
          ip?: string | null
          user_agent?: string | null
          resource?: string | null
          action: string
          details?: Json | null
          timestamp?: string
          severity?: SecuritySeverity
          compliance?: Json | null
          data_classification?: 'public' | 'internal' | 'confidential' | 'restricted'
          retention_period?: number
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          user_id?: string | null
          ip?: string | null
          user_agent?: string | null
          resource?: string | null
          action?: string
          details?: Json | null
          timestamp?: string
          severity?: SecuritySeverity
          compliance?: Json | null
          data_classification?: 'public' | 'internal' | 'confidential' | 'restricted'
          retention_period?: number
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          id: string
          type: string
          severity: SecuritySeverity
          source: string
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          details: Json | null
          metadata: Json | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          severity?: SecuritySeverity
          source: string
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          details?: Json | null
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          severity?: SecuritySeverity
          source?: string
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          details?: Json | null
          metadata?: Json | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_reports: {
        Row: {
          id: string
          framework: string
          period_start: string
          period_end: string
          status: 'draft' | 'in_progress' | 'completed' | 'failed'
          score: number | null
          findings: Json | null
          recommendations: Json | null
          metadata: Json | null
          generated_at: string
          generated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          framework: string
          period_start: string
          period_end: string
          status?: 'draft' | 'in_progress' | 'completed' | 'failed'
          score?: number | null
          findings?: Json | null
          recommendations?: Json | null
          metadata?: Json | null
          generated_at?: string
          generated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          framework?: string
          period_start?: string
          period_end?: string
          status?: 'draft' | 'in_progress' | 'completed' | 'failed'
          score?: number | null
          findings?: Json | null
          recommendations?: Json | null
          metadata?: Json | null
          generated_at?: string
          generated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
       }
       workflows: {
         Row: {
           id: string
           name: string
           description: string
           type: string
           version: string
           status: string
           config: Json
           triggers: Json
           actions: Json
           flow: Json
           variables: Json
           access: Json
           metadata: Json
           created_at: string
           updated_at: string
         }
         Insert: {
           id?: string
           name: string
           description: string
           type: string
           version: string
           status: string
           config: Json
           triggers: Json
           actions: Json
           flow: Json
           variables: Json
           access: Json
           metadata: Json
           created_at?: string
           updated_at?: string
         }
         Update: {
           id?: string
           name?: string
           description?: string
           type?: string
           version?: string
           status?: string
           config?: Json
           triggers?: Json
           actions?: Json
           flow?: Json
           variables?: Json
           access?: Json
           metadata?: Json
           created_at?: string
           updated_at?: string
         }
         Relationships: []
       }
       workflow_executions: {
         Row: {
           id: string
           workflow_id: string
           workflow_version: string
           status: string
           context: Json
           progress: Json
           results: Json
           control: Json
           metadata: Json
           created_at: string
           updated_at: string
         }
         Insert: {
           id?: string
           workflow_id: string
           workflow_version: string
           status: string
           context: Json
           progress: Json
           results: Json
           control: Json
           metadata: Json
           created_at?: string
           updated_at?: string
         }
         Update: {
           id?: string
           workflow_id?: string
           workflow_version?: string
           status?: string
           context?: Json
           progress?: Json
           results?: Json
           control?: Json
           metadata?: Json
           created_at?: string
           updated_at?: string
         }
         Relationships: [
           {
             foreignKeyName: "workflow_executions_workflow_id_fkey"
             columns: ["workflow_id"]
             isOneToOne: false
             referencedRelation: "workflows"
             referencedColumns: ["id"]
           }
         ]
       }
       performance_metrics: {
         Row: {
           id: string
           type: string
           value: number
           unit: string
           timestamp: string
           source: string
           metadata: Json | null
           tags: string[] | null
           created_at: string
         }
         Insert: {
           id?: string
           type: string
           value: number
           unit: string
           timestamp?: string
           source: string
           metadata?: Json | null
           tags?: string[] | null
           created_at?: string
         }
         Update: {
           id?: string
           type?: string
           value?: number
           unit?: string
           timestamp?: string
           source?: string
           metadata?: Json | null
           tags?: string[] | null
           created_at?: string
         }
         Relationships: []
       }
       analytics_events: {
         Row: {
           id: string
           type: string
           timestamp: string
           user_id: string | null
           session_id: string | null
           value: number
           unit: string
           dimensions: Json
           metadata: Json
           processed: boolean
           processed_at: string | null
           created_at: string
         }
         Insert: {
           id: string
           type: string
           timestamp?: string
           user_id?: string | null
           session_id?: string | null
           value?: number
           unit?: string
           dimensions?: Json
           metadata?: Json
           processed?: boolean
           processed_at?: string | null
           created_at?: string
         }
         Update: {
           id?: string
           type?: string
           timestamp?: string
           user_id?: string | null
           session_id?: string | null
           value?: number
           unit?: string
           dimensions?: Json
           metadata?: Json
           processed?: boolean
           processed_at?: string | null
           created_at?: string
         }
         Relationships: []
       }
       analytics_reports: {
         Row: {
           id: string
           name: string
           description: string | null
           type: string
           query: Json
           visualization: Json
           schedule: Json | null
           alerts: Json | null
           access: Json
           metadata: Json
           created_at: string
           updated_at: string
         }
         Insert: {
           id: string
           name: string
           description?: string | null
           type: string
           query: Json
           visualization?: Json
           schedule?: Json | null
           alerts?: Json | null
           access?: Json
           metadata?: Json
           created_at?: string
           updated_at?: string
         }
         Update: {
           id?: string
           name?: string
           description?: string | null
           type?: string
           query?: Json
           visualization?: Json
           schedule?: Json | null
           alerts?: Json | null
           access?: Json
           metadata?: Json
           created_at?: string
           updated_at?: string
         }
         Relationships: []
       }
       analytics_dashboards: {
         Row: {
           id: string
           name: string
           description: string | null
           widgets: Json
           layout: Json
           filters: Json
           access: Json
           metadata: Json
           created_at: string
           updated_at: string
         }
         Insert: {
           id: string
           name: string
           description?: string | null
           widgets?: Json
           layout?: Json
           filters?: Json
           access?: Json
           metadata?: Json
           created_at?: string
           updated_at?: string
         }
         Update: {
           id?: string
           name?: string
           description?: string | null
           widgets?: Json
           layout?: Json
           filters?: Json
           access?: Json
           metadata?: Json
           created_at?: string
           updated_at?: string
         }
         Relationships: []
       }
       system_config: {
         Row: {
           id: string
           key: string
           value: Json
           description: string | null
           category: string | null
           is_public: boolean
           created_at: string
           updated_at: string
         }
         Insert: {
           id?: string
           key: string
           value: Json
           description?: string | null
           category?: string | null
           is_public?: boolean
           created_at?: string
           updated_at?: string
         }
         Update: {
           id?: string
           key?: string
           value?: Json
           description?: string | null
           category?: string | null
           is_public?: boolean
           created_at?: string
           updated_at?: string
         }
         Relationships: []
       }
      }
       Views: {}
    Functions: {
      exec_sql: {
        Args: {
          sql_query: string
        }
        Returns: void
      }
      get_notification_delivery_summary: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          sent: number
          delivered: number
          failed: number
          pending: number
          delivery_rate: number
          avg_processing_time: number
          by_channel: Json
          by_type: Json
          by_priority: Json
        }
      }
      check_notification_system_health: {
        Args: {}
        Returns: {
          status: string
          delivery_rate: number
          pending_notifications: number
          failed_notifications_last_hour: number
          average_processing_time_ms: number
          active_channels: number
          total_channels: number
          issues: string[]
        }
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}