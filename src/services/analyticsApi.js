/**
 * 📊 Analytics API Service - Hub Control
 * 
 * Serviço para comunicação com a API de analytics,
 * incluindo métricas, relatórios e eventos.
 */

import axios from 'axios';
import { getAuthToken } from './auth';
import { handleApiError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

// ============================================================================
// 🔧 CONFIGURAÇÃO DA API
// ============================================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const ANALYTICS_ENDPOINT = `${API_BASE_URL}/api/analytics`;

// Configurar interceptors do axios
const apiClient = axios.create({
  baseURL: ANALYTICS_ENDPOINT,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token de autenticação
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logger.error('Erro no interceptor de request:', error);
    return Promise.reject(error);
  }
);

// Interceptor para tratamento de respostas
apiClient.interceptors.response.use(
  (response) => {
    // Log de sucesso apenas em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Analytics API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    logger.error('Analytics API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(handleApiError(error));
  }
);

// ============================================================================
// 📊 SERVIÇOS DE MÉTRICAS
// ============================================================================

/**
 * Obtém uma métrica específica
 * @param {string} metricName - Nome da métrica
 * @param {Object} options - Opções de consulta
 * @returns {Promise<Object>} Dados da métrica
 */
export const getMetric = async (metricName, options = {}) => {
  try {
    const params = {
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
      dimensions: options.dimensions ? JSON.stringify(options.dimensions) : undefined
    };
    
    // Remove parâmetros undefined
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    
    const response = await apiClient.get(`/metrics/${metricName}`, { params });
    return response.data.data;
  } catch (error) {
    logger.error(`Erro ao obter métrica ${metricName}:`, error);
    throw error;
  }
};

/**
 * Obtém múltiplas métricas
 * @param {string[]} metricNames - Array de nomes das métricas
 * @param {Object} options - Opções de consulta
 * @returns {Promise<Object>} Dados das métricas
 */
export const getMetrics = async (metricNames, options = {}) => {
  try {
    const params = {
      metrics: metricNames.join(','),
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
      groupBy: options.groupBy
    };
    
    // Remove parâmetros undefined
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    
    const response = await apiClient.get('/metrics', { params });
    return response.data.data;
  } catch (error) {
    logger.error('Erro ao obter múltiplas métricas:', error);
    throw error;
  }
};

/**
 * Obtém métricas em tempo real
 * @returns {Promise<Object>} Métricas em tempo real
 */
export const getRealtimeMetrics = async () => {
  try {
    const response = await apiClient.get('/metrics/realtime');
    return response.data.data;
  } catch (error) {
    logger.error('Erro ao obter métricas em tempo real:', error);
    throw error;
  }
};

// ============================================================================
// 📈 SERVIÇOS DE RELATÓRIOS
// ============================================================================

/**
 * Obtém dados de um dashboard específico
 * @param {string} dashboardName - Nome do dashboard (executive, operational, financial)
 * @param {string} period - Período (1h, 24h, 7d, 30d, 90d)
 * @returns {Promise<Object>} Dados do dashboard
 */
export const getDashboard = async (dashboardName, period = '24h') => {
  try {
    const response = await apiClient.get(`/reports/dashboard/${dashboardName}`, {
      params: { period }
    });
    return response.data.data;
  } catch (error) {
    logger.error(`Erro ao obter dashboard ${dashboardName}:`, error);
    throw error;
  }
};

/**
 * Obtém relatório de comportamento do usuário
 * @param {Object} options - Opções do relatório
 * @returns {Promise<Object>} Relatório de comportamento
 */
export const getUserBehaviorReport = async (options = {}) => {
  try {
    const params = {
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
      userId: options.userId
    };
    
    // Remove parâmetros undefined
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    
    const response = await apiClient.get('/reports/user-behavior', { params });
    return response.data.data;
  } catch (error) {
    logger.error('Erro ao obter relatório de comportamento:', error);
    throw error;
  }
};

/**
 * Obtém relatório financeiro
 * @param {Object} options - Opções do relatório
 * @returns {Promise<Object>} Relatório financeiro
 */
export const getFinancialReport = async (options = {}) => {
  try {
    const params = {
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString(),
      groupBy: options.groupBy || 'day'
    };
    
    // Remove parâmetros undefined
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    
    const response = await apiClient.get('/reports/financial', { params });
    return response.data.data;
  } catch (error) {
    logger.error('Erro ao obter relatório financeiro:', error);
    throw error;
  }
};

/**
 * Obtém relatório de performance
 * @param {Object} options - Opções do relatório
 * @returns {Promise<Object>} Relatório de performance
 */
export const getPerformanceReport = async (options = {}) => {
  try {
    const params = {
      startDate: options.startDate?.toISOString(),
      endDate: options.endDate?.toISOString()
    };
    
    // Remove parâmetros undefined
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    
    const response = await apiClient.get('/reports/performance', { params });
    return response.data.data;
  } catch (error) {
    logger.error('Erro ao obter relatório de performance:', error);
    throw error;
  }
};

/**
 * Exporta relatório em PDF
 * @param {string} dashboardName - Nome do dashboard
 * @param {string} period - Período
 * @param {string} format - Formato (pdf, excel, csv)
 * @returns {Promise<Blob>} Arquivo do relatório
 */
export const exportReport = async (dashboardName, period = '24h', format = 'pdf') => {
  try {
    const response = await apiClient.get(`/reports/export/${dashboardName}`, {
      params: { period, format },
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    logger.error('Erro ao exportar relatório:', error);
    throw error;
  }
};

// ============================================================================
// 📝 SERVIÇOS DE EVENTOS
// ============================================================================

/**
 * Registra um evento customizado
 * @param {string} eventName - Nome do evento
 * @param {Object} properties - Propriedades do evento
 * @param {string} userId - ID do usuário (opcional)
 * @returns {Promise<Object>} Resposta da API
 */
export const trackEvent = async (eventName, properties = {}, userId = null) => {
  try {
    const payload = {
      eventName,
      properties,
      userId,
      timestamp: new Date().toISOString()
    };
    
    const response = await apiClient.post('/events', payload);
    return response.data;
  } catch (error) {
    logger.error('Erro ao registrar evento:', error);
    throw error;
  }
};

/**
 * Lista eventos recentes
 * @param {Object} options - Opções de consulta
 * @returns {Promise<Array>} Lista de eventos
 */
export const getEvents = async (options = {}) => {
  try {
    const params = {
      limit: options.limit || 100,
      eventName: options.eventName,
      userId: options.userId,
      startDate: options.startDate?.toISOString()
    };
    
    // Remove parâmetros undefined
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key];
      }
    });
    
    const response = await apiClient.get('/events', { params });
    return response.data.data;
  } catch (error) {
    logger.error('Erro ao listar eventos:', error);
    throw error;
  }
};

