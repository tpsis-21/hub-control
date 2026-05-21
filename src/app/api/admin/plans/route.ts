// src/app/api/admin/plans/route.ts
import { NextRequest } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
import { z } from 'zod';
import type { Database } from '@/lib/database.types';
import { createStandardErrorResponse, createStandardSuccessResponse, attachSecurityHeaders } from '@/middleware/shared/helpers'
import { requireAdminForStandardRoute } from '@/lib/api-admin-route-auth'

// Schema para validação dos dados do plano
const planUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().min(0),
  duration: z.number().min(1),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  plan_group_id: z.string().uuid().optional().nullable(),
});

// Usar cliente Supabase consolidado para operações admin
function createAdminClient() {
  return createApiSupabaseClient();
}

// PUT - Atualizar plano (apenas admins)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdminForStandardRoute();
    if (auth.error) return auth.error;

    // Validar dados
    const body = await request.json();
    const validatedData = planUpdateSchema.parse(body);
    
    // Atualizar plano com cliente admin
    const adminClient = createAdminClient();
    const { data: updated, error } = await adminClient
      .from('plans')
      .update({
        name: validatedData.name,
        price: validatedData.price,
        duration: validatedData.duration,
        description: validatedData.description,
        features: validatedData.features,
        is_active: validatedData.is_active,
        plan_group_id: validatedData.plan_group_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.id)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao atualizar plano:', error);
      return attachSecurityHeaders(
        createStandardErrorResponse('SUPABASE_ERROR', 'Erro ao atualizar plano', 500)
      );
    }
    
    return attachSecurityHeaders(
      createStandardSuccessResponse({ data: updated })
    );
    
  } catch (error) {
    console.error('Erro na API de planos:', error);
    
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

// DELETE - Deletar plano (apenas admins)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('id');
    
    if (!planId) {
      return attachSecurityHeaders(
        createStandardErrorResponse('VALIDATION_ERROR', 'ID do plano é obrigatório', 400)
      );
    }
    
    const auth = await requireAdminForStandardRoute();
    if (auth.error) return auth.error;

    // Deletar plano com cliente admin
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('plans')
      .delete()
      .eq('id', planId);
    
    if (error) {
      console.error('Erro ao deletar plano:', error);
      return attachSecurityHeaders(
        createStandardErrorResponse('SUPABASE_ERROR', 'Erro ao deletar plano', 500)
      );
    }
    
    return attachSecurityHeaders(
      createStandardSuccessResponse({ success: true })
    );
    
  } catch (error) {
    console.error('Erro na API de planos:', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500)
    );
  }
}
