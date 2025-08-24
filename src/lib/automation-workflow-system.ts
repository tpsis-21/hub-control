// 🤖 Sistema de Automação e Workflows
// Sistema avançado de automação de processos, workflows e orquestração de tarefas

import { useState, useEffect, useCallback } from 'react';
import { createServerSupabaseClient } from "./supabase/clients/server";
import { performanceMonitoringSystem } from './performance';
import { MetricType } from './performance/types';
import { auditComplianceSystem, AuditEventType } from './audit-compliance-system';
import { realtimeSecurityMonitor } from './security';
import { SecurityEventType, SecuritySeverity } from './security-monitoring';
import { intelligentCacheSystem } from './intelligent-cache-system';
import { realtimeNotificationSystem, NotificationType } from '@/lib/notifications';
import { analyticsReportingSystem, AnalyticsMetricType } from './analytics-reporting-system';
import { createHash } from 'crypto';

// Tipos de workflow
export enum WorkflowType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  STATE_MACHINE = 'state_machine',
  EVENT_DRIVEN = 'event_driven',
  SCHEDULED = 'scheduled',
  MANUAL = 'manual',
  HYBRID = 'hybrid'
}

// Status do workflow
export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  ARCHIVED = 'archived'
}

// Status da execução
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
  RETRY = 'retry'
}

// Tipos de trigger
export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULED = 'scheduled',
  EVENT = 'event',
  WEBHOOK = 'webhook',
  API = 'api',
  DATABASE = 'database',
  FILE = 'file',
  EMAIL = 'email',
  CONDITION = 'condition'
}

// Tipos de ação
export enum ActionType {
  // Ações de sistema
  HTTP_REQUEST = 'http_request',
  DATABASE_QUERY = 'database_query',
  FILE_OPERATION = 'file_operation',
  EMAIL_SEND = 'email_send',
  NOTIFICATION = 'notification',
  
  // Ações de dados
  DATA_TRANSFORM = 'data_transform',
  DATA_VALIDATION = 'data_validation',
  DATA_EXPORT = 'data_export',
  DATA_IMPORT = 'data_import',
  
  // Ações de integração
  API_CALL = 'api_call',
  WEBHOOK_CALL = 'webhook_call',
  QUEUE_MESSAGE = 'queue_message',
  
  // Ações de controle
  DELAY = 'delay',
  CONDITION = 'condition',
  LOOP = 'loop',
  BRANCH = 'branch',
  MERGE = 'merge',
  
  // Ações customizadas
  SCRIPT = 'script',
  FUNCTION = 'function',
  CUSTOM = 'custom'
}

// Tipos de condição
export enum ConditionType {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  REGEX = 'regex',
  EXISTS = 'exists',
  IS_EMPTY = 'is_empty',
  CUSTOM = 'custom'
}

// Prioridade de execução
export enum ExecutionPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Interface para trigger
export interface WorkflowTrigger {
  id: string;
  type: TriggerType;
  name: string;
  description: string;
  config: {
    // Para triggers agendados
    schedule?: {
      cron?: string;
      interval?: number; // ms
      timezone?: string;
      startDate?: Date;
      endDate?: Date;
    };
    
    // Para triggers de evento
    event?: {
      source: string;
      type: string;
      filters?: Record<string, any>;
    };
    
    // Para triggers de webhook
    webhook?: {
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      headers?: Record<string, string>;
      authentication?: {
        type: 'none' | 'basic' | 'bearer' | 'api_key';
        credentials?: Record<string, string>;
      };
    };
    
    // Para triggers de condição
    condition?: {
      field: string;
      operator: ConditionType;
      value: any;
      checkInterval?: number; // ms
    };
    
    // Para triggers de banco de dados
    database?: {
      table: string;
      operation: 'insert' | 'update' | 'delete';
      filters?: Record<string, any>;
    };
    
    // Para triggers de arquivo
    file?: {
      path: string;
      operation: 'create' | 'modify' | 'delete';
      pattern?: string;
    };
  };
  enabled: boolean;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    lastTriggered?: Date;
    triggerCount: number;
  };
}

// Interface para ação
export interface WorkflowAction {
  id: string;
  type: ActionType;
  name: string;
  description: string;
  config: {
    // Para requisições HTTP
    http?: {
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      headers?: Record<string, string>;
      body?: any;
      timeout?: number; // ms
      retries?: number;
    };
    
    // Para consultas de banco
    database?: {
      query: string;
      parameters?: Record<string, any>;
      timeout?: number; // ms
    };
    
    // Para operações de arquivo
    file?: {
      operation: 'read' | 'write' | 'delete' | 'copy' | 'move';
      source?: string;
      destination?: string;
      content?: string;
      encoding?: string;
    };
    
    // Para envio de email
    email?: {
      to: string[];
      cc?: string[];
      bcc?: string[];
      subject: string;
      body: string;
      attachments?: Array<{
        filename: string;
        content: string;
        encoding?: string;
      }>;
    };
    
    // Para notificações
    notification?: {
      type: NotificationType;
      title: string;
      message: string;
      recipients: string[];
      channels: string[];
      priority: 'low' | 'normal' | 'high' | 'urgent';
    };
    
    // Para transformação de dados
    transform?: {
      input: string; // JSONPath ou campo
      output: string; // JSONPath ou campo
      script: string; // JavaScript ou expressão
      language: 'javascript' | 'jsonpath' | 'jq';
    };
    
    // Para condições
    condition?: {
      field: string;
      operator: ConditionType;
      value: any;
      trueAction?: string; // ID da próxima ação
      falseAction?: string; // ID da próxima ação
    };
    
    // Para loops
    loop?: {
      collection: string; // JSONPath para array
      itemVariable: string;
      actions: string[]; // IDs das ações no loop
      maxIterations?: number;
    };
    
    // Para delays
    delay?: {
      duration: number; // ms
      unit: 'ms' | 's' | 'm' | 'h' | 'd';
    };
    
    // Para scripts customizados
    script?: {
      language: 'javascript' | 'python' | 'bash';
      code: string;
      timeout?: number; // ms
      environment?: Record<string, string>;
    };
    
    // Configurações gerais
    timeout?: number; // ms
    retries?: {
      maxAttempts: number;
      delay: number; // ms
      backoff: 'fixed' | 'exponential' | 'linear';
      conditions?: ConditionType[];
    };
    errorHandling?: {
      onError: 'stop' | 'continue' | 'retry' | 'skip';
      fallbackAction?: string; // ID da ação de fallback
    };
  };
  dependencies: string[]; // IDs das ações que devem ser executadas antes
  outputs: Record<string, string>; // Mapeamento de saídas
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    executionCount: number;
    averageExecutionTime: number;
    successRate: number;
  };
}

