/**
 * Dashboard de Logs de Auditoria
 * 
 * Componente para visualizar e gerenciar logs de acesso a dados sensíveis:
 * - Visualização de logs com filtros
 * - Estatísticas e métricas
 * - Alertas de segurança
 * - Exportação de dados
 */

'use client';

import React, { useState, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Download,
  Eye,
  EyeOff,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  TrendingUp,
  Users,
  Activity,
  Database,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import {
  AuditLogEntry,
  AuditAction,
  RiskLevel,
  AuditLogFilters,
  useAuditLogs
} from '@/hooks/use-audit-logs';
import { useToast } from '@/hooks/use-toast';

// ============================================
// TIPOS E INTERFACES
// ============================================

interface AuditLogsDashboardProps {
  className?: string;
  showStats?: boolean;
  showFilters?: boolean;
  showExport?: boolean;
  maxHeight?: string;
  userId?: string;
  userRole?: string;
  userPermissions?: string[];
}

interface LogTableProps {
  logs: AuditLogEntry[];
  selectedLogs: Set<string>;
  onSelectLog: (logId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onDeleteLogs: (logIds: string[]) => void;
  className?: string;
}

interface StatsCardsProps {
  stats: any;
  className?: string;
}

interface FiltersProps {
  filters: AuditLogFilters;
  onFiltersChange: (filters: Partial<AuditLogFilters>) => void;
  onClearFilters: () => void;
  className?: string;
}

// ============================================
// CONSTANTES
// ============================================

const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
};

const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  critical: 'Crítico'
};

const ACTION_LABELS: Record<AuditAction, string> = {
  view_data: 'Visualizar',
  reveal_data: 'Revelar',
  copy_data: 'Copiar',
  export_data: 'Exportar',
  search_data: 'Buscar',
  filter_data: 'Filtrar',
  change_masking_level: 'Alterar Mascaramento',
  access_denied: 'Acesso Negado',
  suspicious_activity: 'Atividade Suspeita'
};

