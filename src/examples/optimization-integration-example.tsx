/**
 * Exemplo de Integração do Sistema de Otimização
 * 
 * Este arquivo demonstra como integrar e usar o sistema completo
 * de otimização e analytics em uma aplicação React real.
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Brain,
  Gauge,
  Settings,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

// Importar hooks e utilitários do sistema
import { useOptimizationConfig } from '@/lib/optimization-config';
import { useAutoOptimization, getAutoOptimizer } from '@/lib/auto-optimization';
import { useResourceOptimization } from '@/lib/resource-optimization';
import { useRealTimeOptimization } from '@/lib/real-time-performance-optimizer';
import { useUserBehaviorAnalytics } from '@/lib/user-behavior-analytics';
import { usePredictiveAnalytics } from '@/lib/predictive-analytics';

// ============================================
// COMPONENTES DE EXEMPLO
// ============================================

/**
 * Componente que simula uma aplicação pesada
 * para demonstrar as otimizações em ação
 */
function HeavyComponent() {
  const [items, setItems] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Simular operação pesada
  const simulateHeavyOperation = () => {
    setIsLoading(true);
    
    // Criar muitos elementos para consumir memória
    const newItems = Array.from({ length: 10000 }, (_, i) => i);
    setItems(prev => [...prev, ...newItems]);
    
    // Simular processamento pesado
    setTimeout(() => {
      const start = performance.now();
      while (performance.now() - start < 100) {
        // Operação que consome CPU
        Math.random() * Math.random();
      }
      setIsLoading(false);
    }, 100);
  };
  
  const clearItems = () => {
    setItems([]);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Componente de Teste</CardTitle>
        <CardDescription>
          Use este componente para testar as otimizações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Button 
            onClick={simulateHeavyOperation}
            disabled={isLoading}
          >
            {isLoading ? 'Processando...' : 'Simular Operação Pesada'}
          </Button>
          <Button variant="outline" onClick={clearItems}>
            Limpar ({items.length} itens)
          </Button>
        </div>
        
        {items.length > 0 && (
          <div className="text-sm text-gray-600">
            Memória simulada: {(items.length * 8 / 1024 / 1024).toFixed(2)} MB
          </div>
        )}
        
        {/* Lista que pode causar problemas de performance */}
        <div className="max-h-32 overflow-y-auto">
          {items.slice(0, 100).map(item => (
            <div key={item} className="text-xs p-1 border-b">
              Item {item}
            </div>
          ))}
          {items.length > 100 && (
            <div className="text-xs text-gray-500 p-2">
              ... e mais {items.length - 100} itens
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Widget de status em tempo real
 */
function RealTimeStatus() {
  const { isOptimizing: autoOptimizing } = useAutoOptimization();
  const { metrics: resourceMetrics, isOptimizing: resourceOptimizing } = useResourceOptimization();
  const { metrics: realtimeMetrics, isRunning: realtimeRunning, performanceScore } = useRealTimeOptimization();
  
  const getStatusColor = (value: number, threshold: number, inverted = false) => {
    const isGood = inverted ? value < threshold : value > threshold;
    return isGood ? 'text-green-600' : 'text-red-600';
  };
  
  const getStatusIcon = (value: number, threshold: number, inverted = false) => {
    const isGood = inverted ? value < threshold : value > threshold;
    if (isGood) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <AlertTriangle className="h-4 w-4 text-red-600" />;
  };

  // Valores padrão quando métricas não estão disponíveis
  const fps = realtimeMetrics?.core?.fps ?? 60;
  const memoryPercentage = resourceMetrics?.memory?.percentage ?? 25;
  const cpuUsage = resourceMetrics?.cpu?.usage ?? 15;
  const uxScore = performanceScore ?? 85;
  
  const isOptimizing = resourceOptimizing || realtimeRunning || autoOptimizing;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <span>Status em Tempo Real</span>
          {isOptimizing && (
            <Badge className="bg-blue-100 text-blue-800">
              Otimizando
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">FPS</span>
              {getStatusIcon(fps, 30)}
            </div>
            <div className={`text-lg font-bold ${getStatusColor(fps, 30)}`}>
              {fps.toFixed(1)}
            </div>
            <Progress value={Math.min(fps / 60 * 100, 100)} className="h-1" />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memória</span>
              {getStatusIcon(memoryPercentage, 80, true)}
            </div>
            <div className={`text-lg font-bold ${getStatusColor(memoryPercentage, 80, true)}`}>
              {memoryPercentage.toFixed(1)}%
            </div>
            <Progress value={memoryPercentage} className="h-1" />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">CPU</span>
              {getStatusIcon(cpuUsage, 70, true)}
            </div>
            <div className={`text-lg font-bold ${getStatusColor(cpuUsage, 70, true)}`}>
              {cpuUsage.toFixed(1)}%
            </div>
            <Progress value={cpuUsage} className="h-1" />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">UX Score</span>
              {getStatusIcon(uxScore, 70)}
            </div>
            <div className={`text-lg font-bold ${getStatusColor(uxScore, 70)}`}>
              {uxScore.toFixed(0)}
            </div>
            <Progress value={uxScore} className="h-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Widget de insights de comportamento
 */
function BehaviorInsights() {
  const { currentSession, report } = useUserBehaviorAnalytics();

  // Deriva eventos como interações da sessão atual
  const events = currentSession?.interactions ?? [];

  // Calcula média de tempo na página com base nos pageViews da sessão atual
  const pageViews = currentSession?.pageViews ?? [];
  const times = pageViews
    .map((pv) => pv.timeOnPage ?? 0)
    .filter((t) => t > 0);
  const averageTimeOnPage = times.length
    ? times.reduce((a, b) => a + b, 0) / times.length
    : 0;

  // Calcula bounceRate básico para a sessão atual (1 = bounce, 0 = não)
  const bounceRate = (() => {
    const s = currentSession;
    if (!s) return 0;
    const hasInteraction = (s.interactions?.length ?? 0) > 0;
    const singlePage = (s.pageViews?.length ?? 0) <= 1;
    return !hasInteraction && singlePage ? 1 : 0;
  })();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Insights de Comportamento</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Tempo na Página</h4>
            <div className="text-2xl font-bold">
              {averageTimeOnPage.toFixed(1)}s
            </div>
            <div className="text-xs text-gray-500">
              Média da sessão atual
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Interações</h4>
            <div className="text-2xl font-bold">
              {events.length}
            </div>
            <div className="text-xs text-gray-500">
              Eventos registrados
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Taxa de Rejeição</h4>
            <div className="text-2xl font-bold">
              {(bounceRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">
              Sessões sem interação
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="font-medium text-sm mb-2">Eventos Recentes</h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {events.slice(-5).map((event, index) => (
              <div key={index} className="text-xs flex items-center justify-between p-1 bg-gray-50 rounded">
                <span>{event.type}</span>
                <span className="text-gray-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Widget de predições
 */
function PredictiveInsights() {
  const { predictions, anomalies } = usePredictiveAnalytics();
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical': return 'bg-red-200 text-red-900';
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>Análise Preditiva</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Predições */}
          <div>
            <h4 className="font-medium text-sm mb-2">Predições Ativas</h4>
            {predictions.length === 0 ? (
              <div className="text-sm text-gray-500">Nenhuma predição disponível</div>
            ) : (
              <div className="space-y-2">
                {predictions.slice(0, 3).map((prediction: import('@/lib/predictive-analytics').Prediction, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="text-sm font-medium">{prediction.type}</div>
                      <div className="text-xs text-gray-500">
                        Valor previsto: {prediction.predictedValue.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getConfidenceColor(prediction.confidence)}`}>
                        {(prediction.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">confiança</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Anomalias */}
          <div>
            <h4 className="font-medium text-sm mb-2">Anomalias Detectadas</h4>
            {anomalies.length === 0 ? (
              <div className="text-sm text-gray-500">Nenhuma anomalia detectada</div>
            ) : (
              <div className="space-y-2">
                {anomalies.slice(0, 2).map((anomaly: import('@/lib/predictive-analytics').AnomalyDetection, index: number) => (
                  <Alert key={index}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{anomaly.metric}</span>
                        <Badge className={getSeverityColor(anomaly.severity)}>
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Valor: {anomaly.value.toFixed(2)} (esperado: {anomaly.expectedValue.toFixed(2)})
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Controles de configuração rápida
 */
function QuickControls() {
  const { config, applyPreset, updateConfig } = useOptimizationConfig();
  const { isOptimizing: autoLoading, results: autoResults } = useAutoOptimization();
  const { startOptimization: startResource, stopOptimization: stopResource, isOptimizing: resourceRunning } = useResourceOptimization();
  
  // Deriva status de execução da auto-otimização com base no estado do hook
  const autoRunning = !autoLoading || (autoResults && autoResults.success);
  
  const toggleSystem = async () => {
    if (config.enabled) {
      // Parar módulos
      stopResource();
      updateConfig({ enabled: false });
    } else {
      // Iniciar módulos
      updateConfig({ enabled: true });
      startResource();
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Controles Rápidos</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Toggle principal */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Sistema de Otimização</div>
              <div className="text-sm text-gray-500">
                {config.enabled ? 'Ativo' : 'Inativo'}
              </div>
            </div>
            <Button
              onClick={toggleSystem}
              variant={config.enabled ? 'destructive' : 'default'}
            >
              {config.enabled ? 'Parar' : 'Iniciar'}
            </Button>
          </div>
          
          {/* Status dos módulos */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Status dos Módulos</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${autoRunning ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Auto Otimização</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${resourceRunning ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Recursos</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${config.performance.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Performance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${config.analytics.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>Analytics</span>
              </div>
            </div>
          </div>
          
          {/* Presets rápidos */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Presets Rápidos</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('highPerformance')}
              >
                <Zap className="h-3 w-3 mr-1" />
                Alta Performance
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('energySaver')}
              >
                <Activity className="h-3 w-3 mr-1" />
                Economia
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('lowPerformance')}
              >
                <Gauge className="h-3 w-3 mr-1" />
                Baixa Performance
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset('minimal')}
              >
                <Minus className="h-3 w-3 mr-1" />
                Mínimo
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

/**
 * Exemplo completo de integração do sistema de otimização
 */
export default function OptimizationIntegrationExample() {
  const [mounted, setMounted] = useState(false);
  
  // Garantir que o componente só renderize no cliente
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <div className="text-sm text-gray-600">Inicializando sistema...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Exemplo de Integração</h1>
        <p className="text-gray-600">
          Demonstração prática do sistema de otimização e analytics em ação
        </p>
      </div>
      
      {/* Status em tempo real */}
      <RealTimeStatus />
      
      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna esquerda */}
        <div className="space-y-6">
          <QuickControls />
          <BehaviorInsights />
        </div>
        
        {/* Coluna direita */}
        <div className="space-y-6">
          <HeavyComponent />
          <PredictiveInsights />
        </div>
      </div>
      
      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Usar Este Exemplo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <div>
                <strong>Monitore o Status:</strong> Observe as métricas em tempo real no painel superior.
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <div>
                <strong>Teste as Otimizações:</strong> Use o botão "Simular Operação Pesada" para ver o sistema reagir.
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <div>
                <strong>Experimente os Presets:</strong> Teste diferentes configurações usando os presets rápidos.
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <div>
                <strong>Observe as Predições:</strong> Veja como o sistema aprende e faz predições baseadas no uso.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// HOOKS PERSONALIZADOS PARA ESTE EXEMPLO
// ============================================

/**
 * Hook para simular dados de teste
 */
export function useTestData() {
  const [testMetrics, setTestMetrics] = useState({
    simulatedLoad: 0,
    testOperations: 0,
    memoryPressure: 0
  });
  
  const simulateLoad = () => {
    setTestMetrics(prev => ({
      ...prev,
      simulatedLoad: prev.simulatedLoad + 1,
      testOperations: prev.testOperations + 1,
      memoryPressure: Math.min(prev.memoryPressure + 10, 100)
    }));
  };
  
  const resetLoad = () => {
    setTestMetrics({
      simulatedLoad: 0,
      testOperations: 0,
      memoryPressure: 0
    });
  };
  
  return {
    testMetrics,
    simulateLoad,
    resetLoad
  };
}

/**
 * Hook para demonstrar integração com componentes externos
 */
export function useOptimizationDemo() {
  const autoOpt = useAutoOptimization();
  const resourceOpt = useResourceOptimization();
  const realTimeOpt = useRealTimeOptimization();
  const behaviorAnalytics = useUserBehaviorAnalytics();
  const predictiveAnalytics = usePredictiveAnalytics();
  const config = useOptimizationConfig();
  
  const getSystemHealth = () => {
    const metrics = {
      fps: resourceOpt.metrics?.performance.fps ?? 0,
      memory: resourceOpt.metrics?.memory.percentage ?? realTimeOpt.metrics?.system.memoryUsage ?? 0,
      cpu: resourceOpt.metrics?.cpu.usage ?? realTimeOpt.metrics?.system.cpuUsage ?? 0,
      uxScore: realTimeOpt.performanceScore ?? 0
    };
    
    const scores = [
      metrics.fps > 30 ? 1 : 0,
      metrics.memory < 80 ? 1 : 0,
      metrics.cpu < 70 ? 1 : 0,
      metrics.uxScore > 70 ? 1 : 0
    ];
    
    const health = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    return {
      score: health * 100,
      status: health > 0.75 ? 'excellent' : health > 0.5 ? 'good' : health > 0.25 ? 'fair' : 'poor',
      metrics
    };
  };
  
  const getRecommendations = () => {
    const health = getSystemHealth();
    const recommendations = [];
    
    if (health.metrics.fps < 30) {
      recommendations.push('Considere reduzir a complexidade visual ou usar o preset de baixa performance');
    }
    
    if (health.metrics.memory > 80) {
      recommendations.push('Memória alta detectada. Execute limpeza ou reduza o cache');
    }
    
    if (health.metrics.cpu > 70) {
      recommendations.push('CPU sobrecarregada. Considere otimizar operações pesadas');
    }
    
    if (predictiveAnalytics.anomalies.length > 0) {
      recommendations.push('Anomalias detectadas. Verifique o painel preditivo para detalhes');
    }
    
    return recommendations;
  };
  
  return {
    systemHealth: getSystemHealth(),
    recommendations: getRecommendations(),
    allModules: {
      autoOpt,
      resourceOpt,
      realTimeOpt,
      behaviorAnalytics,
      predictiveAnalytics,
      config
    }
  };
}