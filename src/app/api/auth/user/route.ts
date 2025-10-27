import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';

/**
 * API Route para verificar autenticação do usuário de forma segura
 * Substitui o uso direto de createBrowserSupabaseClient no frontend
 */

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação do usuário
    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false,
          user: null,
          error: 'Não autorizado' 
        },
        { status: 401 }
      );
    }

    // Buscar informações adicionais do perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logger.warn('Perfil não encontrado para usuário:', user.id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        ...profile
      },
      error: null
    });

  } catch (error) {
    logger.error('Erro na API de autenticação:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { 
        success: false,
        user: null,
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}