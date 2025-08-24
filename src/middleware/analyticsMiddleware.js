/**
 * 🔍 Middleware de Analytics - Hub Control
 * 
 * Captura automaticamente eventos de analytics das requisições HTTP,
 * incluindo métricas de performance, erros e comportamento do usuário.
 */

const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Middleware principal de analytics
 */
function analyticsMiddleware(options = {}) {
  const config = {
    trackPageViews: true,
    trackApiCalls: true,
    trackErrors: true,
    trackPerformance: true,
    excludePaths: ['/health', '/metrics', '/favicon.ico'],
    sensitiveParams: ['password', 'token', 'secret', 'key'],
    ...options
  };
  
  return (req, res, next) => {
    // Pular caminhos excluídos
    if (config.excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // Inicializar contexto de analytics
    req.analytics = {
      sessionId: req.session?.id || req.headers['x-session-id'] || uuidv4(),
      userId: req.user?.id || req.headers['x-user-id'],
      startTime: Date.now(),
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || req.headers.referrer
    };
    
    // Interceptar resposta para capturar métricas
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data) {
      captureResponseMetrics(req, res, data, config);
      return originalSend.call(this, data);
    };
    
    res.json = function(data) {
      captureResponseMetrics(req, res, data, config);
      return originalJson.call(this, data);
    };
    
    // Capturar eventos baseados no tipo de requisição
    if (config.trackPageViews && isPageRequest(req)) {
      trackPageView(req);
    }
    
    if (config.trackApiCalls && isApiRequest(req)) {
      trackApiCall(req);
    }
    
    next();
  };
}

/**
 * Middleware específico para tracking de erros
 */
function errorTrackingMiddleware(err, req, res, next) {
  // Registrar erro no analytics
  if (req.analytics) {
    analyticsService.trackSystemEvent('error', {
      errorType: err.name || 'UnknownError',
      errorMessage: err.message,
      stackTrace: err.stack,
      endpoint: req.path,
      method: req.method,
      statusCode: err.status || 500,
      userId: req.analytics.userId
    }, {
      sessionId: req.analytics.sessionId,
      ipAddress: req.analytics.ipAddress,
      userAgent: req.analytics.userAgent
    }).catch(analyticsError => {
      logger.error('Erro ao registrar analytics de erro:', analyticsError);
    });
  }
  
  next(err);
}

/**
 * Middleware para tracking de autenticação
 */
function authTrackingMiddleware(req, res, next) {
  // Interceptar eventos de login/logout
  const originalRedirect = res.redirect;
  const originalJson = res.json;
  
  res.redirect = function(url) {
    // Detectar logout por redirecionamento
    if (url.includes('/login') || url.includes('/logout')) {
      trackAuthEvent(req, 'logout');
    }
    return originalRedirect.call(this, url);
  };
  
  res.json = function(data) {
    // Detectar login/logout por resposta JSON
    if (data && typeof data === 'object') {
      if (data.token || data.accessToken) {
        trackAuthEvent(req, 'login', { success: true, method: 'api' });
      } else if (data.error && req.path.includes('/login')) {
        trackAuthEvent(req, 'login', { success: false, error: data.error });
      }
    }
    return originalJson.call(this, data);
  };
  
  next();
}

/**
 * Middleware para tracking de transações
 */
function transactionTrackingMiddleware(req, res, next) {
  // Interceptar rotas de transação
  if (isTransactionRoute(req)) {
    const originalJson = res.json;
    
    res.json = function(data) {
      trackTransactionEvent(req, res, data);
      return originalJson.call(this, data);
    };
  }
  
  next();
}

// ============================================================================
// 🔍 FUNÇÕES DE TRACKING
// ============================================================================

/**
 * Registra visualização de página
 */
async function trackPageView(req) {
  try {
    await analyticsService.trackPageView(req.path, {
      title: req.headers['x-page-title'],
      referrer: req.analytics.referrer,
      sessionId: req.analytics.sessionId,
      userId: req.analytics.userId,
      ipAddress: req.analytics.ipAddress,
      userAgent: req.analytics.userAgent,
      metadata: {
        query: sanitizeQuery(req.query),
        utm: extractUTMParams(req.query)
      }
    });
  } catch (error) {
    logger.error('Erro ao registrar page view:', error);
  }
}

