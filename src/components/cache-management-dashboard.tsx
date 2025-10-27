/**
 * Dashboard de Gerenciamento de Cache
 * 
 * Interface para monitorar, configurar e gerenciar o sistema de cache
 * de banco de dados com métricas em tempo real e controles avançados.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  useDatabaseCacheSystem, 
  formatCacheSize, 
  formatCacheHitRate, 
  getCacheEfficiencyLevel,
  estimateCacheSavings,
  type CacheConfig,
  type QueryCacheStrategy,
  type CacheInvalidationRule
} from '@/lib/database-cache-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  BarChart3, 
  Database, 
  Zap, 
  Settings, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  HardDrive, 
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Save,
  X
} from 'lucide-react';

interface CacheManagementDashboardProps {
  className?: string;
}

export function CacheManagementDashboard({ className }: CacheManagementDashboardProps) {
  const {
    cache,
    metrics,
    config,
    strategies,
    invalidationRules,
    isCleaningUp,
    cacheQuery,
    handleDatabaseChange,
    cleanup,
    clear,
    updateConfig,
    updateStrategies,
    updateInvalidationRules,
    invalidateByTags,
    invalidateByPattern
  } = useDatabaseCacheSystem();

  const [activeTab, setActiveTab] = useState('overview');
  const [editingConfig, setEditingConfig] = useState<CacheConfig | null>(null);
  const [editingStrategy, setEditingStrategy] = useState<QueryCacheStrategy | null>(null);
  const [editingRule, setEditingRule] = useState<CacheInvalidationRule | null>(null);
  const [newStrategyForm, setNewStrategyForm] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState(false);
  const [invalidationInput, setInvalidationInput] = useState('');
  const [invalidationType, setInvalidationType] = useState<'tags' | 'pattern'>('tags');

  // ============================================
  // CÁLCULOS E ESTATÍSTICAS
  // ============================================

  const efficiencyLevel = getCacheEfficiencyLevel(metrics.hitRate);
  const cacheSavings = estimateCacheSavings(metrics, 150); // 150ms tempo médio de query
  const cacheUsagePercent = config.maxSize > 0 ? (metrics.totalSize / config.maxSize) * 100 : 0;
  const entriesUsagePercent = config.maxEntries > 0 ? (metrics.totalEntries / config.maxEntries) * 100 : 0;

  const getEfficiencyColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  const getEfficiencyBadgeVariant = (level: string) => {
    switch (level) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'fair': return 'outline';
      default: return 'destructive';
    }
  };

  // ============================================
  // HANDLERS DE CONFIGURAÇÃO
  // ============================================

  const handleConfigSave = () => {
    if (editingConfig) {
      updateConfig(editingConfig);
      setEditingConfig(null);
    }
  };

  const handleStrategySave = () => {
    if (editingStrategy) {
      const updatedStrategies = strategies.map(s => 
        s.queryPattern.source === editingStrategy.queryPattern.source ? editingStrategy : s
      );
      updateStrategies(updatedStrategies);
      setEditingStrategy(null);
    }
  };

  const handleRuleSave = () => {
    if (editingRule) {
      const updatedRules = invalidationRules.map(r => 
        r.id === editingRule.id ? editingRule : r
      );
      updateInvalidationRules(updatedRules);
      setEditingRule(null);
    }
  };

  const handleInvalidation = () => {
    if (!invalidationInput.trim()) return;

    if (invalidationType === 'tags') {
      const tags = invalidationInput.split(',').map(t => t.trim()).filter(Boolean);
      invalidateByTags(tags);
    } else {
      try {
        const pattern = new RegExp(invalidationInput, 'i');
        invalidateByPattern(pattern);
      } catch (error) {
        console.error('Padrão regex inválido:', error);
        return;
      }
    }

    setInvalidationInput('');
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciamento de Cache</h2>
          <p className="text-muted-foreground">
            Monitore e configure o sistema de cache do banco de dados
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cleanup}
            disabled={isCleaningUp}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isCleaningUp ? 'animate-spin' : ''}`} />
            Limpeza
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={clear}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Cache
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="entries">Entradas</TabsTrigger>
          <TabsTrigger value="strategies">Estratégias</TabsTrigger>
          <TabsTrigger value="invalidation">Invalidação</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          {/* Métricas Principais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCacheHitRate(metrics.hitRate)}</div>
                <Badge variant={getEfficiencyBadgeVariant(efficiencyLevel)} className="mt-1">
                  {efficiencyLevel === 'excellent' && 'Excelente'}
                  {efficiencyLevel === 'good' && 'Bom'}
                  {efficiencyLevel === 'fair' && 'Regular'}
                  {efficiencyLevel === 'poor' && 'Ruim'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entradas</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalEntries}</div>
                <Progress value={entriesUsagePercent} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {entriesUsagePercent.toFixed(1)}% do limite
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tamanho</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCacheSize(metrics.totalSize)}</div>
                <Progress value={cacheUsagePercent} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {cacheUsagePercent.toFixed(1)}% do limite
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
                  {metrics.averageAccessTime.toFixed(1)}ms
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo de acesso
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas de Economia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Economia Estimada
              </CardTitle>
              <CardDescription>
                Benefícios do sistema de cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(cacheSavings.timeSaved / 1000).toFixed(1)}s
                  </div>
                  <p className="text-sm text-muted-foreground">Tempo Economizado</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {cacheSavings.queriesAvoided.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Queries Evitadas</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    ${cacheSavings.estimatedCostSaving.toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground">Economia Estimada</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Queries Mais Acessadas */}
          <Card>
            <CardHeader>
              <CardTitle>Queries Mais Acessadas</CardTitle>
              <CardDescription>
                Top 5 queries com mais acessos no cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.mostAccessedQueries.slice(0, 5).map((entry, index) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono text-sm truncate max-w-md">
                        {entry.query}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{entry.accessCount} acessos</span>
                        <span>{formatCacheSize(entry.size)}</span>
                        <span>TTL: {(entry.ttl / 1000 / 60).toFixed(0)}min</span>
                      </div>
                    </div>
                    <Badge variant="outline">#{index + 1}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Entradas do Cache */}
        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entradas do Cache</CardTitle>
              <CardDescription>
                Todas as entradas atualmente no cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cache.map((entry) => {
                  const age = Date.now() - entry.createdAt.getTime();
                  const agePercent = (age / entry.ttl) * 100;
                  const isExpiringSoon = agePercent > 80;
                  
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-mono text-sm truncate max-w-md">
                          {entry.query}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{entry.accessCount} acessos</span>
                          <span>{formatCacheSize(entry.size)}</span>
                          <span>Criado: {entry.createdAt.toLocaleTimeString()}</span>
                          <span>Último acesso: {entry.lastAccessed.toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {entry.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpiringSoon && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {(100 - agePercent).toFixed(0)}%
                          </div>
                          <div className="text-xs text-muted-foreground">restante</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {cache.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma entrada no cache
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estratégias de Cache */}
        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Estratégias de Cache
                <Button
                  size="sm"
                  onClick={() => setNewStrategyForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Estratégia
                </Button>
              </CardTitle>
              <CardDescription>
                Configure como diferentes tipos de queries são cacheadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {strategies.map((strategy, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-mono text-sm">
                        {strategy.queryPattern.source}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={strategy.priority === 'high' ? 'default' : strategy.priority === 'medium' ? 'secondary' : 'outline'}>
                          {strategy.priority}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingStrategy(strategy)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>TTL: {(strategy.ttl / 1000 / 60).toFixed(0)}min</span>
                      <span>Tags: {strategy.tags.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invalidação */}
        <TabsContent value="invalidation" className="space-y-4">
          {/* Invalidação Manual */}
          <Card>
            <CardHeader>
              <CardTitle>Invalidação Manual</CardTitle>
              <CardDescription>
                Invalide entradas do cache por tags ou padrão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Select value={invalidationType} onValueChange={(value: 'tags' | 'pattern') => setInvalidationType(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tags">Tags</SelectItem>
                      <SelectItem value="pattern">Padrão</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder={invalidationType === 'tags' ? 'tag1, tag2, tag3' : 'SELECT.*FROM users'}
                    value={invalidationInput}
                    onChange={(e) => setInvalidationInput(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleInvalidation}>
                    Invalidar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regras de Invalidação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Regras de Invalidação
                <Button
                  size="sm"
                  onClick={() => setNewRuleForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </CardTitle>
              <CardDescription>
                Regras automáticas para invalidar cache quando dados mudam
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invalidationRules.map((rule) => (
                  <div key={rule.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        {rule.enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingRule(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {rule.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Tabelas: {rule.tables.join(', ')}</span>
                      <span>Operações: {rule.operations.join(', ')}</span>
                      <span>Tags: {rule.tags.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuração */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Configuração do Cache
                {!editingConfig ? (
                  <Button
                    size="sm"
                    onClick={() => setEditingConfig({ ...config })}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleConfigSave}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingConfig(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                Configure os parâmetros do sistema de cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editingConfig ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="maxSize">Tamanho Máximo (bytes)</Label>
                    <Input
                      id="maxSize"
                      type="number"
                      value={editingConfig.maxSize}
                      onChange={(e) => setEditingConfig({
                        ...editingConfig,
                        maxSize: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxEntries">Máximo de Entradas</Label>
                    <Input
                      id="maxEntries"
                      type="number"
                      value={editingConfig.maxEntries}
                      onChange={(e) => setEditingConfig({
                        ...editingConfig,
                        maxEntries: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultTTL">TTL Padrão (ms)</Label>
                    <Input
                      id="defaultTTL"
                      type="number"
                      value={editingConfig.defaultTTL}
                      onChange={(e) => setEditingConfig({
                        ...editingConfig,
                        defaultTTL: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cleanupInterval">Intervalo de Limpeza (ms)</Label>
                    <Input
                      id="cleanupInterval"
                      type="number"
                      value={editingConfig.cleanupInterval}
                      onChange={(e) => setEditingConfig({
                        ...editingConfig,
                        cleanupInterval: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="evictionPolicy">Política de Evicção</Label>
                    <Select
                      value={editingConfig.evictionPolicy}
                      onValueChange={(value: 'lru' | 'lfu' | 'ttl' | 'size') => setEditingConfig({
                        ...editingConfig,
                        evictionPolicy: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lru">LRU (Menos Usado Recentemente)</SelectItem>
                        <SelectItem value="lfu">LFU (Menos Usado Frequentemente)</SelectItem>
                        <SelectItem value="ttl">TTL (Mais Antigo)</SelectItem>
                        <SelectItem value="size">Size (Maior Tamanho)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enableCompression"
                        checked={editingConfig.enableCompression}
                        onCheckedChange={(checked) => setEditingConfig({
                          ...editingConfig,
                          enableCompression: checked
                        })}
                      />
                      <Label htmlFor="enableCompression">Habilitar Compressão</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enablePersistence"
                        checked={editingConfig.enablePersistence}
                        onCheckedChange={(checked) => setEditingConfig({
                          ...editingConfig,
                          enablePersistence: checked
                        })}
                      />
                      <Label htmlFor="enablePersistence">Habilitar Persistência</Label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium">Tamanho Máximo</Label>
                    <p className="text-sm text-muted-foreground">{formatCacheSize(config.maxSize)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Máximo de Entradas</Label>
                    <p className="text-sm text-muted-foreground">{config.maxEntries.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">TTL Padrão</Label>
                    <p className="text-sm text-muted-foreground">{(config.defaultTTL / 1000 / 60).toFixed(0)} minutos</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Intervalo de Limpeza</Label>
                    <p className="text-sm text-muted-foreground">{(config.cleanupInterval / 1000 / 60).toFixed(0)} minutos</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Política de Evicção</Label>
                    <p className="text-sm text-muted-foreground">
                      {config.evictionPolicy === 'lru' && 'LRU (Menos Usado Recentemente)'}
                      {config.evictionPolicy === 'lfu' && 'LFU (Menos Usado Frequentemente)'}
                      {config.evictionPolicy === 'ttl' && 'TTL (Mais Antigo)'}
                      {config.evictionPolicy === 'size' && 'Size (Maior Tamanho)'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Configurações</Label>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Compressão: {config.enableCompression ? 'Ativada' : 'Desativada'}</span>
                      <span>Persistência: {config.enablePersistence ? 'Ativada' : 'Desativada'}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
