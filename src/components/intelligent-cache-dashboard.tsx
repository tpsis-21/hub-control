/**
 * Dashboard Principal do Sistema de Cache Inteligente
 * 
 * Interface centralizada para monitorar e gerenciar todos os sistemas de cache:
 * - Cache de banco de dados
 * - Cache inteligente em memória
 * - Cache de assets
 * - Cache de API
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Zap, 
  HardDrive, 
  Activity, 
  TrendingUp, 
  Clock, 
  RefreshCw, 
  Settings, 
  Trash2,
  BarChart3,
  Layers,
  FileImage,
  Globe,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { logger } from '@/utils/production-logger';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface CacheSystemMetrics {
  name: string;
  type: 'database' | 'memory' | 'asset' | 'api';
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  hitRate: number;
  totalEntries: number;
  totalSize: number; // em bytes
  averageResponseTime: number; // em ms
  memoryUsage: number; // percentual
  lastUpdate: Date;
}

interface CachePerformanceData {
  timestamp: string;
  hitRate: number;
  responseTime: number;
  memoryUsage: number;
  requests: number;
}

interface CacheDistribution {
  name: string;
  value: number;
  color: string;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

function useIntelligentCacheSystem() {
  const [metrics, setMetrics] = useState<CacheSystemMetrics[]>([]);
  const [performanceData, setPerformanceData] = useState<CachePerformanceData[]>([]);
  const [distribution, setDistribution] = useState<CacheDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Simular dados dos sistemas de cache
  const generateMockData = () => {
    const now = new Date();
    
    const mockMetrics: CacheSystemMetrics[] = [
      {
        name: 'Cache de Banco de Dados',
        type: 'database',
        status: 'healthy',
        hitRate: 87.5,
        totalEntries: 15420,
        totalSize: 245 * 1024 * 1024, // 245MB
        averageResponseTime: 12.3,
        memoryUsage: 68.2,
        lastUpdate: now
      },
      {
        name: 'Cache Inteligente',
        type: 'memory',
        status: 'healthy',
        hitRate: 92.1,
        totalEntries: 8750,
        totalSize: 156 * 1024 * 1024, // 156MB
        averageResponseTime: 8.7,
        memoryUsage: 45.3,
        lastUpdate: now
      },
      {
        name: 'Cache de Assets',
        type: 'asset',
        status: 'warning',
        hitRate: 78.9,
        totalEntries: 3240,
        totalSize: 512 * 1024 * 1024, // 512MB
        averageResponseTime: 25.1,
        memoryUsage: 82.7,
        lastUpdate: now
      },
      {
        name: 'Cache de API',
        type: 'api',
        status: 'healthy',
        hitRate: 89.3,
        totalEntries: 5680,
        totalSize: 89 * 1024 * 1024, // 89MB
        averageResponseTime: 15.6,
        memoryUsage: 34.1,
        lastUpdate: now
      }
    ];

    // Dados de performance das últimas 24 horas
    const mockPerformanceData: CachePerformanceData[] = [];
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      mockPerformanceData.push({
        timestamp: timestamp.toISOString(),
        hitRate: 85 + Math.random() * 10,
        responseTime: 10 + Math.random() * 15,
        memoryUsage: 50 + Math.random() * 30,
        requests: 1000 + Math.random() * 2000
      });
    }

    // Distribuição de cache por tipo
    const mockDistribution: CacheDistribution[] = [
      { name: 'Banco de Dados', value: 245, color: '#8884d8' },
      { name: 'Memória', value: 156, color: '#82ca9d' },
      { name: 'Assets', value: 512, color: '#ffc658' },
      { name: 'API', value: 89, color: '#ff7c7c' }
    ];

    setMetrics(mockMetrics);
    setPerformanceData(mockPerformanceData);
    setDistribution(mockDistribution);
    setLastRefresh(now);
  };

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      generateMockData();
      setIsLoading(false);
    }, 1000);
  };

  const clearAllCaches = async () => {
    // Implementar limpeza de todos os caches
    logger.debug('Limpando todos os caches...', undefined, "DEBUG");
    await new Promise(resolve => setTimeout(resolve, 2000));
    refreshData();
  };

  const optimizeAllCaches = async () => {
    // Implementar otimização de todos os caches
    logger.debug('Otimizando todos os caches...', undefined, "DEBUG");
    await new Promise(resolve => setTimeout(resolve, 3000));
    refreshData();
  };

  useEffect(() => {
    generateMockData();
    setIsLoading(false);

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(generateMockData, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    performanceData,
    distribution,
    isLoading,
    lastRefresh,
    refreshData,
    clearAllCaches,
    optimizeAllCaches
  };
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy': return 'text-green-600';
    case 'warning': return 'text-yellow-600';
    case 'critical': return 'text-red-600';
    case 'offline': return 'text-gray-600';
    default: return 'text-gray-600';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
    case 'offline': return <XCircle className="h-4 w-4 text-gray-600" />;
    default: return <XCircle className="h-4 w-4 text-gray-600" />;
  }
}

function getCacheTypeIcon(type: string) {
  switch (type) {
    case 'database': return <Database className="h-5 w-5" />;
    case 'memory': return <Zap className="h-5 w-5" />;
    case 'asset': return <FileImage className="h-5 w-5" />;
    case 'api': return <Globe className="h-5 w-5" />;
    default: return <HardDrive className="h-5 w-5" />;
  }
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

interface IntelligentCacheDashboardProps {
  className?: string;
}

export function IntelligentCacheDashboard({ className }: IntelligentCacheDashboardProps) {
  const {
    metrics,
    performanceData,
    distribution,
    isLoading,
    lastRefresh,
    refreshData,
    clearAllCaches,
    optimizeAllCaches
  } = useIntelligentCacheSystem();

  const [activeTab, setActiveTab] = useState('overview');
  const [isClearing, setIsClearing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Cálculos agregados
  const totalHitRate = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.hitRate, 0) / metrics.length 
    : 0;
  const totalEntries = metrics.reduce((sum, m) => sum + m.totalEntries, 0);
  const totalSize = metrics.reduce((sum, m) => sum + m.totalSize, 0);
  const averageResponseTime = metrics.length > 0 
    ? metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length 
    : 0;

  const handleClearAll = async () => {
    setIsClearing(true);
    await clearAllCaches();
    setIsClearing(false);
  };

  const handleOptimizeAll = async () => {
    setIsOptimizing(true);
    await optimizeAllCaches();
    setIsOptimizing(false);
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sistema de Cache Inteligente</h2>
          <p className="text-muted-foreground">
            Monitoramento centralizado de todos os sistemas de cache
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOptimizeAll}
            disabled={isOptimizing}
          >
            <Settings className={`h-4 w-4 mr-2 ${isOptimizing ? 'animate-spin' : ''}`} />
            Otimizar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearAll}
            disabled={isClearing}
          >
            <Trash2 className={`h-4 w-4 mr-2 ${isClearing ? 'animate-spin' : ''}`} />
            Limpar Tudo
          </Button>
        </div>
      </div>

      {/* Métricas Gerais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto Geral</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHitRate.toFixed(1)}%</div>
            <Progress value={totalHitRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Média de todos os sistemas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Entradas em cache
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamanho Total</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalSize)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Memória utilizada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageResponseTime.toFixed(1)}ms</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tempo de resposta
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="systems">Sistemas</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="distribution">Distribuição</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gráfico de Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance nas Últimas 24h</CardTitle>
                <CardDescription>
                  Taxa de acerto e tempo de resposta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString('pt-BR')}
                      formatter={(value: any, name: string) => {
                        if (name === 'hitRate') return [`${value.toFixed(1)}%`, 'Taxa de Acerto'];
                        if (name === 'responseTime') return [`${value.toFixed(1)}ms`, 'Tempo de Resposta'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="hitRate" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Taxa de Acerto"
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Tempo de Resposta"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição de Uso */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Memória</CardTitle>
                <CardDescription>
                  Uso de memória por tipo de cache
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatBytes(value * 1024 * 1024)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatBytes(value * 1024 * 1024)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Status dos Sistemas */}
          <Card>
            <CardHeader>
              <CardTitle>Status dos Sistemas</CardTitle>
              <CardDescription>
                Estado atual de cada sistema de cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getCacheTypeIcon(metric.type)}
                      <div>
                        <h4 className="font-medium">{metric.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {metric.totalEntries.toLocaleString()} entradas • {formatBytes(metric.totalSize)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{metric.hitRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">{metric.averageResponseTime.toFixed(1)}ms</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(metric.status)}
                        <Badge variant={metric.status === 'healthy' ? 'default' : metric.status === 'warning' ? 'secondary' : 'destructive'}>
                          {metric.status === 'healthy' && 'Saudável'}
                          {metric.status === 'warning' && 'Atenção'}
                          {metric.status === 'critical' && 'Crítico'}
                          {metric.status === 'offline' && 'Offline'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sistemas Individuais */}
        <TabsContent value="systems" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {metrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getCacheTypeIcon(metric.type)}
                    {metric.name}
                  </CardTitle>
                  <CardDescription>
                    Sistema de cache {metric.type}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(metric.status)}
                      <span className={getStatusColor(metric.status)}>
                        {metric.status === 'healthy' && 'Saudável'}
                        {metric.status === 'warning' && 'Atenção'}
                        {metric.status === 'critical' && 'Crítico'}
                        {metric.status === 'offline' && 'Offline'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Acerto</span>
                      <span className="font-medium">{metric.hitRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={metric.hitRate} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uso de Memória</span>
                      <span className="font-medium">{metric.memoryUsage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metric.memoryUsage} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Entradas</span>
                      <div className="font-medium">{metric.totalEntries.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tamanho</span>
                      <div className="font-medium">{formatBytes(metric.totalSize)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tempo Médio</span>
                      <div className="font-medium">{metric.averageResponseTime.toFixed(1)}ms</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Última Atualização</span>
                      <div className="font-medium">{metric.lastUpdate.toLocaleTimeString('pt-BR')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Detalhada */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Performance</CardTitle>
              <CardDescription>
                Métricas detalhadas de performance dos últimos dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString('pt-BR')}
                    formatter={(value: any, name: string) => {
                      if (name === 'hitRate') return [`${value.toFixed(1)}%`, 'Taxa de Acerto'];
                      if (name === 'responseTime') return [`${value.toFixed(1)}ms`, 'Tempo de Resposta'];
                      if (name === 'memoryUsage') return [`${value.toFixed(1)}%`, 'Uso de Memória'];
                      if (name === 'requests') return [`${Math.round(value)}`, 'Requisições'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="hitRate" 
                    stackId="1" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                    name="Taxa de Acerto"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="memoryUsage" 
                    stackId="2" 
                    stroke="#82ca9d" 
                    fill="#82ca9d" 
                    fillOpacity={0.6}
                    name="Uso de Memória"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribuição */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
                <CardDescription>
                  Uso de memória por sistema de cache
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatBytes(value * 1024 * 1024)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas Detalhadas</CardTitle>
                <CardDescription>
                  Breakdown detalhado por sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {distribution.map((item, index) => {
                    const metric = metrics.find(m => m.name.includes(item.name.split(' ')[0]));
                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatBytes(item.value * 1024 * 1024)}</div>
                          {metric && (
                            <div className="text-sm text-muted-foreground">
                              {metric.hitRate.toFixed(1)}% hit rate
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Informações de Atualização */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Última atualização: {lastRefresh.toLocaleString('pt-BR')}</span>
        <span>Atualização automática a cada 30 segundos</span>
      </div>
    </div>
  );
}

export default IntelligentCacheDashboard;
