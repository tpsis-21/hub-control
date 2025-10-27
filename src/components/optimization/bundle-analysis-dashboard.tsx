'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  FileText, 
  Zap, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Target,
  Layers,
  Code,
  ExternalLink
} from 'lucide-react';

// ============================================
// INTERFACES
// ============================================

interface BundleChunk {
  id: string;
  name: string;
  size: number;
  gzipSize: number;
  modules: number;
  isEntry: boolean;
  isAsync: boolean;
  loadTime: number;
}

interface DependencyInfo {
  name: string;
  version: string;
  size: number;
  gzipSize: number;
  usageCount: number;
  isTreeShakeable: boolean;
  recommendation: 'keep' | 'replace' | 'remove' | 'optimize';
  alternatives: string[];
  impact: number;
}

interface OptimizationOpportunity {
  id: string;
  type: 'code-splitting' | 'tree-shaking' | 'dependency' | 'lazy-loading';
  title: string;
  description: string;
  impact: {
    sizeReduction: number;
    performanceGain: number;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  steps: string[];
  codeExample?: string;
}

interface BundleMetrics {
  totalSize: number;
  gzipSize: number;
  chunkCount: number;
  moduleCount: number;
  duplicateModules: number;
  unusedCode: number;
  compressionRatio: number;
  loadTime: number;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

function useBundleAnalysis() {
  const [metrics, setMetrics] = useState<BundleMetrics>({
    totalSize: 0,
    gzipSize: 0,
    chunkCount: 0,
    moduleCount: 0,
    duplicateModules: 0,
    unusedCode: 0,
    compressionRatio: 0,
    loadTime: 0
  });

  const [chunks, setChunks] = useState<BundleChunk[]>([]);
  const [dependencies, setDependencies] = useState<DependencyInfo[]>([]);
  const [opportunities, setOpportunities] = useState<OptimizationOpportunity[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Simular análise do bundle
  useEffect(() => {
    const mockChunks: BundleChunk[] = [
      {
        id: 'main',
        name: 'main',
        size: 1024000,
        gzipSize: 256000,
        modules: 45,
        isEntry: true,
        isAsync: false,
        loadTime: 1200
      },
      {
        id: 'vendor',
        name: 'vendor',
        size: 2048000,
        gzipSize: 512000,
        modules: 120,
        isEntry: false,
        isAsync: false,
        loadTime: 2500
      },
      {
        id: 'dashboard',
        name: 'dashboard',
        size: 512000,
        gzipSize: 128000,
        modules: 25,
        isEntry: false,
        isAsync: true,
        loadTime: 800
      },
      {
        id: 'auth',
        name: 'auth',
        size: 256000,
        gzipSize: 64000,
        modules: 15,
        isEntry: false,
        isAsync: true,
        loadTime: 400
      }
    ];

    const mockDependencies: DependencyInfo[] = [
      {
        name: 'lodash',
        version: '4.17.21',
        size: 512000,
        gzipSize: 128000,
        usageCount: 8,
        isTreeShakeable: false,
        recommendation: 'replace',
        alternatives: ['lodash-es', 'ramda'],
        impact: 75
      },
      {
        name: 'moment',
        version: '2.29.4',
        size: 256000,
        gzipSize: 64000,
        usageCount: 3,
        isTreeShakeable: false,
        recommendation: 'replace',
        alternatives: ['date-fns', 'dayjs'],
        impact: 60
      },
      {
        name: 'react',
        version: '18.2.0',
        size: 128000,
        gzipSize: 32000,
        usageCount: 50,
        isTreeShakeable: true,
        recommendation: 'keep',
        alternatives: [],
        impact: 0
      },
      {
        name: 'chart.js',
        version: '4.2.1',
        size: 384000,
        gzipSize: 96000,
        usageCount: 2,
        isTreeShakeable: true,
        recommendation: 'optimize',
        alternatives: ['recharts', 'victory'],
        impact: 40
      }
    ];

    const mockOpportunities: OptimizationOpportunity[] = [
      {
        id: 'code-splitting-routes',
        type: 'code-splitting',
        title: 'Implementar Code Splitting por Rotas',
        description: 'Divida o código por rotas para reduzir o bundle inicial',
        impact: {
          sizeReduction: 35,
          performanceGain: 40
        },
        difficulty: 'medium',
        steps: [
          'Configure lazy loading para rotas principais',
          'Implemente React.lazy() nos componentes de página',
          'Configure Suspense boundaries',
          'Teste o carregamento das rotas'
        ],
        codeExample: `
// pages/dashboard.tsx
const Dashboard = lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}
        `
      },
      {
        id: 'replace-lodash',
        type: 'dependency',
        title: 'Substituir Lodash por Lodash-ES',
        description: 'Use lodash-es para melhor tree-shaking',
        impact: {
          sizeReduction: 60,
          performanceGain: 25
        },
        difficulty: 'easy',
        steps: [
          'Desinstalar lodash',
          'Instalar lodash-es',
          'Atualizar imports para imports específicos',
          'Testar funcionalidades'
        ],
        codeExample: `
// Antes
import _ from 'lodash';

// Depois
import { debounce, throttle } from 'lodash-es';
        `
      },
      {
        id: 'tree-shake-chart',
        type: 'tree-shaking',
        title: 'Otimizar Imports do Chart.js',
        description: 'Importe apenas os componentes necessários',
        impact: {
          sizeReduction: 45,
          performanceGain: 20
        },
        difficulty: 'medium',
        steps: [
          'Identifique componentes Chart.js utilizados',
          'Configure imports específicos',
          'Registre apenas componentes necessários',
          'Verifique redução no bundle'
        ],
        codeExample: `
// Antes
import Chart from 'chart.js/auto';

// Depois
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement);
        `
      }
    ];

    setChunks(mockChunks);
    setDependencies(mockDependencies);
    setOpportunities(mockOpportunities);

    // Calcular métricas
    const totalSize = mockChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const gzipSize = mockChunks.reduce((sum, chunk) => sum + chunk.gzipSize, 0);
    const moduleCount = mockChunks.reduce((sum, chunk) => sum + chunk.modules, 0);
    const avgLoadTime = mockChunks.reduce((sum, chunk) => sum + chunk.loadTime, 0) / mockChunks.length;

    setMetrics({
      totalSize,
      gzipSize,
      chunkCount: mockChunks.length,
      moduleCount,
      duplicateModules: 3,
      unusedCode: 15,
      compressionRatio: ((totalSize - gzipSize) / totalSize) * 100,
      loadTime: avgLoadTime
    });
  }, []);

  const analyzeBundle = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Simular processo de análise
    const steps = [
      'Analisando chunks...',
      'Identificando dependências...',
      'Calculando métricas...',
      'Gerando recomendações...',
      'Finalizando relatório...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setAnalysisProgress((i / steps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    setAnalysisProgress(100);
    setIsAnalyzing(false);
  };

  const exportReport = () => {
    const report = {
      metrics,
      chunks,
      dependencies,
      opportunities,
      generatedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bundle-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    metrics,
    chunks,
    dependencies,
    opportunities,
    isAnalyzing,
    analysisProgress,
    analyzeBundle,
    exportReport
  };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function BundleAnalysisDashboard() {
  const {
    metrics,
    chunks,
    dependencies,
    opportunities,
    isAnalyzing,
    analysisProgress,
    analyzeBundle,
    exportReport
  } = useBundleAnalysis();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'keep': return 'bg-green-100 text-green-800';
      case 'optimize': return 'bg-yellow-100 text-yellow-800';
      case 'replace': return 'bg-orange-100 text-orange-800';
      case 'remove': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Análise de Bundle</h1>
          <p className="text-muted-foreground">
            Analise o tamanho do bundle e identifique oportunidades de otimização
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={analyzeBundle}
            disabled={isAnalyzing}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            Analisar Bundle
          </Button>
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {isAnalyzing && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Analisando bundle... {Math.round(analysisProgress)}%
            <Progress value={analysisProgress} className="mt-2" />
          </AlertDescription>
        </Alert>
      )}

      {/* Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamanho Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(metrics.totalSize)}</div>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(metrics.gzipSize)} comprimido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chunks</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.chunkCount}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.moduleCount} módulos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compressão</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.compressionRatio.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa de compressão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Código Não Usado</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.unusedCode}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.duplicateModules} módulos duplicados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="chunks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chunks">Chunks</TabsTrigger>
          <TabsTrigger value="dependencies">Dependências</TabsTrigger>
          <TabsTrigger value="opportunities">Oportunidades</TabsTrigger>
        </TabsList>

        {/* Chunks */}
        <TabsContent value="chunks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Chunks</CardTitle>
              <CardDescription>
                Visualize o tamanho e performance de cada chunk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Layers className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{chunk.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {chunk.modules} módulos
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">{formatFileSize(chunk.size)}</div>
                        <div className="text-xs text-muted-foreground">Original</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium">{formatFileSize(chunk.gzipSize)}</div>
                        <div className="text-xs text-muted-foreground">Gzip</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium">{chunk.loadTime}ms</div>
                        <div className="text-xs text-muted-foreground">Carregamento</div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {chunk.isEntry && (
                          <Badge variant="secondary">Entry</Badge>
                        )}
                        {chunk.isAsync && (
                          <Badge variant="outline">Async</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dependências */}
        <TabsContent value="dependencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Dependências</CardTitle>
              <CardDescription>
                Identifique dependências que podem ser otimizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dependencies.map((dep) => (
                  <div key={dep.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Package className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{dep.name}</div>
                        <div className="text-sm text-muted-foreground">
                          v{dep.version} • {dep.usageCount} usos
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-sm font-medium">{formatFileSize(dep.size)}</div>
                        <div className="text-xs text-muted-foreground">Tamanho</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm font-medium">{dep.impact}%</div>
                        <div className="text-xs text-muted-foreground">Impacto</div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge className={getRecommendationColor(dep.recommendation)}>
                          {dep.recommendation.toUpperCase()}
                        </Badge>
                        {dep.isTreeShakeable && (
                          <Badge variant="outline">Tree-shakeable</Badge>
                        )}
                      </div>
                      
                      {dep.alternatives.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Alt: {dep.alternatives.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Oportunidades */}
        <TabsContent value="opportunities" className="space-y-4">
          <div className="space-y-4">
            {opportunities.map((opportunity) => (
              <Card key={opportunity.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      {opportunity.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(opportunity.difficulty)}>
                        {opportunity.difficulty.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {opportunity.type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>{opportunity.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {opportunity.impact.sizeReduction}%
                      </div>
                      <div className="text-sm text-muted-foreground">Redução de tamanho</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {opportunity.impact.performanceGain}%
                      </div>
                      <div className="text-sm text-muted-foreground">Ganho de performance</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Passos para implementação:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {opportunity.steps.map((step, index) => (
                        <li key={index} className="text-muted-foreground">{step}</li>
                      ))}
                    </ol>
                  </div>
                  
                  {opportunity.codeExample && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Exemplo de código:
                      </h4>
                      <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
                        <code>{opportunity.codeExample}</code>
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
