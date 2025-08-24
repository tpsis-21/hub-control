// 🔒 API de Validação de Upload de Arquivos
// Endpoint seguro para validação de arquivos antes do upload

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { validateFileByType, FILE_VALIDATION_CONFIGS } from '@/lib/file-validation';
// import { logSecurityEvent, getClientIP } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      // await logSecurityEvent({
      //   action: 'UPLOAD_VALIDATION_UNAUTHORIZED',
      //   details: 'Tentativa de validação de upload sem autenticação',
      //   ip: getClientIP(request),
      //   userAgent: request.headers.get('user-agent') || 'unknown'
      // });
      
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // 2. Verificar rate limiting específico para uploads
    const rateLimitKey = `upload_validation:${user.id}`;
    const rateLimitResult = await checkUploadRateLimit(rateLimitKey);
    
    if (!rateLimitResult.allowed) {
      // await logSecurityEvent({
      //   action: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      //   details: `Rate limit excedido para validação de upload`,
      //   userId: user.id,
      //   userEmail: user.email,
      //   ip: getClientIP(request)
      // });
      
      return NextResponse.json(
        { 
          error: 'Muitas tentativas de validação. Tente novamente em alguns minutos.',
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429 }
      );
    }

    // 3. Processar dados da requisição
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('type') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo fornecido' },
        { status: 400 }
      );
    }
    
    if (!fileType || !(fileType in FILE_VALIDATION_CONFIGS)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido ou não especificado' },
        { status: 400 }
      );
    }

    // 4. Validar arquivo
    const validationResult = await validateFileByType(
      file, 
      fileType as keyof typeof FILE_VALIDATION_CONFIGS
    );

    // 5. Log de segurança
    // await logSecurityEvent({
    //   action: 'FILE_VALIDATION_ATTEMPT',
    //   details: `Validação de arquivo: ${file.name} (${file.type}, ${file.size} bytes)`,
    //   userId: user.id,
    //   userEmail: user.email,
    //   metadata: {
    //     fileName: file.name,
    //     fileType: file.type,
    //     fileSize: file.size,
    //     validationType: fileType,
    //     isValid: validationResult.isValid,
    //     errors: validationResult.errors,
    //     warnings: validationResult.warnings
    //   }
    // });

    // 6. Se arquivo inválido, log adicional de segurança
    if (!validationResult.isValid) {
      // await logSecurityEvent({
      //   action: 'INVALID_FILE_UPLOAD_ATTEMPT',
      //   details: `Tentativa de upload de arquivo inválido: ${validationResult.errors.join(', ')}`,
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'medium',
      //   metadata: {
      //     fileName: file.name,
      //     fileType: file.type,
      //     fileSize: file.size,
      //     errors: validationResult.errors
      //   }
      // });
    }

    // 7. Retornar resultado
    return NextResponse.json({
      success: true,
      validation: validationResult,
      message: validationResult.isValid 
        ? 'Arquivo válido para upload' 
        : 'Arquivo não passou na validação'
    });

  } catch (error) {
    console.error('Erro na validação de upload:', error);
    
    // await logSecurityEvent({
    //   action: 'UPLOAD_VALIDATION_ERROR',
    //   details: `Erro interno na validação de upload: ${error}`,
    //   severity: 'high',
    //   ip: getClientIP(request)
    // });
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Rate limiting específico para validação de uploads
const uploadRateLimitStore = new Map<string, {
  count: number;
  resetTime: number;
}>();

async function checkUploadRateLimit(key: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutos
  const maxAttempts = 20; // 20 validações por 5 minutos
  
  const current = uploadRateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    uploadRateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true };
  }
  
  if (current.count >= maxAttempts) {
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  current.count++;
  return { allowed: true };
}

// Limpeza periódica do rate limit store
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of uploadRateLimitStore.entries()) {
    if (now > value.resetTime) {
      uploadRateLimitStore.delete(key);
    }
  }
}, 60000); // Limpar a cada minuto