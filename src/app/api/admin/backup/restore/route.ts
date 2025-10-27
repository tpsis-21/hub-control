// 🔒 API de Restauração de Backup
// Endpoint seguro para restaurar backups com confirmação dupla

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/unified-client';
import { getBackupSystem } from '@/lib/backup-system';
import { withUnifiedMiddleware } from '@/middleware/unified-middleware';
import { rateLimitCustom, buildRateLimitHeaders } from '@/lib/security/rate-limit';
// import { logSecurityEvent } from '@/lib/security';
import { createStandardErrorResponse, createStandardSuccessResponse, attachSecurityHeaders } from '@/middleware/shared/helpers';
import crypto from 'crypto';

// Armazenamento temporário para tokens de confirmação
const confirmationTokens = new Map<string, {
  backupId: string;
  userId: string;
  expiresAt: Date;
  confirmed: boolean;
}>();

// Limpeza periódica de tokens expirados
setInterval(() => {
  const now = new Date();
  for (const [token, data] of confirmationTokens.entries()) {
    if (data.expiresAt < now) {
      confirmationTokens.delete(token);
    }
  }
}, 5 * 60 * 1000); // A cada 5 minutos

// Verificar se usuário é super administrador
async function verifySuperAdminAccess(request: NextRequest): Promise<{ user: any; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { user: null, error: 'Usuário não autenticado' };
    }
    
    // Verificar se é super administrador
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      // await logSecurityEvent({
      //   action: 'UNAUTHORIZED_RESTORE_ACCESS',
      //   details: 'Tentativa de acesso não autorizado à restauração de backup',
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'critical'
      // });
      
      return { user: null, error: 'Acesso negado - privilégios de super administrador necessários' };
    }
    
    // Super administrador tem todas as permissões
    // Verificação adicional pode ser implementada conforme necessário
    
    return { user };
  } catch (error) {
    return { user: null, error: 'Erro ao verificar permissões' };
  }
}

// POST - Iniciar processo de restauração (primeira etapa - confirmação)
async function POST(request: NextRequest) {
  try {
    // Verificar acesso de super administrador
    const { user, error } = await verifyAdminAccess(request);
    if (error) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso negado', error, 403)
      )
    }
    
    // Rate limiting muito restritivo para restauração
    const rate = await rateLimitCustom(request, {
      windowMs: 24 * 60 * 60 * 1000,
      max: 3,
      namespace: 'api:admin:backup:restore:start',
      identifier: user.id
    });

    if (!rate.success) {
      // await logSecurityEvent({
      //   action: 'RESTORE_RATE_LIMIT_EXCEEDED',
      //   details: 'Rate limit excedido para restauração de backup',
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'high'
      // });

      const res = createStandardErrorResponse('Rate limit excedido', 'Muitas tentativas de restauração. Aguarde 24 horas.', 429)
      const headers = buildRateLimitHeaders(rate);
      Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
      return attachSecurityHeaders(res);
    }
    
    const body = await request.json();
    const { backupId, confirmationPhrase } = body;
    
    // Validar entrada
    if (!backupId || typeof backupId !== 'string') {
      return attachSecurityHeaders(
        createStandardErrorResponse('Parâmetros inválidos', 'ID do backup é obrigatório.', 400)
      )
    }
    
    // Verificar se backup existe
    const backupSystem = getBackupSystem();
    const backups = await backupSystem.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      // await logSecurityEvent({
      //   action: 'RESTORE_INVALID_BACKUP',
      //   details: `Tentativa de restaurar backup inexistente: ${backupId}`,
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'medium'
      // });

      return attachSecurityHeaders(
        createStandardErrorResponse('Não encontrado', 'Backup não encontrado.', 404)
      )
     }
    
    // Verificar frase de confirmação
    const expectedPhrase = 'CONFIRMO QUE DESEJO RESTAURAR ESTE BACKUP';
    if (confirmationPhrase !== expectedPhrase) {
      // await logSecurityEvent({
      //   action: 'RESTORE_INVALID_CONFIRMATION',
      //   details: 'Frase de confirmação incorreta para restauração',
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'medium'
      // });

      return attachSecurityHeaders(
        createStandardErrorResponse('Confirmação incorreta', `Digite exatamente: "${expectedPhrase}"`, 400)
      )
     }
    
    // Gerar token de confirmação
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    
    confirmationTokens.set(confirmationToken, {
      backupId,
      userId: user.id,
      expiresAt,
      confirmed: false
    });
    
    // await logSecurityEvent({
    //   action: 'RESTORE_CONFIRMATION_REQUESTED',
    //   details: `Token de confirmação gerado para restauração: ${backupId}`,
    //   userId: user.id,
    //   userEmail: user.email,
    //   severity: 'high',
    //   metadata: { 
    //     backupId, 
    //     backupDate: backup.startTime,
    //     backupSize: backup.size,
    //     recordCount: backup.recordCount
    //   }
    // });
    
    return attachSecurityHeaders(
      createStandardSuccessResponse({
        message: 'Confirmação necessária para prosseguir',
        confirmationToken,
        expiresAt: expiresAt.toISOString(),
        backup: {
          id: backup.id,
          type: backup.type,
          startTime: backup.startTime,
          size: backup.size,
          recordCount: backup.recordCount,
          tables: backup.tables
        },
        warning: {
          message: 'ATENÇÃO: Esta operação irá SUBSTITUIR todos os dados atuais!',
          consequences: [
            'Todos os dados atuais serão perdidos',
            'A operação não pode ser desfeita',
            'O sistema ficará indisponível durante a restauração',
            'Usuários conectados serão desconectados'
          ]
        }
      })
    )
    
  } catch (error) {
    console.error('Erro ao iniciar restauração:', error);
    
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', error instanceof Error ? error.message : 'Erro desconhecido', 500)
    )
  }
}

