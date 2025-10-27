// 🔔 Configurações Padrão do Sistema de Notificações

import { ChannelConfig, NotificationTemplate } from './interfaces';
import { UNIFIED_CHANNEL_CONFIGS, toStandardChannelConfig } from './channel-configs';

// Converter configurações unificadas para o formato padrão
// Temporariamente comentado para resolver erro de build
// export const DEFAULT_CHANNEL_CONFIGS: ChannelConfig[] = UNIFIED_CHANNEL_CONFIGS.map(config => 
//   toStandardChannelConfig(config)
// );

// Função para obter configurações padrão (evita exportação de objetos)
export function getDefaultChannelConfigs(): ChannelConfig[] {
  return UNIFIED_CHANNEL_CONFIGS.map(config => toStandardChannelConfig(config));
}

// export const DEFAULT_TEMPLATES: NotificationTemplate[] = [
export function getDefaultTemplates(): NotificationTemplate[] {
  return [
  {
    id: 'security_alert_email',
    type: 'security',
    channel: 'email',
    subject: '🚨 Alerta de Segurança - {{severity}}',
    title: 'Alerta de Segurança Detectado',
    body: `
      <h2>Alerta de Segurança</h2>
      <p><strong>Tipo:</strong> {{type}}</p>
      <p><strong>Severidade:</strong> {{severity}}</p>
      <p><strong>Descrição:</strong> {{description}}</p>
      <p><strong>Data/Hora:</strong> {{timestamp}}</p>
      <p><strong>IP:</strong> {{ip}}</p>
      <p><strong>Usuário:</strong> {{user}}</p>
      
      <h3>Ação Recomendada</h3>
      <p>{{recommendation}}</p>
      
      <hr>
      <p><small>Este é um alerta automático do sistema Hub Control.</small></p>
    `,
    variables: ['type', 'severity', 'description', 'timestamp', 'ip', 'user', 'recommendation'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'performance_alert_webhook',
    type: 'performance',
    channel: 'webhook',
    title: '📊 Alerta de Performance',
    body: `{
      "alert_type": "performance",
      "metric": "{{metric}}",
      "current_value": "{{currentValue}}",
      "threshold": "{{threshold}}",
      "severity": "{{severity}}",
      "timestamp": "{{timestamp}}"
    }`,
    variables: ['metric', 'currentValue', 'threshold', 'severity', 'timestamp'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'backup_status_in_app',
    type: 'system',
    channel: 'in_app',
    title: '💾 Status do Backup',
    body: 'Backup {{status}}: {{details}}',
    variables: ['status', 'details'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  ];
}
