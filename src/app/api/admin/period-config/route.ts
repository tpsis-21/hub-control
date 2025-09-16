// 🔧 API de Configuração de Períodos
// Endpoints para gerenciar configurações de cálculo de períodos

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createStandardErrorResponse, createStandardSuccessResponse } from '@/middleware/shared/helpers';
import { z } from 'zod';

// Schema para configuração de servidor
const serverConfigSchema = z.object({
  serverId: z.string().uuid(),
  periodCalculationType: z.enum(['days', 'months', 'flexible']),
  periodCalculationConfig: z.object({
    defaultDays: z.number().min(1).max(365).optional(),
    defaultMonths: z.number().min(1).max(12).optional(),
    flexibleRules: z.array(z.object({
      condition: z.string(),
      value: z.number(),
      unit: z.enum(['days', 'months'])
    })).optional()
  }).optional(),
  creditMonitoringEnabled: z.boolean().default(false),
  creditWarningThreshold: z.number().min(0).max(100).optional(),
  creditCriticalThreshold: z.number().min(0).max(100).optional(),
  creditNotificationEnabled: z.boolean().default(false)
});

// Schema para configuração de plano
const planConfigSchema = z.object({
  planId: z.string().uuid(),
  periodCalculationOverride: z.enum(['days', 'months', 'flexible']).optional(),
  periodCalculationConfig: z.object({
    overrideDays: z.number().min(1).max(365).optional(),
    overrideMonths: z.number().min(1).max(12).optional(),
    customRules: z.array(z.object({
      condition: z.string(),
      value: z.number(),
      unit: z.enum(['days', 'months'])
    })).optional()
  }).optional()
});

// Função para verificar se o usuário é admin
async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Admin principal é sempre admin
    if (userId === '2f67bed8-9448-446f-8f38-9306f773620d') {
      return true;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    return profile?.role === 'admin';
  } catch (error) {
    console.error('Erro ao verificar admin:', error);
    return false;
  }
}

// GET - Buscar configurações de períodos
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'servers' ou 'plans'
    const id = searchParams.get('id');

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Não autorizado', 401);
    }

    // Verificar se é admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return createStandardErrorResponse('ACCESS_DENIED', 'Acesso negado', 403);
    }

    if (type === 'servers') {
      let query = supabase
        .from('servers')
        .select(`
          id,
          name,
          period_calculation_type,
          period_calculation_config,
          credit_monitoring_enabled,
          credit_warning_threshold,
          credit_critical_threshold,
          credit_notification_enabled
        `);

      if (id) {
        query = query.eq('id', id);
        const { data, error } = await query.single();
        if (error) {
          return createStandardErrorResponse('SERVER_NOT_FOUND', 'Servidor não encontrado', 404);
        }
        return createStandardSuccessResponse(data);
      } else {
        const { data, error } = await query;
        if (error) {
          return createStandardErrorResponse('DATABASE', 'Erro ao buscar servidores', 500);
        }
        return createStandardSuccessResponse(data);
      }
    }

    if (type === 'plans') {
      let query = supabase
        .from('plans')
        .select(`
          id,
          name,
          period_calculation_override,
          period_calculation_config
        `);

      if (id) {
        query = query.eq('id', id);
        const { data, error } = await query.single();
        if (error) {
          return createStandardErrorResponse('PLAN_NOT_FOUND', 'Plano não encontrado', 404);
        }
        return createStandardSuccessResponse(data);
      } else {
        const { data, error } = await query;
        if (error) {
          return createStandardErrorResponse('DATABASE', 'Erro ao buscar planos', 500);
        }
        return createStandardSuccessResponse(data);
      }
    }

    return createStandardErrorResponse('INVALID_TYPE', 'Tipo inválido. Use "servers" ou "plans"', 400);
  } catch (error) {
    console.error('Erro na API de configuração de períodos:', error);
    return createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
}