// ============================================================================
// ⚙️ SERVIÇOS DE CONFIGURAÇÃO
// ============================================================================

/**
 * Obtém configuração atual do analytics
 * @returns {Promise<Object>} Configuração do analytics
 */
export const getAnalyticsConfig = async () => {
  try {
    const response = await apiClient.get('/config');
    return response.data.data;
  } catch (error) {
    logger.error('Erro ao obter configuração do analytics:', error);
    throw error;
  }
};

/**
 * Verifica saúde do sistema de analytics
 * @returns {Promise<Object>} Status de saúde
 */
export const getAnalyticsHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data.data;
  } catch (error) {
    logger.error('Erro ao verificar saúde do analytics:', error);
    throw error;
  }
};

// ============================================================================
// 🎯 EVENTOS PRÉ-DEFINIDOS
// ============================================================================

/**
 * Eventos comuns do sistema
 */
export const trackPageView = async (page, properties = {}) => {
  return trackEvent('page_view', {
    page,
    url: window.location.href,
    referrer: document.referrer,
    ...properties
  });
};

export const trackUserAction = async (action, target, properties = {}) => {
  return trackEvent('user_action', {
    action,
    target,
    timestamp: new Date().toISOString(),
    ...properties
  });
};

export const trackTransaction = async (transactionData) => {
  return trackEvent('transaction', {
    transactionId: transactionData.id,
    amount: transactionData.amount,
    currency: transactionData.currency || 'BRL',
    method: transactionData.method,
    status: transactionData.status,
    timestamp: new Date().toISOString()
  });
};

