import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
import { Database } from '@/lib/database.types';
import thebestService from './thebest.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/production-logger'

type ApiSupabaseClient = SupabaseClient<Database>;

interface PaymentData {
  userId: string;
  packageId: number;
  paymentId: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
}

interface RenewalResult {
  success: boolean;
  message: string;
  renewalId?: string;
  packageInfo?: any;
  error?: string;
}

interface TheBestPackage {
  id: string;
  classificacao: string;
  duracao: string;
  telas: number;
  creditos: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

class TheBestRenewalService {
  private supabase: ApiSupabaseClient;

  constructor(supabase: ApiSupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Processa renovação automática após confirmação de pagamento
   * @param paymentData Dados do pagamento confirmado
   * @returns Resultado da renovação
   */
  async processAutoRenewal(paymentData: PaymentData): Promise<RenewalResult> {
    try {
      logger.debug('🔄 Iniciando renovação automática para:', {
        userId: paymentData.userId,
        packageId: paymentData.packageId,
        paymentId: paymentData.paymentId
      });

      // 1. Buscar informações do pacote
      const packageInfo = await this.getPackageInfo(paymentData.packageId);
      if (!packageInfo) {
        return {
          success: false,
          message: `Pacote ${paymentData.packageId} não encontrado`,
          error: 'PACKAGE_NOT_FOUND'
        };
      }

      // 2. Verificar configuração do usuário
      const userConfig = await this.getUserConfig(paymentData.userId);
      if (!userConfig) {
        return {
          success: false,
          message: 'Configuração The Best não encontrada para o usuário',
          error: 'USER_CONFIG_NOT_FOUND'
        };
      }

      // 3. Calcular data de expiração
      const durationMonths = this.convertDurationToMonths(packageInfo.duracao);
      const expirationDate = this.calculateExpirationDate(durationMonths);

      // 4. Executar renovação via API The Best
      const renewalResponse = await this.executeRenewal({
        userConfig,
        packageInfo,
        paymentData,
        expirationDate
      });

      if (!renewalResponse.success) {
        return {
          success: false,
          message: 'Falha na renovação via API The Best',
          error: renewalResponse.error
        };
      }

      // 5. Registrar renovação no banco
      const renewalRecord = await this.createRenewalRecord({
        userId: paymentData.userId,
        packageId: paymentData.packageId,
        paymentId: paymentData.paymentId,
        packageInfo,
        expirationDate,
        apiResponse: renewalResponse.data
      });

      // 6. Log da operação
      await this.logRenewalOperation({
        userId: paymentData.userId,
        operation: 'auto_renewal',
        packageId: paymentData.packageId,
        success: true,
        details: {
          paymentId: paymentData.paymentId,
          renewalId: renewalRecord.id,
          packageName: packageInfo.classificacao,
          credits: packageInfo.creditos,
          expirationDate
        }
      });

      return {
        success: true,
        message: `Renovação automática realizada com sucesso! Pacote: ${packageInfo.classificacao}`,
        renewalId: renewalRecord.id,
        packageInfo
      };

    } catch (error) {
      console.error('❌ Erro na renovação automática:', error);
      
      // Log do erro
      await this.logRenewalOperation({
        userId: paymentData.userId,
        operation: 'auto_renewal',
        packageId: paymentData.packageId,
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          paymentId: paymentData.paymentId
        }
      });

      return {
        success: false,
        message: 'Erro interno durante a renovação automática',
        error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Busca informações do pacote pelo ID
   */
  private async getPackageInfo(packageId: number): Promise<TheBestPackage | null> {
    // Usando query raw para contornar limitação de tipos
    const { data, error } = await (this.supabase as any)
      .from('thebest_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Erro ao buscar pacote:', error);
      return null;
    }

    return data as TheBestPackage;
  }

  /**
   * Busca configuração do usuário
   */
  private async getUserConfig(userId: string) {
    // Usando query raw para contornar limitação de tipos
    const { data, error } = await (this.supabase as any)
      .from('thebest_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_default', true)
      .single();

    if (error) {
      console.error('Erro ao buscar configuração do usuário:', error);
      return null;
    }

    return data;
  }

  /**
   * Converte duração do enum para número de meses
   */
  private convertDurationToMonths(duracao: string): number {
    switch (duracao) {
      case '1_MES':
        return 1;
      case '3_MESES':
        return 3;
      case '6_MESES':
        return 6;
      case '12_MESES':
        return 12;
      default:
        return 1; // Default para 1 mês
    }
  }

  /**
   * Calcula data de expiração baseada na duração do pacote
   */
  private calculateExpirationDate(durationMonths: number): string {
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setMonth(expirationDate.getMonth() + durationMonths);
    return expirationDate.toISOString();
  }

  /**
   * Executa renovação via API The Best
   */
  private async executeRenewal(params: {
    userConfig: any;
    packageInfo: any;
    paymentData: PaymentData;
    expirationDate: string;
  }) {
    try {
      // Usar o serviço The Best para executar a renovação
      const response = await thebestService.createRenewal(
        params.userConfig.id,
        {
          package_id: params.packageInfo.id,
          user_id: params.paymentData.userId,
          duration: params.packageInfo.duracao,
          classification: params.packageInfo.classificacao
        },
        params.paymentData.userId
      );

      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('Erro na API The Best:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API_ERROR'
      };
    }
  }

  /**
   * Cria registro de renovação no banco
   */
  private async createRenewalRecord(params: {
    userId: string;
    packageId: number;
    paymentId: string;
    packageInfo: any;
    expirationDate: string;
    apiResponse: any;
  }) {
    const { data, error } = await (this.supabase as any)
      .from('thebest_renewals')
      .insert({
        user_id: params.userId,
        package_id: params.packageId,
        payment_id: params.paymentId,
        package_name: params.packageInfo.name,
        credits_added: params.packageInfo.credits,
        expiration_date: params.expirationDate,
        status: 'completed',
        api_response: params.apiResponse,
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erro ao criar registro de renovação: ${error.message}`);
    }

    return data;
  }

  /**
   * Registra operação nos logs
   */
  private async logRenewalOperation(params: {
    userId: string;
    operation: string;
    packageId: number;
    success: boolean;
    details: any;
  }) {
    try {
      await (this.supabase as any)
        .from('thebest_api_logs')
        .insert({
          user_id: params.userId,
          operation: params.operation,
          success: params.success,
          request_data: {
            packageId: params.packageId,
            ...params.details
          },
          response_data: params.success ? { status: 'success' } : { error: params.details.error },
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  }

  /**
   * Busca histórico de renovações do usuário
   */
  async getRenewalHistory(userId: string, limit: number = 10) {
    const { data, error } = await (this.supabase as any)
      .from('thebest_renewals')
      .select(`
        *,
        thebest_packages!inner(
          id,
          classificacao,
          duracao,
          telas,
          creditos
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }

    return data;
  }

  /**
   * Verifica se um pagamento já foi processado
   */
  async isPaymentProcessed(paymentId: string): Promise<boolean> {
    const { data, error } = await (this.supabase as any)
      .from('thebest_renewals')
      .select('id')
      .eq('payment_id', paymentId)
      .single();

    return !error && !!data;
  }

  /**
   * Lista pacotes disponíveis para renovação
   */
  async getAvailablePackages(): Promise<TheBestPackage[]> {
    const { data, error } = await (this.supabase as any)
      .from('thebest_packages')
      .select('*')
      .eq('is_active', true)
      .order('classificacao')
      .order('duracao')
      .order('telas');

    if (error) {
      throw new Error(`Erro ao buscar pacotes: ${error.message}`);
    }

    return data;
  }
}

// Instância singleton
let renewalServiceInstance: TheBestRenewalService | null = null;

export function createRenewalService(supabase?: ApiSupabaseClient) {
  if (!renewalServiceInstance) {
    const client = supabase || createApiSupabaseClient();
    renewalServiceInstance = new TheBestRenewalService(client);
  }
  return renewalServiceInstance;
}

export { TheBestRenewalService };
export type { PaymentData, RenewalResult };
