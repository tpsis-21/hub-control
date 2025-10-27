/**
 * Cliente para operações administrativas seguras
 * Substitui o uso direto da service role key no frontend
 */

import { logger } from '@/lib/logger';

interface DatabaseOperation {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'rpc';
  table?: string;
  data?: any;
  filters?: {
    select?: string;
    eq?: Record<string, any>;
    limit?: number;
    order?: {
      column: string;
      ascending: boolean;
    };
  };
}

interface AdminOperation {
  operation: 'backup_database' | 'optimize_database' | 'cleanup_logs' | 'system_maintenance';
  data?: any;
}

class AdminOperationsClient {
  private baseUrl = '/api/admin';

  /**
   * Executa operação de banco de dados via API segura
   */
  async executeDatabaseOperation(params: DatabaseOperation) {
    try {
      const response = await fetch(`${this.baseUrl}/database-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro na operação');
      }

      return await response.json();
    } catch (error) {
      logger.error('Erro na operação de banco:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Executa operação administrativa via API segura
   */
  async executeAdminOperation(params: AdminOperation) {
    try {
      const response = await fetch(`${this.baseUrl}/service-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro na operação');
      }

      return await response.json();
    } catch (error) {
      logger.error('Erro na operação administrativa:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Métodos de conveniência para operações comuns

  /**
   * Seleciona dados de uma tabela
   */
  async select(table: string, filters?: DatabaseOperation['filters']) {
    return this.executeDatabaseOperation({
      operation: 'select',
      table,
      filters,
    });
  }

  /**
   * Insere dados em uma tabela
   */
  async insert(table: string, data: any) {
    return this.executeDatabaseOperation({
      operation: 'insert',
      table,
      data,
    });
  }

  /**
   * Atualiza dados em uma tabela
   */
  async update(table: string, data: any, filters: DatabaseOperation['filters']) {
    return this.executeDatabaseOperation({
      operation: 'update',
      table,
      data,
      filters,
    });
  }

  /**
   * Remove dados de uma tabela
   */
  async delete(table: string, filters: DatabaseOperation['filters']) {
    return this.executeDatabaseOperation({
      operation: 'delete',
      table,
      filters,
    });
  }

  /**
   * Executa upsert em uma tabela
   */
  async upsert(table: string, data: any) {
    return this.executeDatabaseOperation({
      operation: 'upsert',
      table,
      data,
    });
  }

  /**
   * Executa função RPC
   */
  async rpc(functionName: string, params: any = {}) {
    return this.executeDatabaseOperation({
      operation: 'rpc',
      data: {
        function_name: functionName,
        params,
      },
    });
  }

  /**
   * Cria backup do banco de dados
   */
  async createBackup() {
    return this.executeAdminOperation({
      operation: 'backup_database',
    });
  }

  /**
   * Otimiza o banco de dados
   */
  async optimizeDatabase() {
    return this.executeAdminOperation({
      operation: 'optimize_database',
    });
  }

  /**
   * Limpa logs antigos
   */
  async cleanupLogs(days: number = 30) {
    return this.executeAdminOperation({
      operation: 'cleanup_logs',
      data: { days },
    });
  }

  /**
   * Executa manutenção do sistema
   */
  async systemMaintenance(tasks: Array<{ type: string; params?: any }>) {
    return this.executeAdminOperation({
      operation: 'system_maintenance',
      data: { tasks },
    });
  }
}

// Instância singleton
export const adminOperations = new AdminOperationsClient();

// Exportar também a classe para casos especiais
export { AdminOperationsClient };

// Tipos para uso externo
export type { DatabaseOperation, AdminOperation };
