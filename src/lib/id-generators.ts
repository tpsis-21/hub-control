// Geradores de IDs para diferentes entidades do sistema

/**
 * Gera um ID de gestor mais robusto
 * Formato: 3 letras + 3 números (ex: ABC123)
 * Isso permite 17.576.000 combinações únicas
 */
export function generateManagerId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let result = '';
  
  // 3 letras
  for (let i = 0; i < 3; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // 3 números
  for (let i = 0; i < 3; i++) {
    result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return result;
}

/**
 * Gera um ID de gestor curto (formato atual)
 * Formato: 1 letra + 1 número (ex: A1)
 * Mantido para compatibilidade
 */
export function generateShortManagerId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  const letter = letters.charAt(Math.floor(Math.random() * letters.length));
  const number = numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  return letter + number;
}

/**
 * Gera um customer ID único
 * Formato: CUST + timestamp + random (ex: CUST1703123456789ABC)
 */
export function generateCustomerId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `CUST${timestamp}${random}`;
}

/**
 * Gera um ID alfanumérico de tamanho customizável
 * @param length - Tamanho do ID (padrão: 8)
 * @param prefix - Prefixo opcional
 */
export function generateAlphanumericId(length: number = 8, prefix?: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix || '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Valida se um manager ID está no formato correto
 * @param managerId - ID a ser validado
 * @param format - Formato esperado ('short' para A1, 'long' para ABC123)
 */
export function validateManagerId(managerId: string, format: 'short' | 'long' = 'short'): boolean {
  if (format === 'short') {
    return /^[A-Z][0-9]$/.test(managerId);
  } else {
    return /^[A-Z]{3}[0-9]{3}$/.test(managerId);
  }
}

/**
 * Verifica se um manager ID já existe no sistema
 * @param managerId - ID a ser verificado
 * @param existingIds - Array de IDs existentes
 */
export function isManagerIdUnique(managerId: string, existingIds: string[]): boolean {
  return !existingIds.includes(managerId);
}

/**
 * Gera um manager ID único garantindo que não existe no sistema
 * @param existingIds - Array de IDs já existentes
 * @param format - Formato do ID ('short' ou 'long')
 * @param maxAttempts - Número máximo de tentativas (padrão: 100)
 */
export function generateUniqueManagerId(
  existingIds: string[], 
  format: 'short' | 'long' = 'long',
  maxAttempts: number = 100
): string {
  let attempts = 0;
  let managerId: string;
  
  do {
    managerId = format === 'short' ? generateShortManagerId() : generateManagerId();
    attempts++;
    
    if (attempts >= maxAttempts) {
      throw new Error(`Não foi possível gerar um manager ID único após ${maxAttempts} tentativas`);
    }
  } while (!isManagerIdUnique(managerId, existingIds));
  
  return managerId;
}

/**
 * Gera um ID numérico de servidor de 2 dígitos (10-99)
 * Similar ao sistema de planos, facilita uso em APIs e importações
 */
export function generateServerPanelId(): string {
  // Gera número entre 10 e 99 (2 dígitos)
  const id = Math.floor(Math.random() * 90) + 10;
  return id.toString();
}

/**
 * Gera um ID único de servidor garantindo que não existe no sistema
 * @param existingIds - Array de IDs já existentes
 * @param maxAttempts - Número máximo de tentativas (padrão: 90)
 * @returns ID numérico de 2 dígitos (10-99)
 */
export function generateUniqueServerPanelId(
  existingIds: string[],
  maxAttempts: number = 90
): string {
  let attempts = 0;
  let serverId: string;
  
  do {
    serverId = generateServerPanelId();
    attempts++;
    
    if (attempts >= maxAttempts) {
      // Se esgotar tentativas com 2 dígitos, usar 3 dígitos como fallback
      const fallbackId = Math.floor(Math.random() * 900) + 100;
      return fallbackId.toString();
    }
  } while (existingIds.includes(serverId));
  
  return serverId;
}