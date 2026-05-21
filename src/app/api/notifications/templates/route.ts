// 📝 API de Templates de Notificação
// Endpoints para gerenciar templates de notificação

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/unified-client';
import { withUnifiedMiddleware } from '@/middleware/unified-middleware';
// import { logSecurityEvent } from '@/lib/security';
import { createStandardErrorResponse, createStandardSuccessResponse, attachSecurityHeaders } from '@/middleware/shared/helpers';
import { z } from 'zod';

// Schema de validação para criar template
const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum([
    'security_alert',
    'performance_alert',
    'system',
    'user',
    'backup_status',
    'compliance_alert',
    'maintenance',
    'error_report',
    'audit_event',
    'custom'
  ]),
  subject: z.string().min(1).max(200),
  content: z.object({
    text: z.string().min(1),
    html: z.string().optional(),
    markdown: z.string().optional()
  }),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'date', 'object']),
    required: z.boolean().default(false),
    description: z.string().optional(),
    defaultValue: z.any().optional()
  })).optional(),
  channels: z.array(z.enum([
    'push',
    'email',
    'sms',
    'webhook',

    'teams',
    'discord',
    'telegram',
    'in_app'
  ])).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  metadata: z.record(z.any()).optional(),
  isActive: z.boolean().default(true)
});

// Schema para atualizar template
const updateTemplateSchema = createTemplateSchema.partial();

// Schema para filtros de listagem
const listFiltersSchema = z.object({
  type: z.enum([
    'security_alert',
    'performance_alert',
    'system',
    'user',
    'backup_status',
    'compliance_alert',
    'maintenance',
    'error_report',
    'audit_event',
    'custom'
  ]).optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});

// Verificar permissões de usuário
async function checkUserPermissions(supabase: any, action: string): Promise<{
  user: any;
  hasPermission: boolean;
  role: string;
}> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, hasPermission: false, role: 'anonymous' };
  }

  // Buscar role do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  const role = profile?.role || 'user';
  
  // Definir permissões por ação
  const permissions: { [key: string]: string[] } = {
    'create': ['admin', 'manager'],
    'read': ['admin', 'manager', 'user'],
    'update': ['admin', 'manager'],
    'delete': ['admin'],
    'activate': ['admin', 'manager'],
    'deactivate': ['admin', 'manager']
  };

  const hasPermission = permissions[action]?.includes(role) || false;

  return { user, hasPermission, role };
}

// GET - Listar templates
async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, hasPermission, role } = await checkUserPermissions(supabase, 'read');

    if (!hasPermission) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso não autorizado', 'Você não tem permissão para realizar esta ação.', 403)
      )
    }

    // Extrair parâmetros de query
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    
    // Converter parâmetros
    const queryParams = {
      ...rawParams,
      limit: rawParams.limit ? parseInt(rawParams.limit) : undefined,
      offset: rawParams.offset ? parseInt(rawParams.offset) : undefined,
      isActive: rawParams.isActive ? rawParams.isActive === 'true' : undefined
    };

    // Validar filtros
    const validationResult = listFiltersSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Parâmetros inválidos', 'Os filtros informados são inválidos.', 400)
      )
    }

    const filters = validationResult.data;

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' });

    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('active', filters.isActive);
    }
    if (filters.search) {
      const term = filters.search.replace(/[%_]/g, '');
      query = query.or(`event.ilike.%${term}%,subject.ilike.%${term}%,message.ilike.%${term}%`);
    }

    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    query = query.range(offset, offset + limit - 1).order('updated_at', { ascending: false });

    const { data: rows, error: dbError, count } = await query;

    if (dbError) {
      console.error('Erro ao buscar templates:', dbError);
      return attachSecurityHeaders(
        createStandardErrorResponse('Erro ao buscar templates', dbError.message, 500)
      );
    }

    const templates = (rows || []).map((row: Record<string, unknown>) => {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(String(row.message ?? '{}')) as Record<string, unknown>;
      } catch {
        payload = {};
      }
      return {
        id: row.id,
        name: row.event,
        type: row.type,
        channel: 'email',
        subject: row.subject ?? '',
        content: (payload.emailTemplate as string) || String(row.message ?? ''),
        variables: [],
        metadata: { description: String(row.type) },
        is_active: row.active ?? true,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    const systemTemplates: unknown[] = [];

    // Log da consulta
    // await logSecurityEvent({
    //   action: 'TEMPLATES_LISTED',
    //   details: `Usuário consultou ${(templates || []).length} templates`,
    //   severity: 'low',
    //   userId: user.id,
    //   metadata: {
    //     filters,
    //     resultCount: (templates || []).length,
    //     role
    //   }
    // });

    return attachSecurityHeaders(
      createStandardSuccessResponse({
        templates: templates || [],
        systemTemplates,
        total: count || 0,
        filters
      })
    )

  } catch (error) {
    console.error('Erro na API de templates (GET):', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', 'Ocorreu um erro inesperado ao processar sua solicitação.', 500)
    )
  }
}

