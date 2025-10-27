/**
 * Dashboard de A/B Testing
 * 
 * Interface para gerenciar testes A/B, criar experimentos,
 * monitorar resultados e analisar performance.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useABTestManager, ABTest, ABVariant, ABMetric, ABAnalysis } from '@/lib/ab-testing';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Plus, Play, Pause, Square, BarChart3, TrendingUp, Users, Target, AlertTriangle, CheckCircle } from 'lucide-react';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ABTestingDashboard() {
  const { tests, createTest, updateTest, startTest, pauseTest, completeTest, analyzeTest } = useABTestManager();
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [analysis, setAnalysis] = useState<ABAnalysis | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Estatísticas gerais
  const stats = {
    total: tests.length,
    running: tests.filter(t => t.status === 'running').length,
    completed: tests.filter(t => t.status === 'completed').length,
    draft: tests.filter(t => t.status === 'draft').length
  };

  // Analisar teste selecionado
  const handleAnalyzeTest = async (testId: string) => {
    setIsAnalyzing(true);
    try {
      const result = analyzeTest(testId);
      setAnalysis(result);
    } catch (error) {
      console.error('Erro ao analisar teste:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">A/B Testing</h1>
          <p className="text-muted-foreground">
            Gerencie experimentos e otimize a experiência do usuário
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Teste
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <CreateTestDialog onClose={() => setIsCreateDialogOpen(false)} onCreate={createTest} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total de Testes</div>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.running}</div>
                <div className="text-sm text-muted-foreground">Em Execução</div>
              </div>
              <Play className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                <div className="text-sm text-muted-foreground">Concluídos</div>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
                <div className="text-sm text-muted-foreground">Rascunhos</div>
              </div>
              <Target className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <Tabs defaultValue="tests" className="w-full">
        <TabsList>
          <TabsTrigger value="tests">Testes</TabsTrigger>
          <TabsTrigger value="analysis">Análise</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="tests">
          <TestsList 
            tests={tests} 
            onSelectTest={setSelectedTest}
            onStartTest={startTest}
            onPauseTest={pauseTest}
            onCompleteTest={completeTest}
            onAnalyzeTest={handleAnalyzeTest}
          />
        </TabsContent>

        <TabsContent value="analysis">
          <AnalysisView 
            analysis={analysis}
            isAnalyzing={isAnalyzing}
            selectedTest={selectedTest}
          />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsView tests={tests} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// COMPONENTE DE LISTA DE TESTES
// ============================================

interface TestsListProps {
  tests: ABTest[];
  onSelectTest: (test: ABTest) => void;
  onStartTest: (testId: string) => void;
  onPauseTest: (testId: string) => void;
  onCompleteTest: (testId: string) => void;
  onAnalyzeTest: (testId: string) => void;
}

function TestsList({ tests, onSelectTest, onStartTest, onPauseTest, onCompleteTest, onAnalyzeTest }: TestsListProps) {
  const getStatusColor = (status: ABTest['status']) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ABTest['status']) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'draft': return <Target className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {tests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum teste criado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro teste A/B para começar a otimizar a experiência do usuário
            </p>
          </CardContent>
        </Card>
      ) : (
        tests.map(test => (
          <Card key={test.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectTest(test)}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{test.name}</h3>
                    <Badge className={getStatusColor(test.status)}>
                      {getStatusIcon(test.status)}
                      <span className="ml-1 capitalize">{test.status}</span>
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">{test.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>📊 {test.variants.length} variantes</span>
                    <span>🎯 {test.metrics.length} métricas</span>
                    <span>👥 {test.trafficAllocation}% do tráfego</span>
                    <span>📅 {new Date(test.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {test.status === 'draft' && (
                    <Button size="sm" onClick={() => onStartTest(test.id)}>
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  {test.status === 'running' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => onPauseTest(test.id)}>
                        <Pause className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Square className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Finalizar Teste</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja finalizar este teste? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onCompleteTest(test.id)}>
                              Finalizar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                  {(test.status === 'completed' || test.status === 'running') && (
                    <Button size="sm" variant="outline" onClick={() => onAnalyzeTest(test.id)}>
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Progress bar para testes em execução */}
              {test.status === 'running' && test.endDate && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1">
                    <span>Progresso</span>
                    <span>{Math.round(((Date.now() - test.startDate) / (test.endDate - test.startDate)) * 100)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(100, ((Date.now() - test.startDate) / (test.endDate - test.startDate)) * 100)} 
                    className="h-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ============================================
// COMPONENTE DE ANÁLISE
// ============================================

interface AnalysisViewProps {
  analysis: ABAnalysis | null;
  isAnalyzing: boolean;
  selectedTest: ABTest | null;
}

function AnalysisView({ analysis, isAnalyzing, selectedTest }: AnalysisViewProps) {
  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Analisando resultados do teste...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">Selecione um teste para análise</h3>
          <p className="text-muted-foreground">
            Escolha um teste em execução ou concluído para ver os resultados detalhados
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = analysis.variants.map(variant => ({
    name: variant.name,
    conversions: variant.conversions,
    participants: variant.participants,
    conversionRate: variant.conversionRate
  }));

  return (
    <div className="space-y-6">
      {/* Resumo da Análise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Resumo da Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{analysis.sampleSize}</div>
              <div className="text-sm text-muted-foreground">Participantes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{analysis.confidence.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Confiança</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                analysis.significance ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {analysis.significance ? 'Sim' : 'Não'}
              </div>
              <div className="text-sm text-muted-foreground">Significativo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {analysis.winner ? '🏆' : '🤷'}
              </div>
              <div className="text-sm text-muted-foreground">
                {analysis.winner ? 'Vencedor' : 'Empate'}
              </div>
            </div>
          </div>

          {analysis.winner && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Variante Vencedora Identificada</span>
              </div>
              <p className="text-green-700">
                A variante "{analysis.variants.find(v => v.variantId === analysis.winner)?.name}" 
                mostrou melhor performance com {analysis.confidence.toFixed(1)}% de confiança.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Conversões */}
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Conversão por Variante</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'conversionRate' ? `${value}%` : value,
                  name === 'conversionRate' ? 'Taxa de Conversão' : 
                  name === 'conversions' ? 'Conversões' : 'Participantes'
                ]}
              />
              <Bar dataKey="conversionRate" fill="#3b82f6" name="Taxa de Conversão" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detalhes das Variantes */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes das Variantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.variants.map(variant => (
              <div key={variant.variantId} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">{variant.name}</h4>
                  {variant.variantId === analysis.winner && (
                    <Badge className="bg-green-100 text-green-800">🏆 Vencedor</Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-lg font-semibold">{variant.participants}</div>
                    <div className="text-sm text-muted-foreground">Participantes</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{variant.conversions}</div>
                    <div className="text-sm text-muted-foreground">Conversões</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{variant.conversionRate.toFixed(2)}%</div>
                    <div className="text-sm text-muted-foreground">Taxa de Conversão</div>
                  </div>
                  <div>
                    <Progress value={variant.conversionRate} className="mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium mt-0.5">
                  {index + 1}
                </div>
                <p className="text-blue-800">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// COMPONENTE DE INSIGHTS
// ============================================

interface InsightsViewProps {
  tests: ABTest[];
}

function InsightsView({ tests }: InsightsViewProps) {
  const completedTests = tests.filter(t => t.status === 'completed');
  const runningTests = tests.filter(t => t.status === 'running');
  
  const statusData = [
    { name: 'Concluídos', value: completedTests.length, color: '#3b82f6' },
    { name: 'Em Execução', value: runningTests.length, color: '#10b981' },
    { name: 'Rascunhos', value: tests.filter(t => t.status === 'draft').length, color: '#6b7280' },
    { name: 'Pausados', value: tests.filter(t => t.status === 'paused').length, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-6">
      {/* Distribuição de Status */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Status dos Testes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{tests.length}</div>
              <div className="text-sm text-muted-foreground">Total de Testes</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {tests.reduce((sum, test) => sum + test.variants.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total de Variantes</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {tests.reduce((sum, test) => sum + test.metrics.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total de Métricas</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Insights Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum insight disponível ainda. Crie alguns testes para ver insights.
              </p>
            ) : (
              <>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">💡 Dica de Otimização</h4>
                  <p className="text-blue-700">
                    Você tem {runningTests.length} testes em execução. 
                    Considere aguardar resultados significativos antes de criar novos testes.
                  </p>
                </div>
                
                {completedTests.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">📊 Progresso</h4>
                    <p className="text-green-700">
                      Você já concluiu {completedTests.length} testes. 
                      Continue experimentando para otimizar ainda mais a experiência do usuário.
                    </p>
                  </div>
                )}
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">⚡ Próximos Passos</h4>
                  <p className="text-yellow-700">
                    Considere testar diferentes elementos como CTAs, cores, layouts e copy 
                    para maximizar as conversões.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// DIALOG DE CRIAÇÃO DE TESTE
// ============================================

interface CreateTestDialogProps {
  onClose: () => void;
  onCreate: (testData: any) => void;
}

function CreateTestDialog({ onClose, onCreate }: CreateTestDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trafficAllocation: 100,
    variants: [
      { id: 'control', name: 'Controle', description: '', weight: 50, isControl: true, config: {} },
      { id: 'variant_a', name: 'Variante A', description: '', weight: 50, isControl: false, config: {} }
    ],
    metrics: [
      { id: 'conversion', name: 'Conversão', type: 'conversion', description: 'Taxa de conversão principal', goal: 'increase', primaryMetric: true }
    ],
    targetAudience: {
      segments: [],
      devices: [],
      countries: []
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      onCreate({
        ...formData,
        status: 'draft',
        startDate: Date.now(),
        createdBy: 'current_user' // Em produção, usar ID do usuário atual
      });
      onClose();
    } catch (error) {
      console.error('Erro ao criar teste:', error);
      alert('Erro ao criar teste. Verifique os dados e tente novamente.');
    }
  };

  return (
    <DialogHeader>
      <DialogTitle>Criar Novo Teste A/B</DialogTitle>
      <DialogDescription>
        Configure um novo experimento para otimizar a experiência do usuário
      </DialogDescription>
      
      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Teste</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Teste de CTA na página inicial"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o objetivo e hipótese do teste"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="traffic">Alocação de Tráfego (%)</Label>
            <Input
              id="traffic"
              type="number"
              min="1"
              max="100"
              value={formData.trafficAllocation}
              onChange={(e) => setFormData({ ...formData, trafficAllocation: parseInt(e.target.value) })}
            />
          </div>
        </div>

        {/* Variantes */}
        <div className="space-y-4">
          <h4 className="font-medium">Variantes</h4>
          {formData.variants.map((variant, index) => (
            <div key={variant.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={variant.name}
                  onChange={(e) => {
                    const newVariants = [...formData.variants];
                    newVariants[index].name = e.target.value;
                    setFormData({ ...formData, variants: newVariants });
                  }}
                  placeholder="Nome da variante"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={variant.weight}
                  onChange={(e) => {
                    const newVariants = [...formData.variants];
                    newVariants[index].weight = parseInt(e.target.value);
                    setFormData({ ...formData, variants: newVariants });
                  }}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Textarea
                value={variant.description}
                onChange={(e) => {
                  const newVariants = [...formData.variants];
                  newVariants[index].description = e.target.value;
                  setFormData({ ...formData, variants: newVariants });
                }}
                placeholder="Descrição da variante"
                rows={2}
              />
            </div>
          ))}
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            Criar Teste
          </Button>
        </div>
      </form>
    </DialogHeader>
  );
}
