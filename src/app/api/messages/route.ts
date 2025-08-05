// src/app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import MessageService, { EmailMessage, WhatsAppMessage } from '@/services/message.service';
import { LoggerService } from '@/services/logger.service';

// Verificar se o usuário tem permissão para enviar mensagens
async function verifyPermission(request: NextRequest) {
  const supabase = createClient();
  
  // Verificar autenticação
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { authorized: false, error: 'Não autenticado' };
  }

  // Verificar se é admin ou tem permissão especial
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissions')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && !profile.permissions?.includes('send_messages'))) {
    return { authorized: false, error: 'Sem permissão para enviar mensagens' };
  }

  return { authorized: true, user, profile };
}

// POST /api/messages - Enviar mensagem
export async function POST(request: NextRequest) {
  try {
    const { authorized, error, user } = await verifyPermission(request);
    
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, message, recipients } = body;

    // Validar tipo de mensagem
    if (!['email', 'whatsapp', 'both'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de mensagem inválido. Use: email, whatsapp ou both' },
        { status: 400 }
      );
    }

    // Validar destinatários
    if (!recipients || (!Array.isArray(recipients) && typeof recipients !== 'object')) {
      return NextResponse.json(
        { error: 'Destinatários inválidos' },
        { status: 400 }
      );
    }

    const results: any[] = [];

    // Processar destinatários
    const recipientList = Array.isArray(recipients) ? recipients : [recipients];

    for (const recipient of recipientList) {
      const result: any = {
        recipient: recipient.email || recipient.whatsapp || recipient.name,
        email: null,
        whatsapp: null
      };

      // Enviar e-mail
      if ((type === 'email' || type === 'both') && recipient.email && message.email) {
        const emailMessage: EmailMessage = {
          to: recipient.email,
          subject: MessageService.processTemplate(message.email.subject, recipient.data || {}),
          html: MessageService.processTemplate(message.email.html, recipient.data || {}),
          text: message.email.text ? MessageService.processTemplate(message.email.text, recipient.data || {}) : undefined
        };

        result.email = await MessageService.sendEmail(emailMessage);
      }

      // Enviar WhatsApp
      if ((type === 'whatsapp' || type === 'both') && recipient.whatsapp && message.whatsapp) {
        const whatsappMessage: WhatsAppMessage = {
          to: recipient.whatsapp,
          message: MessageService.processTemplate(message.whatsapp.text, recipient.data || {})
        };

        result.whatsapp = await MessageService.sendWhatsApp(whatsappMessage);
      }

      results.push(result);
    }

    // Log da ação
    LoggerService.logUserAction('send_message', user.id, {
      type,
      recipientCount: recipientList.length,
      results
    });

    return NextResponse.json({
      success: true,
      results,
      message: 'Mensagens processadas com sucesso'
    });

  } catch (error) {
    LoggerService.error('Erro ao enviar mensagens', 'MessagesAPI', { error });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/messages/welcome - Enviar mensagem de boas-vindas
export async function PUT(request: NextRequest) {
  try {
    const { authorized, error, user } = await verifyPermission(request);
    
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { customerData } = body;

    // Validar dados do cliente
    if (!customerData || !customerData.name || !customerData.planName) {
      return NextResponse.json(
        { error: 'Dados do cliente inválidos' },
        { status: 400 }
      );
    }

    const result = await MessageService.sendWelcomeMessage(customerData);

    // Log da ação
    LoggerService.logUserAction('send_welcome_message', user.id, {
      customerName: customerData.name,
      result
    });

    return NextResponse.json({
      success: true,
      result,
      message: 'Mensagem de boas-vindas enviada'
    });

  } catch (error) {
    LoggerService.error('Erro ao enviar mensagem de boas-vindas', 'MessagesAPI', { error });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/messages/reminder - Enviar lembrete de vencimento
export async function PATCH(request: NextRequest) {
  try {
    const { authorized, error, user } = await verifyPermission(request);
    
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { customerData } = body;

    // Validar dados do cliente
    if (!customerData || !customerData.name || !customerData.planName || !customerData.expirationDate) {
      return NextResponse.json(
        { error: 'Dados do cliente inválidos' },
        { status: 400 }
      );
    }

    const result = await MessageService.sendExpirationReminder(customerData);

    // Log da ação
    LoggerService.logUserAction('send_expiration_reminder', user.id, {
      customerName: customerData.name,
      daysUntilExpiration: customerData.daysUntilExpiration,
      result
    });

    return NextResponse.json({
      success: true,
      result,
      message: 'Lembrete de vencimento enviado'
    });

  } catch (error) {
    LoggerService.error('Erro ao enviar lembrete de vencimento', 'MessagesAPI', { error });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET /api/messages/test - Testar conectividade dos serviços
export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await verifyPermission(request);
    
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: 401 }
      );
    }

    const testResults = await MessageService.testConnections();

    return NextResponse.json({
      success: true,
      connections: testResults,
      message: 'Teste de conectividade concluído'
    });

  } catch (error) {
    LoggerService.error('Erro ao testar conectividade', 'MessagesAPI', { error });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}