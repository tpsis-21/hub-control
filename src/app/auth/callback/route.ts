// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/utils/production-logger'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const type = searchParams.get('type')

  logger.debug(`🔍 [AUTH-CALLBACK] Processando callback: ${JSON.stringify({ hasCode: !!code, type, next, origin })}`)

  if (code) {
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
              httpOnly: false,
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
              maxAge: 0
            })
          },
        },
      }
    )

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('❌ [AUTH-CALLBACK] Erro ao trocar código por sessão:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
      }

      logger.debug('✅ [AUTH-CALLBACK] Sessão criada com sucesso para:', data.user?.email)
      
      // Se for recuperação de senha, redirecionar para página de reset
      if (type === 'recovery') {
        logger.debug('🔄 [AUTH-CALLBACK] Redirecionando para reset-password')
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      
      // Para outros tipos de autenticação, redirecionar para próxima página
      return NextResponse.redirect(`${origin}${next}`)
      
    } catch (error) {
      console.error('❌ [AUTH-CALLBACK] Erro inesperado:', error)
      return NextResponse.redirect(`${origin}/login?error=callback_error`)
    }
  }

  // Se não há código, redirecionar para login
  logger.debug('⚠️ [AUTH-CALLBACK] Nenhum código encontrado, redirecionando para login')
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}

// Também suportar POST para alguns casos específicos
export async function POST(request: NextRequest) {
  return GET(request)
}
