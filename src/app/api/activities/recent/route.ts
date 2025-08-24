// @/app/api/activities/recent/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { LoggerService } from '@/services/logger.service';
import { memoryCache, generateCacheKey } from '@/lib/cache';
import { systemMonitor, MonitoringUtils } from '@/lib/monitoring';

/**
 * API para buscar atividades recentes do sistema
 * Esta API é otimizada para o dashboard e não requer permissões de admin
 * Retorna apenas informações básicas e não sensíveis
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // Máximo 50
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const offset = (page - 1) * limit;

    // Gerar chave de cache baseada nos parâmetros
    const cacheKey = generateCacheKey('activities:recent', {
      limit,
      page,
      offset
    });

    // Tentar buscar do cache primeiro
    const cachedResult = memoryCache.get(cacheKey);
    if (cachedResult) {
      MonitoringUtils.recordCache(true, '/api/activities/recent');
      LoggerService.info(
        'Atividades recentes retornadas do cache',
        'api/activities/recent',
        { cacheKey, page, limit }
      );
      return NextResponse.json(cachedResult);
    }
    
    MonitoringUtils.recordCache(false, '/api/activities/recent');

    const supabase = await createServerSupabaseClient();
    
    // Esta API é pública para o dashboard, mas com dados limitados e seguros
    // Não requer autenticação para permitir visualização básica de atividades

    // Buscar atividades recentes de forma segura
    // Usando uma query que não expõe dados sensíveis
    const { data: activities, error: activitiesError } = await supabase
      .from('audit_logs')
      .select(`
        id,
        created_at,
        action,
        table_name,
        severity,
        metadata
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (activitiesError) {
      // Se não conseguir acessar audit_logs, retornar atividades simuladas
      // para não quebrar o dashboard
      const mockActivities = generateMockActivities(limit);
      
      LoggerService.warn(
        'Não foi possível acessar audit_logs, retornando atividades simuladas',
        'api/activities/recent',
        { error: activitiesError.message }
      );
      
      const mockResult = {
        success: true,
        activities: mockActivities,
        total: mockActivities.length,
        page,
        limit,
        hasMore: false,
        source: 'mock' // Indica que são dados simulados
      };

      // Cache dados mock por menos tempo (1 minuto) para tentar buscar dados reais mais frequentemente
      memoryCache.set(cacheKey, mockResult, 1);
      
      // Registrar uso de dados simulados
      systemMonitor.recordMockDataUsage('/api/activities/recent');
      
      return NextResponse.json(mockResult);
    }

    // Processar e sanitizar as atividades
    const processedActivities = activities?.map(activity => ({
      id: activity.id,
      created_at: activity.created_at,
      action: activity.action || 'Ação desconhecida',
      table_name: activity.table_name,
      severity: activity.severity || 'INFO',
      description: generateActivityDescription(activity),
      user_email: 'Usuário do sistema', // Não expor emails reais
      user_role: 'user', // Não expor roles reais
      metadata: sanitizeMetadata(activity.metadata)
    })) || [];

    // Calcular se há mais páginas
    const hasMore = activities?.length === limit;

    const result = {
      success: true,
      activities: processedActivities,
      total: processedActivities.length,
      page,
      limit,
      hasMore,
      source: 'database'
    };

    // Armazenar no cache por 3 minutos (dados do banco mudam com menos frequência)
    memoryCache.set(cacheKey, result, 3);
    
    // Registrar uso de dados reais
    systemMonitor.recordRealDataUsage('/api/activities/recent');
    
    LoggerService.info(
      'Atividades recentes buscadas do banco e armazenadas no cache',
      'api/activities/recent',
      { cacheKey, activitiesCount: processedActivities.length }
    );

    return NextResponse.json(result);

  } catch (error) {
    LoggerService.error(
      'Erro interno na API de atividades recentes',
      'api/activities/recent',
      error
    );

    // Em caso de erro, retornar atividades simuladas para não quebrar o dashboard
    const mockActivities = generateMockActivities(10);
    
    // Registrar uso de dados simulados devido a erro
    systemMonitor.recordMockDataUsage('/api/activities/recent');
    MonitoringUtils.createAlert(
      'ERROR',
      'Erro na API de atividades - usando dados simulados',
      { endpoint: '/api/activities/recent', error: error instanceof Error ? error.message : 'Erro desconhecido' }
    );
    
    return NextResponse.json({
      success: true,
      activities: mockActivities,
      total: mockActivities.length,
      page: 1,
      limit: 10,
      hasMore: false,
      source: 'mock',
      warning: 'Dados simulados devido a erro interno'
    });
  }
}

/**
 * Gera uma descrição amigável para a atividade
 */
function generateActivityDescription(activity: any): string {
  const action = activity.action || 'UNKNOWN';
  const tableName = activity.table_name || 'sistema';
  
  const descriptions: Record<string, string> = {
    'LOGIN': 'Usuário fez login no sistema',
    'LOGOUT': 'Usuário fez logout do sistema',
    'CREATE': `Novo registro criado em ${tableName}`,
    'UPDATE': `Registro atualizado em ${tableName}`,
    'DELETE': `Registro removido de ${tableName}`,
    'VIEW': `Dados visualizados em ${tableName}`,
    'EXPORT': `Dados exportados de ${tableName}`,
    'IMPORT': `Dados importados para ${tableName}`,
    'FAILED_LOGIN': 'Tentativa de login falhada',
    'PASSWORD_CHANGE': 'Senha alterada',
    'PROFILE_UPDATE': 'Perfil atualizado',
    'SETTINGS_CHANGE': 'Configurações alteradas'
  };
  
  return descriptions[action] || `Ação ${action} realizada no sistema`;
}

/**
 * Remove dados sensíveis dos metadados
 */