// PUT - Atualizar configuração de servidor
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Não autorizado', 401);
    }

    // Verificar se é admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return createStandardErrorResponse('ACCESS_DENIED', 'Acesso negado', 403);
    }

    if (type === 'servers') {
      // Validar dados do servidor
      const validatedData = serverConfigSchema.parse(body);
      
      const { data, error } = await supabase
        .from('servers')
        .update({
          period_calculation_type: validatedData.periodCalculationType,
          period_calculation_config: validatedData.periodCalculationConfig,
          credit_monitoring_enabled: validatedData.creditMonitoringEnabled,
          credit_warning_threshold: validatedData.creditWarningThreshold,
          credit_critical_threshold: validatedData.creditCriticalThreshold,
          credit_notification_enabled: validatedData.creditNotificationEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedData.serverId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar servidor:', error);
        return createStandardErrorResponse('DATABASE', 'Erro ao atualizar configuração do servidor', 500);
      }

      return createStandardSuccessResponse(data, 'Configuração do servidor atualizada com sucesso');
    }

    if (type === 'plans') {
      // Validar dados do plano
      const validatedData = planConfigSchema.parse(body);
      
      const { data, error } = await supabase
        .from('plans')
        .update({
          period_calculation_override: validatedData.periodCalculationOverride,
          period_calculation_config: validatedData.periodCalculationConfig,
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedData.planId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar plano:', error);
        return createStandardErrorResponse('DATABASE', 'Erro ao atualizar configuração do plano', 500);
      }

      return createStandardSuccessResponse(data, 'Configuração do plano atualizada com sucesso');
    }

    return createStandardErrorResponse('INVALID_TYPE', 'Tipo inválido. Use "servers" ou "plans"', 400);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createStandardErrorResponse(
        'VALIDATION_ERROR',
        'Dados inválidos: ' + error.errors.map(e => e.message).join(', '),
        400
      );
    }
    console.error('Erro na API de configuração de períodos:', error);
    return createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
}

// POST - Testar configuração de período
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { serverId, planId, testData } = body;

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Não autorizado', 401);
    }

    // Verificar se é admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return createStandardErrorResponse('ACCESS_DENIED', 'Acesso negado', 403);
    }

    // Buscar configurações do servidor
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select('period_calculation_type, period_calculation_config')
      .eq('id', serverId)
      .single();

    if (serverError || !server) {
      return createStandardErrorResponse('SERVER_NOT_FOUND', 'Servidor não encontrado', 404);
    }

    // Buscar configurações do plano (se fornecido)
    let plan = null;
    if (planId) {
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('period_calculation_override, period_calculation_config')
        .eq('id', planId)
        .single();

      if (!planError && planData) {
        plan = planData;
      }
    }

    // Simular cálculo de período
    const calculationType = plan?.period_calculation_override || server.period_calculation_type;
    const config = plan?.period_calculation_config || server.period_calculation_config;

    let result = {
      calculationType,
      config,
      testResult: null as any
    };

    // Simular cálculo baseado no tipo
    if (calculationType === 'days') {
      const configObj = config as any;
      const days = configObj?.defaultDays || configObj?.overrideDays || 30;
      result.testResult = {
        type: 'days',
        value: days,
        description: `Período fixo de ${days} dias`
      };
    } else if (calculationType === 'months') {
      const configObj = config as any;
      const months = configObj?.defaultMonths || configObj?.overrideMonths || 1;
      result.testResult = {
        type: 'months',
        value: months,
        description: `Período fixo de ${months} mês(es)`
      };
    } else if (calculationType === 'flexible') {
      const configObj = config as any;
      const rules = configObj?.flexibleRules || configObj?.customRules || [];
      result.testResult = {
        type: 'flexible',
        rules: Array.isArray(rules) ? rules.length : 0,
        description: `Período flexível com ${Array.isArray(rules) ? rules.length : 0} regra(s) configurada(s)`
      };
    }

    return createStandardSuccessResponse(result, 'Teste de configuração executado com sucesso');
  } catch (error) {
    console.error('Erro no teste de configuração:', error);
    return createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500);
  }
}

// OPTIONS - CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}