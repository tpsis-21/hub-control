/**
 * Sistema de Monitoramento de Recursos do Sistema
 * 
 * Monitora CPU, memória, rede, armazenamento e outras métricas
 * importantes para otimização de performance e detecção de problemas.
 */

// ============================================
// INTERFACES E TIPOS
// ============================================

import { SecuritySeverity } from './security';

export interface SystemMetrics {
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  network: NetworkMetrics;
  storage: StorageMetrics;
  battery?: BatteryMetrics;
  performance: PerformanceMetrics;
  timestamp: number;
}

export interface CpuMetrics {
  usage: number; // Porcentagem de uso
  cores: number; // Número de cores
  frequency: number; // Frequência em GHz
  temperature?: number; // Temperatura em Celsius
  processes: ProcessInfo[];
  loadAverage: number[];
}

export interface MemoryMetrics {
  total: number; // Total em bytes
  used: number; // Usado em bytes
  free: number; // Livre em bytes
  available: number; // Disponível em bytes
  usage: number; // Porcentagem de uso
  swap: {
    total: number;
    used: number;
    free: number;
  };
  heap: {
    total: number;
    used: number;
    limit: number;
  };
}

export interface NetworkMetrics {
  bytesReceived: number;
  bytesSent: number;
  packetsReceived: number;
  packetsSent: number;
  connectionType: string;
  effectiveType: string;
  downlink: number; // Mbps
  rtt: number; // Round trip time em ms
  saveData: boolean;
  interfaces: NetworkInterface[];
}

export interface StorageMetrics {
  total: number;
  used: number;
  free: number;
  usage: number;
  quota?: {
    estimate: number;
    usage: number;
  };
  indexedDB: {
    usage: number;
    quota: number;
  };
  localStorage: {
    usage: number;
    quota: number;
  };
}

export interface BatteryMetrics {
  level: number; // 0-1
  charging: boolean;
  chargingTime: number; // Segundos
  dischargingTime: number; // Segundos
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryPressure: 'low' | 'medium' | 'high';
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
  powerEfficiency: number;
  renderingMetrics: {
    droppedFrames: number;
    totalFrames: number;
    averageFrameTime: number;
  };
}

export interface ProcessInfo {
  name: string;
  pid: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface NetworkInterface {
  name: string;
  type: string;
  speed: number;
  bytesReceived: number;
  bytesSent: number;
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
}

export interface MonitoringConfig {
  interval: number; // Intervalo de coleta em ms
  retentionPeriod: number; // Período de retenção em ms
  alerts: AlertConfig[];
  enabledMetrics: MetricType[];
  adaptiveInterval: boolean;
  backgroundMode: boolean;
}

export interface AlertConfig {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: AlertSeverity;
  cooldown: number; // Tempo mínimo entre alertas em ms
}

export type AlertType = 'cpu' | 'memory' | 'network' | 'storage' | 'battery' | 'performance';
export type AlertSeverity = SecuritySeverity;
export type MetricType = 'cpu' | 'memory' | 'network' | 'storage' | 'battery' | 'performance';

// ============================================
// COLETORES DE MÉTRICAS
// ============================================

class CpuMonitor {
  private lastMeasurement: { idle: number; total: number } | null = null;

  async getCpuMetrics(): Promise<CpuMetrics> {
    const cores = navigator.hardwareConcurrency || 4;
    
    // Simular uso de CPU baseado em performance
    const usage = await this.calculateCpuUsage();
    
    return {
      usage,
      cores,
      frequency: this.estimateFrequency(),
      processes: await this.getTopProcesses(),
      loadAverage: this.getLoadAverage()
    };
  }

  private async calculateCpuUsage(): Promise<number> {
    // Usar Performance API para estimar uso de CPU
    const start = performance.now();
    
    // Executar uma tarefa computacionalmente intensiva
    let iterations = 0;
    const targetTime = 10; // 10ms
    
    while (performance.now() - start < targetTime) {
      Math.random() * Math.random();
      iterations++;
    }
    
    const actualTime = performance.now() - start;
    const efficiency = iterations / actualTime;
    
    // Estimar uso baseado na eficiência
    const baselineEfficiency = 100000; // Valor de referência
    const usage = Math.max(0, Math.min(100, 100 - (efficiency / baselineEfficiency) * 100));
    
    return Math.round(usage * 10) / 10;
  }

