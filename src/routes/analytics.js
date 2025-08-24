/**
 * 📊 Rotas de Analytics - Hub Control
 * 
 * API para consulta de métricas, geração de relatórios
 * e configuração de dashboards de analytics.
 */

const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, query, param } = require('express-validator');
const logger = require('../utils/logger');
const db = require('../config/database');

// ============================================================================
// 🔒 MIDDLEWARES DE AUTENTICAÇÃO
// ============================================================================

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas administrativas requerem role admin
const requireAdmin = requireRole(['admin', 'analytics']);

// ============================================================================
// 📊 ROTAS DE MÉTRICAS
// ============================================================================

/**
 * GET /api/analytics/metrics/:metricName
 * Obtém valor de uma métrica específica
 */
router.get('/metrics/:metricName',
  param('metricName').isString().notEmpty(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('dimensions').optional().isJSON(),
  validateRequest,
  async (req, res) => {
    try {
      const { metricName } = req.params;
      const { startDate, endDate, dimensions } = req.query;
      
      // Definir período padrão (últimas 24h)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
      
      // Parse dimensions se fornecido
      const parsedDimensions = dimensions ? JSON.parse(dimensions) : {};
      
      const metric = await analyticsService.calculateMetrics(
        metricName,
        start,
        end,
        parsedDimensions
      );
      
      res.json({
        success: true,
        data: metric
      });
      
    } catch (error) {
      logger.error('Erro ao obter métrica:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/analytics/metrics
 * Obtém múltiplas métricas
 */
router.get('/metrics',
  query('metrics').isString().notEmpty(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('groupBy').optional().isString(),
  validateRequest,
  async (req, res) => {
    try {
      const { metrics, startDate, endDate, groupBy } = req.query;
      const metricNames = metrics.split(',');
      
      // Definir período padrão
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
      
      const results = {};
      
      for (const metricName of metricNames) {
        try {
          results[metricName] = await analyticsService.calculateMetrics(
            metricName.trim(),
            start,
            end
          );
        } catch (error) {
          results[metricName] = {
            error: error.message
          };
        }
      }
      
      res.json({
        success: true,
        data: results,
        period: { start, end }
      });
      
    } catch (error) {
      logger.error('Erro ao obter métricas:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/analytics/metrics/realtime
 * Métricas em tempo real
 */
router.get('/metrics/realtime', async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const realtimeMetrics = {
      activeUsers: await getActiveUsers(15), // últimos 15 minutos
      currentSessions: await getCurrentSessions(),
      recentTransactions: await getRecentTransactions(60), // última hora
      systemHealth: await getSystemHealth(),
      errorRate: await analyticsService.calculateMetrics(
        'error_rate',
        oneHourAgo,
        now
      )
    };
    
    res.json({
      success: true,
      data: realtimeMetrics,
      timestamp: now.toISOString()
    });
    
  } catch (error) {
    logger.error('Erro ao obter métricas em tempo real:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// 📈 ROTAS DE RELATÓRIOS
// ============================================================================

/**
 * GET /api/analytics/reports/dashboard/:dashboardName
 * Obtém dados para um dashboard específico
 */
router.get('/reports/dashboard/:dashboardName',
  param('dashboardName').isIn(['executive', 'operational', 'financial']),
  query('period').optional().isIn(['1h', '24h', '7d', '30d', '90d']),
  validateRequest,
  async (req, res) => {
    try {
      const { dashboardName } = req.params;
      const { period = '24h' } = req.query;
      
      const dashboardData = await generateDashboardData(dashboardName, period);
      
      res.json({
        success: true,
        data: dashboardData
      });
      
    } catch (error) {
      logger.error('Erro ao gerar dashboard:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/analytics/reports/user-behavior
 * Relatório de comportamento do usuário
 */
router.get('/reports/user-behavior',
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('userId').optional().isString(),
  validateRequest,
  async (req, res) => {
    try {
      const { startDate, endDate, userId } = req.query;
      
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const report = await generateUserBehaviorReport(start, end, userId);
      
      res.json({
        success: true,
        data: report
      });
      
    } catch (error) {
      logger.error('Erro ao gerar relatório de comportamento:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/analytics/reports/financial
 * Relatório financeiro
 */
router.get('/reports/financial',
  requireAdmin,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('groupBy').optional().isIn(['day', 'week', 'month']),
  validateRequest,
  async (req, res) => {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const report = await generateFinancialReport(start, end, groupBy);
      
      res.json({
        success: true,
        data: report
      });
      
    } catch (error) {
      logger.error('Erro ao gerar relatório financeiro:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/analytics/reports/performance
 * Relatório de performance do sistema
 */
router.get('/reports/performance',
  requireAdmin,
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  validateRequest,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 24 * 60 * 60 * 1000);
      
      const report = await generatePerformanceReport(start, end);
      
      res.json({
        success: true,
        data: report
      });
      
    } catch (error) {
      logger.error('Erro ao gerar relatório de performance:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ============================================================================
// 📊 ROTAS DE EVENTOS
// ============================================================================

/**
 * POST /api/analytics/events
 * Registra um evento customizado
 */
router.post('/events',
  body('eventName').isString().notEmpty(),
  body('properties').optional().isObject(),
  body('userId').optional().isString(),
  validateRequest,
  async (req, res) => {
    try {
      const { eventName, properties = {}, userId } = req.body;
      
      await analyticsService.track(eventName, {
        ...properties,
        userId: userId || req.user.id
      }, {
        sessionId: req.session?.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      res.json({
        success: true,
        message: 'Evento registrado com sucesso'
      });
      
    } catch (error) {
      logger.error('Erro ao registrar evento:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/analytics/events
 * Lista eventos recentes
 */
router.get('/events',
  requireAdmin,
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('eventName').optional().isString(),
  query('userId').optional().isString(),
  query('startDate').optional().isISO8601(),
  validateRequest,
  async (req, res) => {
    try {
      const {
        limit = 100,
        eventName,
        userId,
        startDate
      } = req.query;
      
      const events = await getEvents({
        limit: parseInt(limit),
        eventName,
        userId,
        startDate: startDate ? new Date(startDate) : null
      });
      
      res.json({
        success: true,
        data: events
      });
      
    } catch (error) {
      logger.error('Erro ao listar eventos:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ============================================================================
// 🔧 ROTAS DE CONFIGURAÇÃO
// ============================================================================

/**
 * GET /api/analytics/config
 * Obtém configuração atual do analytics
 */
router.get('/config', requireAdmin, (req, res) => {
  const { analyticsConfig } = require('../../config/analytics');
  
  res.json({
    success: true,
    data: {
      enabled: analyticsConfig.enabled,
      environment: analyticsConfig.environment,
      retention: analyticsConfig.retention,
      integrations: Object.keys(analyticsConfig.integrations).reduce((acc, key) => {
        acc[key] = {
          enabled: analyticsConfig.integrations[key].enabled
        };
        return acc;
      }, {})
    }
  });
});

/**
 * GET /api/analytics/health
 * Verifica saúde do sistema de analytics
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: await checkDatabaseHealth(),
        eventQueue: await checkEventQueueHealth(),
        integrations: await checkIntegrationsHealth()
      }
    };
    
    // Determinar status geral
    const hasUnhealthy = Object.values(health.checks).some(check => check.status !== 'healthy');
    if (hasUnhealthy) {
      health.status = 'degraded';
    }
    
    res.json({
      success: true,
      data: health
    });
    
  } catch (error) {
    logger.error('Erro ao verificar saúde do analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// ============================================================================
// 🛠️ FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Gera dados para dashboard específico
 */
async function generateDashboardData(dashboardName, period) {
  const { analyticsConfig } = require('../../config/analytics');
  const dashboardConfig = analyticsConfig.dashboards[dashboardName];
  
  if (!dashboardConfig) {
    throw new Error(`Dashboard não encontrado: ${dashboardName}`);
  }
  
  const { start, end } = getPeriodDates(period);
  const widgets = [];
  
  for (const widget of dashboardConfig.widgets) {
    try {
      const widgetData = await generateWidgetData(widget, start, end);
      widgets.push({
        ...widget,
        data: widgetData
      });
    } catch (error) {
      logger.error(`Erro ao gerar widget ${widget.title}:`, error);
      widgets.push({
        ...widget,
        error: error.message
      });
    }
  }
  
  return {
    name: dashboardConfig.name,
    description: dashboardConfig.description,
    period: { start, end },
    widgets,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Gera dados para um widget específico
 */
async function generateWidgetData(widget, start, end) {
  switch (widget.type) {
    case 'metric_card':
      const metric = await analyticsService.calculateMetrics(widget.metric, start, end);
      return {
        value: metric.value,
        format: widget.format || 'number'
      };
      
    case 'line_chart':
    case 'bar_chart':
      return await generateChartData(widget, start, end);
      
    case 'pie_chart':
      return await generatePieChartData(widget, start, end);
      
    default:
      throw new Error(`Tipo de widget não suportado: ${widget.type}`);
  }
}

/**
 * Gera dados para gráficos de linha/barra
 */
async function generateChartData(widget, start, end) {
  // Implementar lógica para gerar dados de gráfico
  // baseado na métrica e período
  return {
    labels: [],
    datasets: []
  };
}

/**
 * Gera dados para gráfico de pizza
 */
async function generatePieChartData(widget, start, end) {
  // Implementar lógica para gerar dados de pizza
  return {
    labels: [],
    data: []
  };
}

/**
 * Obtém usuários ativos nos últimos X minutos
 */
async function getActiveUsers(minutes) {
  const query = `
    SELECT COUNT(DISTINCT user_id) as count
    FROM analytics_events
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
    AND user_id IS NOT NULL
  `;
  
  const result = await db.query(query, [minutes]);
  return result[0]?.count || 0;
}

/**
 * Obtém sessões ativas atuais
 */
async function getCurrentSessions() {
  const query = `
    SELECT COUNT(*) as count
    FROM analytics_sessions
    WHERE ended_at IS NULL
    AND started_at >= DATE_SUB(NOW(), INTERVAL 30 MINUTE)
  `;
  
  const result = await db.query(query);
  return result[0]?.count || 0;
}

/**
 * Obtém transações recentes
 */
async function getRecentTransactions(minutes) {
  const query = `
    SELECT COUNT(*) as count
    FROM analytics_events
    WHERE event_name = 'transaction_completed'
    AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
  `;
  
  const result = await db.query(query, [minutes]);
  return result[0]?.count || 0;
}

/**
 * Verifica saúde do sistema
 */
async function getSystemHealth() {
  // Implementar verificação de saúde do sistema
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };
}

/**
 * Gera relatório de comportamento do usuário
 */
async function generateUserBehaviorReport(start, end, userId) {
  // Implementar geração de relatório de comportamento
  return {
    period: { start, end },
    userId,
    summary: {},
    events: [],
    sessions: []
  };
}

/**
 * Gera relatório financeiro
 */
async function generateFinancialReport(start, end, groupBy) {
  // Implementar geração de relatório financeiro
  return {
    period: { start, end },
    groupBy,
    summary: {},
    transactions: [],
    trends: []
  };
}

/**
 * Gera relatório de performance
 */
async function generatePerformanceReport(start, end) {
  // Implementar geração de relatório de performance
  return {
    period: { start, end },
    summary: {},
    metrics: [],
    alerts: []
  };
}

/**
 * Lista eventos com filtros
 */
async function getEvents(filters) {
  let query = 'SELECT * FROM analytics_events WHERE 1=1';
  const params = [];
  
  if (filters.eventName) {
    query += ' AND event_name = ?';
    params.push(filters.eventName);
  }
  
  if (filters.userId) {
    query += ' AND user_id = ?';
    params.push(filters.userId);
  }
  
  if (filters.startDate) {
    query += ' AND created_at >= ?';
    params.push(filters.startDate);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(filters.limit);
  
  return await db.query(query, params);
}

/**
 * Converte período em datas
 */
function getPeriodDates(period) {
  const end = new Date();
  let start;
  
  switch (period) {
    case '1h':
      start = new Date(end.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return { start, end };
}

/**
 * Verifica saúde do banco de dados
 */
async function checkDatabaseHealth() {
  try {
    await db.query('SELECT 1');
    return { status: 'healthy', message: 'Database connection OK' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

/**
 * Verifica saúde da fila de eventos
 */
async function checkEventQueueHealth() {
  try {
    // Verificar se o serviço de analytics está funcionando
    const queueSize = analyticsService.eventQueue?.length || 0;
    
    return {
      status: queueSize < 1000 ? 'healthy' : 'degraded',
      message: `Queue size: ${queueSize}`,
      queueSize
    };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

/**
 * Verifica saúde das integrações
 */
async function checkIntegrationsHealth() {
  const { analyticsConfig } = require('../../config/analytics');
  const integrations = {};
  
  for (const [name, config] of Object.entries(analyticsConfig.integrations)) {
    integrations[name] = {
      enabled: config.enabled,
      status: config.enabled ? 'healthy' : 'disabled'
    };
  }
  
  return integrations;
}

module.exports = router;

/**
 * Exemplo de uso:
 * 
 * // Obter métrica específica
 * GET /api/analytics/metrics/daily_active_users?startDate=2024-01-01&endDate=2024-01-02
 * 
 * // Obter múltiplas métricas
 * GET /api/analytics/metrics?metrics=daily_active_users,transaction_volume&period=7d
 * 
 * // Dashboard executivo
 * GET /api/analytics/reports/dashboard/executive?period=30d
 * 
 * // Registrar evento customizado
 * POST /api/analytics/events
 * {
 *   "eventName": "feature_usage",
 *   "properties": {
 *     "feature": "export_report",
 *     "action": "click"
 *   }
 * }
 */