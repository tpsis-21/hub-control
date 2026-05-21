import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
import { Database } from '@/lib/database.types';
import { renewPainelBestLine } from '@/lib/integrations/thebest-panel-client';
import { THEBEST_DEFAULT_TIMEOUT_MS } from '@/lib/integrations/thebest-constants';
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/production-logger'

type ApiSupabaseClient = SupabaseClient<Database>;

interface PaymentData {
  /** UUID do revendedor no Hub (`thebest_configs.user_id`). */
  userId: string;
  /** ID do cliente (line) no Painel Best. */
  lineId: number | string;
  /** Pacote no Hub — opcional se `months` for enviado. */
  packageId?: number | string;
  paymentId: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  /** Meses enviados à API; se omitido, usa duração do pacote no Hub. */
  months?: number;
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
  external_id: string;
  name: string;
  classificacao: string;
  duracao: string;
  telas: number;
  creditos: number;
  is_active: boolean;
  config_id?: string;
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
        lineId: paymentData.lineId,
        packageId: paymentData.packageId,
        paymentId: paymentData.paymentId
      });

      if (paymentData.lineId === '' || paymentData.lineId == null) {
        return {
          success: false,
          message: 'line_id do cliente no Painel Best é obrigatório',
          error: 'LINE_ID_REQUIRED',
        };
      }

      const hasExplicitMonths =
        paymentData.months != null && paymentData.months >= 1;
      const hasPackageRef =
        paymentData.packageId != null &&
        paymentData.packageId !== '' &&
        paymentData.packageId !== 0;

      // 1. Pacote no Hub (opcional se `months` vier no payload)
      let packageInfo: TheBestPackage | null = null;
      if (hasPackageRef) {
        packageInfo = await this.getPackageInfo(paymentData.packageId as string | number);
        if (!packageInfo && !hasExplicitMonths) {
          return {
            success: false,
            message: `Pacote ${paymentData.packageId} não encontrado`,
            error: 'PACKAGE_NOT_FOUND',
          };
        }
      } else if (!hasExplicitMonths) {
        return {
          success: false,
          message: 'Informe package_id (Hub) ou months no webhook',
          error: 'PACKAGE_OR_MONTHS_REQUIRED',
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

      // 3. Calcular meses e data de expiração
      const durationMonths = hasExplicitMonths
        ? paymentData.months!
        : this.convertDurationToMonths(packageInfo!.duracao);
      const expirationDate = this.calculateExpirationDate(durationMonths);

      // 4. Executar renovação no Painel Best (POST /lines/{id}/renew/)
      const renewalResponse = await this.executeRenewal({
        userConfig,
        paymentData,
        months: durationMonths,
      });

      if (!renewalResponse.success) {
        return {
          success: false,
          message: 'Falha na renovação via API The Best',
          error: renewalResponse.error
        };
      }

      // 5. Registrar renovação no banco (somente se houver pacote no Hub)
      let renewalRecord: { id: string } | null = null;
      if (packageInfo) {
        renewalRecord = await this.createRenewalRecord({
          userConfig,
          paymentData,
          packageInfo,
          expirationDate,
          months: durationMonths,
          apiResponse: renewalResponse.data,
        });
      }

      // 6. Log da operação
      await this.logRenewalOperation({
        configId: userConfig.id,
        userId: paymentData.userId,
        lineId: paymentData.lineId,
        operation: 'CREATE_RENEWAL',
        success: true,
        details: {
          paymentId: paymentData.paymentId,
          renewalId: renewalRecord?.id,
          lineId: paymentData.lineId,
          months: durationMonths,
          packageName: packageInfo?.name,
          credits: packageInfo?.creditos,
          expirationDate,
        },
      });

      return {
        success: true,
        message: packageInfo
          ? `Renovação no painel OK (line ${paymentData.lineId}, ${durationMonths} mês(es)).`
          : `Renovação no painel OK (line ${paymentData.lineId}, ${durationMonths} mês(es), sem registro de pacote no Hub).`,
        renewalId: renewalRecord?.id,
        packageInfo: packageInfo ?? undefined,
      };

    } catch (error) {
      console.error('❌ Erro na renovação automática:', error);
      
      // Log do erro
      await this.logRenewalOperation({
        configId: undefined,
        userId: paymentData.userId,
        lineId: paymentData.lineId,
        operation: 'CREATE_RENEWAL',
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          paymentId: paymentData.paymentId,
          packageId: paymentData.packageId,
        },
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
  private async getPackageInfo(packageId: number | string): Promise<TheBestPackage | null> {
    const idStr = String(packageId);
    let query = (this.supabase as any)
      .from('thebest_packages')
      .select('*')
      .eq('is_active', true);

    if (/^[0-9a-f-]{36}$/i.test(idStr)) {
      query = query.eq('id', idStr);
    } else {
      query = query.eq('external_id', idStr);
    }

    const { data, error } = await query.maybeSingle();

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
    const { data, error } = await (this.supabase as any)
      .from('thebest_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

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
    userConfig: {
      id: string;
      api_url: string;
      api_key: string;
      api_secret: string | null;
    };
    paymentData: PaymentData;
    months: number;
  }) {
    try {
      const panelResult = await renewPainelBestLine(
        {
          apiKey: params.userConfig.api_key,
          apiSecret: params.userConfig.api_secret ?? undefined,
          baseUrl: params.userConfig.api_url,
          timeoutMs: THEBEST_DEFAULT_TIMEOUT_MS,
        },
        params.paymentData.lineId,
        params.months
      );

      if (!panelResult.ok) {
        const detail =
          typeof panelResult.data === 'object' && panelResult.data !== null
            ? JSON.stringify(panelResult.data)
            : String(panelResult.data ?? panelResult.status);
        return {
          success: false as const,
          error: `PAINEL_BEST_${panelResult.status}: ${detail}`,
          data: panelResult.data,
        };
      }

      return {
        success: true as const,
        data: panelResult.data,
      };
    } catch (error) {
      console.error('Erro na API Painel Best:', error);
      return {
        success: false as const,
        error: error instanceof Error ? error.message : 'API_ERROR',
      };
    }
  }

  /**
   * Cria registro de renovação no banco
   */
  private async createRenewalRecord(params: {
    userConfig: { id: string };
    paymentData: PaymentData;
    packageInfo: TheBestPackage;
    expirationDate: string;
    months: number;
    apiResponse: unknown;
  }) {
    const panelLine =
      params.apiResponse &&
      typeof params.apiResponse === 'object' &&
      'id' in (params.apiResponse as object)
        ? String((params.apiResponse as { id: unknown }).id)
        : String(params.paymentData.lineId);

    const { data, error } = await (this.supabase as any)
      .from('thebest_renewals')
      .insert({
        config_id: params.userConfig.id,
        package_id: params.packageInfo.id,
        external_renewal_id: panelLine,
        package_external_id: params.packageInfo.external_id,
        package_name: params.packageInfo.name,
        package_classificacao: params.packageInfo.classificacao,
        package_duracao: params.packageInfo.duracao,
        package_telas: params.packageInfo.telas,
        package_creditos: params.packageInfo.creditos,
        amount: params.paymentData.amount,
        status: 'COMPLETED',
        expiry_date: params.expirationDate,
        processed_at: new Date().toISOString(),
        metadata: {
          payment_id: params.paymentData.paymentId,
          line_id: params.paymentData.lineId,
          months: params.months,
          payment_method: params.paymentData.paymentMethod,
          transaction_id: params.paymentData.transactionId,
          panel_response: params.apiResponse,
        },
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
    configId?: string;
    userId: string;
    lineId: number | string;
    operation: string;
    success: boolean;
    details: Record<string, unknown>;
  }) {
    if (!params.configId) return;

    try {
      await (this.supabase as any).from('thebest_api_logs').insert({
        config_id: params.configId,
        user_id: params.userId,
        operation_type: params.operation,
        endpoint: `/lines/${params.lineId}/renew/`,
        http_method: 'POST',
        success: params.success,
        request_data: params.details,
        response_data: params.success
          ? { status: 'success' }
          : { error: params.details.error },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Erro ao registrar log:', error);
    }
  }

  /**
   * Busca histórico de renovações do usuário
   */
  async getRenewalHistory(hubUserId: string, limit: number = 10) {
    const userConfig = await this.getUserConfig(hubUserId);
    if (!userConfig) {
      return [];
    }

    const { data, error } = await (this.supabase as any)
      .from('thebest_renewals')
      .select(`
        *,
        thebest_packages!inner(
          id,
          name,
          classificacao,
          duracao,
          telas,
          creditos
        )
      `)
      .eq('config_id', userConfig.id)
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
      .contains('metadata', { payment_id: paymentId })
      .limit(1)
      .maybeSingle();

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