  private estimateFrequency(): number {
    // Estimar frequência baseada em performance
    const start = performance.now();
    let count = 0;
    
    while (performance.now() - start < 1) {
      count++;
    }
    
    // Converter para estimativa de GHz
    return Math.round((count / 1000000) * 10) / 10;
  }

  private async getTopProcesses(): Promise<ProcessInfo[]> {
    // No navegador, não temos acesso direto aos processos
    // Simular com base em recursos conhecidos
    return [
      {
        name: 'Browser Tab',
        pid: 1,
        cpuUsage: Math.random() * 20,
        memoryUsage: Math.random() * 100
      },
      {
        name: 'JavaScript Engine',
        pid: 2,
        cpuUsage: Math.random() * 15,
        memoryUsage: Math.random() * 80
      }
    ];
  }

  private getLoadAverage(): number[] {
    // Simular load average
    return [
      Math.random() * 2,
      Math.random() * 2,
      Math.random() * 2
    ];
  }
}

class MemoryMonitor {
  async getMemoryMetrics(): Promise<MemoryMetrics> {
    const memoryInfo = await this.getMemoryInfo();
    const heapInfo = this.getHeapInfo();
    
    return {
      total: memoryInfo.total,
      used: memoryInfo.used,
      free: memoryInfo.free,
      available: memoryInfo.available,
      usage: (memoryInfo.used / memoryInfo.total) * 100,
      swap: {
        total: 0,
        used: 0,
        free: 0
      },
      heap: heapInfo
    };
  }

  private async getMemoryInfo(): Promise<{
    total: number;
    used: number;
    free: number;
    available: number;
  }> {
    // Usar Memory API se disponível
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        total: memory.jsHeapSizeLimit,
        used: memory.usedJSHeapSize,
        free: memory.jsHeapSizeLimit - memory.usedJSHeapSize,
        available: memory.jsHeapSizeLimit - memory.usedJSHeapSize
      };
    }
    
    // Fallback: estimar baseado em navigator
    const estimatedTotal = (navigator as any).deviceMemory 
      ? (navigator as any).deviceMemory * 1024 * 1024 * 1024 
      : 8 * 1024 * 1024 * 1024; // 8GB padrão
    
    const estimatedUsed = estimatedTotal * (0.3 + Math.random() * 0.4); // 30-70%
    
    return {
      total: estimatedTotal,
      used: estimatedUsed,
      free: estimatedTotal - estimatedUsed,
      available: estimatedTotal - estimatedUsed
    };
  }

  private getHeapInfo(): {
    total: number;
    used: number;
    limit: number;
  } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        total: memory.totalJSHeapSize,
        used: memory.usedJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    }
    
    return {
      total: 0,
      used: 0,
      limit: 0
    };
  }
}

class NetworkMonitor {
  private lastMeasurement: {
    bytesReceived: number;
    bytesSent: number;
    timestamp: number;
  } | null = null;

  async getNetworkMetrics(): Promise<NetworkMetrics> {
    const connection = this.getConnectionInfo();
    const traffic = await this.getNetworkTraffic();
    
    return {
      ...traffic,
      connectionType: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
      interfaces: await this.getNetworkInterfaces()
    };
  }

  private getConnectionInfo(): {
    type: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false
      };
    }
    
    return {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    };
  }

  private async getNetworkTraffic(): Promise<{
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  }> {
    // No navegador, não temos acesso direto ao tráfego de rede
    // Simular baseado em atividade
    const now = Date.now();
    
    if (this.lastMeasurement) {
      const timeDiff = now - this.lastMeasurement.timestamp;
      const bytesReceived = this.lastMeasurement.bytesReceived + Math.random() * 1000 * (timeDiff / 1000);
      const bytesSent = this.lastMeasurement.bytesSent + Math.random() * 500 * (timeDiff / 1000);
      
      this.lastMeasurement = {
        bytesReceived,
        bytesSent,
        timestamp: now
      };
      
      return {
        bytesReceived,
        bytesSent,
        packetsReceived: Math.floor(bytesReceived / 1500),
        packetsSent: Math.floor(bytesSent / 1500)
      };
    }
    
    this.lastMeasurement = {
      bytesReceived: 0,
      bytesSent: 0,
      timestamp: now
    };
    
    return {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0
    };
  }

  private async getNetworkInterfaces(): Promise<NetworkInterface[]> {
    // Simular interfaces de rede
    return [
      {
        name: 'WiFi',
        type: 'wireless',
        speed: 100,
        bytesReceived: Math.random() * 1000000,
        bytesSent: Math.random() * 500000
      }
    ];
  }
}

