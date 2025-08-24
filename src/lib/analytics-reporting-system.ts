// 📊 Sistema de Análise de Dados e Relatórios
// Sistema avançado de analytics, métricas de negócio e geração de relatórios

import { createApiSupabaseClient } from "./supabase/clients/api";
import type { Database } from './database.types';
import { performanceMonitoringSystem } from '@/lib/performance';
import { MetricType } from '@/lib/performance/types';
import { auditComplianceSystem, AuditEventType } from './audit-compliance-system';
import { realtimeSecurityMonitor } from './security';
import { SecurityEventType, SecuritySeverity } from './security-monitoring';
import { intelligentCacheSystem } from './intelligent-cache-system';
import { realtimeNotificationSystem, NotificationType } from '@/lib/notifications';
import { createHash } from 'crypto';

// Tipos de métricas de analytics
export enum AnalyticsMetricType {
  // Métricas de usuário
  USER_REGISTRATION = 'user_registration',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_ACTIVITY = 'user_activity',
  USER_RETENTION = 'user_retention',
  USER_CHURN = 'user_churn',
  
  // Métricas de engajamento
  PAGE_VIEW = 'page_view',
  SESSION_DURATION = 'session_duration',
  BOUNCE_RATE = 'bounce_rate',
  CLICK_THROUGH_RATE = 'click_through_rate',
  CONVERSION_RATE = 'conversion_rate',
  
  // Métricas de negócio
  REVENUE = 'revenue',
  TRANSACTION = 'transaction',
  ORDER_VALUE = 'order_value',
  CUSTOMER_LIFETIME_VALUE = 'customer_lifetime_value',
  ACQUISITION_COST = 'acquisition_cost',
  
  // Métricas de produto
  FEATURE_USAGE = 'feature_usage',
  API_USAGE = 'api_usage',
  ERROR_RATE = 'error_rate',
  LOAD_TIME = 'load_time',
  UPTIME = 'uptime',
  
  // Métricas de marketing
  CAMPAIGN_PERFORMANCE = 'campaign_performance',
  LEAD_GENERATION = 'lead_generation',
  EMAIL_OPEN_RATE = 'email_open_rate',
  SOCIAL_ENGAGEMENT = 'social_engagement',
  
  // Métricas customizadas
  CUSTOM = 'custom'
}

// Dimensões para análise
export enum AnalyticsDimension {
  TIME = 'time',
  USER = 'user',
  DEVICE = 'device',
  LOCATION = 'location',
  SOURCE = 'source',
  CAMPAIGN = 'campaign',
  CHANNEL = 'channel',
  SEGMENT = 'segment',
  COHORT = 'cohort',
  FEATURE = 'feature',
  PAGE = 'page',
  CUSTOM = 'custom'
}

// Tipos de agregação
export enum AggregationType {
  SUM = 'sum',
  COUNT = 'count',
  AVERAGE = 'average',
  MEDIAN = 'median',
  MIN = 'min',
  MAX = 'max',
  PERCENTILE = 'percentile',
  UNIQUE = 'unique',
  RATE = 'rate',
  RATIO = 'ratio'
}

// Períodos de tempo
export enum TimePeriod {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
  CUSTOM = 'custom'
}

// Tipos de relatório
export enum ReportType {
  DASHBOARD = 'dashboard',
  SUMMARY = 'summary',
  DETAILED = 'detailed',
  COMPARISON = 'comparison',
  TREND = 'trend',
  COHORT = 'cohort',
  FUNNEL = 'funnel',
  RETENTION = 'retention',
  SEGMENTATION = 'segmentation',
  CUSTOM = 'custom'
}

// Formatos de exportação
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  EXCEL = 'excel',
  PDF = 'pdf',
  PNG = 'png',
  SVG = 'svg'
}

// Status do relatório
export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Interface para evento de analytics
export interface AnalyticsEvent {
  id: string;
  type: AnalyticsMetricType;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  value: number;
  unit: string;
  dimensions: Record<AnalyticsDimension | string, any>;
  metadata: {
    source: string;
    version: string;
    environment: string;
    userAgent?: string;
    ip?: string;
    referrer?: string;
    utm?: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    };
    custom?: Record<string, any>;
  };
  processed: boolean;
  processedAt?: Date;
}

