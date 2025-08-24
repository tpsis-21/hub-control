import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createStandardErrorResponse, createStandardSuccessResponse } from '@/middleware/shared/helpers'

const planGroupSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar dados
    const validatedData = planGroupSchema.parse(body)
    
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({
              name,
              value,
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/'
            })
          },
          remove(name: string, options: any) {
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              path: '/'
            })
          },
        },
      }
    )
    
    // Verificar autenticação
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return createStandardErrorResponse('UNAUTHORIZED', 'Usuário não autenticado', 401)
    }
    
    // Verificar se já existe um grupo com o mesmo nome
    const { data: existingGroup, error: checkError } = await supabase
      .from('plan_groups')
      .select('id')
      .eq('name', validatedData.name)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      return createStandardErrorResponse('CHECK_ERROR', 'Erro ao verificar grupo existente', 500)
    }
    
    if (existingGroup) {
      return createStandardErrorResponse('DUPLICATE', 'Já existe um grupo de planos com este nome', 400)
    }
    
    // Inserir grupo de planos
    const { data: inserted, error } = await supabase
      .from('plan_groups')
      .insert([validatedData])
      .select()
      .single()
    
    if (error) {
      return createStandardErrorResponse('SUPABASE_ERROR', error.message, 400)
    }

    return createStandardSuccessResponse(
      { planGroup: inserted },
      'Grupo de planos criado com sucesso',
      201
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return createStandardErrorResponse('VALIDATION_ERROR', 'Dados inválidos', 400)
    }

    return createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({
              name,
              value,
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/'
            })
          },
          remove(name: string, options: any) {
            cookieStore.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              path: '/'
            })
          },
        },
      }
    )
    
    // Buscar grupos de planos
    const { data, error } = await supabase
      .from('plan_groups')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      return createStandardErrorResponse('SUPABASE_ERROR', error.message, 400)
    }

    return createStandardSuccessResponse(
      { planGroups: data || [] }
    )
  } catch (error: any) {
    return createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500)
  }
}