class StorageMonitor {
  async getStorageMetrics(): Promise<StorageMetrics> {
    const quota = await this.getStorageQuota();
    const indexedDB = await this.getIndexedDBUsage();
    const localStorage = this.getLocalStorageUsage();
    
    return {
      total: quota.quota,
      used: quota.usage,
      free: quota.quota - quota.usage,
      usage: (quota.usage / quota.quota) * 100,
      quota: {
        estimate: quota.quota,
        usage: quota.usage
      },
      indexedDB,
      localStorage
    };
  }

  private async getStorageQuota(): Promise<{ quota: number; usage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota || 0,
          usage: estimate.usage || 0
        };
      } catch (error) {
        console.warn('Erro ao obter quota de armazenamento:', error);
      }
    }
    
    return {
      quota: 50 * 1024 * 1024, // 50MB padrão
      usage: 10 * 1024 * 1024   // 10MB usado
    };
  }

  private async getIndexedDBUsage(): Promise<{ usage: number; quota: number }> {
    // Estimar uso do IndexedDB
    return {
      usage: Math.random() * 10 * 1024 * 1024, // 0-10MB
      quota: 50 * 1024 * 1024 // 50MB
    };
  }

  private getLocalStorageUsage(): { usage: number; quota: number } {
    let usage = 0;
    
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          usage += localStorage[key].length + key.length;
        }
      }
    } catch (error) {
      console.warn('Erro ao calcular uso do localStorage:', error);
    }
    
    return {
      usage: usage * 2, // Aproximação em bytes
      quota: 5 * 1024 * 1024 // 5MB típico
    };
  }
}

class BatteryMonitor {
  async getBatteryMetrics(): Promise<BatteryMetrics | undefined> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } catch (error) {
        console.warn('Erro ao obter informações da bateria:', error);
      }
    }
    
    return undefined;
  }
}

class PerformanceMonitor {
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private frameTimes: number[] = [];

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const fps = this.calculateFPS();
    const frameTime = this.getAverageFrameTime();
    
    return {
      fps,
      frameTime,
      memoryPressure: this.getMemoryPressure(),
      thermalState: this.getThermalState(),
      powerEfficiency: this.calculatePowerEfficiency(),
      renderingMetrics: {
        droppedFrames: this.getDroppedFrames(),
        totalFrames: this.frameCount,
        averageFrameTime: frameTime
      }
    };
  }

  private calculateFPS(): number {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    
    if (deltaTime >= 1000) {
      const fps = (this.frameCount * 1000) / deltaTime;
      this.frameCount = 0;
      this.lastFrameTime = now;
      return Math.round(fps);
    }
    
    this.frameCount++;
    return 60; // Valor padrão
  }

  private getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 16.67; // 60fps
    
    const average = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
    return Math.round(average * 100) / 100;
  }

  private getMemoryPressure(): 'low' | 'medium' | 'high' {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      if (usage > 0.8) return 'high';
      if (usage > 0.6) return 'medium';
      return 'low';
    }
    
    return 'low';
  }

  private getThermalState(): 'nominal' | 'fair' | 'serious' | 'critical' {
    // Simular baseado em performance
    const random = Math.random();
    if (random > 0.95) return 'critical';
    if (random > 0.85) return 'serious';
    if (random > 0.7) return 'fair';
    return 'nominal';
  }

  private calculatePowerEfficiency(): number {
    // Estimar eficiência energética baseada em FPS e uso de CPU
    const fps = this.calculateFPS();
    return Math.min(100, (fps / 60) * 100);
  }

  private getDroppedFrames(): number {
    // Simular frames perdidos
    return Math.floor(Math.random() * 5);
  }

  updateFrameTime(frameTime: number): void {
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }
  }
}

