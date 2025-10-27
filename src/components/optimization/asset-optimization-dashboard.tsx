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
  Image, 
  FileImage, 
  Zap, 
  HardDrive, 
  Clock, 
  TrendingUp, 
  Settings, 
  Download,
  Upload,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

// ============================================
// INTERFACES
// ============================================

interface AssetMetrics {
  totalAssets: number;
  totalSize: number;
  compressedSize: number;
  compressionRatio: number;
  cacheHitRate: number;
  avgLoadTime: number;
  optimizedAssets: number;
}

interface AssetItem {
  id: string;
  name: string;
  type: 'image' | 'font' | 'icon' | 'video' | 'audio';
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
  optimized: boolean;
  cached: boolean;
  loadTime: number;
  lastAccessed: Date;
}

interface OptimizationSettings {
  autoOptimization: boolean;
  imageQuality: number;
  enableWebP: boolean;
  enableAVIF: boolean;
  lazyLoading: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
  compressionLevel: number;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

function useAssetOptimization() {
  const [metrics, setMetrics] = useState<AssetMetrics>({
    totalAssets: 0,
    totalSize: 0,
    compressedSize: 0,
    compressionRatio: 0,
    cacheHitRate: 0,
    avgLoadTime: 0,
    optimizedAssets: 0
  });

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [settings, setSettings] = useState<OptimizationSettings>({
    autoOptimization: true,
    imageQuality: 85,
    enableWebP: true,
    enableAVIF: false,
    lazyLoading: true,
    cacheEnabled: true,
    cacheTTL: 3600,
    compressionLevel: 6
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);

  // Simular dados de assets
  useEffect(() => {
    const mockAssets: AssetItem[] = [
      {
        id: '1',
        name: 'hero-banner.jpg',
        type: 'image',
        originalSize: 2048000,
        compressedSize: 512000,
        compressionRatio: 75,
        format: 'JPEG',
        optimized: true,
        cached: true,
        loadTime: 150,
        lastAccessed: new Date()
      },
      {
        id: '2',
        name: 'logo.png',
        type: 'image',
        originalSize: 256000,
        compressedSize: 64000,
        compressionRatio: 75,
        format: 'PNG',
        optimized: true,
        cached: true,
        loadTime: 80,
        lastAccessed: new Date()
      },
      {
        id: '3',
        name: 'inter-font.woff2',
        type: 'font',
        originalSize: 128000,
        compressedSize: 96000,
        compressionRatio: 25,
        format: 'WOFF2',
        optimized: true,
        cached: false,
        loadTime: 120,
        lastAccessed: new Date()
      },
      {
        id: '4',
        name: 'product-gallery.mp4',
        type: 'video',
        originalSize: 10240000,
        compressedSize: 3072000,
        compressionRatio: 70,
        format: 'MP4',
        optimized: false,
        cached: false,
        loadTime: 2500,
        lastAccessed: new Date()
      }
    ];

    setAssets(mockAssets);

    // Calcular métricas
    const totalSize = mockAssets.reduce((sum, asset) => sum + asset.originalSize, 0);
    const compressedSize = mockAssets.reduce((sum, asset) => sum + asset.compressedSize, 0);
    const optimizedCount = mockAssets.filter(asset => asset.optimized).length;
    const cachedCount = mockAssets.filter(asset => asset.cached).length;
    const avgLoadTime = mockAssets.reduce((sum, asset) => sum + asset.loadTime, 0) / mockAssets.length;

    setMetrics({
      totalAssets: mockAssets.length,
      totalSize,
      compressedSize,
      compressionRatio: ((totalSize - compressedSize) / totalSize) * 100,
      cacheHitRate: (cachedCount / mockAssets.length) * 100,
      avgLoadTime,
      optimizedAssets: optimizedCount
    });
  }, []);

  const optimizeAsset = async (assetId: string) => {
    setIsOptimizing(true);
    setOptimizationProgress(0);

    // Simular processo de otimização
    for (let i = 0; i <= 100; i += 10) {
      setOptimizationProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Atualizar asset como otimizado
    setAssets(prev => prev.map(asset => 
      asset.id === assetId 
        ? { ...asset, optimized: true, compressedSize: asset.originalSize * 0.7 }
        : asset
    ));

    setIsOptimizing(false);
    setOptimizationProgress(0);
  };

  const optimizeAllAssets = async () => {
    setIsOptimizing(true);
    const unoptimizedAssets = assets.filter(asset => !asset.optimized);
    
    for (let i = 0; i < unoptimizedAssets.length; i++) {
      setOptimizationProgress((i / unoptimizedAssets.length) * 100);
      await optimizeAsset(unoptimizedAssets[i].id);
    }

    setIsOptimizing(false);
    setOptimizationProgress(0);
  };

  const clearCache = () => {
    setAssets(prev => prev.map(asset => ({ ...asset, cached: false })));
  };

  const updateSettings = (newSettings: Partial<OptimizationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return {
    metrics,
    assets,
    settings,
    isOptimizing,
    optimizationProgress,
    optimizeAsset,
    optimizeAllAssets,
    clearCache,
    updateSettings
  };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AssetOptimizationDashboard() {
  const {
    metrics,
    assets,
    settings,
    isOptimizing,
    optimizationProgress,
    optimizeAsset,
    optimizeAllAssets,
    clearCache,
    updateSettings
  } = useAssetOptimization();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'font': return <FileImage className="h-4 w-4" />;
      case 'video': return <FileImage className="h-4 w-4" />;
      default: return <FileImage className="h-4 w-4" />;
    }
  };

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'bg-blue-100 text-blue-800';
      case 'font': return 'bg-purple-100 text-purple-800';
      case 'video': return 'bg-red-100 text-red-800';
      case 'audio': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Otimização de Assets</h1>
          <p className="text-muted-foreground">
            Gerencie e otimize imagens, fontes e outros recursos
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={optimizeAllAssets}
            disabled={isOptimizing}
            className="flex items-center gap-2"
          >
            {isOptimizing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Otimizar Todos
          </Button>
          <Button variant="outline" onClick={clearCache}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Cache
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {isOptimizing && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Otimizando assets... {Math.round(optimizationProgress)}%
            <Progress value={optimizationProgress} className="mt-2" />
          </AlertDescription>
        </Alert>
      )}

      {/* Métricas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Assets</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAssets}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.optimizedAssets} otimizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia de Espaço</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.compressionRatio.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(metrics.totalSize - metrics.compressedSize)} economizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Cache</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Cache ativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.avgLoadTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Tempo de carregamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="analytics">Análise</TabsTrigger>
        </TabsList>

        {/* Lista de Assets */}
        <TabsContent value="assets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assets do Sistema</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os assets da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getAssetIcon(asset.type)}
                      <div>
                        <div className="font-medium">{asset.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatFileSize(asset.originalSize)} → {formatFileSize(asset.compressedSize)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Badge className={getAssetTypeColor(asset.type)}>
                        {asset.type.toUpperCase()}
                      </Badge>
                      
                      <div className="text-sm text-center">
                        <div className="font-medium">{asset.compressionRatio}%</div>
                        <div className="text-muted-foreground">economia</div>
                      </div>
                      
                      <div className="text-sm text-center">
                        <div className="font-medium">{asset.loadTime}ms</div>
                        <div className="text-muted-foreground">carregamento</div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {asset.optimized ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        {asset.cached && (
                          <Badge variant="secondary">Cached</Badge>
                        )}
                      </div>
                      
                      {!asset.optimized && (
                        <Button 
                          size="sm" 
                          onClick={() => optimizeAsset(asset.id)}
                          disabled={isOptimizing}
                        >
                          Otimizar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configurações */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Otimização de Imagens</CardTitle>
                <CardDescription>
                  Configure as opções de otimização automática
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-optimization">Otimização Automática</Label>
                  <Switch
                    id="auto-optimization"
                    checked={settings.autoOptimization}
                    onCheckedChange={(checked) => updateSettings({ autoOptimization: checked })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="image-quality">Qualidade da Imagem: {settings.imageQuality}%</Label>
                  <Input
                    id="image-quality"
                    type="range"
                    min="10"
                    max="100"
                    value={settings.imageQuality}
                    onChange={(e) => updateSettings({ imageQuality: parseInt(e.target.value) })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-webp">Formato WebP</Label>
                  <Switch
                    id="enable-webp"
                    checked={settings.enableWebP}
                    onCheckedChange={(checked) => updateSettings({ enableWebP: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-avif">Formato AVIF</Label>
                  <Switch
                    id="enable-avif"
                    checked={settings.enableAVIF}
                    onCheckedChange={(checked) => updateSettings({ enableAVIF: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="lazy-loading">Lazy Loading</Label>
                  <Switch
                    id="lazy-loading"
                    checked={settings.lazyLoading}
                    onCheckedChange={(checked) => updateSettings({ lazyLoading: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache e Compressão</CardTitle>
                <CardDescription>
                  Configure o sistema de cache e compressão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cache-enabled">Cache Habilitado</Label>
                  <Switch
                    id="cache-enabled"
                    checked={settings.cacheEnabled}
                    onCheckedChange={(checked) => updateSettings({ cacheEnabled: checked })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cache-ttl">TTL do Cache (segundos)</Label>
                  <Input
                    id="cache-ttl"
                    type="number"
                    value={settings.cacheTTL}
                    onChange={(e) => updateSettings({ cacheTTL: parseInt(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="compression-level">Nível de Compressão: {settings.compressionLevel}</Label>
                  <Input
                    id="compression-level"
                    type="range"
                    min="1"
                    max="9"
                    value={settings.compressionLevel}
                    onChange={(e) => updateSettings({ compressionLevel: parseInt(e.target.value) })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Análise */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Tipo</CardTitle>
                <CardDescription>
                  Análise dos tipos de assets mais utilizados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['image', 'font', 'video', 'audio'].map((type) => {
                    const typeAssets = assets.filter(asset => asset.type === type);
                    const percentage = (typeAssets.length / assets.length) * 100;
                    
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{type}</span>
                          <span>{typeAssets.length} assets ({percentage.toFixed(1)}%)</span>
                        </div>
                        <Progress value={percentage} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Economia de Bandwidth</CardTitle>
                <CardDescription>
                  Impacto da otimização no tráfego de dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {formatFileSize(metrics.totalSize - metrics.compressedSize)}
                    </div>
                    <p className="text-sm text-muted-foreground">Economia total</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold">
                        {formatFileSize(metrics.totalSize)}
                      </div>
                      <p className="text-xs text-muted-foreground">Tamanho original</p>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {formatFileSize(metrics.compressedSize)}
                      </div>
                      <p className="text-xs text-muted-foreground">Tamanho otimizado</p>
                    </div>
                  </div>
                  
                  <Progress value={metrics.compressionRatio} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