// Interface para consulta de analytics
export interface AnalyticsQuery {
  metrics: Array<{
    type: AnalyticsMetricType;
    aggregation: AggregationType;
    field?: string;
    alias?: string;
  }>;
  dimensions: Array<{
    type: AnalyticsDimension;
    field?: string;
    alias?: string;
  }>;
  filters: Array<{
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'between';
    value: any;
  }>;
  timeRange: {
    start: Date;
    end: Date;
    period?: TimePeriod;
  };
  groupBy?: string[];
  orderBy?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
  offset?: number;
}

// Interface para resultado de analytics
export interface AnalyticsResult {
  data: Array<Record<string, any>>;
  metadata: {
    query: AnalyticsQuery;
    executionTime: number;
    totalRows: number;
    cached: boolean;
    generatedAt: Date;
  };
  summary: {
    totals: Record<string, number>;
    averages: Record<string, number>;
    trends: Record<string, {
      direction: 'up' | 'down' | 'stable';
      percentage: number;
      significance: 'high' | 'medium' | 'low';
    }>;
  };
}

// Interface para configuração de relatório
export interface ReportConfig {
  id: string;
  name: string;
  description: string;
  type: ReportType;
  query: AnalyticsQuery;
  visualization: {
    type: 'table' | 'chart' | 'graph' | 'map' | 'custom';
    chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap';
    options: Record<string, any>;
  };
  schedule?: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:mm
    dayOfWeek?: number; // 0-6
    dayOfMonth?: number; // 1-31
    timezone: string;
    recipients: string[];
    format: ExportFormat;
  };
  alerts?: Array<{
    condition: {
      metric: string;
      operator: 'gt' | 'lt' | 'eq' | 'change';
      threshold: number;
      period?: TimePeriod;
    };
    notification: {
      channels: string[];
      message: string;
      severity: SecuritySeverity;
    };
  }>;
  access: {
    public: boolean;
    users: string[];
    roles: string[];
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tags: string[];
    category: string;
    version: string;
  };
}

// Interface para dashboard
export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: Array<{
    id: string;
    type: 'metric' | 'chart' | 'table' | 'text' | 'custom';
    title: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    config: {
      reportId?: string;
      query?: AnalyticsQuery;
      visualization?: any;
      refreshInterval?: number; // ms
      autoRefresh?: boolean;
    };
  }>;
  layout: {
    columns: number;
    rows: number;
    responsive: boolean;
  };
  filters: Array<{
    id: string;
    type: 'date' | 'select' | 'multiselect' | 'text' | 'number';
    field: string;
    label: string;
    defaultValue?: any;
    options?: Array<{ label: string; value: any }>;
  }>;
  access: {
    public: boolean;
    users: string[];
    roles: string[];
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tags: string[];
    category: string;
    lastViewed?: Date;
    viewCount: number;
  };
}

// Interface para configuração do sistema
export interface AnalyticsSystemConfig {
  enabled: boolean;
  collection: {
    batchSize: number;
    batchInterval: number; // ms
    maxQueueSize: number;
    autoFlush: boolean;
    compression: boolean;
  };
  processing: {
    realtime: boolean;
    batchProcessing: boolean;
    parallelWorkers: number;
    retryAttempts: number;
    retryDelay: number; // ms
  };
  storage: {
    retention: {
      raw: number; // days
      aggregated: number; // days
      archived: number; // days
    };
    compression: {
      enabled: boolean;
      algorithm: 'gzip' | 'lz4' | 'snappy';
      level: number;
    };
    partitioning: {
      enabled: boolean;
      strategy: 'time' | 'hash' | 'range';
      interval: TimePeriod;
    };
  };
  cache: {
    enabled: boolean;
    ttl: number; // ms
    maxSize: number; // MB
    strategy: 'lru' | 'lfu' | 'ttl';
  };
  privacy: {
    anonymizeIPs: boolean;
    excludePersonalData: boolean;
    consentRequired: boolean;
    dataRetention: number; // days
  };
  performance: {
    sampling: {
      enabled: boolean;
      rate: number; // 0-1
      strategy: 'random' | 'systematic' | 'stratified';
    };
    indexing: {
      enabled: boolean;
      fields: string[];
      strategy: 'btree' | 'hash' | 'gin';
    };
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      errorRate: number; // %
      responseTime: number; // ms
      queueSize: number;
      diskUsage: number; // %
    };
    cooldown: number; // ms
  };
}

