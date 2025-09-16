'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Calendar,
  Monitor,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Zap,
  Settings,
  BarChart3,
  TrendingUp,
  Link,
  Unlink,
  Search,
  Filter,
  Download,
  Upload,
  Info,
  ExternalLink,
} from 'lucide-react';
import { createClientSupabaseClient } from '@/lib/supabase/clients/browser';
import { useAuth } from '@/hooks/useAuth';

// =====================================================
// INTERFACES E TIPOS
// =====================================================

interface TheBestPackage {
  id: string;
  external_id: string;
  name: string;
  classificacao: 'COM_ADULTO' | 'SEM_ADULTO';
  duracao: '1_MES' | '3_MESES' | '6_MESES' | '12_MESES';
  telas: number;
  creditos: number;
  price: number;
  currency: string;
  is_active: boolean;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

interface HubControlPlan {
  id: string;
  name: string;
  price: number;
  validity: number;
  screens: number;
  panel_plan_id: string | null;
  restrictions: any;
  is_public: boolean;
  group_id: string | null;
  created_at: string;
  updated_at: string;
}

interface TheBestPlanMapping {
  id: string;
  thebest_package_id: string;
  hubcontrol_plan_id: string;
  config_id: string;
  is_active: boolean;
  is_default: boolean;
  sync_price: boolean;
  sync_validity: boolean;
  sync_screens: boolean;
  override_price?: number;
  override_validity?: number;
  override_screens?: number;
  created_at: string;
  updated_at: string;
  
  // Dados relacionados
  thebest_package?: TheBestPackage;
  hubcontrol_plan?: HubControlPlan;
}

interface MappingStatistics {
  total_packages: number;
  active_packages: number;
  total_mappings: number;
  active_mappings: number;
  unmapped_packages: number;
  mapping_percentage: number;
  perfect_compatibility: number;
  good_compatibility: number;
  poor_compatibility: number;
}

interface UnmappedPackage {
  package_id: string;
  package_name: string;
  external_id: string;
  telas: number;
  duracao: string;
  price: number;
  suggested_plans: {
    plan_id: string;
    plan_name: string;
    compatibility_score: number;
    screen_match: boolean;
    validity_match: boolean;
    price_match: boolean;
  }[];
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export function TheBestPlanMappingManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [supabase] = useState(() => createClientSupabaseClient());
  
  // Estados
  const [mappings, setMappings] = useState<TheBestPlanMapping[]>([]);
  const [packages, setPackages] = useState<TheBestPackage[]>([]);
  const [plans, setPlans] = useState<HubControlPlan[]>([]);
  const [statistics, setStatistics] = useState<MappingStatistics | null>(null);
  const [unmappedPackages, setUnmappedPackages] = useState<UnmappedPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoMappingProgress, setAutoMappingProgress] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [editingMapping, setEditingMapping] = useState<TheBestPlanMapping | null>(null);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [configs, setConfigs] = useState<any[]>([]);
  
  // Formulário de criação/edição
  const [formData, setFormData] = useState({
    thebest_package_id: '',
    hubcontrol_plan_id: '',
    is_active: true,
    is_default: false,
    sync_price: true,
    sync_validity: true,
    sync_screens: true,
    override_price: '',
    override_validity: '',
    override_screens: '',
  });

  // =====================================================
  // EFEITOS E CARREGAMENTO DE DADOS
  // =====================================================

  useEffect(() => {
    if (user) {
      loadConfigs();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConfigId) {
      loadData();
    }
  }, [selectedConfigId]);