const ACTION_ICONS: Record<AuditAction, React.ComponentType<{ className?: string }>> = {
  view_data: Eye,
  reveal_data: EyeOff,
  copy_data: () => <span className="text-blue-500">📋</span>,
  export_data: Download,
  search_data: Search,
  filter_data: Filter,
  change_masking_level: Shield,
  access_denied: XCircle,
  suspicious_activity: AlertTriangle
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AuditLogsDashboard({
  className,
  showStats = true,
  showFilters = true,
  showExport = true,
  maxHeight = '600px',
  userId,
  userRole = 'user',
  userPermissions = []
}: AuditLogsDashboardProps) {
  const { toast } = useToast();
  const {
    logs,
    filteredLogs,
    stats,
    isLoading,
    error,
    filters,
    setFilters,
    clearFilters,
    logAccess,
    exportLogs,
    deleteLogs,
    searchLogs,
    refreshLogs,
    suspiciousActivities,
    clearSuspiciousActivity
  } = useAuditLogs({
    enableRealTimeUpdates: true,
    autoDetectSuspiciousActivity: true
  });

  // ============================================
  // ESTADO
  // ============================================

  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('logs');
  const [searchTerm, setSearchTerm] = useState('');

  // ============================================
  // FUNÇÕES AUXILIARES
  // ============================================

  const handleSelectLog = (logId: string, selected: boolean) => {
    const newSelected = new Set(selectedLogs);
    if (selected) {
      newSelected.add(logId);
    } else {
      newSelected.delete(logId);
    }
    setSelectedLogs(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedLogs(new Set(filteredLogs.map(log => log.id)));
    } else {
      setSelectedLogs(new Set());
    }
  };

  const handleDeleteLogs = async (logIds: string[]) => {
    try {
      await deleteLogs(logIds);
      setSelectedLogs(new Set());
    } catch (error) {
      console.error('Erro ao deletar logs:', error);
    }
  };

  const handleExport = async (format: 'json' | 'csv' | 'xlsx') => {
    try {
      await exportLogs(format);
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    searchLogs(term);
  };

  const canViewSensitiveLogs = userPermissions.includes('view_audit_logs') || userRole === 'admin';
  const canDeleteLogs = userPermissions.includes('delete_audit_logs') || userRole === 'admin';
  const canExportLogs = userPermissions.includes('export_audit_logs') || userRole === 'admin';

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  if (!canViewSensitiveLogs) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Acesso Restrito</h3>
            <p className="text-muted-foreground">
              Você não tem permissão para visualizar logs de auditoria.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Erro ao Carregar Logs</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={refreshLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Alertas de Atividade Suspeita */}
      {suspiciousActivities.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800">
                Atividades Suspeitas Detectadas
              </CardTitle>
            </div>
            <CardDescription className="text-red-700">
              {suspiciousActivities.length} atividade(s) suspeita(s) requer(em) atenção.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suspiciousActivities.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <Badge className={RISK_LEVEL_COLORS[activity.riskLevel]}>
                      {RISK_LEVEL_LABELS[activity.riskLevel]}
                    </Badge>
                    <span className="text-sm">
                      {activity.userId} - {ACTION_LABELS[activity.action]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearSuspiciousActivity(activity.id)}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {suspiciousActivities.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{suspiciousActivities.length - 3} atividade(s) suspeita(s) adicional(is)
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estatísticas */}
      {showStats && <StatsCards stats={stats} />}

      {/* Conteúdo Principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Logs de Auditoria
              </CardTitle>
              <CardDescription>
                {filteredLogs.length} de {logs.length} logs exibidos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={refreshLogs} disabled={isLoading}>
                <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                Atualizar
              </Button>
              {showExport && canExportLogs && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Formato de Exportação</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport('json')}>
                      JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                      CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="analytics">Análises</TabsTrigger>
              {showFilters && <TabsTrigger value="filters">Filtros</TabsTrigger>}
            </TabsList>

            <TabsContent value="logs" className="space-y-4">
              {/* Barra de Busca */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar logs..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {selectedLogs.size > 0 && canDeleteLogs && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteLogs(Array.from(selectedLogs))}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar ({selectedLogs.size})
                  </Button>
                )}
              </div>

              {/* Tabela de Logs */}
              <div className="border rounded-lg" style={{ maxHeight }}>
                <LogTable
                  logs={filteredLogs}
                  selectedLogs={selectedLogs}
                  onSelectLog={handleSelectLog}
                  onSelectAll={handleSelectAll}
                  onDeleteLogs={handleDeleteLogs}
                />
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsView stats={stats} />
            </TabsContent>

            {showFilters && (
              <TabsContent value="filters">
                <FiltersPanel
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={clearFilters}
                />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

function StatsCards({ stats, className }: StatsCardsProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Logs</p>
              <p className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usuários Únicos</p>
              <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Riscos Críticos</p>
              <p className="text-2xl font-bold">{stats.riskDistribution.critical}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Atividade Recente</p>
              <p className="text-2xl font-bold">{stats.recentActivity.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LogTable({
  logs,
  selectedLogs,
  onSelectLog,
  onSelectAll,
  onDeleteLogs,
  className
}: LogTableProps) {
  const allSelected = logs.length > 0 && logs.every(log => selectedLogs.has(log.id));
  const someSelected = logs.some(log => selectedLogs.has(log.id));

  if (logs.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Nenhum log encontrado</h3>
        <p className="text-muted-foreground">
          Não há logs que correspondam aos filtros aplicados.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('overflow-auto', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
                    if (input) input.indeterminate = someSelected && !allSelected;
                  }
                }}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Recurso</TableHead>
            <TableHead>Risco</TableHead>
            <TableHead>Revelado</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const IconComponent = ACTION_ICONS[log.action];
            return (
              <TableRow key={log.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedLogs.has(log.id)}
                    onCheckedChange={(checked) => onSelectLog(log.id, !!checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {format(log.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(log.timestamp, { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{log.userId}</p>
                    <Badge variant="outline" className="text-xs">
                      {log.userRole}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-4 w-4" />
                    <span className="text-sm">{ACTION_LABELS[log.action]}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{log.resource}</p>
                    {log.fieldName && (
                      <p className="text-xs text-muted-foreground">{log.fieldName}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={RISK_LEVEL_COLORS[log.riskLevel]}>
                    {RISK_LEVEL_LABELS[log.riskLevel]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {log.wasRevealed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400" />
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Info className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDeleteLogs([log.id])}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function AnalyticsView({ stats }: { stats: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribuição de Risco */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Risco</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.riskDistribution).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={RISK_LEVEL_COLORS[level as RiskLevel]}>
                      {RISK_LEVEL_LABELS[level as RiskLevel]}
                    </Badge>
                  </div>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Mais Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topUsers.slice(0, 5).map((user: any, index: number) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">#{index + 1}</span>
                    <span className="text-sm">{user.userId}</span>
                  </div>
                  <Badge variant="outline">{user.count} acessos</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recursos Mais Acessados */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos Mais Acessados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.topAccessedResources.slice(0, 10).map((resource: any, index: number) => (
              <div key={resource.resource} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">#{index + 1}</span>
                  <span className="text-sm">{resource.resource}</span>
                </div>
                <Badge variant="outline">{resource.count} acessos</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FiltersPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  className
}: FiltersProps) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(filters.dateFrom);
  const [dateTo, setDateTo] = useState<Date | undefined>(filters.dateTo);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Filtros Avançados</h3>
        <Button variant="outline" onClick={onClearFilters}>
          Limpar Filtros
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Filtro por Ação */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Ação</label>
          <Select
            value={filters.action || ''}
            onValueChange={(value) => onFiltersChange({ action: value as AuditAction })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as ações" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas as ações</SelectItem>
              {Object.entries(ACTION_LABELS).map(([action, label]) => (
                <SelectItem key={action} value={action}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Nível de Risco */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Nível de Risco</label>
          <Select
            value={filters.riskLevel || ''}
            onValueChange={(value) => onFiltersChange({ riskLevel: value as RiskLevel })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos os níveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os níveis</SelectItem>
              {Object.entries(RISK_LEVEL_LABELS).map(([level, label]) => (
                <SelectItem key={level} value={level}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Usuário */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Usuário</label>
          <Input
            placeholder="ID do usuário"
            value={filters.userId || ''}
            onChange={(e) => onFiltersChange({ userId: e.target.value })}
          />
        </div>

        {/* Filtro por Data Inicial */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Data Inicial</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Selecionar data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(date) => {
                  setDateFrom(date);
                  onFiltersChange({ dateFrom: date });
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Filtro por Data Final */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Data Final</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Selecionar data'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={(date) => {
                  setDateTo(date);
                  onFiltersChange({ dateTo: date });
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Filtro por Revelação */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status de Revelação</label>
          <Select
            value={filters.wasRevealed?.toString() || ''}
            onValueChange={(value) => 
              onFiltersChange({ 
                wasRevealed: value === '' ? undefined : value === 'true' 
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="true">Revelado</SelectItem>
              <SelectItem value="false">Mascarado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export default AuditLogsDashboard;