// Configuração padrão
const DEFAULT_CONFIG: AnalyticsSystemConfig = {
  enabled: true,
  collection: {
    batchSize: 1000,
    batchInterval: 5000, // 5 segundos
    maxQueueSize: 10000,
    autoFlush: true,
    compression: true
  },
  processing: {
    realtime: true,
    batchProcessing: true,
    parallelWorkers: 4,
    retryAttempts: 3,
    retryDelay: 1000
  },
  storage: {
    retention: {
      raw: 90, // 3 meses
      aggregated: 365, // 1 ano
      archived: 2555 // 7 anos
    },
    compression: {
      enabled: true,
      algorithm: 'gzip',
      level: 6
    },
    partitioning: {
      enabled: true,
      strategy: 'time',
      interval: TimePeriod.DAY
    }
  },
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutos
    maxSize: 100, // 100 MB
    strategy: 'lru'
  },
  privacy: {
    anonymizeIPs: true,
    excludePersonalData: false,
    consentRequired: true,
    dataRetention: 730 // 2 anos
  },
  performance: {
    sampling: {
      enabled: false,
      rate: 1.0,
      strategy: 'random'
    },
    indexing: {
      enabled: true,
      fields: ['timestamp', 'type', 'userId', 'sessionId'],
      strategy: 'btree'
    }
  },
  alerts: {
    enabled: true,
    thresholds: {
      errorRate: 5, // 5%
      responseTime: 1000, // 1 segundo
      queueSize: 5000,
      diskUsage: 80 // 80%
    },
    cooldown: 300000 // 5 minutos
  }
};

// Classe principal do sistema de analytics
export class AnalyticsReportingSystem {
  private config: AnalyticsSystemConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private reports: Map<string, ReportConfig> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private lastAlerts: Map<string, Date> = new Map();
  
  constructor(config: Partial<AnalyticsSystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startProcessing();
    this.startCleanup();
    this.loadReports();
    this.loadDashboards();
  }
  
  // Registrar evento de analytics
  async trackEvent(
    type: AnalyticsMetricType,
    value: number,
    options: {
      userId?: string;
      sessionId?: string;
      unit?: string;
      dimensions?: Record<string, any>;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    if (!this.config.enabled) return;
    
    try {
      const event: AnalyticsEvent = {
        id: this.generateEventId(),
        type,
        timestamp: new Date(),
        userId: options.userId,
        sessionId: options.sessionId,
        value,
        unit: options.unit || 'count',
        dimensions: {
          [AnalyticsDimension.TIME]: new Date().toISOString(),
          ...options.dimensions
        },
        metadata: {
          source: 'application',
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          ...options.metadata
        },
        processed: false
      };
      
      // Aplicar privacidade
      this.applyPrivacyRules(event);
      
      // Adicionar à fila
      this.eventQueue.push(event);
      
      // Flush automático se necessário
      if (this.config.collection.autoFlush && 
          this.eventQueue.length >= this.config.collection.batchSize) {
        await this.flushEvents();
      }
      
    } catch (error) {
      console.error('Erro ao registrar evento de analytics:', error);
    }
  }
  
  // Aplicar regras de privacidade
  private applyPrivacyRules(event: AnalyticsEvent): void {
    if (this.config.privacy.anonymizeIPs && event.metadata.ip) {
      // Anonimizar IP (manter apenas os primeiros 3 octetos)
      const ip = event.metadata.ip;
      const parts = ip.split('.');
      if (parts.length === 4) {
        event.metadata.ip = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
      }
    }
    
    if (this.config.privacy.excludePersonalData) {
      // Remover dados pessoais identificáveis
      delete event.metadata.userAgent;
      delete event.userId;
    }
  }
  
  // Flush eventos para persistência
  async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;
    
    try {
      const events = this.eventQueue.splice(0, this.config.collection.batchSize);
      
      // Comprimir se habilitado
      let data = events;
      if (this.config.collection.compression) {
        data = await this.compressData(events);
      }
      
      // Persistir no banco
      await this.persistEvents(data);
      
      // Processar em tempo real se habilitado
      if (this.config.processing.realtime) {
        await this.processEventsRealtime(events);
      }
      
    } catch (error) {
      console.error('Erro ao fazer flush dos eventos:', error);
      
      // Recolocar eventos na fila em caso de erro
      // this.eventQueue.unshift(...events);
    }
  }
  
