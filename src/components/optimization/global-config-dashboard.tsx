/**
 * Dashboard de Configuração Global
 * 
 * Interface centralizada para gerenciar todas as configurações
 * do sistema de otimização e analytics.
 */

'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle,
  Info,
  Smartphone,
  Monitor,
  Battery,
  Zap,
  Shield,
  Database,
  Activity,
  Brain,
  Users,
  Gauge
} from 'lucide-react';
import {
  useOptimizationConfig,
  CONFIG_PRESETS,
  ConfigUtils,
  type GlobalOptimizationConfig
} from '@/lib/optimization-config';

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface ConfigSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function ConfigSection({ title, description, icon, children }: ConfigSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

interface ConfigToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ConfigToggle({ label, description, checked, onChange, disabled }: ConfigToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <label className="text-sm font-medium">{label}</label>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

interface ConfigSliderProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  formatter?: (value: number) => string;
}

function ConfigSlider({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  formatter
}: ConfigSliderProps) {
  const displayValue = formatter ? formatter(value) : `${value}${unit || ''}`;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm text-gray-600">{displayValue}</span>
      </div>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      <Slider
        value={[value]}
        onValueChange={([newValue]) => onChange(newValue)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function GlobalConfigDashboard() {
  const {
    config,
    updateConfig,
    updateModuleConfig,
    applyPreset,
    reset,
    exportConfig,
    importConfig,
    validateConfig
  } = useOptimizationConfig();

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Detectar capacidades do dispositivo
  const deviceCapabilities = ConfigUtils.detectDeviceCapabilities();
  const suggestedPreset = ConfigUtils.suggestPreset();
  const isDoNotTrack = ConfigUtils.isDoNotTrackEnabled();
  const estimatedStorage = ConfigUtils.estimateStorageUsage(config);

  const handlePresetChange = (preset: string) => {
    applyPreset(preset as keyof typeof CONFIG_PRESETS);
  };

  const handleExport = () => {
    const configJson = exportConfig();
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimization-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      const success = importConfig(importText);
      if (success) {
        setImportDialogOpen(false);
        setImportText('');
        setValidationErrors([]);
      } else {
        const errors = validateConfig(JSON.parse(importText));
        setValidationErrors(errors);
      }
    } catch (error) {
      setValidationErrors(['JSON inválido']);
    }
  };

  const getDeviceIcon = (capabilities: string) => {
    switch (capabilities) {
      case 'high': return <Monitor className="h-4 w-4" />;
      case 'low': return <Smartphone className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getCapabilityColor = (capabilities: string) => {
    switch (capabilities) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração Global</h1>
          <p className="text-gray-600">
            Gerenciamento centralizado de todas as configurações do sistema
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar Configuração</DialogTitle>
                <DialogDescription>
                  Cole o JSON de configuração exportado anteriormente
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Cole o JSON aqui..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={10}
                />
                {validationErrors.length > 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <ul className="list-disc list-inside">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleImport}>
                    Importar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Status do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ambiente</p>
                <Badge className={config.environment === 'production' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                  {config.environment}
                </Badge>
              </div>
              <Settings className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dispositivo</p>
                <Badge className={getCapabilityColor(deviceCapabilities)}>
                  {deviceCapabilities}
                </Badge>
              </div>
              {getDeviceIcon(deviceCapabilities)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Armazenamento</p>
                <p className="text-lg font-bold">
                  {(estimatedStorage / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>
              <Database className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Privacidade</p>
                <Badge className={isDoNotTrack ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {isDoNotTrack ? 'DNT Ativo' : 'Normal'}
                </Badge>
              </div>
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preset Sugerido */}
      {suggestedPreset !== 'production' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Baseado nas capacidades do seu dispositivo, recomendamos o preset <strong>{suggestedPreset}</strong>.
            <Button
              variant="link"
              className="p-0 h-auto ml-2"
              onClick={() => handlePresetChange(suggestedPreset)}
            >
              Aplicar agora
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs de Configuração */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="resources">Recursos</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="predictive">Preditiva</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade</TabsTrigger>
        </TabsList>

        {/* Tab: Configurações Gerais */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ConfigSection
              title="Configurações Básicas"
              description="Configurações fundamentais do sistema"
              icon={<Settings className="h-5 w-5" />}
            >
              <ConfigToggle
                label="Sistema Habilitado"
                description="Ativa/desativa todo o sistema de otimização"
                checked={config.enabled}
                onChange={(enabled) => updateConfig({ enabled })}
              />
              
              <ConfigToggle
                label="Modo Debug"
                description="Exibe logs detalhados no console"
                checked={config.debugMode}
                onChange={(debugMode) => updateConfig({ debugMode })}
              />
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Preset de Configuração</label>
                <Select
                  value={Object.keys(CONFIG_PRESETS).find(key => {
                    const preset = CONFIG_PRESETS[key as keyof typeof CONFIG_PRESETS];
                    return JSON.stringify(preset) === JSON.stringify(config);
                  }) || 'custom'}
                  onValueChange={handlePresetChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Desenvolvimento</SelectItem>
                    <SelectItem value="production">Produção</SelectItem>
                    <SelectItem value="lowPerformance">Baixa Performance</SelectItem>
                    <SelectItem value="highPerformance">Alta Performance</SelectItem>
                    <SelectItem value="energySaver">Economia de Energia</SelectItem>
                    <SelectItem value="minimal">Mínimo</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </ConfigSection>

            <ConfigSection
              title="Coleta de Dados"
              description="Configurações de coleta e armazenamento"
              icon={<Database className="h-5 w-5" />}
            >
              <ConfigSlider
                label="Intervalo de Métricas"
                description="Frequência de coleta de métricas"
                value={config.collection.metricsInterval}
                onChange={(metricsInterval) => updateModuleConfig('collection', { metricsInterval })}
                min={100}
                max={10000}
                step={100}
                unit="ms"
              />
              
              <ConfigSlider
                label="Tamanho do Lote"
                description="Número de métricas processadas por vez"
                value={config.collection.batchSize}
                onChange={(batchSize) => updateModuleConfig('collection', { batchSize })}
                min={10}
                max={500}
                step={10}
              />
              
              <ConfigSlider
                label="Retenção de Dados"
                description="Dias para manter dados históricos"
                value={config.collection.retentionDays}
                onChange={(retentionDays) => updateModuleConfig('collection', { retentionDays })}
                min={1}
                max={90}
                step={1}
                unit=" dias"
              />
            </ConfigSection>
          </div>
        </TabsContent>

        {/* Tab: Performance */}
        <TabsContent value="performance" className="space-y-6">
          <ConfigSection
            title="Otimização de Performance"
            description="Configurações do sistema de performance em tempo real"
            icon={<Gauge className="h-5 w-5" />}
          >
            <ConfigToggle
              label="Performance Habilitada"
              description="Ativa monitoramento e otimização de performance"
              checked={config.performance.enabled}
              onChange={(enabled) => updateModuleConfig('performance', { enabled })}
            />
            
            <ConfigSlider
              label="FPS Target"
              description="Meta de frames por segundo"
              value={config.performance.targetFPS}
              onChange={(targetFPS) => updateModuleConfig('performance', { targetFPS })}
              min={15}
              max={240}
              step={5}
              unit=" FPS"
            />
            
            <ConfigSlider
              label="Uso Máximo de Memória"
              description="Limite de uso de memória antes de otimizar"
              value={config.performance.maxMemoryUsage}
              onChange={(maxMemoryUsage) => updateModuleConfig('performance', { maxMemoryUsage })}
              min={30}
              max={95}
              step={5}
              unit="%"
            />
            
            <ConfigSlider
              label="Tempo Máximo de Carregamento"
              description="Limite de tempo de carregamento aceitável"
              value={config.performance.maxLoadTime}
              onChange={(maxLoadTime) => updateModuleConfig('performance', { maxLoadTime })}
              min={500}
              max={10000}
              step={250}
              unit="ms"
            />
            
            <ConfigSlider
              label="Taxa de Aprendizado"
              description="Velocidade de adaptação do sistema"
              value={config.performance.learningRate}
              onChange={(learningRate) => updateModuleConfig('performance', { learningRate })}
              min={0.01}
              max={0.5}
              step={0.01}
              formatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
          </ConfigSection>
        </TabsContent>

        {/* Tab: Recursos */}
        <TabsContent value="resources" className="space-y-6">
          <ConfigSection
            title="Otimização de Recursos"
            description="Configurações do sistema de recursos"
            icon={<Activity className="h-5 w-5" />}
          >
            <ConfigToggle
              label="Recursos Habilitados"
              description="Ativa monitoramento e otimização de recursos"
              checked={config.resources.enabled}
              onChange={(enabled) => updateModuleConfig('resources', { enabled })}
            />
            
            <ConfigSlider
              label="Intervalo de Monitoramento"
              description="Frequência de verificação de recursos"
              value={config.resources.monitoringInterval}
              onChange={(monitoringInterval) => updateModuleConfig('resources', { monitoringInterval })}
              min={1000}
              max={30000}
              step={1000}
              unit="ms"
            />
            
            <ConfigSlider
              label="Intervalo de Otimização"
              description="Frequência de execução de otimizações"
              value={config.resources.optimizationInterval}
              onChange={(optimizationInterval) => updateModuleConfig('resources', { optimizationInterval })}
              min={2000}
              max={60000}
              step={1000}
              unit="ms"
            />
            
            <ConfigSlider
              label="Máximo de Ações por Minuto"
              description="Limite de otimizações por minuto"
              value={config.resources.maxActionsPerMinute}
              onChange={(maxActionsPerMinute) => updateModuleConfig('resources', { maxActionsPerMinute })}
              min={1}
              max={60}
              step={1}
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Nível de Agressividade</label>
              <Select
                value={config.resources.aggressivenessLevel}
                onValueChange={(aggressivenessLevel: 'low' | 'medium' | 'high') => 
                  updateModuleConfig('resources', { aggressivenessLevel })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixo</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ConfigSection>
        </TabsContent>

        {/* Tab: Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <ConfigSection
            title="Análise de Comportamento"
            description="Configurações de coleta e análise de dados do usuário"
            icon={<Users className="h-5 w-5" />}
          >
            <ConfigToggle
              label="Analytics Habilitado"
              description="Ativa coleta de dados de comportamento"
              checked={config.analytics.enabled}
              onChange={(enabled) => updateModuleConfig('analytics', { enabled })}
            />
            
            <ConfigToggle
              label="Rastrear Comportamento"
              description="Coleta dados de interação do usuário"
              checked={config.analytics.trackUserBehavior}
              onChange={(trackUserBehavior) => updateModuleConfig('analytics', { trackUserBehavior })}
              disabled={!config.analytics.enabled}
            />
            
            <ConfigToggle
              label="Rastrear Erros"
              description="Coleta dados de erros JavaScript"
              checked={config.analytics.trackErrors}
              onChange={(trackErrors) => updateModuleConfig('analytics', { trackErrors })}
              disabled={!config.analytics.enabled}
            />
            
            <ConfigToggle
              label="Rastrear Conversões"
              description="Coleta dados de conversões e metas"
              checked={config.analytics.trackConversions}
              onChange={(trackConversions) => updateModuleConfig('analytics', { trackConversions })}
              disabled={!config.analytics.enabled}
            />
            
            <ConfigSlider
              label="Timeout de Sessão"
              description="Tempo limite para considerar sessão inativa"
              value={config.analytics.sessionTimeout}
              onChange={(sessionTimeout) => updateModuleConfig('analytics', { sessionTimeout })}
              min={5 * 60 * 1000}
              max={120 * 60 * 1000}
              step={5 * 60 * 1000}
              formatter={(value) => `${Math.floor(value / 60000)} min`}
            />
          </ConfigSection>
        </TabsContent>

        {/* Tab: Análise Preditiva */}
        <TabsContent value="predictive" className="space-y-6">
          <ConfigSection
            title="Análise Preditiva"
            description="Configurações de machine learning e predições"
            icon={<Brain className="h-5 w-5" />}
          >
            <ConfigToggle
              label="Análise Preditiva Habilitada"
              description="Ativa predições baseadas em ML"
              checked={config.predictive.enabled}
              onChange={(enabled) => updateModuleConfig('predictive', { enabled })}
            />
            
            <ConfigSlider
              label="Intervalo de Atualização de Modelo"
              description="Frequência de retreinamento dos modelos"
              value={config.predictive.modelUpdateInterval}
              onChange={(modelUpdateInterval) => updateModuleConfig('predictive', { modelUpdateInterval })}
              min={30000}
              max={300000}
              step={30000}
              formatter={(value) => `${Math.floor(value / 1000)}s`}
            />
            
            <ConfigSlider
              label="Intervalo de Predição"
              description="Frequência de geração de predições"
              value={config.predictive.predictionInterval}
              onChange={(predictionInterval) => updateModuleConfig('predictive', { predictionInterval })}
              min={10000}
              max={120000}
              step={10000}
              formatter={(value) => `${Math.floor(value / 1000)}s`}
            />
            
            <ConfigSlider
              label="Limite de Confiança"
              description="Confiança mínima para considerar predições"
              value={config.predictive.confidenceThreshold}
              onChange={(confidenceThreshold) => updateModuleConfig('predictive', { confidenceThreshold })}
              min={0.1}
              max={0.99}
              step={0.05}
              formatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            
            <ConfigSlider
              label="Limite de Anomalia"
              description="Sensibilidade para detecção de anomalias"
              value={config.predictive.anomalyThreshold}
              onChange={(anomalyThreshold) => updateModuleConfig('predictive', { anomalyThreshold })}
              min={1.0}
              max={5.0}
              step={0.1}
              formatter={(value) => `${value.toFixed(1)}σ`}
            />
          </ConfigSection>
        </TabsContent>

        {/* Tab: Privacidade */}
        <TabsContent value="privacy" className="space-y-6">
          <ConfigSection
            title="Configurações de Privacidade"
            description="Controles de privacidade e proteção de dados"
            icon={<Shield className="h-5 w-5" />}
          >
            <ConfigToggle
              label="Anonimizar Dados"
              description="Remove informações identificáveis dos dados"
              checked={config.privacy.anonymizeData}
              onChange={(anonymizeData) => updateModuleConfig('privacy', { anonymizeData })}
            />
            
            <ConfigToggle
              label="Respeitar Do Not Track"
              description="Honra a configuração DNT do navegador"
              checked={config.privacy.respectDoNotTrack}
              onChange={(respectDoNotTrack) => updateModuleConfig('privacy', { respectDoNotTrack })}
            />
            
            <ConfigToggle
              label="Permitir Exportação"
              description="Permite que usuários exportem seus dados"
              checked={config.privacy.allowDataExport}
              onChange={(allowDataExport) => updateModuleConfig('privacy', { allowDataExport })}
            />
            
            <ConfigSlider
              label="Retenção de Dados"
              description="Dias para manter dados pessoais"
              value={config.privacy.dataRetentionDays}
              onChange={(dataRetentionDays) => updateModuleConfig('privacy', { dataRetentionDays })}
              min={1}
              max={365}
              step={1}
              unit=" dias"
            />
            
            {isDoNotTrack && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Do Not Track está ativo no seu navegador. Algumas funcionalidades de analytics podem estar limitadas.
                </AlertDescription>
              </Alert>
            )}
          </ConfigSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
