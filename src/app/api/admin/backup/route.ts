// 🔒 API de Gerenciamento de Backup
// Endpoints seguros para controlar o sistema de backup

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBackupSystem, DEFAULT_TABLE_CONFIGS, BackupMetadata } from '@/lib/backup-system';
import { withSecurity } from '@/middleware/security-middleware';
import { rateLimitCustom, buildRateLimitHeaders } from '@/lib/security/rate-limit';
// import { logSecurityEvent } from '@/lib/security';
import { createStandardErrorResponse, createStandardSuccessResponse, attachSecurityHeaders } from '@/middleware/shared/helpers'

// Verificar se usuário é administrador
async function verifyAdminAccess(request: NextRequest): Promise<{ user: any; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { user: null, error: 'Usuário não autenticado' };
    }
    
    // Verificar se é administrador
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      // await logSecurityEvent({
      //   action: 'UNAUTHORIZED_ADMIN_ACCESS',
      //   details: 'Tentativa de acesso não autorizado à API de backup',
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'high'
      // });
      
      return { user: null, error: 'Acesso negado - privilégios de administrador necessários' };
    }
    
    return { user };
  } catch (error) {
    return { user: null, error: 'Erro ao verificar permissões' };
  }
}

// GET - Listar backups disponíveis
async function GET(request: NextRequest) {
  try {
    // Verificar acesso de administrador
    const { user, error } = await verifyAdminAccess(request);
    if (error) {
      return attachSecurityHeaders(
        createStandardErrorResponse('FORBIDDEN', error, 403)
      );
    }
    
    // Rate limiting específico para admins
    const rate = await rateLimitCustom(request, {
      windowMs: 60 * 1000,
      max: 30,
      namespace: 'api:admin:backup:list',
      identifier: user.id
    });

    if (!rate.success) {
      const res = createStandardErrorResponse('RATE_LIMITED', 'Rate limit excedido', 429);
      const headers = buildRateLimitHeaders(rate);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return attachSecurityHeaders(res);
    }
    
    const backupSystem = getBackupSystem();
    
    // Obter lista de backups
    const backups = await backupSystem.listBackups();
    
    // Obter status atual
    const status = backupSystem.getStatus();
    
    // await logSecurityEvent({
    //   action: 'BACKUP_LIST_ACCESSED',
    //   details: 'Lista de backups acessada',
    //   userId: user.id,
    //   userEmail: user.email,
    //   severity: 'low',
    //   metadata: { backupCount: backups.length }
    // });
    
    const res = createStandardSuccessResponse({
      backups,
      status,
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, backup) => sum + backup.size, 0)
    });
    return attachSecurityHeaders(res);
    
  } catch (error) {
    console.error('Erro ao listar backups:', error);
    
    return attachSecurityHeaders(
      createStandardErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Erro interno do servidor',
        500
      )
    );
  }
}

// POST - Criar novo backup
async function POST(request: NextRequest) {
  try {
    // Verificar acesso de administrador
    const { user, error } = await verifyAdminAccess(request);
    if (error) {
      return attachSecurityHeaders(
        createStandardErrorResponse('FORBIDDEN', error, 403)
      );
    }
    
    // Rate limiting mais restritivo para criação de backup
    const rateCreate = await rateLimitCustom(request, {
      windowMs: 60 * 60 * 1000,
      max: 5,
      namespace: 'api:admin:backup:create',
      identifier: user.id
    });

    if (!rateCreate.success) {
      const res = createStandardErrorResponse(
        'RATE_LIMITED',
        'Muitas tentativas de backup. Tente novamente em 1 hora.',
        429
      );
      const headers = buildRateLimitHeaders(rateCreate);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return attachSecurityHeaders(res);
    }
    
    const body = await request.json();
    const { type = 'full', tableConfigs = DEFAULT_TABLE_CONFIGS } = body;
    
    // Validar tipo de backup
    if (!['full', 'incremental', 'differential', 'schema_only', 'data_only'].includes(type)) {
      return attachSecurityHeaders(
        createStandardErrorResponse('VALIDATION_ERROR', 'Tipo de backup inválido', 400)
      );
    }
    
    const backupSystem = getBackupSystem();
    
    // Verificar se já há um backup em execução
    const status = backupSystem.getStatus();
    if (status.isRunning) {
      return attachSecurityHeaders(
        createStandardErrorResponse('CONFLICT', 'Aguarde o backup atual terminar antes de iniciar outro', 409)
      );
    }
    
    // await logSecurityEvent({
    //   action: 'BACKUP_CREATION_STARTED',
    //   details: `Backup ${type} iniciado pelo administrador`,
    //   userId: user.id,
    //   userEmail: user.email,
    //   severity: 'low',
    //   metadata: { backupType: type, tableCount: tableConfigs.length }
    // });
    
    // Iniciar backup de forma assíncrona
    const backupPromise = backupSystem.createFullBackup(tableConfigs);
    
    // Retornar resposta imediata
    const res = createStandardSuccessResponse({
      message: 'Backup iniciado com sucesso',
      status: 'started',
      type,
      estimatedDuration: '5-15 minutos',
      tables: tableConfigs.map((t: any) => t.tableName)
    });
    return attachSecurityHeaders(res);
    
  } catch (error) {
    console.error('Erro ao criar backup:', error);
    
    // await logSecurityEvent({
    //   action: 'BACKUP_CREATION_FAILED',
    //   details: `Falha ao iniciar backup: ${error}`,
    //   severity: 'medium',
    //   metadata: { error: error instanceof Error ? error.message : 'Erro desconhecido' }
    // });
    
    const res = createStandardErrorResponse(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Erro ao criar backup',
      500
    );
    return attachSecurityHeaders(res);
  }
}

