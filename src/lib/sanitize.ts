import DOMPurify from 'dompurify';

/**
 * Configurações de sanitização para diferentes contextos
 */
const SANITIZE_CONFIGS = {
  // Para conteúdo HTML geral (emails, campanhas)
  html: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'table', 'tr', 'td', 'th',
      'thead', 'tbody', 'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style', 'target',
      'width', 'height', 'border', 'cellpadding', 'cellspacing'
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
  },
  
  // Para conteúdo mais restritivo (comentários, descrições)
  text: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe', 'img'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'style']
  },
  
  // Para preview de templates (mais permissivo, mas ainda seguro)
  template: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'div', 'span', 'table', 'tr', 'td', 'th',
      'thead', 'tbody', 'blockquote', 'code', 'pre', 'hr', 'small', 'sub', 'sup'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style', 'target',
      'width', 'height', 'border', 'cellpadding', 'cellspacing', 'align'
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_SCRIPT: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'iframe'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
  }
};

/**
 * Sanitiza conteúdo HTML removendo elementos perigosos
 * @param html - Conteúdo HTML para sanitizar
 * @param config - Tipo de configuração ('html', 'text', 'template')
 * @returns HTML sanitizado
 */
export function sanitizeHtml(
  html: string, 
  config: keyof typeof SANITIZE_CONFIGS = 'html'
): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  try {
    // Verifica se estamos no ambiente do navegador
    if (typeof window === 'undefined') {
      // No servidor, apenas remove scripts básicos
      return html
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/javascript:/gi, '');
    }

    const sanitizeConfig = SANITIZE_CONFIGS[config];
    
    return DOMPurify.sanitize(html, {
      ...sanitizeConfig,
      // Configurações adicionais de segurança
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true,
      // Remove comentários HTML que podem conter código malicioso
      ALLOW_UNKNOWN_PROTOCOLS: false,
      // Força HTTPS para links externos
      ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|xxx):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
  } catch (error) {
    console.error('Erro ao sanitizar HTML:', error);
    // Em caso de erro, retorna string vazia por segurança
    return '';
  }
}

/**
 * Sanitiza texto removendo todas as tags HTML
 * @param text - Texto para sanitizar
 * @returns Texto limpo sem HTML
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  try {
    // Remove todas as tags HTML
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-zA-Z0-9#]+;/g, (match) => {
        // Decodifica entidades HTML básicas
        const entities: Record<string, string> = {
          '&amp;': '&',
          '&lt;': '<',
          '&gt;': '>',
          '&quot;': '"',
          '&#39;': "'",
          '&nbsp;': ' '
        };
        return entities[match] || match;
      })
      .trim();
  } catch (error) {
    console.error('Erro ao sanitizar texto:', error);
    return '';
  }
}

/**
 * Valida se o HTML contém apenas tags permitidas
 * @param html - HTML para validar
 * @param config - Configuração de validação
 * @returns true se válido, false caso contrário
 */
export function validateHtml(
  html: string, 
  config: keyof typeof SANITIZE_CONFIGS = 'html'
): boolean {
  if (!html || typeof html !== 'string') {
    return true;
  }

  try {
    const sanitized = sanitizeHtml(html, config);
    // Se o HTML sanitizado é muito diferente do original, pode haver conteúdo malicioso
    const originalLength = html.length;
    const sanitizedLength = sanitized.length;
    
    // Permite até 10% de diferença (para remoção de espaços, etc.)
    const threshold = originalLength * 0.9;
    
    return sanitizedLength >= threshold;
  } catch (error) {
    console.error('Erro ao validar HTML:', error);
    return false;
  }
}

/**
 * Hook para sanitização em tempo real durante edição
 * @param html - HTML para sanitizar
 * @param config - Configuração de sanitização
 * @returns HTML sanitizado
 */
export function useSanitizedHtml(
  html: string, 
  config: keyof typeof SANITIZE_CONFIGS = 'html'
): string {
  return sanitizeHtml(html, config);
}

export default {
  sanitizeHtml,
  sanitizeText,
  validateHtml,
  useSanitizedHtml,
  SANITIZE_CONFIGS
};