  // Comprimir dados
  private async compressData(data: any): Promise<any> {
    // Implementação placeholder para compressão
    // Em produção, usar biblioteca de compressão real
    return data;
  }
  
  // Persistir eventos no banco
  private async persistEvents(events: AnalyticsEvent[]): Promise<void> {
    try {
      const supabase = createApiSupabaseClient();
      
      const { error } = await supabase
        .from('analytics_events')
        .insert(events.map(event => ({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp.toISOString(),
          user_id: event.userId,
          session_id: event.sessionId,
          value: event.value,
          unit: event.unit,
          dimensions: event.dimensions,
          metadata: event.metadata,
          processed: event.processed,
          processed_at: event.processedAt?.toISOString()
        })));
      
      if (error) {
        throw error;
      }
      
    } catch (error) {
      console.error('Erro ao persistir eventos:', error);
      throw error;
    }
  }
  
  // Processar eventos em tempo real
  private async processEventsRealtime(events: AnalyticsEvent[]): Promise<void> {
    for (const event of events) {
      try {
        // Atualizar agregações em tempo real
        await this.updateRealTimeAggregations(event);
        
        // Verificar alertas
        await this.checkEventAlerts(event);
        
        // Marcar como processado
        event.processed = true;
        event.processedAt = new Date();
        
      } catch (error) {
        console.error(`Erro ao processar evento ${event.id}:`, error);
      }
    }
  }
  
  // Atualizar agregações em tempo real
  private async updateRealTimeAggregations(event: AnalyticsEvent): Promise<void> {
    try {
      // Implementar agregações em tempo real
      // Por exemplo: contadores, médias móveis, etc.
      
      const cacheKey = `realtime:${event.type}:${this.getTimeKey(event.timestamp)}`;
      
      // Incrementar contador
      const current = await intelligentCacheSystem.get<number>(cacheKey);
      const newValue = (current.value || 0) + event.value;
      
      await intelligentCacheSystem.set(
        cacheKey,
        newValue,
        {
          ttl: this.config.cache.ttl,
          tags: ['realtime', 'aggregations', event.type]
        }
      );
      
    } catch (error) {
      console.error('Erro ao atualizar agregações em tempo real:', error);
    }
  }
  
  // Obter chave de tempo para agregação
  private getTimeKey(timestamp: Date): string {
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const hour = String(timestamp.getHours()).padStart(2, '0');
    
    return `${year}-${month}-${day}-${hour}`;
  }
  
  // Verificar alertas de evento
  private async checkEventAlerts(event: AnalyticsEvent): Promise<void> {
    // Implementar verificação de alertas baseada em eventos
    // Por exemplo: picos de erro, quedas de performance, etc.
  }
  
  // Executar consulta de analytics
  async executeQuery(query: AnalyticsQuery): Promise<AnalyticsResult> {
    try {
      const startTime = Date.now();
      
      // Verificar cache
      const cacheKey = this.generateQueryCacheKey(query);
      if (this.config.cache.enabled) {
        const cached = await intelligentCacheSystem.get<AnalyticsResult>(cacheKey);
        if (cached.status === 'hit' && cached.value) {
          return {
            ...cached.value,
            metadata: {
              ...cached.value.metadata,
              cached: true
            }
          };
        }
      }
      
      // Executar consulta
      const data = await this.executeQueryOnDatabase(query);
      
      // Calcular métricas de resumo
      const summary = this.calculateSummary(data, query);
      
      const result: AnalyticsResult = {
        data,
        metadata: {
          query,
          executionTime: Date.now() - startTime,
          totalRows: data.length,
          cached: false,
          generatedAt: new Date()
        },
        summary
      };
      
      // Armazenar no cache
      if (this.config.cache.enabled) {
        await intelligentCacheSystem.set(
          cacheKey,
          result,
          {
            ttl: this.config.cache.ttl,
            tags: ['analytics', 'queries']
          }
        );
      }
      
      return result;
      
    } catch (error) {
      console.error('Erro ao executar consulta de analytics:', error);
      throw error;
    }
  }
  