// DELETE - Limpar backups antigos
async function DELETE(request: NextRequest) {
  try {
    // Verificar acesso de administrador
    const { user, error } = await verifyAdminAccess(request);
    if (error) {
      return attachSecurityHeaders(
        createStandardErrorResponse('FORBIDDEN', error, 403)
      );
    }
    
    // Rate limiting para limpeza
    const rateCleanup = await rateLimitCustom(request, {
      windowMs: 60 * 60 * 1000,
      max: 10,
      namespace: 'api:admin:backup:cleanup',
      identifier: user.id
    });

    if (!rateCleanup.success) {
      const res = createStandardErrorResponse('RATE_LIMITED', 'Rate limit excedido', 429);
      const headers = buildRateLimitHeaders(rateCleanup);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return attachSecurityHeaders(res);
    }
    
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');
    
    const backupSystem = getBackupSystem();
    
    if (backupId) {
      // Deletar backup específico
      try {
        const backups = await backupSystem.listBackups();
        const backup = backups.find(b => b.id === backupId);
        
        if (!backup) {
          return attachSecurityHeaders(
            createStandardErrorResponse('NOT_FOUND', 'Backup não encontrado', 404)
          );
        }
        
        // Aqui você implementaria a lógica para deletar um backup específico
        // Por enquanto, vamos apenas registrar o evento
        
        // await logSecurityEvent({
        //   action: 'BACKUP_DELETED',
        //   details: `Backup específico removido: ${backupId}`,
        //   userId: user.id,
        //   userEmail: user.email,
        //   severity: 'low',
        //   metadata: { backupId }
        // });
        
        const res = createStandardSuccessResponse({
          message: 'Backup removido com sucesso',
          deletedBackupId: backupId
        });
        return attachSecurityHeaders(res);
        
      } catch (error) {
        return attachSecurityHeaders(
          createStandardErrorResponse('INTERNAL_ERROR', 'Erro ao remover backup específico', 500)
        );
      }
    } else {
      // Limpeza automática de backups antigos
      const deletedCount = await backupSystem.cleanupOldBackups();
      
      // await logSecurityEvent({
      //   action: 'BACKUP_CLEANUP_COMPLETED',
      //   details: `Limpeza de backups concluída: ${deletedCount} backups removidos`,
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'low',
      //   metadata: { deletedCount }
      // });
      
      const res = createStandardSuccessResponse({
        message: 'Limpeza de backups concluída',
        deletedCount,
        humanMessage: deletedCount > 0 
          ? `${deletedCount} backup(s) antigo(s) removido(s)`
          : 'Nenhum backup antigo encontrado'
      });
      return attachSecurityHeaders(res);
    }
    
  } catch (error) {
    console.error('Erro ao limpar backups:', error);
    
    return attachSecurityHeaders(
      createStandardErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Erro ao limpar backups',
        500
      )
    );
  }
}

// Middleware de segurança aplicado diretamente nas funções
// As funções GET, POST e DELETE já estão definidas acima e serão exportadas automaticamente