// POST - Criar novo template
async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, hasPermission } = await checkUserPermissions(supabase, 'create');

    if (!hasPermission) {
      // await logSecurityEvent({
      //   action: 'UNAUTHORIZED_TEMPLATE_CREATE',
      //   details: 'Tentativa não autorizada de criar template',
      //   severity: 'medium',
      //   userId: user?.id,
      //   metadata: { endpoint: '/api/notifications/templates', method: 'POST' }
      // });

      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso não autorizado', 'Você não tem permissão para realizar esta ação.', 403)
      )
    }

    // Validar dados da requisição
    const body = await request.json();
    const validationResult = createTemplateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Dados inválidos', 'Os dados enviados não passaram na validação.', 400)
      )
    }

    const templateData = validationResult.data;

    // Verificar se já existe um template com o mesmo nome
    // const { data: existingTemplate } = await supabase
    //   .from('notification_templates')
    //   .select('id')
    //   .eq('name', templateData.name)
    //   .single();
    const existingTemplate = null; // Dados simulados

    if (existingTemplate) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Conflito', 'Já existe um template com este nome.', 409)
      )
    }

    // Criar template no banco de dados
    // const { data: template, error: createError } = await supabase
    //   .from('notification_templates')
    //   .insert({
    //     name: templateData.name,
    //     description: templateData.description,
    //     type: templateData.type,
    //     subject: templateData.subject,
    //     content: templateData.content,
    //     variables: templateData.variables || [],
    //     channels: templateData.channels || ['push', 'email'],
    //     priority: templateData.priority || 'normal',
    //     metadata: templateData.metadata || {},
    //     is_active: templateData.isActive,
    //     created_by: user.id
    //   })
    //   .select()
    //   .single();
    
    // Dados simulados para teste
    const template = {
      id: 'template_' + Date.now(),
      name: templateData.name,
      description: templateData.description,
      type: templateData.type,
      subject: templateData.subject,
      content: templateData.content,
      variables: templateData.variables || [],
      channels: templateData.channels || ['push', 'email'],
      priority: templateData.priority || 'normal',
      metadata: templateData.metadata || {},
      is_active: templateData.isActive,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const createError = null;

    if (createError) {
      console.error('Erro ao criar template:', createError);
      return attachSecurityHeaders(
        createStandardErrorResponse('Erro ao criar template', 'Não foi possível criar o template.', 500)
      )
    }

    // Adicionar template ao sistema também
    // try {
    //   notificationSystem.addTemplate(template.id, {
    //     name: template.name,
    //     subject: template.subject,
    //     content: template.content,
    //     variables: template.variables || [],
    //     channels: template.channels,
    //     priority: template.priority,
    //     metadata: template.metadata
    //   });
    // } catch (systemError) {
    //   console.error('Erro ao adicionar template ao sistema:', systemError);
    //   // Continuar mesmo se o sistema falhar
    // }

    // Log da criação
    // await logSecurityEvent({
    //   action: 'TEMPLATE_CREATED',
    //   details: `Template criado: ${template.name}`,
    //   severity: 'low',
    //   userId: user.id,
    //   metadata: {
    //     templateId: template.id,
    //     templateName: template.name,
    //     templateType: template.type
    //   }
    // });

    return attachSecurityHeaders(
      createStandardSuccessResponse({
        id: template.id,
        message: 'Template criado com sucesso',
        template
      }, undefined, 201)
    )

  } catch (error) {
    console.error('Erro na API de templates (POST):', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', 'Ocorreu um erro inesperado ao processar sua solicitação.', 500)
    )
  }
}