  const loadConfigs = async () => {
    try {
        if (!user?.id) {
          throw new Error('Usuário não autenticado');
        }

        const { data, error } = await supabase
          .from('integration_configs')
          .select('id, name, is_active')
          .eq('provider', 'thebest')
          .eq('created_by', user.id)
          .eq('is_active', true);

      if (error) throw error;
      
      setConfigs(data || []);
      if (data && data.length > 0) {
        setSelectedConfigId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configurações TheBest',
        variant: 'destructive',
      });
    }
  };

  const loadData = async () => {
    if (!selectedConfigId) return;
    
    setLoading(true);
    try {
      await Promise.all([
        loadMappings(),
        loadPackages(),
        loadPlans(),
        loadStatistics(),
        loadUnmappedPackages(),
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados de mapeamento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = async () => {
    // TODO: Implementar carregamento de mapeamentos quando a tabela thebest_plan_mappings estiver disponível
    // const { data, error } = await supabase
    //   .from('thebest_plan_mappings')
    //   .select(`
    //     *,
    //     thebest_package:thebest_packages(*),
    //     hubcontrol_plan:plans(*)
    //   `)
    //   .eq('config_id', selectedConfigId)
    //   .order('created_at', { ascending: false });
    //
    // if (error) throw error;
    // setMappings(data || []);
    setMappings([]);
  };

  const loadPackages = async () => {
    // TODO: Implementar carregamento de pacotes quando a tabela thebest_packages estiver disponível
    // const { data, error } = await supabase
    //   .from('thebest_packages')
    //   .select('*')
    //   .eq('config_id', selectedConfigId)
    //   .eq('is_active', true)
    //   .order('name');
    //
    // if (error) throw error;
    // setPackages(data || []);
    setPackages([]);
  };

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_public', true)
      .order('name');

    if (error) throw error;
    setPlans(data || []);
  };

  const loadStatistics = async () => {
    // TODO: Implementar carregamento de estatísticas quando a função get_mapping_statistics estiver disponível
    // const { data, error } = await supabase
    //   .rpc('get_mapping_statistics', { p_config_id: selectedConfigId });
    //
    // if (error) throw error;
    // setStatistics(data?.[0] || null);
    setStatistics(null);
  };

  const loadUnmappedPackages = async () => {
    // TODO: Implementar carregamento de pacotes não mapeados quando a função get_unmapped_thebest_packages estiver disponível
    // const { data, error } = await supabase
    //   .rpc('get_unmapped_thebest_packages', { p_config_id: selectedConfigId });
    //
    // if (error) throw error;
    // setUnmappedPackages(data || []);
    setUnmappedPackages([]);
  };

  // =====================================================
  // AÇÕES DE MAPEAMENTO
  // =====================================================

  const handleAutoMapping = async () => {
    if (!selectedConfigId) return;
    
    try {
      setAutoMappingProgress(0);
      
      // TODO: Implementar mapeamento automático quando a função auto_map_thebest_packages estiver disponível
      // const { data, error } = await supabase
      //   .rpc('auto_map_thebest_packages', { 
      //     p_config_id: selectedConfigId,
      //     tolerance_days: 7
      //   });
      //
      // if (error) throw error;

      setAutoMappingProgress(100);
      
      toast({
        title: 'Auto-mapeamento concluído',
        description: 'Funcionalidade de mapeamento automático será implementada em breve.',
      });
      
      await loadData();
    } catch (error) {
      console.error('Erro no auto-mapeamento:', error);
      toast({
        title: 'Erro',
        description: 'Falha no auto-mapeamento de pacotes',
        variant: 'destructive',
      });
    }
  };

  const handleCreateMapping = async () => {
    try {
      const mappingData = {
        thebest_package_id: formData.thebest_package_id,
        hubcontrol_plan_id: formData.hubcontrol_plan_id,
        config_id: selectedConfigId,
        is_active: formData.is_active,
        is_default: formData.is_default,
        sync_price: formData.sync_price,
        sync_validity: formData.sync_validity,
        sync_screens: formData.sync_screens,
        override_price: formData.override_price ? parseFloat(formData.override_price) : null,
        override_validity: formData.override_validity ? parseInt(formData.override_validity) : null,
        override_screens: formData.override_screens ? parseInt(formData.override_screens) : null,
      };

      // TODO: Implementar salvamento de mapeamento quando a tabela thebest_plan_mappings estiver disponível
      // const { error } = await supabase
      //   .from('thebest_plan_mappings')
      //   .insert(mappingData);
      //
      // if (error) throw error;

      toast({
        title: 'Mapeamento criado',
        description: 'Funcionalidade de mapeamento será implementada em breve.',
      });

      setShowCreateDialog(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Erro ao criar mapeamento:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar mapeamento',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateMapping = async () => {
    if (!editingMapping) return;
    
    try {
      const mappingData = {
        is_active: formData.is_active,
        is_default: formData.is_default,
        sync_price: formData.sync_price,
        sync_validity: formData.sync_validity,
        sync_screens: formData.sync_screens,
        override_price: formData.override_price ? parseFloat(formData.override_price) : null,
        override_validity: formData.override_validity ? parseInt(formData.override_validity) : null,
        override_screens: formData.override_screens ? parseInt(formData.override_screens) : null,
      };

      // TODO: Implementar atualização de mapeamento quando a tabela thebest_plan_mappings estiver disponível
      // const { error } = await supabase
      //   .from('thebest_plan_mappings')
      //   .update(mappingData)
      //   .eq('id', editingMapping.id);
      //
      // if (error) throw error;

      toast({
        title: 'Mapeamento atualizado',
        description: 'Funcionalidade de atualização de mapeamento será implementada em breve.',
      });

      setEditingMapping(null);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Erro ao atualizar mapeamento:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar mapeamento',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      // TODO: Implementar remoção de mapeamento quando a tabela thebest_plan_mappings estiver disponível
      // const { error } = await supabase
      //   .from('thebest_plan_mappings')
      //   .delete()
      //   .eq('id', mappingId);
      //
      // if (error) throw error;

      toast({
        title: 'Mapeamento removido',
        description: 'Funcionalidade de remoção será implementada em breve.',
      });

      setShowDeleteDialog(null);
      await loadData();
    } catch (error) {
      console.error('Erro ao remover mapeamento:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao remover mapeamento',
        variant: 'destructive',
      });
    }
  };

  const handleQuickMap = async (packageId: string, planId: string) => {
    try {
      // TODO: Implementar mapeamento rápido quando a tabela thebest_plan_mappings estiver disponível
      // const { error } = await supabase
      //   .from('thebest_plan_mappings')
      //   .insert({
      //     thebest_package_id: packageId,
      //     hubcontrol_plan_id: planId,
      //     config_id: selectedConfigId,
      //     is_active: true,
      //     is_default: true,
      //     sync_price: true,
      //     sync_validity: true,
      //     sync_screens: true,
      //   });
      //
      // if (error) throw error;

      toast({
        title: 'Mapeamento rápido criado',
        description: 'Funcionalidade de mapeamento rápido será implementada em breve.',
      });

      await loadData();
    } catch (error) {
      console.error('Erro no mapeamento rápido:', error);
      toast({
        title: 'Erro',
        description: 'Falha no mapeamento rápido',
        variant: 'destructive',
      });
    }
  };

  // =====================================================
  // FUNÇÕES AUXILIARES
  // =====================================================

  const resetForm = () => {
    setFormData({
      thebest_package_id: '',
      hubcontrol_plan_id: '',
      is_active: true,
      is_default: false,
      sync_price: true,
      sync_validity: true,
      sync_screens: true,
      override_price: '',
      override_validity: '',
      override_screens: '',
    });
  };

  const openEditDialog = (mapping: TheBestPlanMapping) => {
    setEditingMapping(mapping);
    setFormData({
      thebest_package_id: mapping.thebest_package_id,
      hubcontrol_plan_id: mapping.hubcontrol_plan_id,
      is_active: mapping.is_active,
      is_default: mapping.is_default,
      sync_price: mapping.sync_price,
      sync_validity: mapping.sync_validity,
      sync_screens: mapping.sync_screens,
      override_price: mapping.override_price?.toString() || '',
      override_validity: mapping.override_validity?.toString() || '',
      override_screens: mapping.override_screens?.toString() || '',
    });
  };

  const getCompatibilityBadge = (compatibility: string) => {
    switch (compatibility) {
      case 'perfect':
        return <Badge className="bg-green-100 text-green-800">Perfeita</Badge>;
      case 'good':
        return <Badge className="bg-yellow-100 text-yellow-800">Boa</Badge>;
      case 'poor':
        return <Badge className="bg-red-100 text-red-800">Ruim</Badge>;
      default:
        return <Badge variant="secondary">N/A</Badge>;
    }
  };

  const getStatusBadge = (mapping: TheBestPlanMapping) => {
    if (!mapping.is_active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    if (mapping.is_default) {
      return <Badge className="bg-blue-100 text-blue-800">Padrão</Badge>;
    }
    return <Badge variant="default">Ativo</Badge>;
  };

  const formatDuration = (duration: string) => {
    const map: Record<string, string> = {
      '1_MES': '1 mês',
      '3_MESES': '3 meses',
      '6_MESES': '6 meses',
      '12_MESES': '12 meses',
    };
    return map[duration] || duration;
  };

  const formatClassification = (classification: string) => {
    return classification === 'COM_ADULTO' ? 'Com Adulto' : 'Sem Adulto';
  };

  // =====================================================
  // RENDERIZAÇÃO
  // =====================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Carregando mapeamentos...
        </CardContent>
      </Card>
    );
  }

  if (!selectedConfigId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma configuração TheBest</h3>
            <p className="text-muted-foreground">
              Configure uma integração TheBest primeiro para gerenciar mapeamentos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com seleção de configuração */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mapeamento de Planos</h2>
          <p className="text-muted-foreground">
            Gerencie a ligação entre pacotes TheBest e planos HubControl
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedConfigId} onValueChange={setSelectedConfigId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar configuração" />
            </SelectTrigger>
            <SelectContent>
              {configs.map((config) => (
                <SelectItem key={config.id} value={config.id}>
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Pacotes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_packages}</div>
              <p className="text-xs text-muted-foreground">
                {statistics.active_packages} ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mapeamentos</CardTitle>
              <Link className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.active_mappings}</div>
              <p className="text-xs text-muted-foreground">
                de {statistics.total_mappings} criados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Não Mapeados</CardTitle>
              <Unlink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.unmapped_packages}
              </div>
              <p className="text-xs text-muted-foreground">
                pacotes sem mapeamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cobertura</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.mapping_percentage}%</div>
              <Progress value={statistics.mapping_percentage} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="flex items-center gap-4">
        <Button onClick={handleAutoMapping} className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Auto-mapear Pacotes
        </Button>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Mapeamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Mapeamento</DialogTitle>
              <DialogDescription>
                Vincule um pacote TheBest a um plano HubControl
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="package">Pacote TheBest</Label>
                <Select
                  value={formData.thebest_package_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, thebest_package_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar pacote" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkg.telas} telas, {formatDuration(pkg.duracao)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plan">Plano HubControl</Label>
                <Select
                  value={formData.hubcontrol_plan_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, hubcontrol_plan_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} ({plan.screens} telas, {plan.validity} dias)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Ativo</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                />
                <Label htmlFor="is_default">Padrão</Label>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-medium">Configurações de Sincronização</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sync_price"
                    checked={formData.sync_price}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_price: checked }))}
                  />
                  <Label htmlFor="sync_price">Sincronizar Preço</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sync_validity"
                    checked={formData.sync_validity}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_validity: checked }))}
                  />
                  <Label htmlFor="sync_validity">Sincronizar Validade</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sync_screens"
                    checked={formData.sync_screens}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_screens: checked }))}
                  />
                  <Label htmlFor="sync_screens">Sincronizar Telas</Label>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-medium">Valores Customizados (Opcional)</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="override_price">Preço Customizado</Label>
                  <Input
                    id="override_price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.override_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, override_price: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="override_validity">Validade Customizada (dias)</Label>
                  <Input
                    id="override_validity"
                    type="number"
                    placeholder="30"
                    value={formData.override_validity}
                    onChange={(e) => setFormData(prev => ({ ...prev, override_validity: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="override_screens">Telas Customizadas</Label>
                  <Input
                    id="override_screens"
                    type="number"
                    placeholder="1"
                    value={formData.override_screens}
                    onChange={(e) => setFormData(prev => ({ ...prev, override_screens: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateMapping}>
                Criar Mapeamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress do auto-mapeamento */}
      {autoMappingProgress > 0 && autoMappingProgress < 100 && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Auto-mapeamento em progresso...
            <Progress value={autoMappingProgress} className="mt-2" />
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principais */}
      <Tabs defaultValue="mappings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mappings">Mapeamentos Ativos</TabsTrigger>
          <TabsTrigger value="unmapped">Pacotes Não Mapeados</TabsTrigger>
          <TabsTrigger value="issues">Problemas</TabsTrigger>
        </TabsList>

        {/* Aba de Mapeamentos Ativos */}
        <TabsContent value="mappings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mapeamentos Ativos</CardTitle>
              <CardDescription>
                Lista de todos os mapeamentos configurados entre pacotes TheBest e planos HubControl
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mappings.length === 0 ? (
                <div className="text-center py-8">
                  <Link className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum mapeamento encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Crie mapeamentos para vincular pacotes TheBest aos planos HubControl.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Mapeamento
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pacote TheBest</TableHead>
                      <TableHead>Plano HubControl</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Compatibilidade</TableHead>
                      <TableHead>Sincronização</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {mapping.thebest_package?.name || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {mapping.thebest_package?.telas} telas • {formatDuration(mapping.thebest_package?.duracao || '')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {mapping.hubcontrol_plan?.name || 'N/A'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {mapping.hubcontrol_plan?.screens} telas • {mapping.hubcontrol_plan?.validity} dias
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(mapping)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {/* Aqui você pode adicionar lógica de compatibilidade */}
                            <Badge variant="outline">Verificar</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {mapping.sync_price && <Badge variant="outline" className="text-xs">Preço</Badge>}
                            {mapping.sync_validity && <Badge variant="outline" className="text-xs">Validade</Badge>}
                            {mapping.sync_screens && <Badge variant="outline" className="text-xs">Telas</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(mapping)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeleteDialog(mapping.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Pacotes Não Mapeados */}
        <TabsContent value="unmapped" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pacotes Não Mapeados</CardTitle>
              <CardDescription>
                Pacotes TheBest que ainda não possuem mapeamento para planos HubControl
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unmappedPackages.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Todos os pacotes estão mapeados!</h3>
                  <p className="text-muted-foreground">
                    Todos os pacotes TheBest ativos possuem mapeamento para planos HubControl.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unmappedPackages.map((unmapped) => (
                    <Card key={unmapped.package_id} className="border-orange-200">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{unmapped.package_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {unmapped.telas} telas • {formatDuration(unmapped.duracao)} • R$ {unmapped.price}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-orange-600">
                            Não mapeado
                          </Badge>
                        </div>
                        
                        {unmapped.suggested_plans.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium mb-2">Planos Sugeridos:</h5>
                            <div className="space-y-2">
                              {unmapped.suggested_plans.slice(0, 3).map((suggestion) => (
                                <div key={suggestion.plan_id} className="flex items-center justify-between p-2 bg-muted rounded">
                                  <div>
                                    <span className="text-sm font-medium">{suggestion.plan_name}</span>
                                    <div className="flex gap-2 mt-1">
                                      {suggestion.screen_match && <Badge variant="outline" className="text-xs bg-green-100 text-green-800">Telas ✓</Badge>}
                                      {suggestion.validity_match && <Badge variant="outline" className="text-xs bg-green-100 text-green-800">Validade ✓</Badge>}
                                      {suggestion.price_match && <Badge variant="outline" className="text-xs bg-green-100 text-green-800">Preço ✓</Badge>}
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleQuickMap(unmapped.package_id, suggestion.plan_id)}
                                  >
                                    Mapear
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba de Problemas */}
        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Problemas de Mapeamento</CardTitle>
              <CardDescription>
                Identifica incompatibilidades e problemas nos mapeamentos existentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Análise de Problemas</h3>
                <p className="text-muted-foreground mb-4">
                  Esta funcionalidade será implementada para identificar automaticamente problemas de compatibilidade.
                </p>
                <Button variant="outline" disabled>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Analisar Problemas
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Edição */}
      {editingMapping && (
        <Dialog open={!!editingMapping} onOpenChange={() => setEditingMapping(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Mapeamento</DialogTitle>
              <DialogDescription>
                Modifique as configurações do mapeamento selecionado
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pacote TheBest</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {editingMapping.thebest_package?.name || 'N/A'}
                  </div>
                </div>
                <div>
                  <Label>Plano HubControl</Label>
                  <div className="p-2 bg-muted rounded text-sm">
                    {editingMapping.hubcontrol_plan?.name || 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="edit_is_active">Ativo</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_default"
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
                  />
                  <Label htmlFor="edit_is_default">Padrão</Label>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Configurações de Sincronização</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit_sync_price"
                      checked={formData.sync_price}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_price: checked }))}
                    />
                    <Label htmlFor="edit_sync_price">Sincronizar Preço</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit_sync_validity"
                      checked={formData.sync_validity}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_validity: checked }))}
                    />
                    <Label htmlFor="edit_sync_validity">Sincronizar Validade</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="edit_sync_screens"
                      checked={formData.sync_screens}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_screens: checked }))}
                    />
                    <Label htmlFor="edit_sync_screens">Sincronizar Telas</Label>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h4 className="font-medium">Valores Customizados</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_override_price">Preço Customizado</Label>
                    <Input
                      id="edit_override_price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.override_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, override_price: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit_override_validity">Validade Customizada (dias)</Label>
                    <Input
                      id="edit_override_validity"
                      type="number"
                      placeholder="30"
                      value={formData.override_validity}
                      onChange={(e) => setFormData(prev => ({ ...prev, override_validity: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit_override_screens">Telas Customizadas</Label>
                    <Input
                      id="edit_override_screens"
                      type="number"
                      placeholder="1"
                      value={formData.override_screens}
                      onChange={(e) => setFormData(prev => ({ ...prev, override_screens: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMapping(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateMapping}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este mapeamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDeleteMapping(showDeleteDialog)}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TheBestPlanMappingManager;