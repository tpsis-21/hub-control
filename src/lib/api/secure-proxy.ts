/**
 * Proxy seguro para APIs externas
 * Centraliza e protege chamadas para serviços externos como NATV, BPIX, etc.
 */

import { logger } from '@/lib/logger';
import { getGates2bBaseUrl, getNatvBaseUrl } from '@/lib/integrations/server-base-urls';

interface ProxyConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

interface ProxyRequest {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
}

interface ProxyResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

class SecureProxyClient {
  private configs: Map<string, ProxyConfig> = new Map();

  /**
   * Registra configuração para um serviço
   */
  registerService(serviceName: string, config: ProxyConfig) {
    this.configs.set(serviceName, config);
  }

  /**
   * Executa requisição via proxy seguro
   */
  async request<T = any>(
    serviceName: string,
    request: ProxyRequest
  ): Promise<ProxyResponse<T>> {
    try {
      const config = this.configs.get(serviceName);
      if (!config) {
        throw new Error(`Serviço ${serviceName} não configurado`);
      }

      const url = `${config.baseUrl}${request.endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...config.headers,
        ...request.headers,
      };

      const fetchOptions: RequestInit = {
        method: request.method || 'GET',
        headers,
        signal: AbortSignal.timeout(config.timeout || 30000),
      };

      if (request.data && ['POST', 'PUT'].includes(request.method || 'GET')) {
        fetchOptions.body = JSON.stringify(request.data);
      }

      logger.debug(`Proxy request to ${serviceName}:`, {
        url,
        method: request.method,
        hasData: !!request.data,
      });

      const response = await fetch(url, fetchOptions);
      const responseData = await response.json();

      if (!response.ok) {
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          data: responseData,
        };
        logger.error(`Proxy error for ${serviceName}:`, new Error(JSON.stringify(errorDetails)));

        return {
          success: false,
          error: responseData.message || response.statusText,
          status: response.status,
        };
      }

      logger.debug(`Proxy success for ${serviceName}:`, {
        status: response.status,
      });

      return {
        success: true,
        data: responseData,
        status: response.status,
      };

    } catch (error) {
      logger.error(`Proxy request failed for ${serviceName}:`, error instanceof Error ? error : new Error(String(error)));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        status: 500,
      };
    }
  }

  /**
   * Métodos de conveniência
   */
  async get<T = any>(serviceName: string, endpoint: string, headers?: Record<string, string>): Promise<ProxyResponse<T>> {
    return this.request<T>(serviceName, { endpoint, method: 'GET', headers });
  }

  async post<T = any>(serviceName: string, endpoint: string, data: any, headers?: Record<string, string>): Promise<ProxyResponse<T>> {
    return this.request<T>(serviceName, { endpoint, method: 'POST', data, headers });
  }

  async put<T = any>(serviceName: string, endpoint: string, data: any, headers?: Record<string, string>): Promise<ProxyResponse<T>> {
    return this.request<T>(serviceName, { endpoint, method: 'PUT', data, headers });
  }

  async delete<T = any>(serviceName: string, endpoint: string, headers?: Record<string, string>): Promise<ProxyResponse<T>> {
    return this.request<T>(serviceName, { endpoint, method: 'DELETE', headers });
  }
}

// Instância singleton
export const secureProxy = new SecureProxyClient();

// Configurações padrão para serviços conhecidos (URLs via env)
secureProxy.registerService('natv', {
  baseUrl: getNatvBaseUrl(),
  timeout: 30000,
  retries: 3,
});

secureProxy.registerService('gates2b', {
  baseUrl: getGates2bBaseUrl(),
  timeout: 30000,
  retries: 3,
});
// Alias legado: Bpix é o mesmo gateway Gates2b
secureProxy.registerService('bpix', {
  baseUrl: getGates2bBaseUrl(),
  timeout: 30000,
  retries: 3,
});

// Exportar também a classe para casos especiais
export { SecureProxyClient };

// Tipos para uso externo
export type { ProxyConfig, ProxyRequest, ProxyResponse };