  // Executar consulta no banco de dados
  private async executeQueryOnDatabase(query: AnalyticsQuery): Promise<Array<Record<string, any>>> {
    try {
      const supabase = createApiSupabaseClient();
      
      // Construir consulta SQL
      let sqlQuery = supabase.from('analytics_events').select('*');
      
      // Aplicar filtros
      for (const filter of query.filters) {
        switch (filter.operator) {
          case 'eq':
            sqlQuery = sqlQuery.eq(filter.field, filter.value);
            break;
          case 'ne':
            sqlQuery = sqlQuery.neq(filter.field, filter.value);
            break;
          case 'gt':
            sqlQuery = sqlQuery.gt(filter.field, filter.value);
            break;
          case 'gte':
            sqlQuery = sqlQuery.gte(filter.field, filter.value);
            break;
          case 'lt':
            sqlQuery = sqlQuery.lt(filter.field, filter.value);
            break;
          case 'lte':
            sqlQuery = sqlQuery.lte(filter.field, filter.value);
            break;
          case 'in':
            sqlQuery = sqlQuery.in(filter.field, filter.value);
            break;
          case 'like':
            sqlQuery = sqlQuery.like(filter.field, filter.value);
            break;
        }
      }
      
      // Aplicar range de tempo
      sqlQuery = sqlQuery
        .gte('timestamp', query.timeRange.start.toISOString())
        .lte('timestamp', query.timeRange.end.toISOString());
      
      // Aplicar ordenação
      if (query.orderBy) {
        for (const order of query.orderBy) {
          sqlQuery = sqlQuery.order(order.field, { ascending: order.direction === 'asc' });
        }
      }
      
      // Aplicar limite e offset
      if (query.limit) {
        sqlQuery = sqlQuery.limit(query.limit);
      }
      
      if (query.offset) {
        sqlQuery = sqlQuery.range(query.offset, (query.offset + (query.limit || 100)) - 1);
      }
      
      const { data, error } = await sqlQuery;
      
      if (error) {
        throw error;
      }
      
      return data || [];
      
    } catch (error) {
      console.error('Erro ao executar consulta no banco:', error);
      throw error;
    }
  }
  
  // Calcular resumo dos dados
  private calculateSummary(
    data: Array<Record<string, any>>,
    query: AnalyticsQuery
  ): AnalyticsResult['summary'] {
    const totals: Record<string, number> = {};
    const averages: Record<string, number> = {};
    const trends: Record<string, any> = {};
    
    // Calcular totais e médias para métricas numéricas
    for (const metric of query.metrics) {
      const values = data.map(row => Number(row[metric.field || 'value']) || 0);
      
      switch (metric.aggregation) {
        case AggregationType.SUM:
          totals[metric.alias || metric.type] = values.reduce((sum, val) => sum + val, 0);
          break;
        case AggregationType.COUNT:
          totals[metric.alias || metric.type] = values.length;
          break;
        case AggregationType.AVERAGE:
          averages[metric.alias || metric.type] = values.length > 0 
            ? values.reduce((sum, val) => sum + val, 0) / values.length 
            : 0;
          break;
        case AggregationType.MIN:
          totals[metric.alias || metric.type] = Math.min(...values);
          break;
        case AggregationType.MAX:
          totals[metric.alias || metric.type] = Math.max(...values);
          break;
      }
    }
    
    // Calcular tendências (placeholder)
    // Em produção, implementar análise de tendências mais sofisticada
    for (const key of Object.keys(totals)) {
      trends[key] = {
        direction: 'stable' as const,
        percentage: 0,
        significance: 'low' as const
      };
    }
    
    return { totals, averages, trends };
  }
  
