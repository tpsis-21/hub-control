import { NextRequest, NextResponse } from 'next/server';
import { messageQueue } from '@/services/message-queue.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId } = body;

    if (!messageId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID da mensagem é obrigatório' 
        },
        { status: 400 }
      );
    }

    const success = messageQueue.retryMessage(messageId);
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Mensagem não encontrada ou não pode ser reprocessada' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem adicionada novamente à fila para reprocessamento'
    });
  } catch (error) {
    console.error('Erro ao reprocessar mensagem:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}