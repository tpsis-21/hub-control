/**
 * API para gerenciamento de alertas
 * Permite criar, atualizar, reconhecer e resolver alertas
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '../../../lib/logger';
import { alertManager, AlertRule, Alert } from '../../../lib/alerts';

interface AlertsApiRequest extends NextApiRequest {
  body: {
    action?: 'acknowledge' | 'resolve' | 'create_rule' | 'update_rule' | 'delete_rule';
    alertId?: string;
    ruleId?: string;
    acknowledgedBy?: string;
    rule?: AlertRule;
  };
}

interface AlertsResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export default async function handler(req: AlertsApiRequest, res: NextApiResponse<AlertsResponse>) {
  const requestLogger = logger.withContext({
    requestId: Math.random().toString(36).substring(7),
    ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    url: req.url,
    method: req.method,
  });

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetAlerts(req, res, requestLogger);
      case 'POST':
        return await handlePostAlerts(req, res, requestLogger);
      case 'PUT':
        return await handlePutAlerts(req, res, requestLogger);
      case 'DELETE':
        return await handleDeleteAlerts(req, res, requestLogger);
      default:
        return res.status(405).json({
          success: false,
          error: 'Método não permitido',
        });
    }
  } catch (error) {
    requestLogger.error('Erro na API de alertas', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Falha ao processar solicitação de alertas',
    });
  }
}

// GET - Listar alertas e regras
async function handleGetAlerts(
  req: AlertsApiRequest,
  res: NextApiResponse<AlertsResponse>,
  requestLogger: any
) {
  const { type, status, severity, limit } = req.query;

  requestLogger.info('Solicitação de listagem de alertas', {
    type,
    status,
    severity,
    limit,
  });

  try {
    if (type === 'rules') {
      // Listar regras de alerta
      const rules = alertManager['config'].rules;
      
      requestLogger.info('Regras de alerta listadas', {
        count: rules.length,
      });

      return res.status(200).json({
        success: true,
        data: {
          rules,
          total: rules.length,
        },
      });
    }

    if (type === 'history') {
      // Listar histórico de alertas
      const limitNum = limit ? parseInt(limit as string) : 100;
      const history = alertManager.getAlertHistory(limitNum);
      
      let filteredHistory = history;
      
      if (status) {
        filteredHistory = filteredHistory.filter(alert => alert.status === status);
      }
      
      if (severity) {
        filteredHistory = filteredHistory.filter(alert => alert.severity === severity);
      }

      requestLogger.info('Histórico de alertas listado', {
        total: history.length,
        filtered: filteredHistory.length,
      });

      return res.status(200).json({
        success: true,
        data: {
          alerts: filteredHistory,
          total: filteredHistory.length,
        },
      });
    }

    // Listar alertas ativos (padrão)
    let activeAlerts = alertManager.getActiveAlerts();
    
    if (status) {
      activeAlerts = activeAlerts.filter(alert => alert.status === status);
    }
    
    if (severity) {
      activeAlerts = activeAlerts.filter(alert => alert.severity === severity);
    }

    // Estatísticas dos alertas
    const stats = {
      total: activeAlerts.length,
      byStatus: {
        active: activeAlerts.filter(a => a.status === 'active').length,
        acknowledged: activeAlerts.filter(a => a.status === 'acknowledged').length,
        resolved: activeAlerts.filter(a => a.status === 'resolved').length,
      },
      bySeverity: {
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        high: activeAlerts.filter(a => a.severity === 'high').length,
        medium: activeAlerts.filter(a => a.severity === 'medium').length,
        low: activeAlerts.filter(a => a.severity === 'low').length,
      },
    };

    requestLogger.info('Alertas ativos listados', stats);

    return res.status(200).json({
      success: true,
      data: {
        alerts: activeAlerts,
        stats,
      },
    });
  } catch (error) {
    requestLogger.error('Erro ao listar alertas', error);
    throw error;
  }
}

// POST - Criar regra de alerta ou ação em alerta
async function handlePostAlerts(
  req: AlertsApiRequest,
  res: NextApiResponse<AlertsResponse>,
  requestLogger: any
) {
  const { action, alertId, acknowledgedBy, rule } = req.body;

  requestLogger.info('Ação em alerta solicitada', {
    action,
    alertId,
    acknowledgedBy,
    ruleId: rule?.id,
  });

  try {
    switch (action) {
      case 'acknowledge':
        if (!alertId || !acknowledgedBy) {
          return res.status(400).json({
            success: false,
            error: 'Parâmetros obrigatórios: alertId, acknowledgedBy',
          });
        }

        alertManager.acknowledgeAlert(alertId, acknowledgedBy);
        
        requestLogger.info('Alerta reconhecido', {
          alertId,
          acknowledgedBy,
        });

        return res.status(200).json({
          success: true,
          message: 'Alerta reconhecido com sucesso',
        });

      case 'resolve':
        if (!alertId) {
          return res.status(400).json({
            success: false,
            error: 'Parâmetro obrigatório: alertId',
          });
        }

        alertManager.resolveAlert(alertId);
        
        requestLogger.info('Alerta resolvido', { alertId });

        return res.status(200).json({
          success: true,
          message: 'Alerta resolvido com sucesso',
        });

      case 'create_rule':
        if (!rule) {
          return res.status(400).json({
            success: false,
            error: 'Parâmetro obrigatório: rule',
          });
        }

        // Validar regra
        const validationError = validateAlertRule(rule);
        if (validationError) {
          return res.status(400).json({
            success: false,
            error: validationError,
          });
        }

        alertManager.addRule(rule);
        
        requestLogger.info('Regra de alerta criada', {
          ruleId: rule.id,
          ruleName: rule.name,
        });

        return res.status(201).json({
          success: true,
          message: 'Regra de alerta criada com sucesso',
          data: { rule },
        });

      default:
        return res.status(400).json({
          success: false,
          error: 'Ação não reconhecida',
        });
    }
  } catch (error) {
    requestLogger.error('Erro ao processar ação em alerta', error);
    throw error;
  }
}

// PUT - Atualizar regra de alerta
async function handlePutAlerts(
  req: AlertsApiRequest,
  res: NextApiResponse<AlertsResponse>,
  requestLogger: any
) {
  const { ruleId } = req.query;
  const { rule } = req.body;

  if (!ruleId || !rule) {
    return res.status(400).json({
      success: false,
      error: 'Parâmetros obrigatórios: ruleId, rule',
    });
  }

  requestLogger.info('Atualização de regra de alerta solicitada', {
    ruleId,
    ruleName: rule.name,
  });

  try {
    // Validar regra
    const validationError = validateAlertRule(rule);
    if (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError,
      });
    }

    // Garantir que o ID da regra corresponde
    rule.id = ruleId as string;

    alertManager.addRule(rule);
    
    requestLogger.info('Regra de alerta atualizada', {
      ruleId: rule.id,
      ruleName: rule.name,
    });

    return res.status(200).json({
      success: true,
      message: 'Regra de alerta atualizada com sucesso',
      data: { rule },
    });
  } catch (error) {
    requestLogger.error('Erro ao atualizar regra de alerta', error);
    throw error;
  }
}

// DELETE - Remover regra de alerta
async function handleDeleteAlerts(
  req: AlertsApiRequest,
  res: NextApiResponse<AlertsResponse>,
  requestLogger: any
) {
  const { ruleId } = req.query;

  if (!ruleId) {
    return res.status(400).json({
      success: false,
      error: 'Parâmetro obrigatório: ruleId',
    });
  }

  requestLogger.info('Remoção de regra de alerta solicitada', { ruleId });

  try {
    alertManager.removeRule(ruleId as string);
    
    requestLogger.info('Regra de alerta removida', { ruleId });

    return res.status(200).json({
      success: true,
      message: 'Regra de alerta removida com sucesso',
    });
  } catch (error) {
    requestLogger.error('Erro ao remover regra de alerta', error);
    throw error;
  }
}

// Função para validar regra de alerta
function validateAlertRule(rule: AlertRule): string | null {
  if (!rule.id || typeof rule.id !== 'string') {
    return 'ID da regra é obrigatório e deve ser uma string';
  }

  if (!rule.name || typeof rule.name !== 'string') {
    return 'Nome da regra é obrigatório e deve ser uma string';
  }

  if (!rule.description || typeof rule.description !== 'string') {
    return 'Descrição da regra é obrigatória e deve ser uma string';
  }

  if (!['low', 'medium', 'high', 'critical'].includes(rule.severity)) {
    return 'Severidade deve ser: low, medium, high ou critical';
  }

  if (typeof rule.enabled !== 'boolean') {
    return 'Campo enabled deve ser um boolean';
  }

  if (typeof rule.condition !== 'function') {
    return 'Condição deve ser uma função';
  }

  if (!Array.isArray(rule.channels) || rule.channels.length === 0) {
    return 'Canais devem ser um array não vazio';
  }

  const validChannels = ['email', 'slack', 'webhook', 'sms'];
  for (const channel of rule.channels) {
    if (!validChannels.includes(channel)) {
      return `Canal inválido: ${channel}. Canais válidos: ${validChannels.join(', ')}`;
    }
  }

  if (!Array.isArray(rule.tags)) {
    return 'Tags devem ser um array';
  }

  if (rule.threshold !== undefined && typeof rule.threshold !== 'number') {
    return 'Threshold deve ser um número';
  }

  if (rule.timeWindow !== undefined && (typeof rule.timeWindow !== 'number' || rule.timeWindow <= 0)) {
    return 'Time window deve ser um número positivo';
  }

  if (rule.cooldown !== undefined && (typeof rule.cooldown !== 'number' || rule.cooldown <= 0)) {
    return 'Cooldown deve ser um número positivo';
  }

  return null;
}

// Função para criar regras de exemplo
export function createExampleRules(): AlertRule[] {
  return [
    {
      id: 'custom_high_memory',
      name: 'Uso crítico de memória',
      description: 'Uso de memória acima de 95%',
      severity: 'critical',
      enabled: true,
      condition: (metrics) => metrics.system?.memory?.usage > 95,
      threshold: 95,
      timeWindow: 2,
      cooldown: 5,
      channels: ['slack', 'email', 'sms'],
      tags: ['system', 'memory', 'critical'],
    },
    {
      id: 'custom_api_errors',
      name: 'Alta taxa de erros de API',
      description: 'Taxa de erros de API acima de 10%',
      severity: 'high',
      enabled: true,
      condition: (metrics) => {
        const requests = metrics.application?.requests;
        if (!requests?.total || requests.total === 0) return false;
        return (requests.errors / requests.total) * 100 > 10;
      },
      threshold: 10,
      timeWindow: 5,
      cooldown: 10,
      channels: ['slack', 'email'],
      tags: ['api', 'errors', 'application'],
    },
    {
      id: 'custom_bpix_failures',
      name: 'Falhas na integração BPIX',
      description: 'Múltiplas falhas detectadas na integração BPIX',
      severity: 'high',
      enabled: true,
      condition: (metrics) => {
        const bpix = metrics.application?.bpix;
        return bpix?.errors > 5 || bpix?.apiCalls?.failed > 10;
      },
      timeWindow: 10,
      cooldown: 15,
      channels: ['slack', 'email'],
      tags: ['bpix', 'integration', 'payment'],
    },
    {
      id: 'custom_slow_database',
      name: 'Consultas lentas no banco',
      description: 'Tempo médio de consulta muito alto',
      severity: 'medium',
      enabled: true,
      condition: (metrics) => metrics.application?.database?.averageQueryTime > 2000,
      threshold: 2000,
      timeWindow: 15,
      cooldown: 30,
      channels: ['slack'],
      tags: ['database', 'performance'],
    },
  ];
}