  // Gerar chave de cache para consulta
  private generateQueryCacheKey(query: AnalyticsQuery): string {
    const queryString = JSON.stringify(query);
    return `analytics:query:${createHash('md5').update(queryString).digest('hex')}`;
  }
  
  // Helper: converter valores para JSON compatível com o tipo Json do Supabase
  private toJson(value: any): any {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.toJson(v));
    }
    if (value && typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        if (v === undefined) continue; // remover undefined
        result[k] = this.toJson(v);
      }
      return result;
    }
    return value;
  }
  
  // Converter linha do banco (analytics_reports) para ReportConfig
  private mapReportRowToConfig(row: Database['public']['Tables']['analytics_reports']['Row']): ReportConfig {
    const metadata = (row.metadata as any) || {};
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      type: row.type as ReportType,
      query: (row.query as any) as AnalyticsQuery,
      visualization: (row.visualization as any),
      schedule: row.schedule ? ((row.schedule as any) as ReportConfig['schedule']) : undefined,
      alerts: row.alerts ? ((row.alerts as any) as ReportConfig['alerts']) : undefined,
      access: (row.access as any),
      metadata: {
        createdAt: metadata.createdAt ? new Date(metadata.createdAt) : new Date(row.created_at),
        updatedAt: metadata.updatedAt ? new Date(metadata.updatedAt) : new Date(row.updated_at),
        createdBy: metadata.createdBy ?? 'system',
        tags: metadata.tags ?? [],
        category: metadata.category ?? 'general',
        version: metadata.version ?? '1.0.0',
      },
    };
  }
  
  // Converter linha do banco (analytics_dashboards) para Dashboard
  private mapDashboardRowToConfig(row: Database['public']['Tables']['analytics_dashboards']['Row']): Dashboard {
    const metadata = (row.metadata as any) || {};
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      widgets: (row.widgets as any) ?? [],
      layout: (row.layout as any),
      filters: (row.filters as any) ?? [],
      access: (row.access as any),
      metadata: {
        createdAt: metadata.createdAt ? new Date(metadata.createdAt) : new Date(row.created_at),
        updatedAt: metadata.updatedAt ? new Date(metadata.updatedAt) : new Date(row.updated_at),
        createdBy: metadata.createdBy ?? 'system',
        tags: metadata.tags ?? [],
        category: metadata.category ?? 'general',
        lastViewed: metadata.lastViewed ? new Date(metadata.lastViewed) : undefined,
        viewCount: metadata.viewCount ?? 0,
      },
    };
  }
  
  // Gerar relatório
  async generateReport(
    reportId: string,
    options: {
      format?: ExportFormat;
      filters?: Record<string, any>;
      timeRange?: { start: Date; end: Date };
    } = {}
  ): Promise<{
    data: AnalyticsResult;
    metadata: {
      reportId: string;
      generatedAt: Date;
      format: ExportFormat;
      size: number;
    };
  }> {
    try {
      const report = this.reports.get(reportId);
      if (!report) {
        throw new Error(`Relatório não encontrado: ${reportId}`);
      }
      
      // Aplicar filtros e range de tempo personalizados
      const query = { ...report.query };
      
      if (options.timeRange) {
        query.timeRange = options.timeRange;
      }
      
      if (options.filters) {
        query.filters = [
          ...query.filters,
          ...Object.entries(options.filters).map(([field, value]) => ({
            field,
            operator: 'eq' as const,
            value
          }))
        ];
      }
      
      // Executar consulta
      const data = await this.executeQuery(query);
      
      // Registrar geração do relatório
      await auditComplianceSystem.recordAuditEvent(
        AuditEventType.REPORT_GENERATED,
        undefined,
        undefined,
        'localhost',
        'analytics-system',
        'report',
        'generate',
        {
          reportId,
          format: options.format || ExportFormat.JSON,
          rowCount: data.data.length,
          executionTime: data.metadata.executionTime
        },
        'success',
        SecuritySeverity.LOW
      );
      
      return {
        data,
        metadata: {
          reportId,
          generatedAt: new Date(),
          format: options.format || ExportFormat.JSON,
          size: JSON.stringify(data).length
        }
      };
      
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      throw error;
    }
  }
  
  // Criar relatório
  async createReport(config: Omit<ReportConfig, 'id' | 'metadata'> & { metadata?: Partial<ReportConfig['metadata']> }): Promise<string> {
    try {
      const reportId = this.generateReportId();
      
      const report: ReportConfig = {
        ...config,
        id: reportId,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system', // Em produção, usar ID do usuário atual
          tags: config.metadata?.tags || [],
          category: config.metadata?.category || 'general',
          version: '1.0.0'
        }
      };
      
      // Salvar no mapa local
      this.reports.set(reportId, report);
      
      // Persistir no banco
      await this.persistReport(report);
      
      return reportId;
      
    } catch (error) {
      console.error('Erro ao criar relatório:', error);
      throw error;
    }
  }
  
  // Persistir relatório
  private async persistReport(report: ReportConfig): Promise<void> {
    try {
      const supabase = createApiSupabaseClient();
      
      const reportData: Database['public']['Tables']['analytics_reports']['Insert'] = {
        id: report.id,
        name: report.name,
        description: report.description || null,
        type: report.type,
        query: this.toJson(report.query),
        visualization: this.toJson(report.visualization),
        schedule: report.schedule ? this.toJson(report.schedule) : null,
        alerts: report.alerts ? this.toJson(report.alerts) : null,
        access: this.toJson(report.access),
        metadata: this.toJson(report.metadata),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('analytics_reports')
        .upsert(reportData, {
          onConflict: 'id'
        });
      
      if (error) {
        console.error('Erro no upsert do relatório:', error);
        throw error;
      }
      
    } catch (error) {
      console.error('Erro ao persistir relatório:', error);
      throw error;
    }
  }
  
  // Carregar relatórios
  private async loadReports(): Promise<void> {
    try {
      const supabase = createApiSupabaseClient();
      
      const { data, error } = await supabase
        .from('analytics_reports')
        .select('*');
      
      if (error) {
        console.error('Erro ao carregar relatórios:', error);
        return;
      }
      
      for (const reportData of (data || []) as Database['public']['Tables']['analytics_reports']['Row'][]) {
        const report = this.mapReportRowToConfig(reportData);
        this.reports.set(report.id, report);
      }
      
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    }
  }
  
  // Carregar dashboards
  private async loadDashboards(): Promise<void> {
    try {
      const supabase = createApiSupabaseClient();
      
      const { data, error } = await supabase
        .from('analytics_dashboards')
        .select('*');
      
      if (error) {
        console.error('Erro ao carregar dashboards:', error);
        return;
      }
      
      for (const dashboardData of (data || []) as Database['public']['Tables']['analytics_dashboards']['Row'][]) {
        const dashboard = this.mapDashboardRowToConfig(dashboardData);
        this.dashboards.set(dashboard.id, dashboard);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dashboards:', error);
    }
  }
  
  // Gerar ID de evento
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Gerar ID de relatório
  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Iniciar processamento
  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.flushEvents();
    }, this.config.collection.batchInterval);
  }
  
  // Iniciar limpeza
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 24 * 60 * 60 * 1000); // Diário
  }
  
  // Limpeza de dados antigos
  private async cleanup(): Promise<void> {
    try {
      const supabase = createApiSupabaseClient();
      
      // Limpar eventos brutos antigos
      const rawCutoff = new Date();
      rawCutoff.setDate(rawCutoff.getDate() - this.config.storage.retention.raw);
      
      await supabase
        .from('analytics_events')
        .delete()
        .lt('timestamp', rawCutoff.toISOString());
      
      console.log('Limpeza de dados de analytics concluída');
      
    } catch (error) {
      console.error('Erro na limpeza de dados:', error);
    }
  }
  
  // Obter estatísticas do sistema
  getSystemStats(): {
    queueSize: number;
    reportsCount: number;
    dashboardsCount: number;
    config: AnalyticsSystemConfig;
  } {
    return {
      queueSize: this.eventQueue.length,
      reportsCount: this.reports.size,
      dashboardsCount: this.dashboards.size,
      config: this.config
    };
  }
  
  // Finalizar sistema
  async shutdown(): Promise<void> {
    // Parar intervalos
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Flush eventos pendentes
    await this.flushEvents();
    
    console.log('Sistema de analytics e relatórios finalizado');
  }
}

