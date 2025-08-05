import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createApiSupabaseClient } from '@/lib/supabase-api'
import { LoggerService } from '@/services/logger.service'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, subject, html' },
        { status: 400 }
      )
    }

    // Buscar configuração SMTP padrão
    const supabase = await createApiSupabaseClient()
    const { data: smtpConfig } = await supabase
      .from('smtp_configs')
      .select('*')
      .eq('isDefault', true)
      .single()

    if (!smtpConfig) {
      return NextResponse.json(
        { error: 'Configuração SMTP não encontrada' },
        { status: 500 }
      )
    }

    // Criar transporter
    const transporter = nodemailer.createTransporter({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password,
      },
    })

    // Enviar email
    const info = await transporter.sendMail({
      from: smtpConfig.fromEmail,
      to,
      subject,
      html,
      text,
    })

    LoggerService.info('Email enviado via API', 'EmailAPI', {
      to,
      subject,
      messageId: info.messageId,
    })

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
    })
  } catch (error) {
    LoggerService.error('Erro ao enviar email via API', 'EmailAPI', { error })
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    )
  }
}