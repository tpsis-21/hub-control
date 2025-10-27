// 📊 Sistema de Alertas de Performance
// Responsável por detectar e gerenciar alertas baseados em métricas

import { AlertEvent, AlertSeverity, PerformanceMetric, ThresholdConfig, MetricType } from './types';
import { auditComplianceSystem, AuditEventType } from '../audit-compliance-system';
import { SecuritySeverity } from '../security';
import { logger } from '@/utils/production-logger'

export class AlertSystem {
  private alerts: AlertEvent[] = [];
  private alertCooldowns: Map<string, Date> = new Map();
  private thresholds: Map<MetricType, ThresholdConfig> = new Map();
  private maxAlertsHistory: number;

  constructor(
    thresholds: Record<string, ThresholdConfig>,
    maxAlertsHistory: number = 500
  ) {
    this.maxAlertsHistory = maxAlertsHistory;
    this.loadThresholds(thresholds);
  }

  // Gerar ID único para alerta
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Carregar configurações de threshold
  private loadThresholds(thresholds: Record<string, ThresholdConfig>): void {
    Object.values(thresholds).forEach(threshold => {
      this.thresholds.set(threshold.metricType, threshold);
    });
  }

  // Verificar métricas contra thresholds
  checkMetrics(metrics: PerformanceMetric[]): AlertEvent[] {
    const newAlerts: AlertEvent[] = [];

    metrics.forEach(metric => {
      const threshold = this.thresholds.get(metric.type);
      if (!threshold || !threshold.enabled) return;

      const alert = this.evaluateMetric(metric, threshold);
      if (alert && this.shouldTriggerAlert(alert)) {
        newAlerts.push(alert);
        this.addAlert(alert);
        this.setCooldown(alert);
      }
    });

    return newAlerts;
  }

  // Avaliar métrica contra threshold
  private evaluateMetric(
    metric: PerformanceMetric,
    threshold: ThresholdConfig
  ): AlertEvent | null {
    let severity: AlertSeverity | null = null;
    let thresholdValue: number = threshold.warning;
    let operator: '>' | '<' | '=' | '>=' | '<=' = '>=';

    // Determinar severidade baseada no valor
    if (metric.value >= threshold.critical) {
      severity = AlertSeverity.CRITICAL;
      thresholdValue = threshold.critical;
    } else if (metric.value >= threshold.warning) {
      severity = AlertSeverity.WARNING;
      thresholdValue = threshold.warning;
    }

    if (!severity) return null;

    return {
      id: this.generateAlertId(),
      metricId: metric.id,
      severity,
      message: this.generateAlertMessage(metric, severity, thresholdValue),
      timestamp: new Date(),
      resolved: false,
      threshold: {
        value: thresholdValue,
        operator
      },
      metadata: {
        metricType: metric.type,
        metricValue: metric.value,
        metricUnit: metric.unit,
        source: metric.source,
        thresholdConfig: threshold
      }
    };
  }

  // Verificar se deve disparar alerta (considerando cooldown)
  private shouldTriggerAlert(alert: AlertEvent): boolean {
    const cooldownKey = `${alert.metadata?.metricType}_${alert.severity}`;
    const lastAlertTime = this.alertCooldowns.get(cooldownKey);
    
    if (!lastAlertTime) return true;

    const threshold = this.thresholds.get(alert.metadata?.metricType as MetricType);
    if (!threshold) return true;

    const cooldownPeriod = threshold.cooldownPeriod * 60 * 1000; // converter para ms
    const timeSinceLastAlert = Date.now() - lastAlertTime.getTime();

    return timeSinceLastAlert >= cooldownPeriod;
  }

  // Definir cooldown para tipo de alerta
  private setCooldown(alert: AlertEvent): void {
    const cooldownKey = `${alert.metadata?.metricType}_${alert.severity}`;
    this.alertCooldowns.set(cooldownKey, new Date());
  }

  // Adicionar alerta ao histórico
  private addAlert(alert: AlertEvent): void {
    this.alerts.push(alert);
    
    // Limitar histórico de alertas
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts = this.alerts.slice(-this.maxAlertsHistory);
    }