// Instância global do sistema
export const analyticsReportingSystem = new AnalyticsReportingSystem();

// Funções utilitárias para uso direto
export async function trackEvent(
  type: AnalyticsMetricType,
  value: number = 1,
  options?: any
): Promise<void> {
  return analyticsReportingSystem.trackEvent(type, value, options);
}

export async function trackPageView(
  page: string,
  userId?: string,
  sessionId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  return trackEvent(
    AnalyticsMetricType.PAGE_VIEW,
    1,
    {
      userId,
      sessionId,
      dimensions: {
        [AnalyticsDimension.PAGE]: page
      },
      metadata
    }
  );
}

export async function trackUserAction(
  action: string,
  userId: string,
  sessionId?: string,
  value: number = 1,
  metadata?: Record<string, any>
): Promise<void> {
  return trackEvent(
    AnalyticsMetricType.USER_ACTIVITY,
    value,
    {
      userId,
      sessionId,
      dimensions: {
        [AnalyticsDimension.CUSTOM]: action
      },
      metadata
    }
  );
}

export async function trackConversion(
  type: string,
  value: number,
  userId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  return trackEvent(
    AnalyticsMetricType.CONVERSION_RATE,
    value,
    {
      userId,
      dimensions: {
        [AnalyticsDimension.CUSTOM]: type
      },
      metadata
    }
  );
}

