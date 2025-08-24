// 🔒 Utilitários para proteção CSRF
// Funções para gerar e validar tokens CSRF no frontend e backend

import crypto from 'crypto';
// Removido: import { useState, useCallback, useEffect } from 'react';

// Interface para token CSRF
export interface CSRFToken {
  token: string;
  timestamp: number;
  sessionId: string;
}

// Configurações do CSRF
export interface CSRFConfig {
  tokenExpiry?: number; // em milissegundos
  secretKey?: string;
  cookieName?: string;
  headerName?: string;
}

const DEFAULT_CONFIG: Required<CSRFConfig> = {
  tokenExpiry: 60 * 60 * 1000, // 1 hora
  secretKey: process.env.CSRF_SECRET_KEY || 'default-csrf-secret-key',
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token'
};

// Classe para gerenciar tokens CSRF
export class CSRFManager {
  private config: Required<CSRFConfig>;
  
  constructor(config: CSRFConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  // Gerar token CSRF
  generateToken(sessionId: string): CSRFToken {
    const timestamp = Date.now();
    const payload = `${sessionId}:${timestamp}`;
    const signature = this.createSignature(payload);
    const token = `${payload}:${signature}`;
    
    return {
      token,
      timestamp,
      sessionId
    };
  }
  
  // Validar token CSRF
  validateToken(token: string, sessionId: string): boolean {
    try {
      const parts = token.split(':');
      if (parts.length !== 3) return false;
      
      const [tokenSessionId, timestampStr, signature] = parts;
      const timestamp = parseInt(timestampStr, 10);
      
      // Verificar se o sessionId corresponde
      if (tokenSessionId !== sessionId) return false;
      
      // Verificar se o token não expirou
      if (Date.now() - timestamp > this.config.tokenExpiry) return false;
      
      // Verificar assinatura
      const payload = `${tokenSessionId}:${timestampStr}`;
      const expectedSignature = this.createSignature(payload);
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      return false;
    }
  }
  
  // Criar assinatura HMAC
  private createSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.config.secretKey)
      .update(payload)
      .digest('hex');
  }
  
  // Extrair informações do token
  parseToken(token: string): Partial<CSRFToken> | null {
    try {
      const parts = token.split(':');
      if (parts.length !== 3) return null;
      
      const [sessionId, timestampStr] = parts;
      const timestamp = parseInt(timestampStr, 10);
      
      return {
        token,
        timestamp,
        sessionId
      };
    } catch (error) {
      return null;
    }
  }
  
  // Verificar se o token está próximo do vencimento
  isTokenExpiringSoon(token: string, thresholdMs: number = 5 * 60 * 1000): boolean {
    const parsed = this.parseToken(token);
    if (!parsed || !parsed.timestamp) return true;
    
    const timeLeft = this.config.tokenExpiry - (Date.now() - parsed.timestamp);
    return timeLeft <= thresholdMs;
  }
}

// Instância padrão do gerenciador CSRF
export const csrfManager = new CSRFManager();

// Funções utilitárias para uso direto
export function generateCSRFToken(sessionId: string): string {
  return csrfManager.generateToken(sessionId).token;
}

export function validateCSRFToken(token: string, sessionId: string): boolean {
  return csrfManager.validateToken(token, sessionId);
}

export function isCSRFTokenValid(token: string, sessionId: string): boolean {
  return validateCSRFToken(token, sessionId);
}

// Removido hook React do módulo server-side. Use '@/hooks/useCSRF' no client.

// Middleware para validação automática de CSRF
export function createCSRFMiddleware(config: CSRFConfig = {}) {
  const manager = new CSRFManager(config);
  
  return function csrfMiddleware(
    req: Request,
    sessionId: string
  ): { isValid: boolean; error?: string } {
    const token = req.headers.get(manager['config'].headerName);
    
    if (!token) {
      return { isValid: false, error: 'Token CSRF não fornecido' };
    }
    
    if (!manager.validateToken(token, sessionId)) {
      return { isValid: false, error: 'Token CSRF inválido ou expirado' };
    }
    
    return { isValid: true };
  };
}

// Utilitário para adicionar token CSRF aos headers de requisição
export function addCSRFTokenToHeaders(
  headers: HeadersInit,
  token: string,
  headerName: string = DEFAULT_CONFIG.headerName
): HeadersInit {
  return {
    ...headers,
    [headerName]: token
  };
}

// Utilitário para extrair token CSRF de cookies
export function extractCSRFTokenFromCookies(
  cookies: string,
  cookieName: string = DEFAULT_CONFIG.cookieName
): string | null {
  const match = cookies.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

export default csrfManager;