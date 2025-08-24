// 🔒 API de Upload Seguro de Arquivos
// Endpoint protegido para upload de arquivos com validação completa

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { validateFileByType, generateSecureFileName } from '@/lib/file-validation';
// import { logSecurityEvent } from '@/lib/security';
import { getClientIP } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticação
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      // await logSecurityEvent({
      //   action: 'SECURE_UPLOAD_UNAUTHORIZED',
      //   details: 'Tentativa de upload sem autenticação',
      //   ip: getClientIP(request),
      //   userAgent: request.headers.get('user-agent') || 'unknown'
      // });
      
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // 2. Verificar rate limiting para uploads
    const rateLimitResult = await checkSecureUploadRateLimit(user.id);
    
    if (!rateLimitResult.allowed) {
      // await logSecurityEvent({
      //   action: 'SECURE_UPLOAD_RATE_LIMIT',
      //   details: 'Rate limit excedido para upload seguro',
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'medium'
      // });
      
      return NextResponse.json(
        { 
          error: 'Limite de uploads excedido. Tente novamente em alguns minutos.',
          retryAfter: rateLimitResult.retryAfter
        },
        { status: 429 }
      );
    }

    // 3. Processar dados da requisição
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileType = formData.get('type') as string;
    const bucket = formData.get('bucket') as string || 'user-uploads';
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo fornecido' },
        { status: 400 }
      );
    }

    // 4. Validar arquivo completamente
    const validationResult = await validateFileByType(file, fileType as any);
    
    if (!validationResult.isValid) {
      // await logSecurityEvent({
      //   action: 'INVALID_FILE_UPLOAD_BLOCKED',
      //   details: `Upload bloqueado: ${validationResult.errors.join(', ')}`,
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
      
      return NextResponse.json(
        { 
          error: 'Arquivo não passou na validação de segurança',
          details: validationResult.errors,
          warnings: validationResult.warnings
        },
        { status: 400 }
      );
    }

    // 5. Gerar nome seguro para o arquivo
    const secureFileName = generateSecureFileName(file.name, user.id);
    
    // 6. Verificar se o bucket é permitido
    const allowedBuckets = ['avatars', 'documents', 'user-uploads', 'profiles'];
    if (!allowedBuckets.includes(bucket)) {
      return NextResponse.json(
        { error: 'Bucket não permitido' },
        { status: 400 }
      );
    }

    // 7. Upload para o Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(secureFileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      // await logSecurityEvent({
      //   action: 'SECURE_UPLOAD_FAILED',
      //   details: `Erro no upload: ${uploadError.message}`,
      //   userId: user.id,
      //   userEmail: user.email,
      //   severity: 'medium',
      //   metadata: {
      //     fileName: file.name,
      //     secureFileName,
      //     bucket,
      //     error: uploadError.message
      //   }
      // });
      
      return NextResponse.json(
        { error: 'Erro no upload do arquivo', details: uploadError.message },
        { status: 500 }
      );
    }

    // 8. Obter URL pública (se necessário)
    let publicUrl = null;
    if (bucket === 'avatars' || bucket === 'profiles') {
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uploadData.path);
      publicUrl = urlData.publicUrl;
    }

    // 9. Registrar upload bem-sucedido
    // await logSecurityEvent({
    //   action: 'SECURE_UPLOAD_SUCCESS',
    //   details: `Upload realizado com sucesso: ${file.name}`,
    //   userId: user.id,
    //   userEmail: user.email,
    //   metadata: {
    //     originalFileName: file.name,
    //     secureFileName,
    //     bucket,
    //     fileSize: file.size,
    //     fileType: file.type,
    //     path: uploadData.path
    //   }
    // });

    // 10. Registrar no banco de dados para auditoria
    await supabase
      .from('file_uploads')
      .insert({
        user_id: user.id,
        original_name: file.name,
        secure_name: secureFileName,
        file_type: file.type,
        file_size: file.size,
        bucket: bucket,
        path: uploadData.path,
        public_url: publicUrl,
        validation_passed: true,
        uploaded_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      data: {
        path: uploadData.path,
        publicUrl,
        fileName: file.name,
        secureFileName,
        fileSize: file.size,
        fileType: file.type
      },
      validation: {
        warnings: validationResult.warnings
      }
    });

  } catch (error) {
    console.error('Erro no upload seguro:', error);
    
    // await logSecurityEvent({
    //   action: 'SECURE_UPLOAD_ERROR',
    //   details: `Erro interno no upload seguro: ${error}`,
    //   severity: 'high',
    //   ip: getClientIP(request)
    // });
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Rate limiting específico para uploads seguros
const secureUploadRateLimitStore = new Map<string, {
  count: number;
  resetTime: number;
  dailyCount: number;
  dailyResetTime: number;
}>();

async function checkSecureUploadRateLimit(userId: string): Promise<{
  allowed: boolean;
  retryAfter?: number;
}> {
  const now = Date.now();
  const hourlyWindowMs = 60 * 60 * 1000; // 1 hora
  const dailyWindowMs = 24 * 60 * 60 * 1000; // 24 horas
  const maxHourlyUploads = 10; // 10 uploads por hora
  const maxDailyUploads = 50; // 50 uploads por dia
  
  const current = secureUploadRateLimitStore.get(userId);
  
  if (!current || now > current.resetTime) {
    const newRecord = {
      count: 1,
      resetTime: now + hourlyWindowMs,
      dailyCount: current?.dailyCount || 0,
      dailyResetTime: current?.dailyResetTime || now + dailyWindowMs
    };
    
    // Reset daily count if needed
    if (now > (current?.dailyResetTime || 0)) {
      newRecord.dailyCount = 1;
      newRecord.dailyResetTime = now + dailyWindowMs;
    } else {
      newRecord.dailyCount = (current?.dailyCount || 0) + 1;
    }
    
    secureUploadRateLimitStore.set(userId, newRecord);
    
    // Check daily limit
    if (newRecord.dailyCount > maxDailyUploads) {
      const retryAfter = Math.ceil((newRecord.dailyResetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }
    
    return { allowed: true };
  }
  
  // Check hourly limit
  if (current.count >= maxHourlyUploads) {
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Check daily limit
  if (current.dailyCount >= maxDailyUploads) {
    const retryAfter = Math.ceil((current.dailyResetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  current.count++;
  current.dailyCount++;
  
  return { allowed: true };
}

// Limpeza periódica do rate limit store
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of secureUploadRateLimitStore.entries()) {
    if (now > value.dailyResetTime) {
      secureUploadRateLimitStore.delete(key);
    }
  }
}, 60000); // Limpar a cada minuto