// Interface para workflow
export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: WorkflowType;
  version: string;
  status: WorkflowStatus;
  
  // Configuração do workflow
  config: {
    maxExecutions?: number;
    timeout?: number; // ms
    priority: ExecutionPriority;
    concurrency?: {
      enabled: boolean;
      maxConcurrent: number;
      strategy: 'queue' | 'reject' | 'replace';
    };
    errorHandling: {
      onError: 'stop' | 'continue' | 'retry';
      maxRetries: number;
      retryDelay: number; // ms
      notifyOnError: boolean;
    };
    monitoring: {
      enabled: boolean;
      metrics: string[];
      alerts: boolean;
      logging: 'none' | 'basic' | 'detailed';
    };
  };
  
  // Componentes do workflow
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  
  // Fluxo de execução
  flow: {
    startAction: string; // ID da primeira ação
    connections: Array<{
      from: string; // ID da ação origem
      to: string; // ID da ação destino
      condition?: {
        field: string;
        operator: ConditionType;
        value: any;
      };
    }>;
  };
  
  // Variáveis e contexto
  variables: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    defaultValue?: any;
    required: boolean;
    description: string;
  }>;
  
  // Controle de acesso
  access: {
    public: boolean;
    users: string[];
    roles: string[];
    permissions: {
      view: boolean;
      edit: boolean;
      execute: boolean;
      delete: boolean;
    };
  };
  
  // Metadados
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    tags: string[];
    category: string;
    executionCount: number;
    lastExecuted?: Date;
    averageExecutionTime: number;
    successRate: number;
  };
}

// Interface para execução de workflow
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: string;
  status: ExecutionStatus;
  
  // Contexto da execução
  context: {
    triggeredBy: {
      type: 'manual' | 'trigger' | 'api' | 'schedule';
      triggerId?: string;
      userId?: string;
      source?: string;
    };
    input: Record<string, any>;
    variables: Record<string, any>;
    environment: Record<string, string>;
  };
  
  // Progresso da execução
  progress: {
    currentAction?: string;
    completedActions: string[];
    failedActions: string[];
    skippedActions: string[];
    totalActions: number;
    percentage: number;
  };
  
  // Resultados
  results: {
    output: Record<string, any>;
    logs: Array<{
      timestamp: Date;
      level: 'debug' | 'info' | 'warn' | 'error';
      message: string;
      actionId?: string;
      data?: any;
    }>;
    metrics: {
      startTime: Date;
      endTime?: Date;
      duration?: number; // ms
      actionsExecuted: number;
      errorsCount: number;
      retriesCount: number;
    };
  };
  
  // Controle de execução
  control: {
    priority: ExecutionPriority;
    timeout?: Date;
    pausedAt?: Date;
    resumedAt?: Date;
    cancelledAt?: Date;
    retryCount: number;
    maxRetries: number;
  };
  
  // Metadados
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    scheduledFor?: Date;
    node?: string; // Nó que executou
    version: string;
  };
}

// Interface para configuração do sistema
export interface AutomationSystemConfig {
  enabled: boolean;
  
  // Configurações de execução
  execution: {
    maxConcurrentWorkflows: number;
    maxConcurrentActions: number;
    defaultTimeout: number; // ms
    maxExecutionTime: number; // ms
    queueSize: number;
    workerThreads: number;
  };
  
  // Configurações de agendamento
  scheduling: {
    enabled: boolean;
    precision: number; // ms
    maxScheduledJobs: number;
    timezone: string;
    persistence: boolean;
  };
  
  // Configurações de monitoramento
  monitoring: {
    enabled: boolean;
    metricsInterval: number; // ms
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    retentionDays: number;
    alerting: {
      enabled: boolean;
      thresholds: {
        errorRate: number; // %
        executionTime: number; // ms
        queueSize: number;
        failureRate: number; // %
      };
    };
  };
  
  // Configurações de segurança
  security: {
    enableSandbox: boolean;
    maxScriptExecutionTime: number; // ms
    allowedDomains: string[];
    blockedIPs: string[];
    encryptSensitiveData: boolean;
  };
  
  // Configurações de integração
  integrations: {
    webhook: {
      enabled: boolean;
      maxPayloadSize: number; // bytes
      timeout: number; // ms
      retries: number;
    };
    email: {
      enabled: boolean;
      provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
      config: Record<string, any>;
    };
    storage: {
      provider: 'local' | 's3' | 'gcs' | 'azure';
      config: Record<string, any>;
    };
  };
  
  // Configurações de performance
  performance: {
    caching: {
      enabled: boolean;
      ttl: number; // ms
      maxSize: number; // MB
    };
    optimization: {
      enableParallelization: boolean;
      enableBatching: boolean;
      batchSize: number;
      enableCompression: boolean;
    };
  };
}

// Configuração padrão
const DEFAULT_CONFIG: AutomationSystemConfig = {
  enabled: true,
  execution: {
    maxConcurrentWorkflows: 10,
    maxConcurrentActions: 50,
    defaultTimeout: 300000, // 5 minutos
    maxExecutionTime: 3600000, // 1 hora
    queueSize: 1000,
    workerThreads: 4
  },
  scheduling: {
    enabled: true,
    precision: 1000, // 1 segundo
    maxScheduledJobs: 1000,
    timezone: 'America/Sao_Paulo',
    persistence: true
  },
  monitoring: {
    enabled: true,
    metricsInterval: 60000, // 1 minuto
    logLevel: 'info',
    retentionDays: 30,
    alerting: {
      enabled: true,
      thresholds: {
        errorRate: 10, // 10%
        executionTime: 300000, // 5 minutos
        queueSize: 500,
        failureRate: 20 // 20%
      }
    }
  },
  security: {
    enableSandbox: true,
    maxScriptExecutionTime: 30000, // 30 segundos
    allowedDomains: [],
    blockedIPs: [],
    encryptSensitiveData: true
  },
  integrations: {
    webhook: {
      enabled: true,
      maxPayloadSize: 10485760, // 10MB
      timeout: 30000, // 30 segundos
      retries: 3
    },
    email: {
      enabled: true,
      provider: 'smtp',
      config: {}
    },
    storage: {
      provider: 'local',
      config: {}
    }
  },
  performance: {
    caching: {
      enabled: true,
      ttl: 300000, // 5 minutos
      maxSize: 100 // 100MB
    },
    optimization: {
      enableParallelization: true,
      enableBatching: true,
      batchSize: 10,
      enableCompression: true
    }
  }
};

