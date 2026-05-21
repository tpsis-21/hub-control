// src/components/integrations/thebest-package-manager.tsx
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Upload,
  Download,
  RefreshCw,
  Eye,
  Calendar,
  Monitor,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react';
import {
  TheBestService,
  TheBestPackage,
  TheBestRenewal,
  CreateRenewalRequest,
  SyncPackagesRequest,
} from '@/services/thebest.service';
import { useAuth } from '@/hooks/useAuth';

/**
 * Tipos para o componente
 */
interface PackageFormData {
  classificacao: 'COM ADULTO' | 'SEM ADULTO';
  duracao: '1' | '3' | '6' | '12';
  telas: number;
  creditos: number;
}

interface RenewalFormData {
  /** ID do cliente (line) no Painel Best — obrigatório para renovar na API. */
  line_id: string;
  months: string;
  /** Opcional: pacote no Hub só para histórico / mapeamento de meses. */
  package_id: string;
  notes?: string;
}

interface CSVUploadData {
  file: File | null;
  preview: PackageFormData[];
}

/**
 * Componente principal de gerenciamento de pacotes The Best
 */
export function TheBestPackageManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Estados principais
  const [packages, setPackages] = useState<TheBestPackage[]>([]);
  const [renewals, setRenewals] = useState<TheBestRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Estados de diálogos
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  const [isCSVDialogOpen, setIsCSVDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Estados de formulários
  const [packageForm, setPackageForm] = useState<PackageFormData>({
    classificacao: 'SEM ADULTO',
    duracao: '1',
    telas: 1,
    creditos: 0,
  });
  
  const [renewalForm, setRenewalForm] = useState<RenewalFormData>({
    line_id: '',
    months: '1',
    package_id: '',
    notes: '',
  });
  
  const [csvUpload, setCSVUpload] = useState<CSVUploadData>({
    file: null,
    preview: [],
  });
  
  const [selectedPackage, setSelectedPackage] = useState<TheBestPackage | null>(null);
  const [editingPackage, setEditingPackage] = useState<TheBestPackage | null>(null);
  
  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [filterDuration, setFilterDuration] = useState<string>('all');
  
  /**
   * Carrega os dados iniciais
   */
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [packagesData, renewalsData] = await Promise.all([
        TheBestService.getPackages(),
        user ? TheBestService.getUserRenewals(user.id, { limit: 50 }) : Promise.resolve([])
      ]);
      
      setPackages(packagesData);
      setRenewals(renewalsData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados dos pacotes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Filtra os pacotes baseado nos critérios
   */
  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = 
      pkg.classificacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.duracao.includes(searchTerm) ||
      pkg.telas.toString().includes(searchTerm) ||
      pkg.creditos.toString().includes(searchTerm);
    
    const matchesClassification = 
      filterClassification === 'all' || pkg.classificacao === filterClassification;
    
    const matchesDuration = 
      filterDuration === 'all' || pkg.duracao === filterDuration;
    
    return matchesSearch && matchesClassification && matchesDuration;
  });
  
  /**
   * Processa o upload de CSV
   */
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      const preview: PackageFormData[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length >= 4) {
          preview.push({
            classificacao: values[0] as 'COM ADULTO' | 'SEM ADULTO',
            duracao: values[1] as '1' | '3' | '6' | '12',
            telas: parseInt(values[2]) || 1,
            creditos: parseInt(values[3]) || 0,
          });
        }
      }
      
      setCSVUpload({ file, preview });
      setIsCSVDialogOpen(true);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível processar o arquivo CSV.',
        variant: 'destructive',
      });
    }
  };
  
  /**
   * Sincroniza pacotes do CSV
   */
  const handleSyncPackages = async () => {
    if (!csvUpload.preview.length) return;
    
    try {
      setSyncing(true);
      const result = await TheBestService.syncPackages(csvUpload.preview);
      
      toast({
        title: 'Sincronização Concluída',
        description: `${result.synced} pacotes sincronizados. ${result.errors} erros.`,
      });
      
      setIsCSVDialogOpen(false);
      setCSVUpload({ file: null, preview: [] });
      await loadData();
    } catch (error) {
      toast({
        title: 'Erro na Sincronização',
        description: 'Não foi possível sincronizar os pacotes.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };
  
  /** Sincroniza pacotes do Painel Best (GET /packages/) para o Supabase. */
  const handleSyncFromPanel = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/integrations/thebest/packages?sync=true');
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Falha na sincronização');
      }
      toast({
        title: 'Pacotes sincronizados',
        description: `${result.count ?? 0} pacote(s) do Painel Best.`,
      });
      await loadData();
    } catch (error) {
      toast({
        title: 'Erro na sincronização',
        description:
          error instanceof Error ? error.message : 'Não foi possível sincronizar do painel.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  /**
   * Renova no Painel Best (POST /lines/{id}/renew/) e opcionalmente registra no Hub.
   */
  const handleCreateRenewal = async () => {
    if (!user || !renewalForm.line_id.trim()) return;

    const months = parseInt(renewalForm.months, 10) || 1;

    try {
      const panelRes = await fetch('/api/proxy/thebest?action=renew_line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_id: renewalForm.line_id.trim(),
          months,
        }),
      });

      const panelData = await panelRes.json();
      if (!panelRes.ok) {
        throw new Error(panelData.error || panelData.message || 'Falha na API do painel');
      }

      if (renewalForm.package_id) {
        await fetch('/api/thebest/renewals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            line_id: renewalForm.line_id.trim(),
            package_id: renewalForm.package_id,
            payment_id: `manual-${Date.now()}`,
            amount: 0,
            payment_method: 'manual',
            months,
          }),
        });
      }

      toast({
        title: 'Cliente renovado',
        description: `Line ${renewalForm.line_id} renovada por ${months} mês(es) no Painel Best.`,
      });

      setIsRenewalDialogOpen(false);
      setRenewalForm({
        line_id: '',
        months: '1',
        package_id: '',
        notes: '',
      });

      await loadData();
    } catch (error) {
      toast({
        title: 'Erro na renovação',
        description:
          error instanceof Error ? error.message : 'Não foi possível renovar no painel.',
        variant: 'destructive',
      });
    }
  };
  
  /**
   * Formata a duração para exibição
   */
  const formatDuration = (duration: string) => {
    const durations: Record<string, string> = {
      '1': '1 mês',
      '3': '3 meses',
      '6': '6 meses',
      '12': '12 meses',
      '1_MES': '1 mês',
      '3_MESES': '3 meses',
      '6_MESES': '6 meses',
      '12_MESES': '12 meses',
    };
    return durations[duration] || duration.replace(/_/g, ' ');
  };
  
  /**
   * Formata o status da renovação
   */
  const formatRenewalStatus = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'outline' },
      active: { label: 'Ativo', variant: 'default' },
      expired: { label: 'Expirado', variant: 'secondary' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };
    return statusMap[status] || { label: status, variant: 'outline' };
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando pacotes...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Painel Best — Pacotes e renovações</h2>
          <p className="text-muted-foreground">
            Pacotes vêm de <code className="text-xs">GET /packages/</code> (sync e mapeamento).
            Renovação usa <code className="text-xs">line_id</code> + <code className="text-xs">months</code> — sem package na API de renew.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleSyncFromPanel}
            disabled={syncing || loading}
          >
            <Download className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Painel Best
          </Button>

          <Button
            variant="outline"
            onClick={() => loadData()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          
          <label className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Importar CSV
              </span>
            </Button>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
          </label>
          
          <Button onClick={() => setIsRenewalDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Renovação
          </Button>
        </div>
      </div>
      
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Buscar pacotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="classification">Classificação</Label>
              <Select value={filterClassification} onValueChange={setFilterClassification}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="COM ADULTO">Com Adulto</SelectItem>
                  <SelectItem value="SEM ADULTO">Sem Adulto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="duration">Duração</Label>
              <Select value={filterDuration} onValueChange={setFilterDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setFilterClassification('all');
                  setFilterDuration('all');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Pacotes</p>
                <p className="text-2xl font-bold">{packages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Com Adulto</p>
                <p className="text-2xl font-bold">
                  {packages.filter(p => p.classificacao === 'COM ADULTO').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Monitor className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sem Adulto</p>
                <p className="text-2xl font-bold">
                  {packages.filter(p => p.classificacao === 'SEM ADULTO').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Renovações</p>
                <p className="text-2xl font-bold">{renewals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabela de Pacotes */}
      <Card>
        <CardHeader>
          <CardTitle>Pacotes Disponíveis</CardTitle>
          <CardDescription>
            {filteredPackages.length} de {packages.length} pacotes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPackages.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum pacote encontrado</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Telas</TableHead>
                    <TableHead>Créditos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[50px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <Badge variant={pkg.classificacao === 'COM ADULTO' ? 'destructive' : 'default'}>
                          {pkg.classificacao}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDuration(pkg.duracao)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Monitor className="h-4 w-4" />
                          <span>{pkg.telas}</span>
                        </div>
                      </TableCell>
                      <TableCell>{pkg.creditos}</TableCell>
                      <TableCell>
                        <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                          {pkg.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(pkg.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setRenewalForm(prev => ({ ...prev, package_id: pkg.id }));
                                setIsRenewalDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Nova Renovação
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPackage(pkg);
                                // Aqui poderia abrir um modal de detalhes
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tabela de Renovações Recentes */}
      {renewals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Renovações Recentes</CardTitle>
            <CardDescription>
              Últimas {renewals.length} renovações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pacote</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewals.map((renewal) => {
                    const renewalStatus = formatRenewalStatus(renewal.status);
                    return (
                      <TableRow key={renewal.id}>
                        <TableCell>
                          <div className="font-medium">
                            {renewal.renewal_data?.classification || 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDuration(renewal.renewal_data?.duration || '1')}
                          </div>
                        </TableCell>
                        <TableCell>{renewal.user_id}</TableCell>
                        <TableCell>
                          <Badge variant={renewalStatus.variant}>
                            {renewalStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDuration(renewal.renewal_data?.duration || '1')}
                        </TableCell>
                        <TableCell>
                          {new Date(renewal.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {renewal.start_date 
                            ? new Date(renewal.start_date).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {renewal.end_date 
                            ? new Date(renewal.end_date).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Dialog de Nova Renovação */}
      <Dialog open={isRenewalDialogOpen} onOpenChange={setIsRenewalDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Renovar cliente no Painel Best</DialogTitle>
            <DialogDescription>
              Chama <code className="text-xs">POST /lines/&#123;line_id&#125;/renew/</code> com meses.
              Pacote abaixo é opcional (só histórico no Hub).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="renewal-line">ID do cliente no painel (line_id) *</Label>
              <Input
                id="renewal-line"
                type="number"
                min={1}
                value={renewalForm.line_id}
                onChange={(e) => setRenewalForm(prev => ({ ...prev, line_id: e.target.value }))}
                placeholder="Ex.: 12345"
              />
            </div>

            <div>
              <Label htmlFor="renewal-months">Meses *</Label>
              <Select
                value={renewalForm.months}
                onValueChange={(value) => setRenewalForm(prev => ({ ...prev, months: value }))}
              >
                <SelectTrigger id="renewal-months">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 mês</SelectItem>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="renewal-package">Pacote no Hub (opcional)</Label>
              <Select 
                value={renewalForm.package_id || '_none'} 
                onValueChange={(value) =>
                  setRenewalForm(prev => ({
                    ...prev,
                    package_id: value === '_none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem registro no Hub" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— Não registrar no Hub —</SelectItem>
                  {packages.filter(p => p.is_active).map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {(pkg as { name?: string }).name ?? pkg.classificacao} — {formatDuration(pkg.duracao)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="renewal-notes">Observações (opcional)</Label>
              <Textarea
                id="renewal-notes"
                value={renewalForm.notes}
                onChange={(e) => setRenewalForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações sobre a renovação..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsRenewalDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateRenewal}
              disabled={!renewalForm.line_id.trim()}
            >
              Renovar no painel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog de Upload CSV */}
      <Dialog open={isCSVDialogOpen} onOpenChange={setIsCSVDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Importar Pacotes via CSV</DialogTitle>
            <DialogDescription>
              Visualize e confirme os dados antes da sincronização
            </DialogDescription>
          </DialogHeader>
          
          {csvUpload.preview.length > 0 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {csvUpload.preview.length} pacotes encontrados no arquivo
              </div>
              
              <div className="max-h-[300px] overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Classificação</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Telas</TableHead>
                      <TableHead>Créditos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvUpload.preview.map((pkg, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Badge variant={pkg.classificacao === 'COM ADULTO' ? 'destructive' : 'default'}>
                            {pkg.classificacao}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDuration(pkg.duracao)}</TableCell>
                        <TableCell>{pkg.telas}</TableCell>
                        <TableCell>{pkg.creditos}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsCSVDialogOpen(false);
                setCSVUpload({ file: null, preview: [] });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSyncPackages}
              disabled={syncing || csvUpload.preview.length === 0}
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Sincronizar {csvUpload.preview.length} Pacotes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TheBestPackageManager;
