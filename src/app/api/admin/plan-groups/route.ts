// src/app/api/admin/plan-groups/route.ts
import { NextRequest } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
import { z } from 'zod';
import type { Database } from '@/lib/database.types';
import { createStandardErrorResponse, createStandardSuccessResponse, attachSecurityHeaders } from '@/middleware/shared/helpers'
import { requireAdminForStandardRoute } from '@/lib/api-admin-route-auth'

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

// PUT - Atualizar grupo de planos (apenas admins)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminForStandardRoute();
    if (auth.error) return auth.error;

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
    
    const auth = await requireAdminForStandardRoute();
    if (auth.error) return auth.error;

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