// PUT - Confirmar e executar restauração (segunda etapa)
async function PUT(request: NextRequest) {
  try {
    // Verificar acesso de super administrador
    const { user, error } = await verifyAdminAccess(request);
    if (error) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso negado', error, 403)
      )
    }
    
    const body = await request.json();
    const { confirmationToken, finalConfirmation } = body;
    
    // Validar token de confirmação
    if (!confirmationToken || typeof confirmationToken !== 'string') {
      return attachSecurityHeaders(
        createStandardErrorResponse('Parâmetros inválidos', 'Token de confirmação é obrigatório.', 400)
      )
    }
    
    const tokenData = confirmationTokens.get(confirmationToken);
    
    if (!tokenData) {
      // await logSecurityEvent({
      //   action: 'RESTORE_INVALID_TOKEN',
      //   details: 'Token de confirmação inválido usado',
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'high'
      // });
      
      return attachSecurityHeaders(
        createStandardErrorResponse('Token inválido', 'Token de confirmação inválido ou expirado.', 400)
      )
    }
    
    // Verificar se token pertence ao usuário
    if (tokenData.userId !== user.id) {
      // await logSecurityEvent({
      //   action: 'RESTORE_TOKEN_MISMATCH',
      //   details: 'Tentativa de usar token de outro usuário',
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'critical'
      // });
      
      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso negado', 'Token não pertence ao usuário atual.', 403)
      )
     }
    
    // Verificar se token não expirou
    if (tokenData.expiresAt < new Date()) {
      confirmationTokens.delete(confirmationToken);
      
      // await logSecurityEvent({
      //   action: 'RESTORE_TOKEN_EXPIRED',
      //   details: 'Token de confirmação expirado usado',
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'medium'
      // });
      
      return attachSecurityHeaders(
        createStandardErrorResponse('Token expirado', 'Token de confirmação expirado.', 400)
      )
     }
    
    // Verificar confirmação final
    if (finalConfirmation !== 'EXECUTAR RESTAURACAO AGORA') {
      // await logSecurityEvent({
      //   action: 'RESTORE_FINAL_CONFIRMATION_FAILED',
      //   details: 'Confirmação final incorreta para restauração',
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'medium'
      // });
      
      return attachSecurityHeaders(
        createStandardErrorResponse('Confirmação incorreta', 'Digite exatamente: "EXECUTAR RESTAURACAO AGORA"', 400)
      )
     }
    
    // Marcar token como usado
    tokenData.confirmed = true;
    
    const backupSystem = getBackupSystem();
    
    // Verificar se há backup em execução
    const status = backupSystem.getStatus();
    if (status.isRunning) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Conflito', 'Aguarde o backup atual terminar antes de restaurar.', 409)
      )
    }
    
    // await logSecurityEvent({
    //   action: 'RESTORE_EXECUTION_STARTED',
    //   details: `Restauração iniciada: ${tokenData.backupId}`,
    //   userId: user.id,
    //   userEmail: user.email,
    //   severity: 'critical',
    //   metadata: { 
    //     backupId: tokenData.backupId,
    //     confirmationToken: confirmationToken.substring(0, 8) + '...' // Apenas parte do token
    //   }
    // });
    
    try {
      // Executar restauração
      await backupSystem.restoreBackup(tokenData.backupId);
      
      // Limpar token usado
      confirmationTokens.delete(confirmationToken);
      
      // await logSecurityEvent({
      //   action: 'RESTORE_EXECUTION_COMPLETED',
      //   details: `Restauração concluída com sucesso: ${tokenData.backupId}`,
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'critical',
      //   metadata: { backupId: tokenData.backupId }
      // });
      
      return attachSecurityHeaders(
        createStandardSuccessResponse({
          message: 'Restauração concluída com sucesso',
          backupId: tokenData.backupId,
          restoredAt: new Date().toISOString(),
          warning: 'Sistema restaurado. Recomenda-se reiniciar a aplicação.'
        })
      )
      
    } catch (restoreError) {
      // await logSecurityEvent({
      //   action: 'RESTORE_EXECUTION_FAILED',
      //   details: `Falha na restauração: ${tokenData.backupId} - ${restoreError}`,
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'critical',
      //   metadata: { 
      //     backupId: tokenData.backupId,
      //     error: restoreError instanceof Error ? restoreError.message : 'Erro desconhecido'
      //   }
      // });
      
      return attachSecurityHeaders(
        createStandardErrorResponse('Falha na restauração', restoreError instanceof Error ? restoreError.message : 'Erro desconhecido', 500)
      )
    }
    
  } catch (error) {
    console.error('Erro ao executar restauração:', error);
    
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', error instanceof Error ? error.message : 'Erro desconhecido', 500)
    )
  }
}