/**
 * Registra chamada de API
 */
async function trackApiCall(req) {
  try {
    await analyticsService.track('api_call', {
      endpoint: req.path,
      method: req.method,
      userId: req.analytics.userId,
      parameters: sanitizeParams(req.params),
      query: sanitizeQuery(req.query)
    }, {
      sessionId: req.analytics.sessionId,
      ipAddress: req.analytics.ipAddress,
      userAgent: req.analytics.userAgent
    });
  } catch (error) {
    logger.error('Erro ao registrar API call:', error);
  }
}

/**
 * Registra evento de autenticação
 */
async function trackAuthEvent(req, eventType, properties = {}) {
  try {
    await analyticsService.trackUserEvent(eventType, req.analytics.userId, {
      method: req.body?.method || 'unknown',
      endpoint: req.path,
      ...properties
    }, {
      sessionId: req.analytics.sessionId,
      ipAddress: req.analytics.ipAddress,
      userAgent: req.analytics.userAgent
    });
  } catch (error) {
    logger.error('Erro ao registrar evento de auth:', error);
  }
}

/**
 * Registra evento de transação
 */
async function trackTransactionEvent(req, res, responseData) {
  try {
    const transactionData = extractTransactionData(req, responseData);
    
    if (transactionData) {
      let eventType = 'initiated';
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        eventType = responseData.status === 'completed' ? 'completed' : 'initiated';
      } else {
        eventType = 'failed';
      }
      
      await analyticsService.trackTransaction(eventType, transactionData, {
        sessionId: req.analytics.sessionId,
        ipAddress: req.analytics.ipAddress,
        userAgent: req.analytics.userAgent
      });
    }
  } catch (error) {
    logger.error('Erro ao registrar evento de transação:', error);
  }
}

/**
 * Captura métricas de resposta
 */
async function captureResponseMetrics(req, res, data, config) {
  try {
    const duration = Date.now() - req.analytics.startTime;
    
    // Registrar métrica de performance
    if (config.trackPerformance) {
      await analyticsService.trackSystemEvent('performance', {
        metric: 'response_time',
        value: duration,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseSize: getResponseSize(data)
      }, {
        sessionId: req.analytics.sessionId,
        userId: req.analytics.userId
      });
    }
    
    // Registrar erro se status code indica falha
    if (config.trackErrors && res.statusCode >= 400) {
      await analyticsService.trackSystemEvent('error', {
        errorType: 'HttpError',
        errorMessage: `HTTP ${res.statusCode}`,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseData: typeof data === 'string' ? data.substring(0, 500) : JSON.stringify(data).substring(0, 500)
      }, {
        sessionId: req.analytics.sessionId,
        userId: req.analytics.userId,
        ipAddress: req.analytics.ipAddress
      });
    }
    
  } catch (error) {
    logger.error('Erro ao capturar métricas de resposta:', error);
  }
}

// ============================================================================
// 🛠️ FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Verifica se é uma requisição de página
 */
function isPageRequest(req) {
  return req.method === 'GET' && 
         (req.headers.accept?.includes('text/html') || 
          req.path.endsWith('.html') ||
          (!req.path.startsWith('/api') && !req.path.includes('.')));
}

/**
 * Verifica se é uma requisição de API
 */
function isApiRequest(req) {
  return req.path.startsWith('/api') || 
         req.headers.accept?.includes('application/json') ||
         req.headers['content-type']?.includes('application/json');
}

/**
 * Verifica se é uma rota de transação
 */
function isTransactionRoute(req) {
  const transactionPaths = ['/api/transactions', '/api/payments', '/api/pix'];
  return transactionPaths.some(path => req.path.startsWith(path));
}

/**
 * Obtém IP do cliente
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip;
}

/**
 * Sanitiza parâmetros removendo dados sensíveis
 */
