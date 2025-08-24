/**
 * Dashboard de Otimização de Banco de Dados
 * 
 * Interface para monitorar performance de queries, visualizar recomendações
 * de índices e configurar otimizações automáticas.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { 
  useDatabaseQueryOptimizer, 
  formatExecutionTime, 
  getQueryType, 
  estimateQueryComplexity,
  type QueryPerformanceMetrics,
  type SlowQueryAlert,
  type IndexRecommendation
} from '@/lib/database-query-optimizer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Clock, 
  Database, 
  FileText, 
  Lightbulb, 
  RefreshCw, 
  Settings, 
  TrendingUp, 
  Zap,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

export function DatabaseOptimizationDashboard() {
  const {
    metrics,
    slowQueries,
    indexRecommendations,
    optimizationRules,
    config,
    statistics,
    isAnalyzing,
    logQueryExecution,
    analyzeQuery,
    optimizeQuery,
    generateIndexRecommendations,
    updateDatabaseStatistics,
    updateConfig,
    updateOptimizationRules,
    clearMetrics,
    clearSlowQueries,
    clearRecommendations
  } = useDatabaseQueryOptimizer();

  const [selectedQuery, setSelectedQuery] = useState<string>('');
  const [queryAnalysis, setQueryAnalysis] = useState<string[]>([]);
  const [testQuery, setTestQuery] = useState<string>('');

  // ============================================
  // ESTATÍSTICAS CALCULADAS
  // ============================================

  const recentMetrics = useMemo(() => {
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);
    return metrics.filter(m => m.timestamp > last24h);
  }, [metrics]);

  const queryTypeStats = useMemo(() => {
    const stats = new Map<string, number>();
    recentMetrics.forEach(metric => {
      const type = getQueryType(metric.query);
      stats.set(type, (stats.get(type) || 0) + 1);
    });
    return Array.from(stats.entries()).map(([type, count]) => ({ type, count }));
  }, [recentMetrics]);

  const performanceStats = useMemo(() => {
    if (recentMetrics.length === 0) {
      return {
        averageTime: 0,
        fastQueries: 0,
        slowQueries: 0,
        criticalQueries: 0
      };
    }

    const totalTime = recentMetrics.reduce((sum, m) => sum + m.executionTime, 0);
    const averageTime = totalTime / recentMetrics.length;
    
    return {
      averageTime,
      fastQueries: recentMetrics.filter(m => m.executionTime < 100).length,
      slowQueries: recentMetrics.filter(m => m.executionTime >= 1000 && m.executionTime < 5000).length,
      criticalQueries: recentMetrics.filter(m => m.executionTime >= 5000).length
    };
  }, [recentMetrics]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleAnalyzeQuery = () => {
    if (testQuery.trim()) {
      const suggestions = analyzeQuery(testQuery);
      setQueryAnalysis(suggestions);
    }
  };

  const handleOptimizeQuery = () => {
    if (testQuery.trim()) {
      const optimized = optimizeQuery(testQuery);
      setTestQuery(optimized);
    }
  };

  const handleConfigUpdate = (key: keyof typeof config, value: any) => {
    updateConfig(prev => ({ ...prev, [key]: value }));
  };

  const getSeverityColor = (severity: SlowQueryAlert['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: IndexRecommendation['priority']) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Otimização de Banco de Dados</h1>
          <p className="text-muted-foreground">
            Monitore performance, analise queries e otimize o banco de dados
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={updateDatabaseStatistics}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={generateIndexRecommendations}
            disabled={isAnalyzing}
            size="sm"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            {isAnalyzing ? 'Analisando...' : 'Gerar Recomendações'}
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queries (24h)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentMetrics.length}</div>
            <p className="text-xs text-muted-foreground">
              Média: {formatExecutionTime(performanceStats.averageTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queries Lentas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {performanceStats.slowQueries}
            </div>
            <p className="text-xs text-muted-foreground">
              Críticas: {performanceStats.criticalQueries}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recomendações</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {indexRecommendations.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Alta prioridade: {indexRecommendations.filter(r => r.priority === 'high').length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics?.indexHitRatio || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Cache: {statistics?.cacheHitRatio || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Principais */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="slow-queries">Queries Lentas</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
          <TabsTrigger value="analyzer">Analisador</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Performance por Tipo de Query */}
            <Card>
              <CardHeader>
                <CardTitle>Queries por Tipo (24h)</CardTitle>
                <CardDescription>
                  Distribuição dos tipos de queries executadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {queryTypeStats.map(({ type, count }) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ 
                              width: `${(count / Math.max(...queryTypeStats.map(s => s.count))) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Geral */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Geral</CardTitle>
                <CardDescription>
                  Distribuição de performance das queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600">Rápidas (&lt;100ms)</span>
                    <span className="text-sm font-bold">{performanceStats.fastQueries}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-600">Lentas (1-5s)</span>
                    <span className="text-sm font-bold">{performanceStats.slowQueries}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-600">Críticas (&gt;5s)</span>
                    <span className="text-sm font-bold">{performanceStats.criticalQueries}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {formatExecutionTime(performanceStats.averageTime)}
                    </div>
                    <p className="text-sm text-muted-foreground">Tempo médio de execução</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queries Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Queries Recentes</CardTitle>
              <CardDescription>
                Últimas queries executadas com métricas de performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentMetrics.slice(0, 10).map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{getQueryType(metric.query)}</Badge>
                        <Badge variant={estimateQueryComplexity(metric.query) === 'high' ? 'destructive' : 'secondary'}>
                          {estimateQueryComplexity(metric.query)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {metric.query.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatExecutionTime(metric.executionTime)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {metric.rowsReturned} linhas
                      </div>
                    </div>
                  </div>
                ))}
                
                {recentMetrics.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma query registrada nas últimas 24 horas</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queries Lentas */}
        <TabsContent value="slow-queries" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Queries Lentas</h3>
              <p className="text-sm text-muted-foreground">
                Queries que excederam o limite de {config.slowQueryThreshold}ms
              </p>
            </div>
            <Button 
              onClick={clearSlowQueries} 
              variant="outline" 
              size="sm"
              disabled={slowQueries.length === 0}
            >
              Limpar Lista
            </Button>
          </div>

          <div className="space-y-4">
            {slowQueries.map((alert) => (
              <Card key={alert.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <CardTitle className="text-base">
                        Query Lenta - {formatExecutionTime(alert.executionTime)}
                      </CardTitle>
                      <Badge variant={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {alert.timestamp.toLocaleString()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Query:</Label>
                      <div className="mt-1 p-3 bg-muted rounded-md">
                        <code className="text-sm">{alert.query}</code>
                      </div>
                    </div>
                    
                    {alert.suggestions.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Sugestões de Otimização:</Label>
                        <ul className="mt-1 space-y-1">
                          {alert.suggestions.map((suggestion, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {slowQueries.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma Query Lenta</h3>
                  <p className="text-muted-foreground">
                    Todas as queries estão executando dentro do limite de performance!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Recomendações de Índices */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Recomendações de Índices</h3>
              <p className="text-sm text-muted-foreground">
                Sugestões para melhorar a performance do banco de dados
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={clearRecommendations} 
                variant="outline" 
                size="sm"
                disabled={indexRecommendations.length === 0}
              >
                Limpar
              </Button>
              <Button 
                onClick={generateIndexRecommendations}
                disabled={isAnalyzing}
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isAnalyzing ? 'Analisando...' : 'Atualizar'}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {indexRecommendations.map((recommendation) => (
              <Card key={recommendation.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-base">
                        {recommendation.tableName}.{recommendation.columns.join(', ')}
                      </CardTitle>
                      <Badge variant={getPriorityColor(recommendation.priority)}>
                        {recommendation.priority}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      +{recommendation.estimatedImprovement}% performance
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {recommendation.reason}
                    </p>
                    
                    <div>
                      <Label className="text-sm font-medium">Padrão de Query:</Label>
                      <div className="mt-1 p-2 bg-muted rounded text-sm font-mono">
                        {recommendation.queryPattern}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">SQL para Criar Índice:</Label>
                      <div className="mt-1 p-2 bg-muted rounded text-sm font-mono">
                        CREATE INDEX idx_{recommendation.tableName}_{recommendation.columns.join('_')} 
                        ON {recommendation.tableName} ({recommendation.columns.join(', ')});
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {indexRecommendations.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Zap className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma Recomendação</h3>
                  <p className="text-muted-foreground">
                    Execute algumas queries ou aguarde a análise automática para ver recomendações.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Analisador de Queries */}
        <TabsContent value="analyzer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analisador de Queries</CardTitle>
              <CardDescription>
                Analise e otimize queries antes de executá-las
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test-query">Query SQL:</Label>
                <textarea
                  id="test-query"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Digite sua query SQL aqui..."
                  className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleAnalyzeQuery} disabled={!testQuery.trim()}>
                  <FileText className="h-4 w-4 mr-2" />
                  Analisar
                </Button>
                <Button 
                  onClick={handleOptimizeQuery} 
                  disabled={!testQuery.trim()}
                  variant="outline"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Otimizar
                </Button>
              </div>
              
              {queryAnalysis.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Análise da Query</AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 space-y-1">
                      {queryAnalysis.map((suggestion, index) => (
                        <li key={index} className="text-sm">
                          • {suggestion}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Otimização</CardTitle>
              <CardDescription>
                Configure os parâmetros de monitoramento e otimização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="slow-threshold">Limite Query Lenta (ms)</Label>
                  <Input
                    id="slow-threshold"
                    type="number"
                    value={config.slowQueryThreshold}
                    onChange={(e) => handleConfigUpdate('slowQueryThreshold', parseInt(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retention">Retenção de Logs (dias)</Label>
                  <Input
                    id="retention"
                    type="number"
                    value={config.maxLogRetention}
                    onChange={(e) => handleConfigUpdate('maxLogRetention', parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Otimização Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Aplicar otimizações automáticas em queries
                    </p>
                  </div>
                  <Switch
                    checked={config.enableAutoOptimization}
                    onCheckedChange={(checked) => handleConfigUpdate('enableAutoOptimization', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Log de Queries</Label>
                    <p className="text-sm text-muted-foreground">
                      Registrar todas as queries executadas
                    </p>
                  </div>
                  <Switch
                    checked={config.enableQueryLogging}
                    onCheckedChange={(checked) => handleConfigUpdate('enableQueryLogging', checked)}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium mb-3">Limites de Alerta</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="alert-time">Tempo de Execução (ms)</Label>
                    <Input
                      id="alert-time"
                      type="number"
                      value={config.alertThresholds.executionTime}
                      onChange={(e) => handleConfigUpdate('alertThresholds', {
                        ...config.alertThresholds,
                        executionTime: parseInt(e.target.value)
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="alert-rows">Linhas Escaneadas</Label>
                    <Input
                      id="alert-rows"
                      type="number"
                      value={config.alertThresholds.rowsScanned}
                      onChange={(e) => handleConfigUpdate('alertThresholds', {
                        ...config.alertThresholds,
                        rowsScanned: parseInt(e.target.value)
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="alert-misses">Index Misses</Label>
                    <Input
                      id="alert-misses"
                      type="number"
                      value={config.alertThresholds.indexMisses}
                      onChange={(e) => handleConfigUpdate('alertThresholds', {
                        ...config.alertThresholds,
                        indexMisses: parseInt(e.target.value)
                      })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}