    // Log de auditoria
    // Log de auditoria
    void auditComplianceSystem
      .recordAuditEvent(
        AuditEventType.PERFORMANCE_ALERT,
        'system',
        undefined,
        '127.0.0.1',
        'internal/alert-system',
        alert.metadata?.source || 'unknown',
        'ALERT_TRIGGERED',
        {
          alertId: alert.id,
          severity: alert.severity,
          metricType: alert.metadata?.metricType,
          value: alert.metadata?.metricValue,
          threshold: alert.threshold.value,
          metadata: alert.metadata,
        },
        'success',
        alert.severity === AlertSeverity.CRITICAL ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH
      )
      .catch((e) => {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Falha ao registrar evento de auditoria (alerta de performance):', e, "WARN");
        }
      });
  }

  // Gerar mensagem de alerta
  private generateAlertMessage(
    metric: PerformanceMetric,
    severity: AlertSeverity,
    threshold: number
  ): string {
    const severityText = severity.toUpperCase();
    const metricName = this.getMetricDisplayName(metric.type);
    
    return `[${severityText}] ${metricName} está em ${metric.value}${metric.unit} ` +
           `(limite: ${threshold}${metric.unit}) em ${metric.source}`;
  }

  // Obter nome amigável da métrica
  private getMetricDisplayName(type: MetricType): string {
    const displayNames: Record<MetricType, string> = {
      [MetricType.RESPONSE_TIME]: 'Tempo de Resposta',
      [MetricType.THROUGHPUT]: 'Throughput',
      [MetricType.ERROR_RATE]: 'Taxa de Erro',
      [MetricType.CPU_USAGE]: 'Uso de CPU',
      [MetricType.MEMORY_USAGE]: 'Uso de Memória',
      [MetricType.DATABASE_QUERY_TIME]: 'Tempo de Query',
      [MetricType.CACHE_HIT_RATE]: 'Taxa de Cache Hit',
      [MetricType.CONCURRENT_USERS]: 'Usuários Concorrentes',
      [MetricType.API_LATENCY]: 'Latência da API',
      [MetricType.DISK_IO]: 'I/O de Disco',
      [MetricType.NETWORK_IO]: 'I/O de Rede',
      [MetricType.WORKFLOW_EXECUTION_TIME]: 'Tempo de Execução de Workflow',
      [MetricType.NOTIFICATION_DELIVERY_RATE]: 'Taxa de Entrega de Notificação'
    };

    return displayNames[type] || type;
  }

  // Resolver alerta
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId && !a.resolved);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;

    // Log de auditoria
    // Log de auditoria
    void auditComplianceSystem
      .recordAuditEvent(
        AuditEventType.PERFORMANCE_ALERT,
        resolvedBy,
        undefined,
        '127.0.0.1',
        'internal/alert-system',
        alert.metadata?.source || 'unknown',
        'ALERT_RESOLVED',
        {
          alertId: alert.id,
          severity: alert.severity,
          resolvedAt: alert.resolvedAt,
        },
        'success',
        SecuritySeverity.LOW
      )
      .catch((e) => {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Falha ao registrar evento de auditoria (resolução de alerta:', e);
        }
      });

    return true;
  }

  // Obter alertas ativos
  getActiveAlerts(): AlertEvent[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Obter histórico de alertas
  getAlertsHistory(limit?: number): AlertEvent[] {
    const sorted = [...this.alerts].sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  // Obter alertas por severidade
  getAlertsBySeverity(severity: AlertSeverity): AlertEvent[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  // Obter estatísticas de alertas
  getAlertStats(): {
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<AlertSeverity, number>;
    byMetricType: Record<string, number>;
  } {
    const active = this.getActiveAlerts();
    const resolved = this.alerts.filter(a => a.resolved);
    
    const bySeverity = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.CRITICAL]: 0,
      [AlertSeverity.EMERGENCY]: 0
    };
    
    const byMetricType: Record<string, number> = {};
    
    this.alerts.forEach(alert => {
      bySeverity[alert.severity]++;
      
      const metricType = alert.metadata?.metricType || 'unknown';
      byMetricType[metricType] = (byMetricType[metricType] || 0) + 1;
    });
    
    return {
      total: this.alerts.length,
      active: active.length,
      resolved: resolved.length,
      bySeverity,
      byMetricType
    };
  }

  // Atualizar configurações de threshold
  updateThreshold(metricType: MetricType, config: Partial<ThresholdConfig>): void {
    const existing = this.thresholds.get(metricType);
    if (existing) {
      this.thresholds.set(metricType, { ...existing, ...config });
    }
  }

  // Limpar alertas antigos
  cleanupOldAlerts(maxAge: number): number {
    const cutoffDate = new Date(Date.now() - maxAge);
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoffDate);
    
    return initialCount - this.alerts.length;
  }

  // Reset do sistema
  reset(): void {
    this.alerts = [];
    this.alertCooldowns.clear();
  }
}

// Utilitários para notificação de alertas
export const AlertNotificationUtils = {
  // Formatar alerta para email
  formatAlertForEmail: (alert: AlertEvent): { subject: string; body: string } => {
    const subject = `🚨 Alerta de Performance: ${alert.severity.toUpperCase()}`;
    
    const body = `
ALERTA DE PERFORMANCE

Severidade: ${alert.severity.toUpperCase()}
Mensagem: ${alert.message}
Data/Hora: ${alert.timestamp.toLocaleString()}
Fonte: ${alert.metadata?.source || 'N/A'}

Detalhes:
- Tipo de Métrica: ${alert.metadata?.metricType || 'N/A'}
- Valor Atual: ${alert.metadata?.metricValue}${alert.metadata?.metricUnit || ''}
- Limite: ${alert.threshold.value}${alert.metadata?.metricUnit || ''}

Por favor, verifique o sistema e tome as ações necessárias.
    `;
    
    return { subject, body };
  },

  // Formatar alerta para Slack
  formatAlertForSlack: (alert: AlertEvent): Record<string, any> => {
    const color = {
      [AlertSeverity.INFO]: 'good',
      [AlertSeverity.WARNING]: 'warning',
      [AlertSeverity.CRITICAL]: 'danger',
      [AlertSeverity.EMERGENCY]: 'danger'
    }[alert.severity];

    return {
      text: `🚨 Alerta de Performance: ${alert.severity.toUpperCase()}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Mensagem',
              value: alert.message,
              short: false
            },
            {
              title: 'Fonte',
              value: alert.metadata?.source || 'N/A',
              short: true
            },
            {
              title: 'Data/Hora',
              value: alert.timestamp.toLocaleString(),
              short: true
            }
          ]
        }
      ]
    };
  }
};
