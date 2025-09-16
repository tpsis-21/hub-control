// src/services/thebest.service.ts
import { createApiSupabaseClient } from "@/lib/supabase/clients/api";
import { LoggerService } from './logger.service';

/**
 * Tipos para The Best Integration
 */
export interface TheBestConfig {
  id: string;
  user_id: string;
  api_url: string;
  api_key: string;
  username?: string;
  password?: string;
  config_data?: {
    timeout?: number;
    [key: string]: any;
  };
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TheBestPackage {
  id: string;
  classificacao: 'COM ADULTO' | 'SEM ADULTO';
  duracao: '1' | '3' | '6' | '12';
  telas: number;
  creditos: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TheBestRenewal {
  id: string;
  config_id: string;
  package_id: string;
  user_id: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  start_date?: string;
  end_date?: string;
  renewal_data?: {
    duration: string;
    classification: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TheBestApiLog {
  id: string;
  config_id: string;
  operation_type: 'GET_PACKAGES' | 'CREATE_RENEWAL' | 'GET_RENEWAL' | 'UPDATE_RENEWAL' | 'CANCEL_RENEWAL' | 'SYNC_PACKAGES' | 'TEST_CONNECTION';
  endpoint: string;
  http_method: string;
  request_data?: any;
  response_data?: any;
  response_status?: number;
  duration_ms?: number;
  success: boolean;
  error_message?: string;
  created_at: string;
  user_id?: string;
}

export interface CreateRenewalRequest {
  package_id: string;
  user_id: string;
  duration: string;
  classification: string;
}

export interface SyncPackagesRequest {
  packages: Array<{
    classificacao: string;
    duracao: string;
    telas: number;
    creditos: number;
  }>;
}

/**
 * Serviço de Integração The Best
 * Gerencia configurações, pacotes, renovações e logs da API
 */
export class TheBestService {
  private static readonly DEFAULT_TIMEOUT = 30000;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;

  /**
   * Obtém a configuração ativa do usuário
   */
  static async getUserConfig(userId: string): Promise<TheBestConfig | null> {
    try {
      const supabase = await createApiSupabaseClient();
      
      const { data, error } = await (supabase as any)
        .from('thebest_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Nenhuma configuração encontrada
          return null;
        }
        throw error;
      }
      
      LoggerService.info('Configuração The Best obtida', 'TheBestService', { userId, configId: data.id });
      return data as TheBestConfig;
    } catch (error) {
      LoggerService.error('Erro ao obter configuração The Best', 'TheBestService', { userId, error });
      throw error;
    }
  }

  /**
   * Cria ou atualiza a configuração do usuário
   */
  static async saveUserConfig(
    userId: string, 
    configData: Omit<TheBestConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<TheBestConfig> {
    try {
      const supabase = await createApiSupabaseClient();
      
      // Verificar se já existe configuração
      const existingConfig = await this.getUserConfig(userId);
      
      const configPayload = {
        user_id: userId,
        api_url: configData.api_url,
        api_key: configData.api_key,
        username: configData.username,
        password: configData.password,
        config_data: configData.config_data || { timeout: this.DEFAULT_TIMEOUT },
        is_active: configData.is_active,
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (existingConfig) {
        // Atualizar configuração existente
        const { data, error } = await (supabase as any)
          .from('thebest_configs')
          .update(configPayload)
          .eq('id', existingConfig.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        
        LoggerService.info('Configuração The Best atualizada', 'TheBestService', { userId, configId: existingConfig.id });
      } else {
        // Criar nova configuração
        const { data, error } = await (supabase as any)
          .from('thebest_configs')
          .insert({
            ...configPayload,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        
        LoggerService.info('Nova configuração The Best criada', 'TheBestService', { userId, configId: result.id });
      }
      
      return result as TheBestConfig;
    } catch (error) {
      LoggerService.error('Erro ao salvar configuração The Best', 'TheBestService', { userId, error });
      throw error;
    }
  }

  /**
   * Remove a configuração do usuário (marca como inativa)
   */
  static async removeUserConfig(userId: string): Promise<void> {
    try {
      const supabase = await createApiSupabaseClient();
      
      const { error } = await (supabase as any)
        .from('thebest_configs')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      LoggerService.info('Configuração The Best removida', 'TheBestService', { userId });
    } catch (error) {
      LoggerService.error('Erro ao remover configuração The Best', 'TheBestService', { userId, error });
      throw error;
    }
  }

  /**
   * Atualiza o timestamp de último uso da configuração
   */
  static async updateLastUsed(configId: string): Promise<void> {
    try {
      const supabase = await createApiSupabaseClient();
      
      const { error } = await (supabase as any)
        .from('thebest_configs')
        .update({ 
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);
      
      if (error) throw error;
      
      LoggerService.debug('Último uso atualizado', 'TheBestService', { configId });
    } catch (error) {
      LoggerService.error('Erro ao atualizar último uso', 'TheBestService', { configId, error });
      // Não propagar o erro pois é uma operação secundária
    }
  }

  /**
   * Obtém todos os pacotes disponíveis
   */
  static async getPackages(): Promise<TheBestPackage[]> {
    try {
      const supabase = await createApiSupabaseClient();
      
      const { data, error } = await (supabase as any)
        .from('thebest_packages')
        .select('*')
        .eq('is_active', true)
        .order('classificacao', { ascending: true })
        .order('duracao', { ascending: true });
      
      if (error) throw error;
      
      LoggerService.info('Pacotes The Best obtidos', 'TheBestService', { count: data?.length || 0 });
      return (data || []) as TheBestPackage[];
    } catch (error) {
      LoggerService.error('Erro ao obter pacotes The Best', 'TheBestService', { error });
      throw error;
    }
  }

  /**
   * Sincroniza pacotes a partir de dados CSV ou API
   */
  static async syncPackages(packagesData: SyncPackagesRequest['packages']): Promise<{ synced: number; errors: number }> {
    try {
      const supabase = await createApiSupabaseClient();
      let synced = 0;
      let errors = 0;
      
      // Desativar todos os pacotes existentes
      await (supabase as any)
        .from('thebest_packages')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('is_active', true);
      
      // Inserir ou atualizar pacotes
      for (const packageData of packagesData) {
        try {
          // Verificar se o pacote já existe
          const { data: existing } = await (supabase as any)
            .from('thebest_packages')
            .select('id')
            .eq('classificacao', packageData.classificacao)
            .eq('duracao', packageData.duracao)
            .single();
          
          const packagePayload = {
            classificacao: packageData.classificacao as TheBestPackage['classificacao'],
            duracao: packageData.duracao as TheBestPackage['duracao'],
            telas: packageData.telas,
            creditos: packageData.creditos,
            is_active: true,
            updated_at: new Date().toISOString()
          };
          
          if (existing) {
            // Atualizar pacote existente
            const { error } = await (supabase as any)
              .from('thebest_packages')
              .update(packagePayload)
              .eq('id', existing.id);
            
            if (error) throw error;
          } else {
            // Criar novo pacote
            const { error } = await (supabase as any)
              .from('thebest_packages')
              .insert({
                ...packagePayload,
                created_at: new Date().toISOString()
              });
            
            if (error) throw error;
          }
          
          synced++;
        } catch (error) {
          LoggerService.error('Erro ao sincronizar pacote individual', 'TheBestService', { packageData, error });
          errors++;
        }
      }
      
      LoggerService.info('Sincronização de pacotes concluída', 'TheBestService', { synced, errors });
      return { synced, errors };
    } catch (error) {
      LoggerService.error('Erro na sincronização de pacotes', 'TheBestService', { error });
      throw error;
    }
  }

  /**
   * Cria uma nova renovação
   */
  static async createRenewal(
    configId: string,
    renewalData: CreateRenewalRequest,
    createdBy: string
  ): Promise<TheBestRenewal> {
    try {
      const supabase = await createApiSupabaseClient();
      
      // Verificar se o pacote existe
      const { data: packageExists, error: packageError } = await (supabase as any)
        .from('thebest_packages')
        .select('id')
        .eq('id', renewalData.package_id)
        .eq('is_active', true)
        .single();
      
      if (packageError || !packageExists) {
        throw new Error('Pacote não encontrado ou inativo');
      }
      
      const renewal = {
        config_id: configId,
        package_id: renewalData.package_id,
        user_id: renewalData.user_id,
        status: 'pending' as const,
        renewal_data: {
          duration: renewalData.duration,
          classification: renewalData.classification
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: createdBy
      };
      
      const { data, error } = await (supabase as any)
        .from('thebest_renewals')
        .insert(renewal)
        .select()
        .single();
      
      if (error) throw error;
      
      LoggerService.info('Renovação The Best criada', 'TheBestService', { 
        renewalId: data.id, 
        packageId: renewalData.package_id,
        userId: renewalData.user_id
      });
      
      return data as TheBestRenewal;
    } catch (error) {
      LoggerService.error('Erro ao criar renovação The Best', 'TheBestService', { renewalData, error });
      throw error;
    }
  }

  /**
   * Obtém renovações do usuário
   */
  static async getUserRenewals(
    userId: string, 
    options?: { limit?: number; status?: TheBestRenewal['status'] }
  ): Promise<TheBestRenewal[]> {
    try {
      const supabase = await createApiSupabaseClient();
      
      let query = (supabase as any)
        .from('thebest_renewals')
        .select(`
          *,
          thebest_packages (
            classificacao,
            duracao,
            telas,
            creditos
          )
        `)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      LoggerService.info('Renovações do usuário obtidas', 'TheBestService', { 
        userId, 
        count: data?.length || 0,
        status: options?.status
      });
      
      return (data || []) as TheBestRenewal[];
    } catch (error) {
      LoggerService.error('Erro ao obter renovações do usuário', 'TheBestService', { userId, error });
      throw error;
    }
  }

  /**
   * Atualiza o status de uma renovação
   */
  static async updateRenewalStatus(
    renewalId: string, 
    status: TheBestRenewal['status'],
    additionalData?: Partial<Pick<TheBestRenewal, 'start_date' | 'end_date' | 'renewal_data'>>
  ): Promise<void> {
    try {
      const supabase = await createApiSupabaseClient();
      
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
        ...additionalData
      };
      
      const { error } = await (supabase as any)
        .from('thebest_renewals')
        .update(updateData)
        .eq('id', renewalId);
      
      if (error) throw error;
      
      LoggerService.info('Status da renovação atualizado', 'TheBestService', { renewalId, status });
    } catch (error) {
      LoggerService.error('Erro ao atualizar status da renovação', 'TheBestService', { renewalId, status, error });
      throw error;
    }
  }

  /**
   * Registra um log de operação da API
   */
  static async logApiCall(
    configId: string,
    operationType: TheBestApiLog['operation_type'],
    endpoint: string,
    httpMethod: string,
    options?: {
      requestData?: any;
      responseData?: any;
      responseStatus?: number;
      durationMs?: number;
      success: boolean;
      errorMessage?: string;
      userId?: string;
    }
  ): Promise<void> {
    try {
      const supabase = await createApiSupabaseClient();
      
      const logData = {
        config_id: configId,
        operation_type: operationType,
        endpoint,
        http_method: httpMethod,
        request_data: options?.requestData,
        response_data: options?.responseData,
        response_status: options?.responseStatus,
        duration_ms: options?.durationMs,
        success: options?.success || false,
        error_message: options?.errorMessage,
        user_id: options?.userId,
        created_at: new Date().toISOString()
      };
      
      const { error } = await (supabase as any)
        .from('thebest_api_logs')
        .insert(logData);
      
      if (error) throw error;
      
      LoggerService.debug('Log de API registrado', 'TheBestService', { 
        configId, 
        operationType, 
        success: options?.success 
      });
    } catch (error) {
      LoggerService.error('Erro ao registrar log de API', 'TheBestService', { 
        configId, 
        operationType, 
        error 
      });
      // Não propagar o erro pois é uma operação de log
    }
  }

  /**
   * Obtém logs de API para uma configuração
   */
  static async getApiLogs(
    configId: string, 
    options?: { 
      limit?: number; 
      operationType?: TheBestApiLog['operation_type'];
      success?: boolean;
    }
  ): Promise<TheBestApiLog[]> {
    try {
      const supabase = await createApiSupabaseClient();
      
      let query = (supabase as any)
        .from('thebest_api_logs')
        .select('*')
        .eq('config_id', configId)
        .order('created_at', { ascending: false });
      
      if (options?.operationType) {
        query = query.eq('operation_type', options.operationType);
      }
      
      if (typeof options?.success === 'boolean') {
        query = query.eq('success', options.success);
      }
      
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []) as TheBestApiLog[];
    } catch (error) {
      LoggerService.error('Erro ao obter logs de API', 'TheBestService', { configId, error });
      throw error;
    }
  }

  /**
   * Testa a conectividade com a API The Best
   */
  static async testConnection(config: TheBestConfig): Promise<{
    success: boolean;
    message: string;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      // Simular teste de conexão (substituir pela implementação real)
      const timeout = config.config_data?.timeout || this.DEFAULT_TIMEOUT;
      
      // Aqui seria feita a chamada real para a API The Best
      // Por enquanto, simular um teste básico
      await new Promise(resolve => setTimeout(resolve, 100)); // Simular latência
      
      const latency = Date.now() - startTime;
      
      // Log do teste
      await this.logApiCall(
        config.id,
        'TEST_CONNECTION',
        config.api_url,
        'GET',
        {
          success: true,
          durationMs: latency,
          responseStatus: 200,
          userId: config.user_id
        }
      );
      
      LoggerService.info('Teste de conexão The Best realizado', 'TheBestService', { 
        configId: config.id,
        latency,
        success: true
      });
      
      return {
        success: true,
        message: 'Conexão estabelecida com sucesso',
        latency
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Log do erro
      await this.logApiCall(
        config.id,
        'TEST_CONNECTION',
        config.api_url,
        'GET',
        {
          success: false,
          durationMs: latency,
          errorMessage,
          userId: config.user_id
        }
      );
      
      LoggerService.error('Erro no teste de conexão The Best', 'TheBestService', { 
        configId: config.id,
        error
      });
      
      return {
        success: false,
        message: 'Falha na conexão',
        latency,
        error: errorMessage
      };
    }
  }

  /**
   * Obtém estatísticas de uso da integração
   */
  static async getUsageStats(configId: string): Promise<{
    totalApiCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageLatency: number;
    lastUsed?: string;
    totalRenewals: number;
    activeRenewals: number;
  }> {
    try {
      const supabase = await createApiSupabaseClient();
      
      // Obter estatísticas de logs de API
      const { data: logs, error: logsError } = await (supabase as any)
        .from('thebest_api_logs')
        .select('success, duration_ms')
        .eq('config_id', configId);
      
      if (logsError) throw logsError;
      
      // Obter estatísticas de renovações
      const { data: renewals, error: renewalsError } = await (supabase as any)
        .from('thebest_renewals')
        .select('status')
        .eq('config_id', configId);
      
      if (renewalsError) throw renewalsError;
      
      // Obter informações da configuração
      const { data: config, error: configError } = await (supabase as any)
        .from('thebest_configs')
        .select('last_used_at')
        .eq('id', configId)
        .single();
      
      if (configError) throw configError;
      
      const totalApiCalls = logs?.length || 0;
      const successfulCalls = logs?.filter((log: any) => log.success).length || 0;
      const failedCalls = totalApiCalls - successfulCalls;
      const averageLatency = logs?.length 
        ? logs.reduce((sum: number, log: any) => sum + (log.duration_ms || 0), 0) / logs.length 
        : 0;
      
      const totalRenewals = renewals?.length || 0;
      const activeRenewals = renewals?.filter((renewal: any) => renewal.status === 'active').length || 0;
      
      return {
        totalApiCalls,
        successfulCalls,
        failedCalls,
        averageLatency: Math.round(averageLatency),
        lastUsed: config?.last_used_at,
        totalRenewals,
        activeRenewals
      };
    } catch (error) {
      LoggerService.error('Erro ao obter estatísticas de uso', 'TheBestService', { configId, error });
      throw error;
    }
  }
}

export default TheBestService;