// ============================================
// SISTEMA DE ALERTAS
// ============================================

class AlertManager {
  private alerts: SystemAlert[] = [];
  private lastAlerts = new Map<string, number>();
  private config: AlertConfig[];

  constructor(config: AlertConfig[]) {
    this.config = config;
  }

  checkAlerts(metrics: SystemMetrics): SystemAlert[] {
    const newAlerts: SystemAlert[] = [];
    const now = Date.now();

    for (const alertConfig of this.config) {
      const value = this.getMetricValue(metrics, alertConfig.metric);
      const shouldAlert = this.evaluateCondition(value, alertConfig.threshold, alertConfig.operator);
      
      if (shouldAlert) {
        const lastAlert = this.lastAlerts.get(alertConfig.metric);
        
        // Verificar cooldown
        if (!lastAlert || now - lastAlert > alertConfig.cooldown) {
          const alert: SystemAlert = {
            id: `${alertConfig.metric}_${now}`,
            type: this.getAlertType(alertConfig.metric),
            severity: alertConfig.severity,
            message: this.generateAlertMessage(alertConfig, value),
            metric: alertConfig.metric,
            value,
            threshold: alertConfig.threshold,
            timestamp: now,
            resolved: false
          };
          
          newAlerts.push(alert);
          this.alerts.push(alert);
          this.lastAlerts.set(alertConfig.metric, now);
        }
      }
    }

    return newAlerts;
  }

  private getMetricValue(metrics: SystemMetrics, metricPath: string): number {
    const parts = metricPath.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : 0;
  }

  private evaluateCondition(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  private getAlertType(metric: string): AlertType {
    if (metric.startsWith('cpu')) return 'cpu';
    if (metric.startsWith('memory')) return 'memory';
    if (metric.startsWith('network')) return 'network';
    if (metric.startsWith('storage')) return 'storage';
    if (metric.startsWith('battery')) return 'battery';
    return 'performance';
  }

  private generateAlertMessage(config: AlertConfig, value: number): string {
    const metricName = config.metric.replace(/\./g, ' ');
    const operator = {
      'gt': 'acima de',
      'lt': 'abaixo de',
      'gte': 'igual ou acima de',
      'lte': 'igual ou abaixo de',
      'eq': 'igual a'
    }[config.operator] || 'comparado com';
    
    return `${metricName} está ${operator} ${config.threshold} (valor atual: ${value.toFixed(2)})`;
  }

  getActiveAlerts(): SystemAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  clearOldAlerts(maxAge: number): void {
    const cutoff = Date.now() - maxAge;
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff);
  }
}

// ============================================
// MONITOR PRINCIPAL
// ============================================

export class SystemMonitor {
  private cpuMonitor = new CpuMonitor();
  private memoryMonitor = new MemoryMonitor();
  private networkMonitor = new NetworkMonitor();
  private storageMonitor = new StorageMonitor();
  private batteryMonitor = new BatteryMonitor();
  private performanceMonitor = new PerformanceMonitor();
  private alertManager: AlertManager;
  
