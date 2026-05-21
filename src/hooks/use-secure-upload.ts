// 🔒 Hook para Upload Seguro de Arquivos
// Hook personalizado para gerenciar uploads com validação completa

import { useState, useCallback } from 'react';
import { appToast } from '@/lib/app-toast';
import { validateFileByType, FILE_VALIDATION_CONFIGS, formatFileSize } from '@/lib/file-validation';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResult {
  success: boolean;
  data?: {
    path: string;
    publicUrl?: string;
    fileName: string;
    secureFileName: string;
    fileSize: number;
    fileType: string;
  };
  error?: string;
  details?: string[];
  warnings?: string[];
}

interface UseSecureUploadOptions {
  bucket?: string;
  onProgress?: (progress: UploadProgress) => void;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string, details?: string[]) => void;
  validateBeforeUpload?: boolean;
  showToasts?: boolean;
}

interface UseSecureUploadReturn {
  upload: (file: File, fileType: keyof typeof FILE_VALIDATION_CONFIGS) => Promise<UploadResult>;
  isUploading: boolean;
  progress: UploadProgress | null;
  validateFile: (file: File, fileType: keyof typeof FILE_VALIDATION_CONFIGS) => Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  getMaxFileSize: (fileType: keyof typeof FILE_VALIDATION_CONFIGS) => string;
  getAllowedTypes: (fileType: keyof typeof FILE_VALIDATION_CONFIGS) => string[];
}

export function useSecureUpload(options: UseSecureUploadOptions = {}): UseSecureUploadReturn {
  const {
    bucket = 'user-uploads',
    onProgress,
    onSuccess,
    onError,
    validateBeforeUpload = true,
    showToasts = true
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const validateFile = useCallback(async (
    file: File, 
    fileType: keyof typeof FILE_VALIDATION_CONFIGS
  ) => {
    try {
      const result = await validateFileByType(file, fileType);
      
      if (showToasts && !result.isValid) {
        appToast.error('Arquivo inválido', result.errors.join(', '));
      }
      
      if (showToasts && result.warnings.length > 0) {
        appToast.warning('Avisos de validação', result.warnings.join(', '));
      }
      
      return result;
    } catch (error) {
      const errorMessage = 'Erro na validação do arquivo';
      
      if (showToasts) {
        appToast.error(errorMessage);
      }
      
      return {
        isValid: false,
        errors: [errorMessage],
        warnings: []
      };
    }
  }, [showToasts]);

  const upload = useCallback(async (
    file: File,
    fileType: keyof typeof FILE_VALIDATION_CONFIGS
  ): Promise<UploadResult> => {
    if (isUploading) {
      const error = 'Upload já em andamento';
      if (showToasts) {
        appToast.error(error);
      }
      return { success: false, error };
    }

    setIsUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // 1. Validação prévia (se habilitada)
      if (validateBeforeUpload) {
        if (showToasts) {
          appToast.loading('Validando arquivo...', { id: 'upload-validation' });
        }
        
        const validation = await validateFile(file, fileType);
        
        if (showToasts) {
          appToast.dismiss('upload-validation');
        }
        
        if (!validation.isValid) {
          const result: UploadResult = {
            success: false,
            error: 'Arquivo não passou na validação',
            details: validation.errors,
            warnings: validation.warnings
          };
          
          onError?.(result.error!, result.details);
          return result;
        }
      }

      // 2. Preparar FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', fileType);
      formData.append('bucket', bucket);

      // 3. Criar XMLHttpRequest para monitorar progresso
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progressData: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            };
            
            setProgress(progressData);
            onProgress?.(progressData);
          }
        });

        xhr.addEventListener('load', () => {
          try {
            const response = JSON.parse(xhr.responseText);
            
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve({
                success: true,
                data: response.data,
                warnings: response.validation?.warnings
              });
            } else {
              resolve({
                success: false,
                error: response.error || 'Erro no upload',
                details: response.details
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: 'Erro ao processar resposta do servidor'
            });
          }
        });

        xhr.addEventListener('error', () => {
          resolve({
            success: false,
            error: 'Erro de conexão durante o upload'
          });
        });

        xhr.addEventListener('timeout', () => {
          resolve({
            success: false,
            error: 'Timeout durante o upload'
          });
        });

        xhr.open('POST', '/api/upload/secure');
        xhr.withCredentials = true; // Incluir cookies de autenticação
        xhr.timeout = 300000; // 5 minutos
        xhr.send(formData);
      });

      if (showToasts) {
        appToast.loading('Enviando arquivo...', { id: 'upload-progress' });
      }

      const result = await uploadPromise;

      if (showToasts) {
        appToast.dismiss('upload-progress');
      }

      if (result.success) {
        if (showToasts) {
          appToast.success(
            'Arquivo enviado com sucesso!',
            `${file.name} (${formatFileSize(file.size)})`
          );
        }
        
        onSuccess?.(result);
      } else {
        if (showToasts) {
          appToast.error('Erro no upload', result.error);
        }
        
        onError?.(result.error!, result.details);
      }

      return result;

    } catch (error) {
      const errorMessage = 'Erro inesperado durante o upload';
      
      if (showToasts) {
        appToast.dismiss('upload-progress');
        appToast.error(errorMessage);
      }
      
      const result: UploadResult = {
        success: false,
        error: errorMessage
      };
      
      onError?.(result.error!);
      return result;
      
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  }, [isUploading, bucket, validateBeforeUpload, showToasts, onProgress, onSuccess, onError, validateFile]);

  const getMaxFileSize = useCallback((fileType: keyof typeof FILE_VALIDATION_CONFIGS): string => {
    const config = FILE_VALIDATION_CONFIGS[fileType];
    return formatFileSize(config.maxSize);
  }, []);

  const getAllowedTypes = useCallback((fileType: keyof typeof FILE_VALIDATION_CONFIGS): string[] => {
    const config = FILE_VALIDATION_CONFIGS[fileType];
    return config.allowedTypes;
  }, []);

  return {
    upload,
    isUploading,
    progress,
    validateFile,
    getMaxFileSize,
    getAllowedTypes
  };
}

// Hook especializado para upload de avatares
export function useAvatarUpload(options: Omit<UseSecureUploadOptions, 'bucket'> = {}) {
  return useSecureUpload({
    ...options,
    bucket: 'avatars'
  });
}

// Hook especializado para upload de documentos
export function useDocumentUpload(options: Omit<UseSecureUploadOptions, 'bucket'> = {}) {
  return useSecureUpload({
    ...options,
    bucket: 'documents'
  });
}

// Hook especializado para upload de imagens
export function useImageUpload(options: Omit<UseSecureUploadOptions, 'bucket'> = {}) {
  return useSecureUpload({
    ...options,
    bucket: 'user-uploads'
  });
}