function sanitizeMetadata(metadata: any): Record<string, any> {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  
  const sanitized: Record<string, any> = {};
  
  // Lista de campos seguros para exibir
  const safeFields = [
    'action_type',
    'resource_type',
    'status',
    'duration',
    'count',
    'category',
    'source'
  ];
  
  safeFields.forEach(field => {
    if (metadata[field] !== undefined) {
      sanitized[field] = metadata[field];
    }
  });
  
  return sanitized;
}

/**
 * Gera atividades simuladas para quando não conseguir acessar o banco
 */
function generateMockActivities(limit: number) {
  const mockActions = [
    // Autenticação e Segurança
    { action: 'LOGIN', description: 'Usuário fez login no sistema', severity: 'INFO', table: 'auth_logs' },
    { action: 'LOGOUT', description: 'Usuário fez logout do sistema', severity: 'INFO', table: 'auth_logs' },
    { action: 'LOGIN_FAILED', description: 'Tentativa de login falhada', severity: 'WARNING', table: 'auth_logs' },
    { action: 'PASSWORD_CHANGE', description: 'Senha alterada com sucesso', severity: 'INFO', table: 'users' },
    { action: 'ACCOUNT_LOCKED', description: 'Conta bloqueada por múltiplas tentativas', severity: 'ERROR', table: 'users' },
    
    // Navegação e Visualização
    { action: 'VIEW', description: 'Dashboard principal visualizado', severity: 'INFO', table: 'page_views' },
    { action: 'VIEW', description: 'Relatório de vendas acessado', severity: 'INFO', table: 'page_views' },
    { action: 'VIEW', description: 'Configurações do sistema visualizadas', severity: 'INFO', table: 'page_views' },
    { action: 'SEARCH', description: 'Busca realizada no sistema', severity: 'INFO', table: 'search_logs' },
    
    // Operações CRUD
    { action: 'CREATE', description: 'Novo cliente cadastrado', severity: 'INFO', table: 'customers' },
    { action: 'CREATE', description: 'Nova venda registrada', severity: 'INFO', table: 'sales' },
    { action: 'CREATE', description: 'Novo produto adicionado', severity: 'INFO', table: 'products' },
    { action: 'UPDATE', description: 'Dados do cliente atualizados', severity: 'INFO', table: 'customers' },
    { action: 'UPDATE', description: 'Configurações de perfil alteradas', severity: 'INFO', table: 'profiles' },
    { action: 'UPDATE', description: 'Status do pedido modificado', severity: 'INFO', table: 'orders' },
    { action: 'DELETE', description: 'Registro removido do sistema', severity: 'WARNING', table: 'general' },
    
    // Relatórios e Exportações
    { action: 'EXPORT', description: 'Relatório de vendas exportado', severity: 'INFO', table: 'reports' },
    { action: 'EXPORT', description: 'Lista de clientes exportada', severity: 'INFO', table: 'reports' },
    { action: 'PRINT', description: 'Documento impresso', severity: 'INFO', table: 'print_logs' },
    { action: 'DOWNLOAD', description: 'Arquivo baixado', severity: 'INFO', table: 'downloads' },
    
    // Integrações e APIs
    { action: 'API_CALL', description: 'Chamada para API externa realizada', severity: 'INFO', table: 'api_logs' },
    { action: 'WEBHOOK', description: 'Webhook recebido de sistema externo', severity: 'INFO', table: 'webhooks' },
    { action: 'SYNC', description: 'Sincronização de dados executada', severity: 'INFO', table: 'sync_logs' },
    
    // Erros e Problemas
    { action: 'ERROR', description: 'Erro interno do sistema detectado', severity: 'ERROR', table: 'error_logs' },
    { action: 'TIMEOUT', description: 'Operação expirou por timeout', severity: 'WARNING', table: 'performance_logs' },
    { action: 'VALIDATION_ERROR', description: 'Erro de validação de dados', severity: 'WARNING', table: 'validation_logs' },
    
    // Manutenção e Sistema
    { action: 'BACKUP', description: 'Backup automático executado', severity: 'INFO', table: 'system_logs' },
    { action: 'MAINTENANCE', description: 'Manutenção programada iniciada', severity: 'INFO', table: 'system_logs' },
    { action: 'UPDATE_SYSTEM', description: 'Sistema atualizado para nova versão', severity: 'INFO', table: 'system_logs' }
  ];
  
  const userRoles = ['admin', 'manager', 'user', 'viewer'];
  const userEmails = [
    'admin@sistema.com',
    'gerente@empresa.com', 
    'usuario@teste.com',
    'operador@sistema.com',
    'analista@empresa.com'
  ];
  
  const activities = [];
  const now = new Date();
  
  for (let i = 0; i < limit; i++) {
    const mockAction = mockActions[i % mockActions.length];
    // Varia o intervalo entre 5 minutos e 2 horas para mais realismo
    const randomInterval = Math.floor(Math.random() * 115) + 5; // 5-120 minutos
    const activityTime = new Date(now.getTime() - (i * randomInterval * 60 * 1000));
    
    // Seleciona usuário e role aleatórios
    const randomUserIndex = Math.floor(Math.random() * userEmails.length);
    const randomRole = userRoles[Math.floor(Math.random() * userRoles.length)];
    
    activities.push({
      id: `mock-${Date.now()}-${i}`,
      created_at: activityTime.toISOString(),
      action: mockAction.action,
      table_name: mockAction.table,
      severity: mockAction.severity,
      description: mockAction.description,
      user_email: userEmails[randomUserIndex],
      user_role: randomRole,
      metadata: { 
        source: 'mock',
        ip_address: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        session_id: `sess_${Math.random().toString(36).substr(2, 9)}`
      }
    });
  }
  
  // Ordena por data decrescente (mais recente primeiro)
  return activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}