'use client';

/**
 * Utilitários de validação local para evitar requisições desnecessárias
 * Estas validações são executadas no cliente sem fazer chamadas para APIs
 */

// Tipos para validação local
export interface LocalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface URLValidationResult extends LocalValidationResult {
  protocol?: string;
  hostname?: string;
  port?: string;
}

export interface CredentialsValidationResult extends LocalValidationResult {
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Valida formato de URL sem fazer requisições
 */
export function validateURLFormat(url: string): URLValidationResult {
  const result: URLValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!url || url.trim() === '') {
    result.isValid = false;
    result.errors.push('URL é obrigatória');
    return result;
  }

  try {
    const urlObj = new URL(url);
    result.protocol = urlObj.protocol;
    result.hostname = urlObj.hostname;
    result.port = urlObj.port;

    // Validações de protocolo
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      result.errors.push('Protocolo deve ser HTTP ou HTTPS');
      result.isValid = false;
    }

    // Preferência por HTTPS
    if (urlObj.protocol === 'http:') {
      result.warnings.push('Recomendado usar HTTPS para maior segurança');
    }

    // Validação de hostname
    if (!urlObj.hostname) {
      result.errors.push('Hostname inválido');
      result.isValid = false;
    }

    // Validação de porta
    if (urlObj.port && (parseInt(urlObj.port) < 1 || parseInt(urlObj.port) > 65535)) {
      result.errors.push('Porta deve estar entre 1 e 65535');
      result.isValid = false;
    }

  } catch (error) {
    result.isValid = false;
    result.errors.push('Formato de URL inválido');
  }

  return result;
}

/**
 * Valida credenciais sem fazer requisições
 */
export function validateCredentials(username: string, password: string): CredentialsValidationResult {
  const result: CredentialsValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    strength: 'weak'
  };

  // Validação de username
  if (!username || username.trim() === '') {
    result.isValid = false;
    result.errors.push('Nome de usuário é obrigatório');
  } else if (username.length < 3) {
    result.warnings.push('Nome de usuário muito curto (mínimo 3 caracteres)');
  }

  // Validação de senha
  if (!password || password.trim() === '') {
    result.isValid = false;
    result.errors.push('Senha é obrigatória');
  } else {
    // Análise de força da senha
    let strengthScore = 0;
    
    if (password.length >= 8) strengthScore++;
    if (/[A-Z]/.test(password)) strengthScore++;
    if (/[a-z]/.test(password)) strengthScore++;
    if (/[0-9]/.test(password)) strengthScore++;
    if (/[^A-Za-z0-9]/.test(password)) strengthScore++;

    if (strengthScore < 2) {
      result.strength = 'weak';
      result.warnings.push('Senha fraca - use pelo menos 8 caracteres com letras e números');
    } else if (strengthScore < 4) {
      result.strength = 'medium';
      result.warnings.push('Senha média - adicione caracteres especiais para maior segurança');
    } else {
      result.strength = 'strong';
    }
  }

  return result;
}

/**
 * Valida configuração de API Key
 */
export function validateAPIKey(apiKey: string): LocalValidationResult {
  const result: LocalValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (!apiKey || apiKey.trim() === '') {
    result.isValid = false;
    result.errors.push('API Key é obrigatória');
    return result;
  }

  // Validações básicas de formato
  if (apiKey.length < 10) {
    result.warnings.push('API Key parece muito curta');
  }

  if (apiKey.includes(' ')) {
    result.warnings.push('API Key não deve conter espaços');
  }

  // Verificar se não é um placeholder comum
  const commonPlaceholders = ['your-api-key', 'api-key-here', 'insert-key', 'test-key'];
  if (commonPlaceholders.some(placeholder => apiKey.toLowerCase().includes(placeholder))) {
    result.isValid = false;
    result.errors.push('API Key parece ser um placeholder - insira uma chave válida');
  }

  return result;
}

/**
 * Valida configuração de timeout
 */
