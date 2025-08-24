/**
 * 📈 Serviço de Analytics - Hub Control
 * 
 * Responsável pela coleta, processamento e envio de eventos de analytics
 * e métricas de negócio para dashboards e relatórios.
 */

const { analyticsConfig, validateEvent, findEventConfig } = require('../../config/analytics');
const logger = require('../utils/logger');
const db = require('../config/database');
const EventEmitter = require('events');

class AnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.eventQueue = [];
    this.isProcessing = false;
    this.flushTimer = null;
    
    // Inicializar serviço se habilitado
    if (analyticsConfig.enabled) {
      this.initialize();
    }
  }
  
  // ============================================================================
  // 🚀 INICIALIZAÇÃO
  // ============================================================================
  
  async initialize() {
    try {
      logger.info('Inicializando serviço de analytics...');
      
      // Criar tabelas se não existirem
      await this.createTables();
      
      // Configurar timer de flush
      this.setupFlushTimer();
      
      // Configurar listeners de eventos
      this.setupEventListeners();
      
      logger.info('Serviço de analytics inicializado com sucesso');
    } catch (error) {
      logger.error('Erro ao inicializar analytics:', error);
      throw error;
    }
  }
  
  async createTables() {
    const createEventsTable = `
      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        event_name VARCHAR(100) NOT NULL,
        event_category VARCHAR(50) NOT NULL,
        user_id VARCHAR(100),
        session_id VARCHAR(100),
        properties JSON,
        metadata JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        referrer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP NULL,
        
        INDEX idx_event_name (event_name),
        INDEX idx_event_category (event_category),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at),
        INDEX idx_processed_at (processed_at)
      )
    `;
    
    const createMetricsTable = `
      CREATE TABLE IF NOT EXISTS analytics_metrics (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        metric_name VARCHAR(100) NOT NULL,
        metric_category VARCHAR(50) NOT NULL,
        value DECIMAL(15,4) NOT NULL,
        dimensions JSON,
        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        aggregation_type ENUM('count', 'sum', 'avg', 'min', 'max', 'distinct') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_metric_period (metric_name, period_start, period_end),
        INDEX idx_metric_name (metric_name),
        INDEX idx_metric_category (metric_category),
        INDEX idx_period (period_start, period_end)
      )
    `;
    
    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS analytics_sessions (
        id VARCHAR(100) PRIMARY KEY,
        user_id VARCHAR(100),
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP NULL,
        duration_seconds INT NULL,
        page_views INT DEFAULT 0,
        events_count INT DEFAULT 0,
        ip_address VARCHAR(45),
        user_agent TEXT,
        referrer TEXT,
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_user_id (user_id),
        INDEX idx_started_at (started_at),
        INDEX idx_ended_at (ended_at)
      )
    `;
    
    await db.query(createEventsTable);
    await db.query(createMetricsTable);
    await db.query(createSessionsTable);
    
    logger.info('Tabelas de analytics criadas/verificadas');
  }
  
  setupFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flushQueue();
    }, analyticsConfig.collection.flushInterval);
  }
  
  setupEventListeners() {
    // Listener para eventos de sistema
    this.on('system_event', (eventData) => {
      this.track(eventData.name, eventData.properties, eventData.context);
    });
    
    // Cleanup ao encerrar aplicação
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }
  
  // ============================================================================
  // 📊 COLETA DE EVENTOS
  // ============================================================================
  
  /**
   * Registra um evento de analytics
   */
  async track(eventName, properties = {}, context = {}) {
    try {
      if (!analyticsConfig.enabled) {
        return;
      }
      
      // Validar evento
      validateEvent(eventName, properties);
      
      // Obter configuração do evento
      const eventConfig = findEventConfig(eventName);
      
      // Preparar dados do evento
      const eventData = {
        event_name: eventName,
        event_category: eventConfig.category,
        user_id: properties.userId || context.userId,
        session_id: context.sessionId,
        properties: this.sanitizeProperties(properties),
        metadata: {
          timestamp: new Date().toISOString(),
          environment: analyticsConfig.environment,
          version: process.env.APP_VERSION || '1.0.0',
          ...context.metadata
        },
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        referrer: context.referrer
      };
      
      // Adicionar à fila
      this.addToQueue(eventData);
      
      // Log em desenvolvimento
      if (analyticsConfig.development.verboseLogging) {
        logger.debug('Evento registrado:', { eventName, properties });
      }
      
      // Emitir evento para listeners
      this.emit('event_tracked', eventData);
      
    } catch (error) {
      logger.error('Erro ao registrar evento:', error);
      
      // Registrar erro como evento de sistema
      this.trackSystemEvent('analytics_error', {
        originalEvent: eventName,
        error: error.message
      });
    }
  }
  
  /**
   * Registra evento de página visitada
   */
  async trackPageView(page, context = {}) {
    await this.track('page_view', {
      page,
      title: context.title,
      referrer: context.referrer,
      loadTime: context.loadTime
    }, context);
    
    // Atualizar sessão
    if (context.sessionId) {
      await this.updateSession(context.sessionId, { page_views: 1 });
    }
  }
  
  /**
   * Registra evento de usuário
   */
  async trackUserEvent(eventType, userId, properties = {}, context = {}) {
    const eventMap = {
      registration: 'user_registration',
      login: 'user_login',
      logout: 'user_logout',
      profile_update: 'user_profile_update'
    };
    
    const eventName = eventMap[eventType];
    if (!eventName) {
      throw new Error(`Tipo de evento de usuário inválido: ${eventType}`);
    }
    
    await this.track(eventName, {
      userId,
      ...properties
    }, context);
  }
  
  /**
   * Registra evento de transação
   */
  async trackTransaction(eventType, transactionData, context = {}) {
    const eventMap = {
      initiated: 'transaction_initiated',
      completed: 'transaction_completed',
      failed: 'transaction_failed'
    };
    
    const eventName = eventMap[eventType];
    if (!eventName) {
      throw new Error(`Tipo de evento de transação inválido: ${eventType}`);
    }
    
    await this.track(eventName, transactionData, context);
  }
  
  /**
   * Registra evento de sistema
   */
  async trackSystemEvent(eventType, properties = {}, context = {}) {
    const eventMap = {
      error: 'system_error',
      performance: 'performance_metric'
    };
    
    const eventName = eventMap[eventType] || eventType;
    
    await this.track(eventName, properties, {
      ...context,
      isSystemEvent: true
    });
  }
  
  // ============================================================================
  // 🔄 PROCESSAMENTO DE FILA
  // ============================================================================
  
  addToQueue(eventData) {
    this.eventQueue.push(eventData);
    
    // Flush imediato se a fila estiver cheia
    if (this.eventQueue.length >= analyticsConfig.collection.batchSize) {
      this.flushQueue();
    }
    
    // Verificar limite máximo da fila
    if (this.eventQueue.length > analyticsConfig.collection.maxQueueSize) {
      logger.warn('Fila de analytics cheia, removendo eventos antigos');
      this.eventQueue = this.eventQueue.slice(-analyticsConfig.collection.maxQueueSize);
    }
  }
  
  async flushQueue() {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      const batch = this.eventQueue.splice(0, analyticsConfig.collection.batchSize);
      
      if (batch.length > 0) {
        await this.processBatch(batch);
        logger.debug(`Processados ${batch.length} eventos de analytics`);
      }
      
    } catch (error) {
      logger.error('Erro ao processar fila de analytics:', error);
    } finally {
      this.isProcessing = false;
    }
  }
  
  async processBatch(events) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Inserir eventos
      for (const event of events) {
        await this.insertEvent(connection, event);
      }
      
      await connection.commit();
      
      // Enviar para integrações externas
      await this.sendToExternalServices(events);
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  async insertEvent(connection, eventData) {
    const query = `
      INSERT INTO analytics_events (
        event_name, event_category, user_id, session_id,
        properties, metadata, ip_address, user_agent, referrer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      eventData.event_name,
      eventData.event_category,
      eventData.user_id,
      eventData.session_id,
      JSON.stringify(eventData.properties),
      JSON.stringify(eventData.metadata),
      eventData.ip_address,
      eventData.user_agent,
      eventData.referrer
    ];
    
    await connection.query(query, values);
  }
  
  // ============================================================================
  // 📈 MÉTRICAS E AGREGAÇÕES
  // ============================================================================
  
  /**
   * Calcula métricas agregadas
   */
  async calculateMetrics(metricName, startDate, endDate, dimensions = {}) {
    try {
      const metricConfig = this.getMetricConfig(metricName);
      if (!metricConfig) {
        throw new Error(`Métrica não configurada: ${metricName}`);
      }
      
      let query = this.buildMetricQuery(metricConfig, startDate, endDate, dimensions);
      const result = await db.query(query.sql, query.params);
      
      return {
        metric: metricName,
        value: result[0]?.value || 0,
        period: { start: startDate, end: endDate },
        dimensions,
        calculatedAt: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('Erro ao calcular métrica:', error);
      throw error;
    }
  }
  
  buildMetricQuery(metricConfig, startDate, endDate, dimensions) {
    let sql = '';
    let params = [];
    
    switch (metricConfig.aggregation) {
      case 'count':
        sql = `SELECT COUNT(*) as value FROM analytics_events WHERE created_at BETWEEN ? AND ?`;
        params = [startDate, endDate];
        break;
        
      case 'distinct':
        sql = `SELECT COUNT(DISTINCT ${metricConfig.field}) as value FROM analytics_events WHERE created_at BETWEEN ? AND ?`;
        params = [startDate, endDate];
        break;
        
      case 'sum':
        sql = `SELECT SUM(JSON_EXTRACT(properties, '$.${metricConfig.field}')) as value FROM analytics_events WHERE created_at BETWEEN ? AND ?`;
        params = [startDate, endDate];
        break;
        
      case 'avg':
        sql = `SELECT AVG(JSON_EXTRACT(properties, '$.${metricConfig.field}')) as value FROM analytics_events WHERE created_at BETWEEN ? AND ?`;
        params = [startDate, endDate];
        break;
    }
    
    // Adicionar filtros
    if (metricConfig.filter) {
      if (metricConfig.filter.event) {
        sql += ` AND event_name = ?`;
        params.push(metricConfig.filter.event);
      }
      if (metricConfig.filter.category) {
        sql += ` AND event_category = ?`;
        params.push(metricConfig.filter.category);
      }
    }
    
    // Adicionar dimensões
    for (const [key, value] of Object.entries(dimensions)) {
      sql += ` AND JSON_EXTRACT(properties, '$.${key}') = ?`;
      params.push(value);
    }
    
    return { sql, params };
  }
  
  // ============================================================================
  // 👥 GERENCIAMENTO DE SESSÕES
  // ============================================================================
  
  async startSession(sessionId, userId, context = {}) {
    const query = `
      INSERT INTO analytics_sessions (
        id, user_id, started_at, ip_address, user_agent, referrer,
        utm_source, utm_medium, utm_campaign
      ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        started_at = NOW(),
        ip_address = VALUES(ip_address),
        user_agent = VALUES(user_agent)
    `;
    
    const values = [
      sessionId,
      userId,
      context.ipAddress,
      context.userAgent,
      context.referrer,
      context.utmSource,
      context.utmMedium,
      context.utmCampaign
    ];
    
    await db.query(query, values);
  }
  
  async endSession(sessionId) {
    const query = `
      UPDATE analytics_sessions 
      SET ended_at = NOW(),
          duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW())
      WHERE id = ? AND ended_at IS NULL
    `;
    
    await db.query(query, [sessionId]);
  }
  
  async updateSession(sessionId, updates) {
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'page_views' || key === 'events_count') {
        fields.push(`${key} = ${key} + ?`);
      } else {
        fields.push(`${key} = ?`);
      }
      values.push(value);
    }
    
    if (fields.length > 0) {
      const query = `UPDATE analytics_sessions SET ${fields.join(', ')} WHERE id = ?`;
      values.push(sessionId);
      await db.query(query, values);
    }
  }
  
  // ============================================================================
  // 🔌 INTEGRAÇÕES EXTERNAS
  // ============================================================================
  
  async sendToExternalServices(events) {
    const promises = [];
    
    // Google Analytics
    if (analyticsConfig.integrations.googleAnalytics.enabled) {
      promises.push(this.sendToGoogleAnalytics(events));
    }
    
    // Mixpanel
    if (analyticsConfig.integrations.mixpanel.enabled) {
      promises.push(this.sendToMixpanel(events));
    }
    
    await Promise.allSettled(promises);
  }
  
  async sendToGoogleAnalytics(events) {
    // Implementar integração com Google Analytics 4
    // usando Measurement Protocol
  }
  
  async sendToMixpanel(events) {
    // Implementar integração com Mixpanel
  }
  
  // ============================================================================
  // 🛠️ UTILITÁRIOS
  // ============================================================================
  
  sanitizeProperties(properties) {
    const sanitized = { ...properties };
    
    // Remover campos sensíveis
    for (const field of analyticsConfig.privacy.anonymizeFields) {
      if (sanitized[field]) {
        sanitized[field] = this.anonymizeValue(sanitized[field]);
      }
    }
    
    return sanitized;
  }
  
  anonymizeValue(value) {
    if (typeof value === 'string') {
      // Hash simples para anonimização
      return require('crypto')
        .createHash('sha256')
        .update(value)
        .digest('hex')
        .substring(0, 16);
    }
    return '[ANONYMIZED]';
  }
  
  getMetricConfig(metricName) {
    for (const category of Object.values(analyticsConfig.metrics)) {
      if (category[metricName]) {
        return category[metricName];
      }
    }
    return null;
  }
  
  async shutdown() {
    logger.info('Encerrando serviço de analytics...');
    
    // Parar timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Processar eventos restantes
    await this.flushQueue();
    
    logger.info('Serviço de analytics encerrado');
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();

module.exports = analyticsService;

/**
 * Exemplo de uso:
 * 
 * const analyticsService = require('./services/analyticsService');
 * 
 * // Registrar evento de usuário
 * await analyticsService.trackUserEvent('login', userId, {
 *   method: 'email',
 *   success: true
 * }, { sessionId, ipAddress, userAgent });
 * 
 * // Registrar transação
 * await analyticsService.trackTransaction('completed', {
 *   transactionId: '123',
 *   userId: 'user456',
 *   amount: 100.00,
 *   currency: 'BRL',
 *   method: 'pix'
 * });
 * 
 * // Calcular métrica
 * const dau = await analyticsService.calculateMetrics(
 *   'daily_active_users',
 *   '2024-01-01',
 *   '2024-01-02'
 * );
 */