// GET - Verificar status de token de confirmação
async function GET(request: NextRequest) {
  try {
    const { user, error } = await verifyAdminAccess(request);
    if (error) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso negado', error, 403)
      )
    }
    
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Parâmetros inválidos', 'Token é obrigatório.', 400)
      )
    }
    
    const tokenData = confirmationTokens.get(token);
    
    if (!tokenData || tokenData.userId !== user.id) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Token inválido', 'Token inválido.', 404)
      )
    }
    
    const isExpired = tokenData.expiresAt < new Date();
    
    return attachSecurityHeaders(
      createStandardSuccessResponse({
        valid: !isExpired && !tokenData.confirmed,
        expired: isExpired,
        confirmed: tokenData.confirmed,
        expiresAt: tokenData.expiresAt.toISOString(),
        backupId: tokenData.backupId
      })
    )
    
  } catch (error) {
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', 'Erro interno do servidor', 500)
    )
  }
}

// Exportar as funções HTTP com middleware unificado
const POST_WITH_MIDDLEWARE = withUnifiedMiddleware(POST, {
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: true
});

const PUT_WITH_MIDDLEWARE = withUnifiedMiddleware(PUT, {
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: true
});

const GET_WITH_MIDDLEWARE = withUnifiedMiddleware(GET, {
  enablePayloadScan: false,
  enableIPBlocking: true,
  enableUserBlocking: true
});

export { POST_WITH_MIDDLEWARE as POST, PUT_WITH_MIDDLEWARE as PUT, GET_WITH_MIDDLEWARE as GET };

// Função auxiliar (corrigir referência)
async function verifyAdminAccess(request: NextRequest) {
  return verifySuperAdminAccess(request);
}