export function validateTimeout(timeout: number): LocalValidationResult {
  const result: LocalValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (timeout < 1000) {
    result.errors.push('Timeout deve ser pelo menos 1 segundo (1000ms)');
    result.isValid = false;
  } else if (timeout < 5000) {
    result.warnings.push('Timeout muito baixo - pode causar falhas em conexões lentas');
  }

  if (timeout > 60000) {
    result.warnings.push('Timeout muito alto - pode afetar a experiência do usuário');
  }

  return result;
}

/**
 * Valida configuração completa de integração
 */
export function validateIntegrationConfig(config: {
  apiUrl?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  timeout?: number;
}): LocalValidationResult {
  const result: LocalValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Validar URL se fornecida
  if (config.apiUrl) {
    const urlValidation = validateURLFormat(config.apiUrl);
    result.errors.push(...urlValidation.errors);
    result.warnings.push(...urlValidation.warnings);
    if (!urlValidation.isValid) result.isValid = false;
  }

  // Validar API Key se fornecida
  if (config.apiKey) {
    const keyValidation = validateAPIKey(config.apiKey);
    result.errors.push(...keyValidation.errors);
    result.warnings.push(...keyValidation.warnings);
    if (!keyValidation.isValid) result.isValid = false;
  }

  // Validar credenciais se fornecidas
  if (config.username || config.password) {
    const credValidation = validateCredentials(config.username || '', config.password || '');
    result.errors.push(...credValidation.errors);
    result.warnings.push(...credValidation.warnings);
    if (!credValidation.isValid) result.isValid = false;
  }

  // Validar timeout se fornecido
  if (config.timeout !== undefined) {
    const timeoutValidation = validateTimeout(config.timeout);
    result.errors.push(...timeoutValidation.errors);
    result.warnings.push(...timeoutValidation.warnings);
    if (!timeoutValidation.isValid) result.isValid = false;
  }

  return result;
}

/**
 * Valida configuração de monitoramento
 */
export function validateMonitoringConfig(config: {
  auto_refresh?: boolean;
  refresh_interval?: number;
  alert_thresholds?: {
    low_credits?: number;
    high_usage?: number;
  };
}): LocalValidationResult {
  const result: LocalValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Validar intervalo de refresh
  if (config.refresh_interval !== undefined) {
    if (config.refresh_interval < 60) {
      result.errors.push('Intervalo de atualização deve ser pelo menos 60 segundos');
      result.isValid = false;
    } else if (config.refresh_interval < 300) {
      result.warnings.push('Intervalo muito baixo pode impactar a performance');
    }

    if (config.refresh_interval > 3600) {
      result.warnings.push('Intervalo muito alto pode atrasar alertas importantes');
    }
  }

  // Validar thresholds de alerta
  if (config.alert_thresholds) {
    const { low_credits, high_usage } = config.alert_thresholds;
    
    if (low_credits !== undefined && (low_credits < 0 || low_credits > 100)) {
      result.errors.push('Limite de créditos baixos deve estar entre 0 e 100%');
      result.isValid = false;
    }

    if (high_usage !== undefined && (high_usage < 0 || high_usage > 100)) {
      result.errors.push('Limite de uso alto deve estar entre 0 e 100%');
      result.isValid = false;
    }

    if (low_credits !== undefined && high_usage !== undefined && low_credits >= high_usage) {
      result.warnings.push('Limite de créditos baixos deve ser menor que limite de uso alto');
    }
  }

  return result;
}

/**
 * Utilitário para exibir resultados de validação
 */
export function formatValidationMessages(result: LocalValidationResult): {
  errorMessage?: string;
  warningMessage?: string;
} {
  const messages: { errorMessage?: string; warningMessage?: string } = {};

  if (result.errors.length > 0) {
    messages.errorMessage = result.errors.join('; ');
  }

  if (result.warnings.length > 0) {
    messages.warningMessage = result.warnings.join('; ');
  }

  return messages;
}