  private config: MonitoringConfig;
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;
  private metricsHistory: SystemMetrics[] = [];
  private listeners: ((metrics: SystemMetrics) => void)[] = [];
  private alertListeners: ((alerts: SystemAlert[]) => void)[] = [];

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      interval: 5000, // 5 segundos
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 horas
      alerts: [
        { metric: 'cpu.usage', threshold: 80, operator: 'gt', severity: SecuritySeverity.HIGH, cooldown: 60000 },
{ metric: 'memory.usage', threshold: 85, operator: 'gt', severity: SecuritySeverity.HIGH, cooldown: 60000 },
{ metric: 'storage.usage', threshold: 90, operator: 'gt', severity: SecuritySeverity.MEDIUM, cooldown: 300000 },
{ metric: 'performance.fps', threshold: 30, operator: 'lt', severity: SecuritySeverity.MEDIUM, cooldown: 30000 }
      ],
      enabledMetrics: ['cpu', 'memory', 'network', 'storage', 'performance'],
      adaptiveInterval: true,
      backgroundMode: false,
      ...config
    };

    this.alertManager = new AlertManager(this.config.alerts);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    await this.collectMetrics();
    
    this.intervalId = setInterval(async () => {
      await this.collectMetrics();
    }, this.config.interval);
    
    console.log('Monitor de sistema iniciado');
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    console.log('Monitor de sistema parado');
  }

  async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = Date.now();
    const enabledMetrics = this.config.enabledMetrics;
    
    const metrics: SystemMetrics = {
      cpu: enabledMetrics.includes('cpu') ? await this.cpuMonitor.getCpuMetrics() : {} as CpuMetrics,
      memory: enabledMetrics.includes('memory') ? await this.memoryMonitor.getMemoryMetrics() : {} as MemoryMetrics,
      network: enabledMetrics.includes('network') ? await this.networkMonitor.getNetworkMetrics() : {} as NetworkMetrics,
      storage: enabledMetrics.includes('storage') ? await this.storageMonitor.getStorageMetrics() : {} as StorageMetrics,
      battery: enabledMetrics.includes('battery') ? await this.batteryMonitor.getBatteryMetrics() : undefined,
      performance: enabledMetrics.includes('performance') ? await this.performanceMonitor.getPerformanceMetrics() : {} as PerformanceMetrics,
      timestamp
    };

    // Adicionar ao histórico
    this.metricsHistory.push(metrics);
    this.cleanupHistory();
    
    // Verificar alertas
    const newAlerts = this.alertManager.checkAlerts(metrics);
    if (newAlerts.length > 0) {
      this.notifyAlertListeners(newAlerts);
    }
    
    // Notificar listeners
    this.notifyListeners(metrics);
    
    // Ajustar intervalo adaptativamente
    if (this.config.adaptiveInterval) {
      this.adjustInterval(metrics);
    }
    
    return metrics;
  }

  getLatestMetrics(): SystemMetrics | null {
    return this.metricsHistory[this.metricsHistory.length - 1] || null;
  }

  getMetricsHistory(duration?: number): SystemMetrics[] {
    if (!duration) return [...this.metricsHistory];
    
    const cutoff = Date.now() - duration;
    return this.metricsHistory.filter(m => m.timestamp > cutoff);
  }

  getActiveAlerts(): SystemAlert[] {
    return this.alertManager.getActiveAlerts();
  }

  resolveAlert(alertId: string): void {
    this.alertManager.resolveAlert(alertId);
  }

  onMetrics(callback: (metrics: SystemMetrics) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  onAlert(callback: (alerts: SystemAlert[]) => void): () => void {
    this.alertListeners.push(callback);
    return () => {
      const index = this.alertListeners.indexOf(callback);
      if (index > -1) {
        this.alertListeners.splice(index, 1);
      }
    };
  }

  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.alerts) {
      this.alertManager = new AlertManager(this.config.alerts);
    }
    
    if (this.isRunning && newConfig.interval) {
      this.stop();
      this.start();
    }
  }

  private cleanupHistory(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoff);
    this.alertManager.clearOldAlerts(this.config.retentionPeriod);
  }

  private adjustInterval(metrics: SystemMetrics): void {
    // Ajustar intervalo baseado na carga do sistema
    const cpuUsage = metrics.cpu?.usage || 0;
    const memoryUsage = metrics.memory?.usage || 0;
    
    let newInterval = this.config.interval;
    
    if (cpuUsage > 80 || memoryUsage > 80) {
      // Sistema sob carga - reduzir frequência
      newInterval = Math.min(this.config.interval * 2, 30000);
    } else if (cpuUsage < 20 && memoryUsage < 40) {
      // Sistema ocioso - pode aumentar frequência
      newInterval = Math.max(this.config.interval * 0.8, 1000);
    }
    
    if (newInterval !== this.config.interval) {
      this.config.interval = newInterval;
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = setInterval(async () => {
          await this.collectMetrics();
        }, newInterval);
      }
    }
  }

  private notifyListeners(metrics: SystemMetrics): void {
    for (const listener of this.listeners) {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Erro ao notificar listener de métricas:', error);
      }
    }
  }

  private notifyAlertListeners(alerts: SystemAlert[]): void {
    for (const listener of this.alertListeners) {
      try {
        listener(alerts);
      } catch (error) {
        console.error('Erro ao notificar listener de alertas:', error);
      }
    }
  }
}