// PUT - Atualizar template
async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, hasPermission } = await checkUserPermissions(supabase, 'update');

    if (!hasPermission) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso não autorizado', 'Você não tem permissão para realizar esta ação.', 403)
      )
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return attachSecurityHeaders(
        createStandardErrorResponse('ID obrigatório', 'ID do template é obrigatório.', 400)
      )
    }

    // Validar dados de atualização
    const validationResult = updateTemplateSchema.safeParse(updateData);
    if (!validationResult.success) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Dados inválidos', 'Os dados enviados não passaram na validação.', 400)
      )
    }

    const templateData = validationResult.data;

    // Verificar se o template existe
    // const { data: existingTemplate, error: fetchError } = await supabase
    //   .from('notification_templates')
    //   .select('*')
    //   .eq('id', id)
    //   .single();
    const existingTemplate = {
      id: id,
      name: 'Template Existente',
      description: 'Descrição do template',
      type: 'email',
      subject: 'Assunto',
      content: 'Conteúdo do template'
    };
    const fetchError = null;

    if (fetchError || !existingTemplate) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Não encontrado', 'Template não encontrado.', 404)
      )
    }

    // Se mudando o nome, verificar se não existe outro com o mesmo nome
    if (templateData.name && templateData.name !== existingTemplate.name) {
      // const { data: nameConflict } = await supabase
      //   .from('notification_templates')
      //   .select('id')
      //   .eq('name', templateData.name)
      //   .neq('id', id)
      //   .single();
      const nameConflict = null; // Dados simulados

      if (nameConflict) {
        return attachSecurityHeaders(
          createStandardErrorResponse('Conflito', 'Já existe um template com este nome.', 409)
        )
      }
    }

    // Atualizar template
    // const { data: updatedTemplate, error: updateError } = await supabase
    //   .from('notification_templates')
    //   .update({
    //     ...templateData,
    //     updated_at: new Date().toISOString()
    //   })
    const updatedTemplate = {
      ...existingTemplate,
      ...templateData,
      updated_at: new Date().toISOString()
    };
    const updateError = null;

    if (updateError) {
      console.error('Erro ao atualizar template:', updateError);
      return attachSecurityHeaders(
        createStandardErrorResponse('Erro ao atualizar template', 'Não foi possível atualizar o template.', 500)
      )
    }

    // Atualizar no sistema também
    // try {
    //   notificationSystem.addTemplate(updatedTemplate.id, {
    //     name: updatedTemplate.name,
    //     subject: updatedTemplate.subject,
    //     content: updatedTemplate.content,
    //     variables: updatedTemplate.variables || [],
    //     channels: updatedTemplate.channels,
    //     priority: updatedTemplate.priority,
    //     metadata: updatedTemplate.metadata
    //   });
    // } catch (systemError) {
    //   console.error('Erro ao atualizar template no sistema:', systemError);
    // }

    // Log da atualização
    // await logSecurityEvent({
    //   action: 'TEMPLATE_UPDATED',
    //   details: `Template atualizado: ${updatedTemplate.name}`,
    //   severity: 'low',
    //   userId: user.id,
    //   metadata: {
    //     templateId: id,
    //     templateName: updatedTemplate.name,
    //     changes: Object.keys(templateData)
    //   }
    // });

    return attachSecurityHeaders(
      createStandardSuccessResponse({
        message: 'Template atualizado com sucesso',
        template: updatedTemplate
      })
    )

  } catch (error) {
    console.error('Erro na API de templates (PUT):', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', 'Ocorreu um erro inesperado ao processar sua solicitação.', 500)
    )
  }
}

// DELETE - Deletar template
async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, hasPermission } = await checkUserPermissions(supabase, 'delete');

    if (!hasPermission) {
      // await logSecurityEvent({
      //   action: 'UNAUTHORIZED_TEMPLATE_DELETE',
      //   details: 'Tentativa não autorizada de deletar template',
      //   severity: 'high',
      //   userId: user?.id,
      //   metadata: { endpoint: '/api/notifications/templates', method: 'DELETE' }
      // });

      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso não autorizado', 'Você não tem permissão para realizar esta ação.', 403)
      )
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return attachSecurityHeaders(
        createStandardErrorResponse('ID obrigatório', 'ID do template é obrigatório.', 400)
      )
    }

    // Verificar se o template existe
    // const { data: template, error: fetchError } = await supabase
    //   .from('notification_templates')
    //   .select('*')
    //   .eq('id', id)
    //   .single();
    const template = {
      id: id,
      name: 'Template para deletar',
      description: 'Template que será deletado'
    };
    const fetchError = null;

    if (fetchError || !template) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Não encontrado', 'Template não encontrado.', 404)
      )
    }

    // Verificar se o template está sendo usado
    // const { data: usageCount } = await supabase
    //   .from('notifications')
    //   .select('id', { count: 'exact' })
    //   .eq('template_id', id);
    const usageCount: any[] = []; // Dados simulados - sem uso

    if (usageCount && usageCount.length > 0) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Conflito', 'Template não pode ser deletado pois está em uso por notificações existentes.', 409)
      )
    }

    // Deletar template
    // const { error: deleteError } = await supabase
    //   .from('notification_templates')
    //   .delete()
    //   .eq('id', id);
    const deleteError = null; // Dados simulados - sucesso na deleção

    if (deleteError) {
      console.error('Erro ao deletar template:', deleteError);
      return attachSecurityHeaders(
        createStandardErrorResponse('Erro ao deletar template', 'Não foi possível deletar o template.', 500)
      )
    }

    // Log da deleção
    // await logSecurityEvent({
    //   action: 'TEMPLATE_DELETED',
    //   details: `Template deletado: ${template.name}`,
    //   severity: 'medium',
    //   userId: user.id,
    //   metadata: {
    //     templateId: id,
    //     templateName: template.name
    //   }
    // });

    return attachSecurityHeaders(
      createStandardSuccessResponse({
        message: 'Template deletado com sucesso'
      })
    )

  } catch (error) {
    console.error('Erro na API de templates (DELETE):', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', 'Ocorreu um erro inesperado ao processar sua solicitação.', 500)
    )
  }
}

// Handlers com middleware unificado
const GET_WITH_MIDDLEWARE = withUnifiedMiddleware(GET, {
  enablePayloadScan: false,
  enableIPBlocking: true,
  enableUserBlocking: true
});

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

const DELETE_WITH_MIDDLEWARE = withUnifiedMiddleware(DELETE, {
  enablePayloadScan: false,
  enableIPBlocking: true,
  enableUserBlocking: true
});

// Exportações renomeadas
export { GET_WITH_MIDDLEWARE as GET, POST_WITH_MIDDLEWARE as POST, PUT_WITH_MIDDLEWARE as PUT, DELETE_WITH_MIDDLEWARE as DELETE };