export const trackError = async (error, context = {}) => {
  return trackEvent('error', {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    ...context
  });
};

export const trackFeatureUsage = async (feature, action, properties = {}) => {
  return trackEvent('feature_usage', {
    feature,
    action,
    timestamp: new Date().toISOString(),
    ...properties
  });
};

// ============================================================================
// 🔄 UTILITÁRIOS
// ============================================================================

/**
 * Converte período em datas
 * @param {string} period - Período (1h, 24h, 7d, 30d, 90d)
 * @returns {Object} Objeto com startDate e endDate
 */
export const getPeriodDates = (period) => {
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
  
  return { startDate: start, endDate: end };
};

/**
 * Agrupa métricas por período
 * @param {Array} data - Dados das métricas
 * @param {string} groupBy - Agrupamento (hour, day, week, month)
 * @returns {Array} Dados agrupados
 */
export const groupMetricsByPeriod = (data, groupBy) => {
  if (!Array.isArray(data)) return [];
  
  const grouped = {};
  
  data.forEach(item => {
    const date = new Date(item.timestamp || item.created_at);
    let key;
    
    switch (groupBy) {
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = `${weekStart.getFullYear()}-${weekStart.getMonth() + 1}-${weekStart.getDate()}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return Object.entries(grouped).map(([key, items]) => ({
    period: key,
    count: items.length,
    items
  }));
};

/**
 * Calcula tendência entre dois períodos
 * @param {number} current - Valor atual
 * @param {number} previous - Valor anterior
 * @returns {Object} Objeto com direção e percentual
 */
export const calculateTrend = (current, previous) => {
  if (previous === 0) {
    return {
      direction: current > 0 ? 'up' : 'neutral',
      percentage: current > 0 ? 100 : 0
    };
  }
  
  const change = ((current - previous) / previous) * 100;
  
  return {
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
    percentage: Math.abs(change)
  };
};

// ============================================================================
// 📊 OBJETO PRINCIPAL DA API
// ============================================================================

export const analyticsApi = {
  // Métricas
  getMetric,
  getMetrics,
  getRealtimeMetrics,
  
  // Relatórios
  getDashboard,
  getUserBehaviorReport,
  getFinancialReport,
  getPerformanceReport,
  exportReport,
  
  // Eventos
  trackEvent,
  getEvents,
  
  // Eventos pré-definidos
  trackPageView,
  trackUserAction,
  trackTransaction,
  trackError,
  trackFeatureUsage,
  
  // Configuração
  getAnalyticsConfig,
  getAnalyticsHealth,
  
  // Utilitários
  getPeriodDates,
  groupMetricsByPeriod,
  calculateTrend
};

export default analyticsApi;

/**
 * Exemplo de uso:
 * 
 * import { analyticsApi } from './services/analyticsApi';
 * 
 * // Obter dashboard executivo
 * const dashboard = await analyticsApi.getDashboard('executive', '30d');
 * 
 * // Registrar evento
 * await analyticsApi.trackPageView('/dashboard');
 * 
 * // Obter métricas em tempo real
 * const realtime = await analyticsApi.getRealtimeMetrics();
 * 
 * // Exportar relatório
 * const blob = await analyticsApi.exportReport('financial', '30d', 'pdf');
 */