function sanitizeParams(params, sensitiveKeys = ['password', 'token', 'secret', 'key']) {
  if (!params || typeof params !== 'object') {
    return params;
  }
  
  const sanitized = { ...params };
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Sanitiza query string
 */
function sanitizeQuery(query) {
  return sanitizeParams(query);
}

/**
 * Extrai parâmetros UTM
 */
function extractUTMParams(query) {
  const utmParams = {};
  
  for (const [key, value] of Object.entries(query || {})) {
    if (key.startsWith('utm_')) {
      utmParams[key] = value;
    }
  }
  
  return Object.keys(utmParams).length > 0 ? utmParams : null;
}

/**
 * Extrai dados de transação da requisição/resposta
 */
function extractTransactionData(req, responseData) {
  const transactionData = {
    userId: req.analytics.userId,
    endpoint: req.path,
    method: req.method
  };
  
  // Extrair dados do body da requisição
  if (req.body) {
    transactionData.transactionId = req.body.transactionId || req.body.id;
    transactionData.amount = req.body.amount || req.body.value;
    transactionData.currency = req.body.currency || 'BRL';
    transactionData.method = req.body.paymentMethod || req.body.method;
  }
  
  // Extrair dados da resposta
  if (responseData && typeof responseData === 'object') {
    transactionData.transactionId = transactionData.transactionId || responseData.transactionId || responseData.id;
    transactionData.amount = transactionData.amount || responseData.amount || responseData.value;
    transactionData.status = responseData.status;
    transactionData.errorCode = responseData.errorCode;
    transactionData.errorMessage = responseData.errorMessage || responseData.error;
  }
  
  // Validar se temos dados mínimos necessários
  if (!transactionData.transactionId && !transactionData.amount) {
    return null;
  }
  
  return transactionData;
}

/**
 * Calcula tamanho da resposta
 */
function getResponseSize(data) {
  if (!data) return 0;
  
  if (typeof data === 'string') {
    return Buffer.byteLength(data, 'utf8');
  }
  
  if (typeof data === 'object') {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }
  
  return 0;
}

/**
 * Middleware para inicializar sessão de analytics
 */
function initializeAnalyticsSession(req, res, next) {
  if (!req.session) {
    req.session = {};
  }
  
  if (!req.session.analyticsId) {
    req.session.analyticsId = uuidv4();
  }
  
  // Iniciar sessão no analytics se for nova
  if (!req.session.analyticsStarted) {
    analyticsService.startSession(
      req.session.analyticsId,
      req.user?.id,
      {
        ipAddress: getClientIP(req),
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer,
        utmSource: req.query.utm_source,
        utmMedium: req.query.utm_medium,
        utmCampaign: req.query.utm_campaign
      }
    ).catch(error => {
      logger.error('Erro ao iniciar sessão de analytics:', error);
    });
    
    req.session.analyticsStarted = true;
  }
  
  next();
}

/**
 * Middleware para finalizar sessão de analytics
 */
function finalizeAnalyticsSession(req, res, next) {
  // Finalizar sessão no logout ou timeout
  if (req.session?.analyticsId && (req.path.includes('/logout') || req.session.destroy)) {
    analyticsService.endSession(req.session.analyticsId)
      .catch(error => {
        logger.error('Erro ao finalizar sessão de analytics:', error);
      });
  }
  
  next();
}

module.exports = {
  analyticsMiddleware,
  errorTrackingMiddleware,
  authTrackingMiddleware,
  transactionTrackingMiddleware,
  initializeAnalyticsSession,
  finalizeAnalyticsSession
};

/**
 * Exemplo de uso no app.js:
 * 
 * const {
 *   analyticsMiddleware,
 *   errorTrackingMiddleware,
 *   authTrackingMiddleware,
 *   transactionTrackingMiddleware,
 *   initializeAnalyticsSession
 * } = require('./middleware/analyticsMiddleware');
 * 
 * // Configurar middlewares
 * app.use(initializeAnalyticsSession);
 * app.use(analyticsMiddleware({
 *   trackPageViews: true,
 *   trackApiCalls: true,
 *   excludePaths: ['/health', '/metrics']
 * }));
 * app.use(authTrackingMiddleware);
 * app.use(transactionTrackingMiddleware);
 * 
 * // Middleware de erro deve ser o último
 * app.use(errorTrackingMiddleware);
 */