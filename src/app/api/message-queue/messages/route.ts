import { NextRequest, NextResponse } from 'next/server';
import { messageQueue } from '@/services/message-queue.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const messages = messageQueue.getMessages({
      status: status as any,
      type: type as any,
      priority: priority as any,
      limit,
      offset
    });

    return NextResponse.json({
      success: true,
      messages,
      total: messages.length
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, priority = 'normal', scheduledFor } = body;

    if (!type || !data) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tipo e dados são obrigatórios' 
        },
        { status: 400 }
      );
    }

    const messageId = await messageQueue.addMessage(
      type,
      data,
      {
        priority,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
      }
    );

    return NextResponse.json({
      success: true,
      messageId,
      message: 'Mensagem adicionada à fila com sucesso'
    });
  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}