// ============================================
// INSTÂNCIA GLOBAL COM LAZY INITIALIZATION
// ============================================

let _systemMonitor: SystemMonitor | null = null;

export function getSystemMonitor(): SystemMonitor {
  if (typeof window === 'undefined') {
    // No servidor, retornar uma instância mock
    return {
      start: async () => {},
      stop: () => {},
      getLatestMetrics: () => null,
      getMetricsHistory: () => [],
      getActiveAlerts: () => [],
      resolveAlert: () => {},
      onMetrics: () => () => {},
      onAlert: () => () => {},
      updateConfig: () => {}
    } as any;
  }
  
  if (!_systemMonitor) {
    _systemMonitor = new SystemMonitor();
  }
  
  return _systemMonitor;
}

// Manter compatibilidade com código existente
export const systemMonitor = getSystemMonitor();

// ============================================
// HOOKS REACT
// ============================================

import { useState, useEffect, useCallback } from 'react';

export function useSystemMetrics(interval?: number) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const startMonitoring = async () => {
      try {
        if (interval) {
          systemMonitor.updateConfig({ interval });
        }
        
        await systemMonitor.start();
        
        const unsubscribe = systemMonitor.onMetrics((newMetrics) => {
          if (mounted) {
            setMetrics(newMetrics);
            setLoading(false);
          }
        });

        // Obter métricas iniciais
        const initialMetrics = systemMonitor.getLatestMetrics();
        if (initialMetrics && mounted) {
          setMetrics(initialMetrics);
          setLoading(false);
        }

        return unsubscribe;
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Erro desconhecido'));
          setLoading(false);
        }
      }
    };

    const unsubscribePromise = startMonitoring();

    return () => {
      mounted = false;
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [interval]);

  return { metrics, loading, error };
}

export function useSystemAlerts() {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);

  useEffect(() => {
    const unsubscribe = systemMonitor.onAlert((newAlerts) => {
      setAlerts(current => [...current, ...newAlerts]);
    });

    // Obter alertas ativos
    setAlerts(systemMonitor.getActiveAlerts());

    return unsubscribe;
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    systemMonitor.resolveAlert(alertId);
    setAlerts(current => current.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  }, []);

  const clearAlert = useCallback((alertId: string) => {
    setAlerts(current => current.filter(alert => alert.id !== alertId));
  }, []);

  return {
    alerts: alerts.filter(alert => !alert.resolved),
    resolvedAlerts: alerts.filter(alert => alert.resolved),
    resolveAlert,
    clearAlert
  };
}

export function useMetricHistory(metric: string, duration: number = 60000) {
  const [history, setHistory] = useState<{ timestamp: number; value: number }[]>([]);

  useEffect(() => {
    const updateHistory = () => {
      const metricsHistory = systemMonitor.getMetricsHistory(duration);
      const metricHistory = metricsHistory.map(m => ({
        timestamp: m.timestamp,
        value: getNestedValue(m, metric)
      })).filter(item => typeof item.value === 'number');
      
      setHistory(metricHistory);
    };

    const unsubscribe = systemMonitor.onMetrics(() => {
      updateHistory();
    });

    updateHistory();

    return unsubscribe;
  }, [metric, duration]);

  return history;
}

// ============================================
// UTILITÁRIOS
// ============================================

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

export const systemUtils = {
  formatBytes: (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatPercentage: (value: number): string => {
    return `${Math.round(value * 10) / 10}%`;
  },

  formatDuration: (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  },

  getHealthStatus: (metrics: SystemMetrics): 'excellent' | 'good' | 'warning' | 'critical' => {
    const cpuUsage = metrics.cpu?.usage || 0;
    const memoryUsage = metrics.memory?.usage || 0;
    const storageUsage = metrics.storage?.usage || 0;
    
    const maxUsage = Math.max(cpuUsage, memoryUsage, storageUsage);
    
    if (maxUsage > 90) return 'critical';
    if (maxUsage > 75) return 'warning';
    if (maxUsage > 50) return 'good';
    return 'excellent';
  }
};