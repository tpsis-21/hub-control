import { NextRequest, NextResponse } from 'next/server';
import { messageQueue } from '@/services/message-queue.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const message = messageQueue.getMessage(id);
    
    if (!message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Mensagem não encontrada' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Erro ao buscar mensagem:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const success = messageQueue.removeMessage(id);
    
    if (!success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Mensagem não encontrada ou não pode ser removida' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mensagem removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover mensagem:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}