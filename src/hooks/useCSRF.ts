'use client';

// 🔒 Hook para proteção CSRF no client-side
import { useState, useCallback, useEffect } from 'react';
import { generateCSRFToken, validateCSRFToken, csrfManager } from '@/lib/csrf-utils';

// Hook para uso no frontend (Next.js)
export function useCSRFToken(sessionId: string) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Gerar novo token
  const generateNewToken = useCallback(() => {
    try {
      const newToken = generateCSRFToken(sessionId);
      setToken(newToken);
      setError(null);
      return newToken;
    } catch (err) {
      setError('Erro ao gerar token CSRF');
      return null;
    }
  }, [sessionId]);
  
  // Validar token atual
  const validateCurrentToken = useCallback(() => {
    if (!token) return false;
    return validateCSRFToken(token, sessionId);
  }, [token, sessionId]);
  
  // Renovar token se necessário
  const renewTokenIfNeeded = useCallback(() => {
    if (!token || csrfManager.isTokenExpiringSoon(token)) {
      return generateNewToken();
    }
    return token;
  }, [token, generateNewToken]);
  
  // Efeito para gerar token inicial
  useEffect(() => {
    setIsLoading(true);
    generateNewToken();
    setIsLoading(false);
  }, [generateNewToken]);
  
  // Efeito para renovar token automaticamente
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(() => {
      renewTokenIfNeeded();
    }, 5 * 60 * 1000); // Verificar a cada 5 minutos
    
    return () => clearInterval(interval);
  }, [token, renewTokenIfNeeded]);
  
  return {
    token,
    isLoading,
    error,
    generateNewToken,
    validateCurrentToken,
    renewTokenIfNeeded,
    isValid: token ? validateCurrentToken() : false
  };
}