export async function trackRevenue(
  amount: number,
  currency: string = 'BRL',
  userId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  return trackEvent(
    AnalyticsMetricType.REVENUE,
    amount,
    {
      userId,
      unit: currency,
      metadata
    }
  );
}

export async function executeAnalyticsQuery(
  query: AnalyticsQuery
): Promise<AnalyticsResult> {
  return analyticsReportingSystem.executeQuery(query);
}

export async function generateAnalyticsReport(
  reportId: string,
  options?: any
): Promise<any> {
  return analyticsReportingSystem.generateReport(reportId, options);
}

export async function createAnalyticsReport(
  config: Omit<ReportConfig, 'id' | 'metadata'> & { metadata?: Partial<ReportConfig['metadata']> }
): Promise<string> {
  return analyticsReportingSystem.createReport(config);
}

export function getAnalyticsStats(): any {
  return analyticsReportingSystem.getSystemStats();
}

// Hook para React/Next.js
export function useAnalytics() {
  const track = (type: AnalyticsMetricType, value?: number, options?: any) => {
    trackEvent(type, value, options);
  };
  
  const trackPage = (page: string, metadata?: any) => {
    trackPageView(page, undefined, undefined, metadata);
  };
  
  const trackAction = (action: string, value?: number, metadata?: any) => {
    trackUserAction(action, 'anonymous', undefined, value, metadata);
  };
  
  return {
    track,
    trackPage,
    trackAction,
    trackConversion,
    trackRevenue
  };
}

// Middleware para Next.js
export function createAnalyticsMiddleware() {
  return async (req: any, res: any, next: any) => {
    // Adicionar funções de analytics ao request
    req.analytics = {
      track: (type: AnalyticsMetricType, value?: number, options?: any) => 
        trackEvent(type, value, options),
      trackPage: (page: string, metadata?: any) => 
        trackPageView(page, req.user?.id, req.sessionId, metadata),
      trackAction: (action: string, value?: number, metadata?: any) => 
        trackUserAction(action, req.user?.id || 'anonymous', req.sessionId, value, metadata)
    };
    
    // Rastrear requisição automaticamente
    await trackPageView(
      req.url,
      req.user?.id,
      req.sessionId,
      {
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        referrer: req.headers.referer
      }
    );
    
    next();
  };
}