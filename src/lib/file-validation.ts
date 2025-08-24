// 🔒 Sistema de Validação de Upload de Arquivos
// Implementa validação rigorosa de tipos, tamanho e conteúdo de arquivos

export interface FileValidationConfig {
  maxSize: number; // em bytes
  allowedTypes: string[];
  allowedExtensions: string[];
  scanForMalware?: boolean;
  validateContent?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
}

// Configurações padrão por tipo de arquivo
export const FILE_VALIDATION_CONFIGS: Record<string, FileValidationConfig> = {
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    validateContent: true
  },
  image: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    validateContent: true
  },
  document: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
    validateContent: true,
    scanForMalware: true
  },
  media: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mp3', 'audio/wav', 'audio/ogg'
    ],
    allowedExtensions: [
      '.jpg', '.jpeg', '.png', '.webp', '.gif',
      '.mp4', '.webm', '.ogv',
      '.mp3', '.wav', '.ogg'
    ],
    validateContent: true
  }
};

// Assinaturas de arquivo (magic numbers) para validação de conteúdo
const FILE_SIGNATURES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'video/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]],
  'audio/mp3': [[0x49, 0x44, 0x33], [0xFF, 0xFB]]
};

// Padrões maliciosos conhecidos
const MALICIOUS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /\x00/g, // null bytes
  /%00/g,  // encoded null bytes
];

/**
 * Valida um arquivo baseado na configuração fornecida
 */
export async function validateFile(
  file: File,
  config: FileValidationConfig
): Promise<FileValidationResult> {
  const result: FileValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    fileInfo: {
      name: file.name,
      size: file.size,
      type: file.type,
      extension: getFileExtension(file.name)
    }
  };

  // 1. Validar tamanho do arquivo
  if (file.size > config.maxSize) {
    result.errors.push(
      `Arquivo muito grande. Tamanho máximo permitido: ${formatFileSize(config.maxSize)}`
    );
    result.isValid = false;
  }

  if (file.size === 0) {
    result.errors.push('Arquivo está vazio');
    result.isValid = false;
  }

  // 2. Validar tipo MIME
  if (!config.allowedTypes.includes(file.type)) {
    result.errors.push(
      `Tipo de arquivo não permitido: ${file.type}. Tipos permitidos: ${config.allowedTypes.join(', ')}`
    );
    result.isValid = false;
  }

  // 3. Validar extensão
  const extension = getFileExtension(file.name);
  if (!config.allowedExtensions.includes(extension)) {
    result.errors.push(
      `Extensão não permitida: ${extension}. Extensões permitidas: ${config.allowedExtensions.join(', ')}`
    );
    result.isValid = false;
  }

  // 4. Validar nome do arquivo
  if (!isValidFileName(file.name)) {
    result.errors.push('Nome do arquivo contém caracteres inválidos');
    result.isValid = false;
  }

  // 5. Validação de conteúdo (se habilitada)
  if (config.validateContent && result.isValid) {
    try {
      const contentValidation = await validateFileContent(file);
      if (!contentValidation.isValid) {
        result.errors.push(...contentValidation.errors);
        result.warnings.push(...contentValidation.warnings);
        result.isValid = false;
      }
    } catch (error) {
      result.warnings.push('Não foi possível validar o conteúdo do arquivo');
    }
  }

  // 6. Scan de malware (se habilitado)
  if (config.scanForMalware && result.isValid) {
    try {
      const malwareCheck = await scanForMalware(file);
      if (!malwareCheck.isClean) {
        result.errors.push('Arquivo contém conteúdo suspeito ou malicioso');
        result.isValid = false;
      }
    } catch (error) {
      result.warnings.push('Não foi possível verificar malware no arquivo');
    }
  }

  return result;
}

/**
 * Valida o conteúdo do arquivo verificando assinatura e estrutura
 */
