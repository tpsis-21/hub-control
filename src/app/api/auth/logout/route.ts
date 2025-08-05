import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 API Logout: Iniciando logout')
    
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
              maxAge: 0,
              path: '/'
            })
          },
        },
      }
    )
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('❌ API Logout: Erro:', error.message)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    console.log('✅ API Logout: Logout bem-sucedido')
    
    return NextResponse.json(
      { message: 'Logout realizado com sucesso' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('❌ API Logout: Erro interno:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}