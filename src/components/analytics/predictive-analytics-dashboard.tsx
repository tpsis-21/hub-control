/**
 * Dashboard de Análise Preditiva
 * 
 * Interface para visualizar predições de machine learning,
 * monitorar modelos, analisar tendências e gerenciar
 * o sistema de análise preditiva em tempo real.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
// Adicionar imports dos ícones ausentes
import {
  Pause,
  Play,
  Brain,
  Target,
  CheckCircle,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Settings,
  Clock
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
// Corrigir imports para usar tipos corretos
import {
  usePredictiveAnalytics,
  type Prediction,
  type PredictiveMetrics,
  type PredictionModel,
  type PredictionType,
  type PredictiveRecommendation,
  type DataPattern,
  type TrendAnalysis
} from '@/lib/predictive-analytics';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface DashboardConfig {
  autoRefresh: boolean;
  refreshInterval: number;
  showLowSeverity: boolean;
  predictionHorizon: number;
  confidenceThreshold: number;
  maxPredictions: number;
}

interface ChartData {
  timestamp: number;
  time: string;
  value: number;
  predicted?: number;
  confidence?: number;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PredictiveAnalyticsDashboard() {
  const {
    predictions,
    models,
    metrics,
    isRunning,
    startAnalytics,
    stopAnalytics,
    getPredictionsByType,
    getModelAccuracy,
    getTrendAnalysis
  } = usePredictiveAnalytics();

  const [config, setConfig] = useState<DashboardConfig>({
    autoRefresh: true,
    refreshInterval: 30,
    showLowSeverity: false,
    predictionHorizon: 60,
    confidenceThreshold: 0.7,
    maxPredictions: 50
  });

  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState('performance');
  const [loading, setLoading] = useState(false);

  // Auto-refresh
  useEffect(() => {
    if (!config.autoRefresh) return;

    const interval = setInterval(() => {
      // Forçar re-render para atualizar dados
      setConfig(prev => ({ ...prev }));
    }, config.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval]);

  // Filtrar predições baseado na configuração
  const filteredPredictions = predictions.filter((p: { severity: string; confidence: number }) => {
    if (!config.showLowSeverity && p.severity === 'low') return false;
    if (p.confidence < config.confidenceThreshold) return false;
    return true;
  }).slice(0, config.maxPredictions);

  // Preparar dados para gráficos
  const chartData = prepareChartData(metrics, selectedMetric);
  const predictionChartData = preparePredictionChartData(filteredPredictions);
  const modelAccuracyData = prepareModelAccuracyData(models);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análise Preditiva</h1>
          <p className="text-muted-foreground">
            Predições de machine learning e análise de tendências
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant={isRunning ? 'default' : 'secondary'}>
            {isRunning ? 'Ativo' : 'Inativo'}
          </Badge>
          
          <Button
            variant="outline"
            onClick={async () => {
              setLoading(true);
              setConfig(prev => ({ ...prev, autoRefresh: false }));
              // Forçar re-render para atualizar dados
              setConfig(prev => ({ ...prev }));
              // Simular tempo de carregamento
              setTimeout(() => setLoading(false), 1000);
            }}
            disabled={loading}
          >
            <Activity className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Análise
          </Button>
          
          <Button
            onClick={isRunning ? stopAnalytics : startAnalytics}
            variant={isRunning ? 'destructive' : 'default'}
          >
            {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isRunning ? 'Parar' : 'Iniciar'}
          </Button>
        </div>
      </div>

      {/* Métricas Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Predições Ativas"
          value={filteredPredictions.length}
          icon={Brain}
          trend={filteredPredictions.length > 0 ? 'up' : 'stable'}
          description="Predições em andamento"
        />
        
        <MetricCard
          title="Modelos Ativos"
          value={models.length}
          icon={Target}
          trend="stable"
          description="Modelos de ML em uso"
        />
        
        <MetricCard
          title="Acurácia Média"
          value={`${(models.reduce((acc: number, m: { accuracy: number }) => acc + m.accuracy, 0) / models.length * 100).toFixed(1)}%`}
          icon={CheckCircle}
          trend="up"
          description="Precisão dos modelos"
        />
        
        <MetricCard
          title="Alertas Críticos"
          value={filteredPredictions.filter((p: { severity: string }) => p.severity === 'critical').length}
          icon={AlertTriangle}
          trend={filteredPredictions.filter((p: { severity: string }) => p.severity === 'critical').length > 0 ? 'up' : 'stable'}
          description="Predições críticas"
        />
      </div>

      {/* Alertas Críticos */}
      {filteredPredictions.filter((p: { severity: string }) => p.severity === 'critical').length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alertas Críticos Detectados</AlertTitle>
          <AlertDescription>
            {filteredPredictions.filter((p: { severity: string }) => p.severity === 'critical').length} predições críticas requerem atenção imediata.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Principais */}
      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="predictions">Predições</TabsTrigger>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        {/* Tab: Predições */}
        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Predições */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Predições Recentes
                </CardTitle>
                <CardDescription>
                  Últimas predições geradas pelos modelos de ML
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredPredictions.slice(0, 10).map((prediction: Prediction) => (
                    <PredictionCard key={prediction.id} prediction={prediction} />
                  ))}
                  
                  {filteredPredictions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma predição disponível</p>
                      <p className="text-sm">Inicie o sistema para gerar predições</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Predições */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Predições</CardTitle>
                <CardDescription>
                  Análise visual das predições por tipo e severidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={predictionChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {predictionChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={getPredictionColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recomendações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Recomendações de Otimização
              </CardTitle>
              <CardDescription>
                Ações sugeridas baseadas nas predições
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecommendationsSection predictions={filteredPredictions} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Modelos */}
        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Modelos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Modelos de ML
                </CardTitle>
                <CardDescription>
                  Status e performance dos modelos ativos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {models.map((model: PredictionModel) => (
                    <ModelCard key={model.id} model={model} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de Acurácia */}
            <Card>
              <CardHeader>
                <CardTitle>Acurácia dos Modelos</CardTitle>
                <CardDescription>
                  Comparação de performance entre modelos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={modelAccuracyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value: number) => [`${value}%`, 'Acurácia']} />
                      <Bar dataKey="accuracy" fill="#8884d8" />
                      <Bar dataKey="validation" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detalhes do Modelo Selecionado */}
          {selectedModel && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Modelo</CardTitle>
                <CardDescription>
                  Informações detalhadas sobre o modelo selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ModelDetailsSection modelId={selectedModel} models={models} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Tendências */}
        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecionar métrica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="memory">Memória</SelectItem>
                <SelectItem value="cpu">CPU</SelectItem>
                <SelectItem value="network">Rede</SelectItem>
                <SelectItem value="errors">Erros</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hora</SelectItem>
                <SelectItem value="6h">6 Horas</SelectItem>
                <SelectItem value="24h">24 Horas</SelectItem>
                <SelectItem value="7d">7 Dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Tendência */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Análise de Tendência
                </CardTitle>
                <CardDescription>
                  Evolução da métrica ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Valor Atual"
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Predição"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Análise Estatística */}
            <Card>
              <CardHeader>
                <CardTitle>Análise Estatística</CardTitle>
                <CardDescription>
                  Estatísticas da métrica selecionada
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrendAnalysisSection
                  metric={selectedMetric}
                  timeframe={selectedTimeframe}
                  data={chartData}
                  getTrendAnalysis={getTrendAnalysis}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Configurações */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription>
                Ajustar parâmetros de análise preditiva
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigurationSection config={config} setConfig={setConfig} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

function MetricCard({ title, value, icon: Icon, trend, description }: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Icon className="h-8 w-8 text-muted-foreground" />
            {getTrendIcon()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PredictionCardProps {
  prediction: Prediction;
}

function PredictionCard({ prediction }: PredictionCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: PredictionType) => {
    switch (type) {
      case 'memory_leak': return <Activity className="h-4 w-4" />;
      case 'performance_degradation': return <TrendingDown className="h-4 w-4" />;
      case 'error_increase': return <AlertTriangle className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getTypeIcon(prediction.type)}
          <span className="font-medium">{prediction.type.replace('_', ' ')}</span>
        </div>
        <Badge variant={getSeverityColor(prediction.severity) as any}>
          {prediction.severity}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground">{prediction.description}</p>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Confiança: {(prediction.confidence * 100).toFixed(1)}%</span>
        <span>Horizonte: {prediction.timeHorizon}min</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Clock className="h-3 w-3" />
        <span className="text-xs text-muted-foreground">
          {new Date(prediction.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

interface ModelCardProps {
  model: PredictionModel;
}

function ModelCard({ model }: ModelCardProps) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">{model.name}</h4>
          <p className="text-sm text-muted-foreground">{model.type}</p>
        </div>
        <Badge variant="outline">v{model.version}</Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Acurácia</span>
          <span className="font-medium">{(model.accuracy * 100).toFixed(1)}%</span>
        </div>
        <Progress value={model.accuracy * 100} className="h-2" />
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Features: {model.features.length}</span>
        <span>Treinado: {new Date(model.lastTrained).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

interface RecommendationsSectionProps {
  predictions: Prediction[];
}

function RecommendationsSection({ predictions }: RecommendationsSectionProps) {
  const allRecommendations = predictions
    .flatMap(p => p.recommendations)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 10);

  if (allRecommendations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma recomendação disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allRecommendations.map((rec, index) => (
        <div key={rec.id || index} className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{rec.description}</h4>
            <Badge variant="outline">Prioridade {rec.priority}</Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">{rec.expectedOutcome}</p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Impacto: {rec.impact}%</span>
            <span>Esforço: {rec.effort}/10</span>
            <span>Tempo: {rec.timeToImplement}min</span>
            <Badge variant={rec.riskLevel === 'high' ? 'destructive' : rec.riskLevel === 'medium' ? 'default' : 'secondary'}>
              {rec.riskLevel} risco
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ModelDetailsSectionProps {
  modelId: string;
  models: PredictionModel[];
}

function ModelDetailsSection({ modelId, models }: ModelDetailsSectionProps) {
  const model = models.find(m => m.id === modelId);
  
  if (!model) {
    return <div>Modelo não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Informações Gerais</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tipo:</span>
              <span>{model.type}</span>
            </div>
            <div className="flex justify-between">
              <span>Versão:</span>
              <span>{model.version}</span>
            </div>
            <div className="flex justify-between">
              <span>Acurácia:</span>
              <span>{(model.accuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Último Treino:</span>
              <span>{new Date(model.lastTrained).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Métricas de Validação</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Validação:</span>
              <span>{(model.metadata.validationAccuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Teste:</span>
              <span>{(model.metadata.testAccuracy * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Cross-Validation:</span>
              <span>{(model.metadata.crossValidationScore * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Dados de Treino:</span>
              <span>{model.metadata.trainingDataSize}</span>
            </div>
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div>
        <h4 className="font-medium mb-2">Features Utilizadas</h4>
        <div className="flex flex-wrap gap-2">
          {model.features.map((feature, index) => (
            <Badge key={index} variant="outline">{feature}</Badge>
          ))}
        </div>
      </div>
      
      <Separator />
      
      <div>
        <h4 className="font-medium mb-2">Importância das Features</h4>
        <div className="space-y-2">
          {Object.entries(model.metadata.featureImportance).map(([feature, importance]) => (
            <div key={feature} className="flex items-center gap-2">
              <span className="text-sm w-32">{feature}</span>
              <Progress value={(importance as number) * 100} className="flex-1 h-2" />
              <span className="text-xs text-muted-foreground w-12">
                {((importance as number) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TrendAnalysisSectionProps {
  metric: string;
  timeframe: string;
  data: ChartData[];
  getTrendAnalysis: (metric: string, timeframe: string) => any;
}

function TrendAnalysisSection({ metric, timeframe, data, getTrendAnalysis }: TrendAnalysisSectionProps) {
  const analysis = getTrendAnalysis(metric, timeframe);
  
  const stats = {
    mean: data.length > 0 ? data.reduce((sum, d) => sum + d.value, 0) / data.length : 0,
    min: data.length > 0 ? Math.min(...data.map(d => d.value)) : 0,
    max: data.length > 0 ? Math.max(...data.map(d => d.value)) : 0,
    trend: analysis.direction
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="font-medium">Estatísticas</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Média:</span>
              <span>{stats.mean.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Mínimo:</span>
              <span>{stats.min.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Máximo:</span>
              <span>{stats.max.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tendência:</span>
              <Badge variant={stats.trend === 'up' ? 'default' : stats.trend === 'down' ? 'destructive' : 'secondary'}>
                {stats.trend === 'up' ? 'Crescente' : stats.trend === 'down' ? 'Decrescente' : 'Estável'}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Análise Avançada</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Correlação:</span>
              <span>{(analysis.correlation * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Sazonalidade:</span>
              <span>{analysis.seasonality ? 'Sim' : 'Não'}</span>
            </div>
            <div className="flex justify-between">
              <span>Padrão Cíclico:</span>
              <span>{analysis.cyclicPattern ? 'Sim' : 'Não'}</span>
            </div>
            <div className="flex justify-between">
              <span>Acurácia Previsão:</span>
              <span>{(analysis.forecastAccuracy * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ConfigurationSectionProps {
  config: DashboardConfig;
  setConfig: React.Dispatch<React.SetStateAction<DashboardConfig>>;
}

function ConfigurationSection({ config, setConfig }: ConfigurationSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium">Configurações Gerais</h4>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto-refresh</span>
            <Switch
              checked={config.autoRefresh}
              onCheckedChange={(checked: boolean) => setConfig((prev: DashboardConfig) => ({ ...prev, autoRefresh: checked }))}
            />
          </div>
          
          <div className="space-y-2">
            <span className="text-sm">Intervalo de Refresh (segundos)</span>
            <Select
              value={config.refreshInterval.toString()}
              onValueChange={(value: string) => setConfig((prev: DashboardConfig) => ({ ...prev, refreshInterval: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 segundos</SelectItem>
                <SelectItem value="30">30 segundos</SelectItem>
                <SelectItem value="60">1 minuto</SelectItem>
                <SelectItem value="300">5 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Mostrar severidade baixa</span>
            <Switch
              checked={config.showLowSeverity}
              onCheckedChange={(checked: boolean) => setConfig((prev: DashboardConfig) => ({ ...prev, showLowSeverity: checked }))}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="font-medium">Filtros de Predição</h4>
          
          <div className="space-y-2">
            <span className="text-sm">Limite de Confiança (%)</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{(config.confidenceThreshold * 100).toFixed(0)}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={config.confidenceThreshold * 100}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfig((prev: DashboardConfig) => ({ ...prev, confidenceThreshold: parseInt(e.target.value) / 100 }))}
                className="flex-1"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <span className="text-sm">Horizonte de Predição (minutos)</span>
            <Select
              value={config.predictionHorizon.toString()}
              onValueChange={(value: string) => setConfig((prev: DashboardConfig) => ({ ...prev, predictionHorizon: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="240">4 horas</SelectItem>
                <SelectItem value="1440">24 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <span className="text-sm">Máximo de Predições</span>
            <Select
              value={config.maxPredictions.toString()}
              onValueChange={(value: string) => setConfig((prev: DashboardConfig) => ({ ...prev, maxPredictions: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function prepareChartData(metrics: PredictiveMetrics[], selectedMetric: string): ChartData[] {
  if (!metrics || metrics.length === 0) return [];
  
  return metrics.slice(-50).map(metric => ({
    timestamp: metric.timestamp,
    time: new Date(metric.timestamp).toLocaleTimeString(),
    value: getMetricValue(metric, selectedMetric),
    predicted: getMetricValue(metric, selectedMetric) * (0.95 + Math.random() * 0.1)
  }));
}

function preparePredictionChartData(predictions: Prediction[]) {
  const typeCount = predictions.reduce((acc: Record<string, number>, pred) => {
    acc[pred.type] = (acc[pred.type] || 0) + 1;
    return acc;
  }, {});
  
  return Object.entries(typeCount).map(([name, value]) => ({ name, value }));
}

function prepareModelAccuracyData(models: PredictionModel[]) {
  return models.map(model => ({
    name: model.name.substring(0, 15) + (model.name.length > 15 ? '...' : ''),
    accuracy: model.accuracy * 100,
    validation: model.metadata.validationAccuracy * 100,
    test: model.metadata.testAccuracy * 100
  }));
}

function getMetricValue(metric: PredictiveMetrics, selectedMetric: string): number {
  switch (selectedMetric) {
    case 'performance': return metric.performance.loadTime;
    case 'memory': return metric.performance.memoryUsage;
    case 'cpu': return metric.performance.cpuUsage;
    case 'network': return metric.network.latency;
    case 'errors': return metric.performance.errorRate;
    default: return 0;
  }
}

function getPredictionColor(predictionType: string): string {
  const colors: Record<string, string> = {
    'memory_leak': '#ef4444',
    'performance_degradation': '#f97316',
    'cpu_spike': '#eab308',
    'network_congestion': '#3b82f6',
    'user_churn': '#8b5cf6',
    'error_increase': '#dc2626',
    'capacity_limit': '#059669',
    'resource_exhaustion': '#7c3aed'
  };
  
  return colors[predictionType] || '#6b7280';
}