async function validateFileContent(file: File): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const result = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[]
  };

  try {
    // Ler os primeiros bytes do arquivo
    const arrayBuffer = await file.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Verificar assinatura do arquivo
    const signatures = FILE_SIGNATURES[file.type];
    if (signatures) {
      const hasValidSignature = signatures.some(signature => 
        signature.every((byte, index) => bytes[index] === byte)
      );

      if (!hasValidSignature) {
        result.errors.push('Assinatura do arquivo não corresponde ao tipo declarado');
        result.isValid = false;
      }
    }

    // Para arquivos de texto, verificar conteúdo
    if (file.type.startsWith('text/') || file.type === 'application/pdf') {
      const text = await file.text();
      
      // Verificar padrões maliciosos
      for (const pattern of MALICIOUS_PATTERNS) {
        if (pattern.test(text)) {
          result.errors.push('Arquivo contém código potencialmente malicioso');
          result.isValid = false;
          break;
        }
      }

      // Verificar caracteres suspeitos
      if (text.includes('\x00') || text.includes('%00')) {
        result.errors.push('Arquivo contém caracteres nulos suspeitos');
        result.isValid = false;
      }
    }

  } catch (error) {
    result.warnings.push('Erro ao validar conteúdo do arquivo');
  }

  return result;
}

/**
 * Scan básico de malware verificando padrões conhecidos
 */
async function scanForMalware(file: File): Promise<{ isClean: boolean }> {
  try {
    // Para arquivos pequenos, verificar todo o conteúdo
    if (file.size < 1024 * 1024) { // 1MB
      const text = await file.text();
      
      // Padrões de malware conhecidos
      const malwarePatterns = [
        /eval\s*\(/gi,
        /exec\s*\(/gi,
        /system\s*\(/gi,
        /shell_exec/gi,
        /base64_decode/gi,
        /\$_GET\[/gi,
        /\$_POST\[/gi,
        /<\?php/gi,
        /<%.*%>/gi,
        /document\.write/gi,
        /window\.location/gi
      ];

      for (const pattern of malwarePatterns) {
        if (pattern.test(text)) {
          return { isClean: false };
        }
      }
    }

    return { isClean: true };
  } catch (error) {
    // Em caso de erro, assumir que não é limpo por segurança
    return { isClean: false };
  }
}

/**
 * Extrai a extensão do arquivo
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.slice(lastDot).toLowerCase();
}

/**
 * Valida se o nome do arquivo é seguro
 */
function isValidFileName(filename: string): boolean {
  // Caracteres não permitidos
  const invalidChars = /[<>:"\/\\|?*\x00-\x1f]/;
  
  // Nomes reservados no Windows
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
  
  // Verificações
  if (invalidChars.test(filename)) return false;
  if (reservedNames.test(filename.split('.')[0])) return false;
  if (filename.length > 255) return false;
  if (filename.trim() !== filename) return false;
  if (filename.startsWith('.') || filename.endsWith('.')) return false;
  
  return true;
}

/**
 * Formata o tamanho do arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Gera um nome de arquivo seguro
 */
export function generateSecureFileName(originalName: string, userId: string): string {
  const extension = getFileExtension(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${userId}/${timestamp}_${random}${extension}`;
}

/**
 * Valida arquivo por tipo específico
 */
export async function validateFileByType(
  file: File,
  type: keyof typeof FILE_VALIDATION_CONFIGS
): Promise<FileValidationResult> {
  const config = FILE_VALIDATION_CONFIGS[type];
  if (!config) {
    throw new Error(`Configuração não encontrada para o tipo: ${type}`);
  }
  
  return validateFile(file, config);
}

/**
 * Hook para validação em tempo real
 */
export function useFileValidation() {
  const validateFiles = async (
    files: FileList | File[],
    type: keyof typeof FILE_VALIDATION_CONFIGS
  ): Promise<FileValidationResult[]> => {
    const fileArray = Array.from(files);
    const results: FileValidationResult[] = [];
    
    for (const file of fileArray) {
      const result = await validateFileByType(file, type);
      results.push(result);
    }
    
    return results;
  };
  
  return { validateFiles };
}