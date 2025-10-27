// src/app/api/admin/plan-groups/route.ts
import { NextRequest } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
import { z } from 'zod';
import type { Database } from '@/lib/database.types';
import { createStandardErrorResponse, createStandardSuccessResponse, attachSecurityHeaders } from '@/middleware/shared/helpers'

// Schema para validação dos dados do grupo de planos
const planGroupUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

// Usar cliente Supabase consolidado para operações admin
function createAdminClient() {
  return createApiSupabaseClient();
}

// Função para verificar se o usuário é admin
async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient();
    
    // Admin principal é sempre admin
    if (userId === '2f67bed8-9448-446f-8f38-9306f773620d') {
      return true;
    }
    
    const { data: profile } = await adminClient
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

// Função para obter usuário autenticado
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const adminClient = createAdminClient();
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return null;
  }
}

// PUT - Atualizar grupo de planos (apenas admins)
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return attachSecurityHeaders(
        createStandardErrorResponse('UNAUTHORIZED', 'Não autorizado', 401)
      );
    }
    
    // Verificar se é admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return attachSecurityHeaders(
        createStandardErrorResponse('FORBIDDEN', 'Acesso negado - apenas administradores', 403)
      );
    }
    
    // Validar dados
    const body = await request.json();
    const validatedData = planGroupUpdateSchema.parse(body);
    
    // Atualizar grupo de planos com cliente admin
    const adminClient = createAdminClient();
    const { data: updated, error } = await adminClient
      .from('plan_groups')
      .update({
        name: validatedData.name,
        description: validatedData.description,
        is_active: validatedData.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.id)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao atualizar grupo de planos:', error);
      return attachSecurityHeaders(
        createStandardErrorResponse('SUPABASE_ERROR', 'Erro ao atualizar grupo de planos', 500)
      );
    }
    
    return attachSecurityHeaders(
      createStandardSuccessResponse({ data: updated })
    );
    
  } catch (error) {
    console.error('Erro na API de grupos de planos:', error);
    
    if (error instanceof z.ZodError) {
      return attachSecurityHeaders(
        createStandardErrorResponse('VALIDATION_ERROR', 'Dados inválidos', 400)
      );
    }
    
    return attachSecurityHeaders(
      createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500)
    );
  }
}

// DELETE - Deletar grupo de planos (apenas admins)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('id');
    
    if (!groupId) {
      return attachSecurityHeaders(
        createStandardErrorResponse('VALIDATION_ERROR', 'ID do grupo é obrigatório', 400)
      );
    }
    
    // Verificar autenticação
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return attachSecurityHeaders(
        createStandardErrorResponse('UNAUTHORIZED', 'Não autorizado', 401)
      );
    }
    
    // Verificar se é admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return attachSecurityHeaders(
        createStandardErrorResponse('FORBIDDEN', 'Acesso negado - apenas administradores', 403)
      );
    }
    
    // Deletar grupo de planos com cliente admin
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('plan_groups')
      .delete()
      .eq('id', groupId);
    
    if (error) {
      console.error('Erro ao deletar grupo de planos:', error);
      return attachSecurityHeaders(
        createStandardErrorResponse('SUPABASE_ERROR', 'Erro ao deletar grupo de planos', 500)
      );
    }
    
    return attachSecurityHeaders(
      createStandardSuccessResponse({ success: true })
    );
    
  } catch (error) {
    console.error('Erro na API de grupos de planos:', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500)
    );
  }
}
