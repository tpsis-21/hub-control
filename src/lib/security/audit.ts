// @/lib/security/audit.ts
// "use server";

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { logger } from '@/utils/production-logger'

/**
 * Interface para logs de auditoria
 */
export interface AuditLogEntry {
  action: string;
  userId: string | null;
  ip: string;
  userAgent: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Tipos de ações auditáveis
 */
export const AUDIT_ACTIONS = {
  // Autenticação
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET: 'PASSWORD_RESET',
  
  // Autorização
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  AUTHORIZED_ACCESS: 'AUTHORIZED_ACCESS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Segurança
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  CSRF_TOKEN_MISMATCH: 'CSRF_TOKEN_MISMATCH',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  SECURITY_MIDDLEWARE_ERROR: 'SECURITY_MIDDLEWARE_ERROR',
  
  // Dados
  DATA_ACCESS: 'DATA_ACCESS',
  DATA_MODIFICATION: 'DATA_MODIFICATION',
  DATA_DELETION: 'DATA_DELETION',
  DATA_EXPORT: 'DATA_EXPORT',
  
  // Sistema
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CONFIGURATION_CHANGE: 'CONFIGURATION_CHANGE',
  BACKUP_CREATED: 'BACKUP_CREATED',
  BACKUP_RESTORED: 'BACKUP_RESTORED'
} as const;

/**
 * Registra um evento de auditoria no banco de dados
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    const auditEntry = {
      action: entry.action,
      user_id: entry.userId,
      ip_address: entry.ip,
      user_agent: entry.userAgent,
      details: entry.details || {},
      created_at: entry.timestamp || new Date().toISOString()
    };
    
    // Inserir no banco de dados
    const { error } = await supabase
      .from('audit_logs')
      .insert([auditEntry]);
    
    if (error) {
      console.error('Erro ao registrar log de auditoria:', error);
      // Fallback: registrar no console se o banco falhar
      console.log('AUDIT_LOG:', JSON.stringify(auditEntry, null, 2));
    }
  } catch (error) {
    console.error('Erro crítico no sistema de auditoria:', error);
    // Fallback: registrar no console
    console.log('AUDIT_LOG_FALLBACK:', JSON.stringify(entry, null, 2));
  }
}

/**
 * Busca logs de auditoria com filtros
 */
export async function getAuditLogs({
  userId,
  action,
  startDate,
  endDate,
  limit = 100,
  offset = 0
}: {
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
} = {}) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (action) {
      query = query.eq('action', action);
    }
    
    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }
    
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return { data: [], error };
    }
    
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Erro crítico ao buscar logs de auditoria:', error);
    return { data: [], error };
  }
}

/**
 * Analisa padrões suspeitos nos logs de auditoria
 */
export async function detectSuspiciousActivity(userId?: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    
    // Buscar tentativas de login falhadas nas últimas 24 horas
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('action', AUDIT_ACTIONS.LOGIN_FAILED)
      .gte('created_at', oneDayAgo.toISOString());
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: failedLogins, error } = await query;
    
    if (error) {
      console.error('Erro ao detectar atividade suspeita:', error);
      return { suspicious: false, details: null };
    }
    
    // Analisar padrões suspeitos
    const suspiciousPatterns = {
      multipleFailedLogins: (failedLogins?.length || 0) > 5,
      rapidFailedAttempts: false,
      unusualIpAddresses: false
    };
    
    // Verificar tentativas rápidas (mais de 3 em 5 minutos)
    if (failedLogins && failedLogins.length > 3) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentAttempts = failedLogins.filter(
        log => new Date(log.created_at) > fiveMinutesAgo
      );
      suspiciousPatterns.rapidFailedAttempts = recentAttempts.length > 3;
    }
    
    // Verificar IPs incomuns
    if (failedLogins && failedLogins.length > 0) {
      const uniqueIps = new Set(failedLogins.map(log => log.ip_address));
      suspiciousPatterns.unusualIpAddresses = uniqueIps.size > 3;
    }
    
    const isSuspicious = Object.values(suspiciousPatterns).some(Boolean);
    
    if (isSuspicious) {
      await auditLog({
        action: AUDIT_ACTIONS.SUSPICIOUS_ACTIVITY,
        userId: userId ?? null,
        ip: 'system',
        userAgent: 'audit-system',
        details: {
          patterns: suspiciousPatterns,
          failedLoginCount: failedLogins?.length || 0
        }
      });
    }
    
    return {
      suspicious: isSuspicious,
      details: suspiciousPatterns
    };
  } catch (error) {
    console.error('Erro ao detectar atividade suspeita:', error);
    return { suspicious: false, details: null };
  }
}

/**
 * Remove logs antigos com base na política de retenção
 */
export async function cleanupOldAuditLogs() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Retenção de 1 ano por padrão
    const retentionDays = 365;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error('Erro ao remover logs antigos:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao executar limpeza de logs:', error);
    return { success: false, error };
  }
}