// Classe principal do sistema de automação
export class AutomationWorkflowSystem {
  private config: AutomationSystemConfig;
  private workflows: Map<string, Workflow> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private executionQueue: Array<{ executionId: string; priority: ExecutionPriority }> = [];
  private activeExecutions: Set<string> = new Set();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private processingInterval?: NodeJS.Timeout;

  constructor(config: Partial<AutomationSystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Inicialização do sistema
  async initialize(): Promise<void> {
    try {
      console.log('Inicializando sistema de automação...');
      
      // Carregar workflows existentes
      await this.loadWorkflows();
      
      // Configurar triggers
      await this.setupTriggers();
      
      // Iniciar processamento da fila
      this.startProcessing();
      
      // Iniciar monitoramento
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }
      
      console.log('Sistema de automação inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar sistema de automação:', error);
      throw error;
    }
  }

  // Criar novo workflow
  async createWorkflow(workflow: Omit<Workflow, 'id'> & { metadata?: Partial<Workflow['metadata']> }): Promise<string> {
    try {
      const id = createHash('sha256').update(JSON.stringify(workflow) + Date.now()).digest('hex').substring(0, 16);
      
      const newWorkflow: Workflow = {
        ...workflow,
        id,
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system', // TODO: pegar do contexto de autenticação
          tags: workflow.metadata?.tags || [],
          category: workflow.metadata?.category || 'general',
          executionCount: 0,
          lastExecuted: undefined,
          averageExecutionTime: 0,
          successRate: 0
        }
      };
      
      // Validar workflow
      this.validateWorkflow(newWorkflow);
      
      // Armazenar em memória
      this.workflows.set(id, newWorkflow);
      
      // Persistir no banco
      await this.persistWorkflow(newWorkflow);
      
      // Configurar triggers se o workflow estiver ativo
      if (newWorkflow.status === WorkflowStatus.ACTIVE) {
        await this.setupWorkflowTriggers(newWorkflow);
      }
      
      console.log(`Workflow criado: ${id}`);
      return id;
    } catch (error) {
      console.error('Erro ao criar workflow:', error);
      throw error;
    }
  }

  // Executar workflow
  async executeWorkflow(
    workflowId: string,
    input: Record<string, any> = {},
    options: {
      priority?: ExecutionPriority;
      scheduledFor?: Date;
      variables?: Record<string, any>;
    } = {}
  ): Promise<string> {
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow não encontrado: ${workflowId}`);
      }
      
      if (workflow.status !== WorkflowStatus.ACTIVE) {
        throw new Error(`Workflow não está ativo: ${workflowId}`);
      }
      
      const executionId = createHash('sha256').update(workflowId + Date.now() + Math.random()).digest('hex').substring(0, 16);
      
      const execution: WorkflowExecution = {
        id: executionId,
        workflowId,
        workflowVersion: workflow.version,
        status: ExecutionStatus.PENDING,
        context: {
          triggeredBy: {
            type: 'manual',
            source: 'api'
          },
          input,
          variables: { ...workflow.variables, ...options.variables },
          environment: process.env as Record<string, string>
        },
        progress: {
          completedActions: [],
          failedActions: [],
          skippedActions: [],
          totalActions: workflow.actions.length,
          percentage: 0
        },
        results: {
          output: {},
          logs: [],
          metrics: {
            startTime: new Date(),
            actionsExecuted: 0,
            errorsCount: 0,
            retriesCount: 0
          }
        },
        control: {
          priority: options.priority || workflow.config.priority,
          retryCount: 0,
          maxRetries: workflow.config.errorHandling.maxRetries
        },
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          scheduledFor: options.scheduledFor,
          version: '1.0'
        }
      };
      
      // Armazenar execução
      this.executions.set(executionId, execution);
      
      // Persistir no banco
      await this.persistExecution(execution);
      
      // Agendar ou executar imediatamente
      if (options.scheduledFor && options.scheduledFor > new Date()) {
        this.scheduleExecution(executionId, options.scheduledFor);
      } else {
        // Adicionar à fila de execução
        this.executionQueue.push({
          executionId,
          priority: execution.control.priority
        });
        
        // Processar fila
        await this.processQueue();
      }
      
      console.log(`Execução criada: ${executionId}`);
      return executionId;
    } catch (error) {
      console.error('Erro ao executar workflow:', error);
      throw error;
    }
  }

  // Obter workflow
  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    return this.workflows.get(workflowId) || null;
  }

  // Obter execução
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  // Pausar workflow
  async pauseWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.status = WorkflowStatus.PAUSED;
      workflow.metadata.updatedAt = new Date();
      await this.persistWorkflow(workflow);
    }
  }

  // Retomar workflow
  async resumeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.status = WorkflowStatus.ACTIVE;
      workflow.metadata.updatedAt = new Date();
      await this.persistWorkflow(workflow);
      await this.setupWorkflowTriggers(workflow);
    }
  }

  // Cancelar execução
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === ExecutionStatus.RUNNING) {
      execution.status = ExecutionStatus.CANCELLED;
      execution.control.cancelledAt = new Date();
      execution.metadata.updatedAt = new Date();
      this.activeExecutions.delete(executionId);
      await this.persistExecution(execution);
    }
  }

  // Pausar execução
  async pauseExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === ExecutionStatus.RUNNING) {
      execution.status = ExecutionStatus.WAITING;
      execution.control.pausedAt = new Date();
      execution.metadata.updatedAt = new Date();
      await this.persistExecution(execution);
    }
  }

  // Retomar execução
  async resumeExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution && execution.status === ExecutionStatus.WAITING) {
      execution.status = ExecutionStatus.RUNNING;
      execution.control.resumedAt = new Date();
      execution.metadata.updatedAt = new Date();
      await this.persistExecution(execution);
      
      // Adicionar de volta à fila
      this.executionQueue.push({
        executionId,
        priority: execution.control.priority
      });
      await this.processQueue();
    }
  }

  // Limpeza de recursos
  async cleanup(): Promise<void> {
    try {
      // Cancelar execuções ativas
      for (const executionId of Array.from(this.activeExecutions)) {
        await this.cancelExecution(executionId);
      }

      // Limpar jobs agendados
      for (const [key, job] of Array.from(this.scheduledJobs.entries())) {
        clearTimeout(job);
      }
      this.scheduledJobs.clear();

      // Limpar intervalos
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
      }

      // Limpar dados em memória
      this.workflows.clear();
      this.executions.clear();
      this.executionQueue.length = 0;
      this.activeExecutions.clear();

      console.log('Sistema de automação limpo com sucesso');
    } catch (error) {
      console.error('Erro ao limpar sistema de automação:', error);
      throw error;
    }
  }

  // Limpeza de execuções antigas
  async cleanupOldExecutions(daysOld: number = 30): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error } = await supabase
        .from('workflow_executions')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        throw error;
      }

      // Registrar evento de auditoria
      await auditComplianceSystem.recordAuditEvent(
        AuditEventType.ADMIN_ACTION,
        'system',
        'system@automation',
        '127.0.0.1',
        'AutomationWorkflowSystem/1.0',
        'workflow_executions',
        'cleanup',
        { daysOld, cutoffDate: cutoffDate.toISOString(), description: `Limpeza de execuções antigas (${daysOld} dias)` },
        'success',
        SecuritySeverity.LOW
      );

      console.log(`Execuções antigas removidas (${daysOld} dias)`);
    } catch (error) {
      console.error('Erro ao limpar execuções antigas:', error);
      throw error;
    }
  }

  // Obter estatísticas do sistema
  async getSystemStats(): Promise<{
    workflows: {
      total: number;
      active: number;
      inactive: number;
      draft: number;
    };
    executions: {
      total: number;
      running: number;
      completed: number;
      failed: number;
      cancelled: number;
    };
    performance: {
      averageExecutionTime: number;
      successRate: number;
      totalExecutions: number;
    };
  }> {
    try {
      const supabase = await createServerSupabaseClient();

      // Estatísticas de workflows
      const { data: workflowStats } = await supabase
        .from('workflows')
        .select('status');

      const workflows = {
        total: workflowStats?.length || 0,
        active: workflowStats?.filter(w => w.status === WorkflowStatus.ACTIVE).length || 0,
        inactive: workflowStats?.filter(w => w.status === WorkflowStatus.PAUSED).length || 0,
        draft: workflowStats?.filter(w => w.status === WorkflowStatus.DRAFT).length || 0
      };

      // Estatísticas de execuções
      const { data: executionStats } = await supabase
        .from('workflow_executions')
        .select('status, created_at, updated_at');

      const executions = {
        total: executionStats?.length || 0,
        running: executionStats?.filter(e => e.status === ExecutionStatus.RUNNING).length || 0,
        completed: executionStats?.filter(e => e.status === ExecutionStatus.COMPLETED).length || 0,
        failed: executionStats?.filter(e => e.status === ExecutionStatus.FAILED).length || 0,
        cancelled: executionStats?.filter(e => e.status === ExecutionStatus.CANCELLED).length || 0
      };

      // Estatísticas de performance
      const completedExecutions = executionStats?.filter(e => 
        e.status === ExecutionStatus.COMPLETED && e.created_at && e.updated_at
      ) || [];

      const totalExecutionTime = completedExecutions.reduce((sum, exec) => {
        const duration = new Date(exec.updated_at).getTime() - new Date(exec.created_at).getTime();
        return sum + duration;
      }, 0);

      const performance = {
        averageExecutionTime: completedExecutions.length > 0 ? 
          totalExecutionTime / completedExecutions.length : 0,
        successRate: executions.total > 0 ? 
          (executions.completed / executions.total) * 100 : 0,
        totalExecutions: executions.total
      };

      return { workflows, executions, performance };
    } catch (error) {
      console.error('Erro ao obter estatísticas do sistema:', error);
      throw error;
    }
  }

  // Métodos privados auxiliares
  private validateWorkflow(workflow: Workflow): void {
    if (!workflow.name || workflow.name.trim().length === 0) {
      throw new Error('Nome do workflow é obrigatório');
    }
    
    if (!workflow.actions || workflow.actions.length === 0) {
      throw new Error('Workflow deve ter pelo menos uma ação');
    }
    
    if (!workflow.flow.startAction) {
      throw new Error('Workflow deve ter uma ação inicial definida');
    }
    
    const actionIds = new Set(workflow.actions.map(a => a.id));
    if (!actionIds.has(workflow.flow.startAction)) {
      throw new Error('Ação inicial não encontrada nas ações do workflow');
    }
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, 1000); // Processar a cada segundo
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  private async collectMetrics(): Promise<void> {
    try {
      const stats = await this.getSystemStats();
      
      // Registrar métricas de performance
      performanceMonitoringSystem.recordMetric(
        MetricType.WORKFLOW_EXECUTION_TIME,
        stats.executions.total,
        'count',
        'automation-workflow-system',
        stats,
        ['workflow', 'executions']
      );
      
      // Verificar alertas
      if (stats.performance.successRate < this.config.monitoring.alerting.thresholds.failureRate) {
        await realtimeSecurityMonitor.recordEvent(
          SecurityEventType.SYSTEM_ERROR,
          SecuritySeverity.HIGH,
          '127.0.0.1',
          'AutomationWorkflowSystem/1.0',
          'workflow_monitoring',
          { successRate: stats.performance.successRate, reason: 'Taxa de sucesso baixa em workflows' }
        );
      }
    } catch (error) {
      console.error('Erro ao coletar métricas:', error);
    }
  }

  private async processQueue(): Promise<void> {
    if (this.executionQueue.length === 0) return;
    if (this.activeExecutions.size >= this.config.execution.maxConcurrentWorkflows) return;

    // Ordenar por prioridade
    this.executionQueue.sort((a, b) => {
      const priorityOrder = {
        [ExecutionPriority.CRITICAL]: 4,
        [ExecutionPriority.HIGH]: 3,
        [ExecutionPriority.NORMAL]: 2,
        [ExecutionPriority.LOW]: 1
      };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const next = this.executionQueue.shift();
    if (next) {
      await this.executeWorkflowExecution(next.executionId);
    }
  }

  private async executeWorkflowExecution(executionId: string): Promise<void> {
    try {
      const execution = this.executions.get(executionId);
      if (!execution) return;

      const workflow = this.workflows.get(execution.workflowId);
      if (!workflow) return;

      // Marcar como ativo
      this.activeExecutions.add(executionId);
      execution.status = ExecutionStatus.RUNNING;
      execution.metadata.updatedAt = new Date();
      
      // Executar ações do workflow
      await this.executeWorkflowActions(workflow, execution);
      
    } catch (error) {
      console.error(`Erro na execução ${executionId}:`, error);
      await this.failExecution(executionId, error);
    }
  }

  private async executeWorkflowActions(workflow: Workflow, execution: WorkflowExecution): Promise<void> {
    let currentActionId = workflow.flow.startAction;
    
    while (currentActionId && execution.status === ExecutionStatus.RUNNING) {
      const action = workflow.actions.find(a => a.id === currentActionId);
      if (!action) break;
      
      try {
        execution.progress.currentAction = currentActionId;
        await this.persistExecution(execution);
        
        const result = await this.executeAction(action, execution);
        
        execution.progress.completedActions.push(currentActionId);
        execution.progress.percentage = (execution.progress.completedActions.length / execution.progress.totalActions) * 100;
        execution.results.metrics.actionsExecuted++;
        
        // Determinar próxima ação
        const nextActionId = await this.getNextAction(workflow, currentActionId, result);
        if (nextActionId) {
          currentActionId = nextActionId;
        } else {
          break; // Não há próxima ação, finalizar loop
        }
        
      } catch (error) {
        execution.progress.failedActions.push(currentActionId);
        execution.results.metrics.errorsCount++;
        
        await this.handleActionError(execution, currentActionId, error);
        break;
      }
    }
    
    // Finalizar execução
    if (execution.status === ExecutionStatus.RUNNING) {
      await this.completeExecution(execution.id);
    }
  }

  private async executeAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const startTime = Date.now();
    
    try {
      let result: any;
      
      switch (action.type) {
        case ActionType.HTTP_REQUEST:
          result = await this.executeHttpAction(action, execution);
          break;
        case ActionType.DATABASE_QUERY:
          result = await this.executeDatabaseAction(action, execution);
          break;
        case ActionType.NOTIFICATION:
          result = await this.executeNotificationAction(action, execution);
          break;
        case ActionType.DELAY:
          result = await this.executeDelayAction(action, execution);
          break;
        case ActionType.SCRIPT:
          result = await this.executeScriptAction(action, execution);
          break;
        default:
          throw new Error(`Tipo de ação não suportado: ${action.type}`);
      }
      
      const duration = Date.now() - startTime;
      this.addExecutionLog(execution, 'info', `Ação ${action.name} executada com sucesso`, action.id, { duration, result });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.addExecutionLog(execution, 'error', `Erro na ação ${action.name}: ${error}`, action.id, { duration, error });
      throw error;
    }
  }

  private async executeHttpAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const config = action.config.http!;
    
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
      signal: AbortSignal.timeout(config.timeout || 30000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  private async executeDatabaseAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const config = action.config.database!;
    const supabase = await createServerSupabaseClient();
    
    try {
      // Para queries que não retornam dados (INSERT, UPDATE, DELETE)
      if (config.query.trim().toUpperCase().startsWith('INSERT') || 
          config.query.trim().toUpperCase().startsWith('UPDATE') || 
          config.query.trim().toUpperCase().startsWith('DELETE')) {
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: config.query
        });
        
        if (error) {
          throw error;
        }
        
        return { success: true, message: 'Query executada com sucesso' };
      } else {
        // Para queries SELECT, usar uma abordagem diferente
        // Por enquanto, apenas executar sem retornar dados
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: config.query
        });
        
        if (error) {
          throw error;
        }
        
        return { success: true, message: 'Query executada com sucesso' };
      }
    } catch (error) {
      console.error('Erro ao executar ação de banco de dados:', error);
      throw error;
    }
  }

  private async executeNotificationAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const config = action.config.notification!;
    
    // Converter channels de string[] para NotificationChannelConfig[]
    const channelConfigs = config.channels?.map(channel => ({
      channel: channel as any,
      enabled: true,
      priority: 1,
      config: {}
    })) || [];
    
    await realtimeNotificationSystem.send(
      config.type,
      config.title,
      config.message,
      {
        userId: config.recipients?.[0],
        priority: config.priority as any,
        channels: channelConfigs,
        data: { workflowId: execution.workflowId, executionId: execution.id }
      }
    );
    
    return { sent: true, timestamp: new Date() };
  }

  private async executeDelayAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const config = action.config.delay!;
    let delayMs = config.duration;
    
    // Converter unidade para milissegundos
    switch (config.unit) {
      case 's': delayMs *= 1000; break;
      case 'm': delayMs *= 60000; break;
      case 'h': delayMs *= 3600000; break;
      case 'd': delayMs *= 86400000; break;
    }
    
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return { delayed: delayMs };
  }

  private async executeScriptAction(action: WorkflowAction, execution: WorkflowExecution): Promise<any> {
    const config = action.config.script!;
    
    if (config.language === 'javascript') {
      return this.executeJavaScript(config.code, execution.context.variables);
    }
    
    throw new Error(`Linguagem de script não suportada: ${config.language}`);
  }

  private executeJavaScript(code: string, context: Record<string, any>): any {
    try {
      // Criar função com contexto seguro
      const func = new Function('context', `
        const { ${Object.keys(context).join(', ')} } = context;
        ${code}
      `);
      
      return func(context);
    } catch (error) {
      throw new Error(`Erro na execução do JavaScript: ${error}`);
    }
  }

  private async getNextAction(workflow: Workflow, currentActionId: string, result: any): Promise<string | null> {
    const connections = workflow.flow.connections.filter(c => c.from === currentActionId);
    
    if (connections.length === 0) {
      return null; // Fim do workflow
    }
    
    // Se há apenas uma conexão, seguir ela
    if (connections.length === 1 && !connections[0].condition) {
      return connections[0].to;
    }
    
    // Avaliar condições
    for (const connection of connections) {
      if (connection.condition) {
        const fieldValue = this.extractValue(result, connection.condition.field);
        if (this.evaluateCondition(fieldValue, connection.condition.operator, connection.condition.value)) {
          return connection.to;
        }
      }
    }
    
    // Se nenhuma condição foi atendida, usar conexão padrão (sem condição)
    const defaultConnection = connections.find(c => !c.condition);
    return defaultConnection?.to || null;
  }

  private extractValue(data: any, path: string): any {
    if (path.startsWith('$.')) {
      // JSONPath simples
      return path.split('.').slice(1).reduce((obj, key) => obj?.[key], data);
    }
    return data[path];
  }

  private evaluateCondition(fieldValue: any, operator: ConditionType, expectedValue: any): boolean {
    switch (operator) {
      case ConditionType.EQUALS:
        return fieldValue === expectedValue;
      case ConditionType.NOT_EQUALS:
        return fieldValue !== expectedValue;
      case ConditionType.GREATER_THAN:
        return Number(fieldValue) > Number(expectedValue);
      case ConditionType.LESS_THAN:
        return Number(fieldValue) < Number(expectedValue);
      case ConditionType.CONTAINS:
        return String(fieldValue).includes(String(expectedValue));
      case ConditionType.STARTS_WITH:
        return String(fieldValue).startsWith(String(expectedValue));
      case ConditionType.ENDS_WITH:
        return String(fieldValue).endsWith(String(expectedValue));
      case ConditionType.EXISTS:
        return fieldValue !== undefined && fieldValue !== null;
      case ConditionType.IS_EMPTY:
        return !fieldValue || 
               (Array.isArray(fieldValue) && fieldValue.length === 0) ||
               (typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0);
      case ConditionType.REGEX:
        return new RegExp(String(expectedValue)).test(String(fieldValue));
      default:
        return false;
    }
  }

  private async handleActionError(execution: WorkflowExecution, actionId: string, error: any): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId);
    if (!workflow) return;
    
    const action = workflow.actions.find(a => a.id === actionId);
    if (!action) return;
    
    const errorHandling = action.config.errorHandling || workflow.config.errorHandling;
    
    switch (errorHandling.onError) {
      case 'retry':
        if (execution.control.retryCount < execution.control.maxRetries) {
          execution.control.retryCount++;
          execution.results.metrics.retriesCount++;
          this.addExecutionLog(execution, 'warn', `Tentativa ${execution.control.retryCount} para ação ${action.name}`, actionId);
          
          // Aguardar antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, workflow.config.errorHandling.retryDelay));
          return; // Tentar novamente
        }
        // Se excedeu tentativas, falhar
        await this.failExecution(execution.id, error);
        break;
        
      case 'continue':
        execution.progress.skippedActions.push(actionId);
        this.addExecutionLog(execution, 'warn', `Ação ${action.name} falhou, continuando execução`, actionId, { error });
        break;
        
      case 'stop':
      default:
        await this.failExecution(execution.id, error);
        break;
    }
  }

  private async completeExecution(executionId: string): Promise<void> {
    try {
      const execution = this.executions.get(executionId);
      if (!execution) return;
      
      execution.status = ExecutionStatus.COMPLETED;
      execution.results.metrics.endTime = new Date();
      execution.results.metrics.duration = execution.results.metrics.endTime.getTime() - execution.results.metrics.startTime.getTime();
      execution.metadata.updatedAt = new Date();
      
      this.activeExecutions.delete(executionId);
      
      await this.persistExecution(execution);
      await this.updateWorkflowMetrics(execution.workflowId, execution);
      
      this.addExecutionLog(execution, 'info', 'Execução concluída com sucesso');
      
      // Registrar métricas
      await performanceMonitoringSystem.recordMetric(
        MetricType.WORKFLOW_EXECUTION_TIME,
        execution.results.metrics.duration!,
        'ms',
        'automation-workflow',
        { workflowId: execution.workflowId, executionId },
        ['workflow', 'execution']
      );
      
    } catch (error) {
      console.error(`Erro ao completar execução ${executionId}:`, error);
    }
  }

  private async failExecution(executionId: string, error: any): Promise<void> {
    try {
      const execution = this.executions.get(executionId);
      if (!execution) return;
      
      execution.status = ExecutionStatus.FAILED;
      execution.results.metrics.endTime = new Date();
      execution.results.metrics.duration = execution.results.metrics.endTime.getTime() - execution.results.metrics.startTime.getTime();
      execution.metadata.updatedAt = new Date();
      
      this.activeExecutions.delete(executionId);
      
      await this.persistExecution(execution);
      await this.updateWorkflowMetrics(execution.workflowId, execution);
      
      this.addExecutionLog(execution, 'error', `Execução falhou: ${error}`, undefined, { error });
      
      // Registrar evento de segurança
      await realtimeSecurityMonitor.recordEvent(
        SecurityEventType.SYSTEM_ERROR,
        SecuritySeverity.MEDIUM,
        'localhost',
        'automation-workflow',
        'workflow-execution',
        { executionId, error: error.toString(), workflowId: execution.workflowId }
      );
      
    } catch (failError) {
      console.error(`Erro ao falhar execução ${executionId}:`, failError);
    }
  }

  private addExecutionLog(
    execution: WorkflowExecution,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    actionId?: string,
    data?: any
  ): void {
    execution.results.logs.push({
      timestamp: new Date(),
      level,
      message,
      actionId,
      data
    });
    execution.metadata.updatedAt = new Date();
  }

  private async updateWorkflowMetrics(workflowId: string, execution: WorkflowExecution): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;
    
    workflow.metadata.executionCount++;
    workflow.metadata.lastExecuted = new Date();
    
    if (execution.results.metrics.duration) {
      const totalTime = workflow.metadata.averageExecutionTime * (workflow.metadata.executionCount - 1) + execution.results.metrics.duration;
      workflow.metadata.averageExecutionTime = totalTime / workflow.metadata.executionCount;
    }
    
    // Calcular taxa de sucesso (simplificado)
    const successCount = execution.status === ExecutionStatus.COMPLETED ? 1 : 0;
    const totalSuccesses = workflow.metadata.successRate * (workflow.metadata.executionCount - 1) / 100 + successCount;
    workflow.metadata.successRate = (totalSuccesses / workflow.metadata.executionCount) * 100;
    
    workflow.metadata.updatedAt = new Date();
    await this.persistWorkflow(workflow);
  }

  private scheduleExecution(executionId: string, scheduledFor: Date): void {
    const delay = scheduledFor.getTime() - Date.now();
    
    if (delay <= 0) {
      // Executar imediatamente
      this.executionQueue.push({ executionId, priority: ExecutionPriority.NORMAL });
      return;
    }
    
    const timeout = setTimeout(async () => {
      this.executionQueue.push({ executionId, priority: ExecutionPriority.NORMAL });
      await this.processQueue();
    }, delay);
    
    this.scheduledJobs.set(executionId, timeout);
  }

  private async setupWorkflowTriggers(workflow: Workflow): Promise<void> {
    for (const trigger of workflow.triggers) {
      if (!trigger.enabled) continue;
      
      switch (trigger.type) {
        case TriggerType.SCHEDULED:
          await this.setupScheduledTrigger(workflow.id, trigger);
          break;
        case TriggerType.WEBHOOK:
          await this.setupWebhookTrigger(workflow.id, trigger);
          break;
        case TriggerType.DATABASE:
          await this.setupDatabaseTrigger(workflow.id, trigger);
          break;
        case TriggerType.FILE:
          await this.setupFileTrigger(workflow.id, trigger);
          break;
        case TriggerType.CONDITION:
          await this.setupConditionTrigger(workflow.id, trigger);
          break;
      }
    }
  }

  private async setupScheduledTrigger(workflowId: string, trigger: WorkflowTrigger): Promise<void> {
    const config = trigger.config.schedule!;
    
    if (config.cron) {
      // Implementar cron job (simplificado)
      console.log(`Cron trigger configurado para workflow ${workflowId}: ${config.cron}`);
    } else if (config.interval) {
      const interval = setInterval(async () => {
        try {
          await this.executeWorkflow(workflowId, {}, { priority: ExecutionPriority.NORMAL });
          
          // Atualizar metadados do trigger
          trigger.metadata.lastTriggered = new Date();
          trigger.metadata.triggerCount++;
          
        } catch (error) {
          console.error(`Erro no trigger agendado ${trigger.id}:`, error);
        }
      }, config.interval);
      
      this.scheduledJobs.set(`trigger_${trigger.id}`, interval);
    }
  }

  private async setupWebhookTrigger(workflowId: string, trigger: WorkflowTrigger): Promise<void> {
    // Implementar webhook trigger
    console.log(`Webhook trigger configurado para workflow ${workflowId}`);
  }

  private async setupDatabaseTrigger(workflowId: string, trigger: WorkflowTrigger): Promise<void> {
    // Implementar database trigger
    console.log(`Database trigger configurado para workflow ${workflowId}`);
  }

  private async setupFileTrigger(workflowId: string, trigger: WorkflowTrigger): Promise<void> {
    // Implementar file trigger
    console.log(`File trigger configurado para workflow ${workflowId}`);
  }

  private async setupConditionTrigger(workflowId: string, trigger: WorkflowTrigger): Promise<void> {
    const config = trigger.config.condition!;
    
    const interval = setInterval(async () => {
      try {
        const fieldValue = await this.getFieldValue(config.field);
        
        if (this.evaluateCondition(fieldValue, config.operator, config.value)) {
          await this.executeWorkflow(workflowId, { triggerValue: fieldValue }, { priority: ExecutionPriority.NORMAL });
          
          trigger.metadata.lastTriggered = new Date();
          trigger.metadata.triggerCount++;
        }
      } catch (error) {
        console.error(`Erro no trigger de condição ${trigger.id}:`, error);
      }
    }, config.checkInterval || 60000); // Padrão: 1 minuto
    
    this.scheduledJobs.set(`trigger_${trigger.id}`, interval);
  }

  private async getFieldValue(field: string): Promise<any> {
    // Implementar busca de valor do campo
    return null;
  }

  private async setupTriggers(): Promise<void> {
    for (const workflow of Array.from(this.workflows.values())) {
      if (workflow.status === WorkflowStatus.ACTIVE) {
        await this.setupWorkflowTriggers(workflow);
      }
    }
  }

  private async loadWorkflows(): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();
      
      const { data, error } = await supabase
        .from('workflows')
        .select('*');
      
      if (error) {
        throw error;
      }
      
      if (data) {
        for (const workflowData of data) {
          const workflow = this.deserializeWorkflow(workflowData);
          this.workflows.set(workflow.id, workflow);
        }
      }
      
      console.log(`${this.workflows.size} workflows carregados`);
    } catch (error) {
      console.error('Erro ao carregar workflows:', error);
    }
  }

  private async persistWorkflow(workflow: Workflow): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient();
      const serialized = this.serializeWorkflow(workflow);
      
      const { error } = await supabase
        .from('workflows')
        .upsert(serialized);
      
      if (error) {
         throw error;
       }
     } catch (error) {
       console.error('Erro ao persistir workflow:', error);
       throw error;
     }
   }

   private async persistExecution(execution: WorkflowExecution): Promise<void> {
     try {
       const supabase = await createServerSupabaseClient();
       const serialized = this.serializeExecution(execution);
       
       const { error } = await supabase
         .from('workflow_executions')
         .upsert(serialized);
       
       if (error) {
         throw error;
       }
     } catch (error) {
       console.error('Erro ao persistir execução:', error);
       throw error;
     }
   }

   private serializeWorkflow(workflow: Workflow): any {
     return {
       id: workflow.id,
       name: workflow.name,
       description: workflow.description,
       type: workflow.type,
       version: workflow.version,
       status: workflow.status,
       config: JSON.stringify(workflow.config),
       triggers: JSON.stringify(workflow.triggers),
       actions: JSON.stringify(workflow.actions),
       flow: JSON.stringify(workflow.flow),
       variables: JSON.stringify(workflow.variables),
       access: JSON.stringify(workflow.access),
       metadata: JSON.stringify(workflow.metadata),
       created_at: workflow.metadata.createdAt.toISOString(),
       updated_at: workflow.metadata.updatedAt.toISOString()
     };
   }

   private deserializeWorkflow(data: any): Workflow {
     return {
       id: data.id,
       name: data.name,
       description: data.description,
       type: data.type,
       version: data.version,
       status: data.status,
       config: JSON.parse(data.config),
       triggers: JSON.parse(data.triggers),
       actions: JSON.parse(data.actions),
       flow: JSON.parse(data.flow),
       variables: JSON.parse(data.variables),
       access: JSON.parse(data.access),
       metadata: {
         ...JSON.parse(data.metadata),
         createdAt: new Date(data.created_at),
         updatedAt: new Date(data.updated_at)
       }
     };
   }

   private serializeExecution(execution: WorkflowExecution): any {
     return {
       id: execution.id,
       workflow_id: execution.workflowId,
       workflow_version: execution.workflowVersion,
       status: execution.status,
       context: JSON.stringify(execution.context),
       progress: JSON.stringify(execution.progress),
       results: JSON.stringify(execution.results),
       control: JSON.stringify(execution.control),
       metadata: JSON.stringify(execution.metadata),
       created_at: execution.metadata.createdAt.toISOString(),
       updated_at: execution.metadata.updatedAt.toISOString()
     };
   }

   private deserializeExecution(data: any): WorkflowExecution {
     return {
       id: data.id,
       workflowId: data.workflow_id,
       workflowVersion: data.workflow_version,
       status: data.status,
       context: JSON.parse(data.context),
       progress: JSON.parse(data.progress),
       results: {
         ...JSON.parse(data.results),
         logs: JSON.parse(data.results).logs.map((log: any) => ({
           ...log,
           timestamp: new Date(log.timestamp)
         })),
         metrics: {
           ...JSON.parse(data.results).metrics,
           startTime: new Date(JSON.parse(data.results).metrics.startTime),
           endTime: JSON.parse(data.results).metrics.endTime ? 
             new Date(JSON.parse(data.results).metrics.endTime) : undefined
         }
       },
       control: {
         ...JSON.parse(data.control),
         timeout: JSON.parse(data.control).timeout ? 
           new Date(JSON.parse(data.control).timeout) : undefined,
         pausedAt: JSON.parse(data.control).pausedAt ? 
           new Date(JSON.parse(data.control).pausedAt) : undefined,
         resumedAt: JSON.parse(data.control).resumedAt ? 
           new Date(JSON.parse(data.control).resumedAt) : undefined,
         cancelledAt: JSON.parse(data.control).cancelledAt ? 
           new Date(JSON.parse(data.control).cancelledAt) : undefined
       },
       metadata: {
         ...JSON.parse(data.metadata),
         createdAt: new Date(data.created_at),
         updatedAt: new Date(data.updated_at),
         scheduledFor: JSON.parse(data.metadata).scheduledFor ? 
           new Date(JSON.parse(data.metadata).scheduledFor) : undefined
       }
     };
   }
 }

 // Instância global do sistema
 let automationSystem: AutomationWorkflowSystem | null = null;

 // Funções utilitárias exportadas
 export async function getAutomationSystem(): Promise<AutomationWorkflowSystem> {
   if (!automationSystem) {
     automationSystem = new AutomationWorkflowSystem();
     await automationSystem.initialize();
   }
   return automationSystem;
 }

 export async function createWorkflow(workflow: Omit<Workflow, 'id'> & { metadata?: Partial<Workflow['metadata']> }): Promise<string> {
  const system = await getAutomationSystem();
  return system.createWorkflow(workflow);
}

 export async function executeWorkflow(
   workflowId: string, 
   input?: Record<string, any>, 
   options?: {
     priority?: ExecutionPriority;
     scheduledFor?: Date;
     variables?: Record<string, any>;
   }
 ): Promise<string> {
   const system = await getAutomationSystem();
   return system.executeWorkflow(workflowId, input, options);
 }

 export async function getWorkflowStatus(workflowId: string): Promise<WorkflowStatus | null> {
   const system = await getAutomationSystem();
   const workflow = await system.getWorkflow(workflowId);
   return workflow?.status || null;
 }

 export async function getExecutionStatus(executionId: string): Promise<ExecutionStatus | null> {
   const system = await getAutomationSystem();
   const execution = await system.getExecution(executionId);
   return execution?.status || null;
 }

 export async function pauseWorkflow(workflowId: string): Promise<void> {
   const system = await getAutomationSystem();
   await system.pauseWorkflow(workflowId);
 }

 export async function resumeWorkflow(workflowId: string): Promise<void> {
   const system = await getAutomationSystem();
   await system.resumeWorkflow(workflowId);
 }

 export async function cancelWorkflowExecution(executionId: string): Promise<void> {
   const system = await getAutomationSystem();
   await system.cancelExecution(executionId);
 }

 export async function pauseWorkflowExecution(executionId: string): Promise<void> {
   const system = await getAutomationSystem();
   await system.pauseExecution(executionId);
 }

 export async function resumeWorkflowExecution(executionId: string): Promise<void> {
   const system = await getAutomationSystem();
   await system.resumeExecution(executionId);
 }

 export async function getSystemStatistics(): Promise<any> {
   const system = await getAutomationSystem();
   return system.getSystemStats();
 }

 // Hook para React/Next.js
 export function useWorkflowAutomation() {
   const [workflows, setWorkflows] = useState<Workflow[]>([]);
   const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const loadWorkflows = useCallback(async () => {
     try {
       setLoading(true);
       setError(null);
       const system = await getAutomationSystem();
       // Implementar método para listar workflows
       const workflowList: Workflow[] = [];
       setWorkflows(workflowList);
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Erro ao carregar workflows');
     } finally {
       setLoading(false);
     }
   }, []);

   const loadExecutions = useCallback(async (workflowId?: string) => {
     try {
       setLoading(true);
       setError(null);
       const system = await getAutomationSystem();
       // Implementar método para listar execuções
       const executionList: WorkflowExecution[] = [];
       setExecutions(executionList);
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Erro ao carregar execuções');
     } finally {
       setLoading(false);
     }
   }, []);

   const executeWorkflowHook = useCallback(async (
     workflowId: string, 
     input?: Record<string, any>
   ) => {
     try {
       setError(null);
       const executionId = await executeWorkflow(workflowId, input);
       await loadExecutions();
       return executionId;
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Erro ao executar workflow');
       throw err;
     }
   }, [loadExecutions]);

   const cancelExecution = useCallback(async (executionId: string) => {
     try {
       setError(null);
       await cancelWorkflowExecution(executionId);
       await loadExecutions();
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Erro ao cancelar execução');
       throw err;
     }
   }, [loadExecutions]);

   useEffect(() => {
     loadWorkflows();
   }, [loadWorkflows]);

   return {
     workflows,
     executions,
     loading,
     error,
     loadWorkflows,
     loadExecutions,
     executeWorkflow: executeWorkflowHook,
     cancelExecution
   };
 }

 // Middleware para Next.js
 export function createAutomationMiddleware() {
   return async (req: any, res: any, next: any) => {
     try {
       req.automationSystem = await getAutomationSystem();
       next();
     } catch (error) {
       console.error('Erro ao inicializar sistema de automação:', error);
       res.status(500).json({ error: 'Erro interno do servidor' });
     }
   };
 }

 // Instância global do sistema
 export const automationWorkflowSystem = new AutomationWorkflowSystem();

 // Tipos e constantes já exportados nas definições acima