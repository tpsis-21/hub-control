// ============================================
// PÁGINA DE OTIMIZAÇÃO E ANALYTICS
// Sistema completo de monitoramento e otimização
// ============================================

'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  BarChart3,
  Brain,
  Cpu,
  Gauge,
  Settings,
  TrendingUp,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// Importações dos componentes de otimização
import {
  AutoOptimizationDashboard,
  ResourceOptimizationDashboard,
  RealTimePerformanceDashboard,
  GlobalConfigDashboard,
  OptimizationNavigationBar,
  OptimizationSequentialNavigation
} from '@/components/optimization';

import {
  UserBehaviorDashboard,
  PredictiveAnalyticsDashboard
} from '@/components/analytics';

// Hooks personalizados
import { useRealTimeOptimization } from '@/lib/real-time-performance-optimizer';
import { useResourceOptimization } from '@/lib/resource-optimization';
import { useAutoOptimization } from '@/lib/auto-optimization';
import { useUserBehaviorAnalytics } from '@/lib/user-behavior-analytics';
import { usePredictiveAnalytics } from '@/lib/predictive-analytics';

// ============================================
// COMPONENTE DE OVERVIEW DO SISTEMA
// ============================================

function SystemStatusOverview() {
  const { isRunning: performanceRunning, performanceScore } = useRealTimeOptimization();
  const { isOptimizing: resourceRunning } = useResourceOptimization();
  // useAutoOptimization expõe flag de execução; consideramos ativo quando está otimizando ou quando há resultados disponíveis
  const { isOptimizing: autoOptLoading, results: autoOptResults } = useAutoOptimization();
  const autoOptActive = autoOptLoading || (autoOptResults && autoOptResults.improvements.length > 0);
  const { currentSession } = useUserBehaviorAnalytics();
  const { isRunning: predictiveRunning, predictions } = usePredictiveAnalytics();

  const getSystemStatus = () => {
    const activeModules = [
      performanceRunning,
      resourceRunning,
      autoOptActive,
      predictiveRunning
    ].filter(Boolean).length;

    if (activeModules >= 3) return { status: 'Excelente', color: 'bg-green-100 text-green-800' };
    if (activeModules >= 2) return { status: 'Bom', color: 'bg-blue-100 text-blue-800' };
    if (activeModules >= 1) return { status: 'Parcial', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'Inativo', color: 'bg-red-100 text-red-800' };
  };

  const systemStatus = getSystemStatus();
  const activePredictions = predictions.filter((p: { confidence: number }) => p.confidence > 0.7).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status do Sistema</p>
              <Badge className={systemStatus.color}>{systemStatus.status}</Badge>
            </div>
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Performance Score</p>
              <p className="text-2xl font-bold">{performanceScore.toFixed(0)}/100</p>
            </div>
            <Gauge className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sessão Atual</p>
              <p className="text-2xl font-bold">
                {currentSession ? Math.floor((Date.now() - currentSession.startTime) / 60000) : 0}m
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Predições Ativas</p>
              <p className="text-2xl font-bold">{activePredictions}</p>
            </div>
            <Brain className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function OptimizationPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de navegação */}
      <OptimizationNavigationBar />
      
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Sistema de Otimização e Analytics
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Monitoramento em tempo real, otimização automática e análise preditiva 
            para máxima performance da aplicação
          </p>
        </div>

        {/* Status Overview */}
        <SystemStatusOverview />

        {/* Tabs principais */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Configuração</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center space-x-2">
              <Cpu className="h-4 w-4" />
              <span>Recursos</span>
            </TabsTrigger>
            <TabsTrigger value="behavior" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Comportamento</span>
            </TabsTrigger>
            <TabsTrigger value="predictive" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>Preditiva</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Visão Geral */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Métricas em Tempo Real</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RealTimePerformanceDashboard />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>Otimização Automática</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AutoOptimizationDashboard />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Configuração Global */}
          <TabsContent value="config">
            <GlobalConfigDashboard />
          </TabsContent>

          {/* Tab: Performance em Tempo Real */}
          <TabsContent value="performance">
            <RealTimePerformanceDashboard />
          </TabsContent>

          {/* Tab: Recursos */}
          <TabsContent value="resources">
            <div className="space-y-6">
              <ResourceOptimizationDashboard />
              <AutoOptimizationDashboard />
            </div>
          </TabsContent>

          {/* Tab: Comportamento */}
          <TabsContent value="behavior">
            <UserBehaviorDashboard />
          </TabsContent>

          {/* Tab: Análise Preditiva */}
          <TabsContent value="predictive">
            <PredictiveAnalyticsDashboard />
          </TabsContent>
        </Tabs>

        {/* Navegação sequencial */}
        <OptimizationSequentialNavigation />

        {/* Footer */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Sistema de Otimização e Analytics - Versão 1.0
              </p>
              <p className="text-xs text-gray-500">
                Monitoramento em tempo real • Machine Learning • Análise Preditiva • Otimização Automática
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
