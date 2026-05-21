"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  X,
  Calendar,
  User,
  Activity,
  Eye,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  type: string;
  message: string;
  user_id?: string;
  user_email?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  action?: string;
  resource?: string;
  details?: string;
}

interface LogFilters {
  level?: string;
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
}

const logLevels = [
  { value: 'all', label: 'Todos os níveis', color: 'default' },
  { value: 'info', label: 'Informação', color: 'blue' },
  { value: 'success', label: 'Sucesso', color: 'green' },
  { value: 'warning', label: 'Aviso', color: 'yellow' },
  { value: 'error', label: 'Erro', color: 'red' }
];

const logTypes = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'auth', label: 'Autenticação' },
  { value: 'customer', label: 'Clientes' },
  { value: 'payment', label: 'Pagamentos' },
  { value: 'server', label: 'Servidores' },
  { value: 'test', label: 'Testes' },
  { value: 'system', label: 'Sistema' },
  { value: 'api', label: 'API' },
  { value: 'security', label: 'Segurança' }
];

function getLevelIcon(level: string) {
  switch (level) {
    case 'info':
      return <Info className="h-4 w-4 text-blue-500" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
}

function getLevelBadgeVariant(level: string) {
  switch (level) {
    case 'info':
      return 'default';
    case 'success':
      return 'default';
    case 'warning':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LogFilters>({
    level: 'all',
    type: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const { toast } = useToast();

  const itemsPerPage = 50;

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(filters.level && filters.level !== 'all' && { level: filters.level }),
        ...(filters.type && filters.type !== 'all' && { type: filters.type }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId })
      });

      const response = await fetch(`/api/logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setTotalPages(Math.ceil(data.total / itemsPerPage));
      } else {
        throw new Error('Erro ao carregar logs');
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os logs.",
        variant: "destructive"
      });
      
      // Dados mock para desenvolvimento
      const mockLogs: LogEntry[] = Array.from({ length: 50 }, (_, i) => ({
        id: `log-${i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        level: ['info', 'success', 'warning', 'error'][Math.floor(Math.random() * 4)] as any,
        type: ['auth', 'customer', 'payment', 'server', 'test', 'system'][Math.floor(Math.random() * 6)],
        message: [
          'Usuário realizou login com sucesso',
          'Cliente criado com sucesso',
          'Pagamento processado',
          'Servidor reiniciado',
          'Teste de velocidade executado',
          'Configuração atualizada',
          'Erro ao conectar com API externa',
          'Tentativa de acesso não autorizado',
          'Backup realizado com sucesso',
          'Falha na sincronização de dados'
        ][Math.floor(Math.random() * 10)],
        user_email: `user${Math.floor(Math.random() * 100)}@example.com`,
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        action: ['create', 'update', 'delete', 'login', 'logout', 'view'][Math.floor(Math.random() * 6)],
        resource: ['customer', 'payment', 'server', 'test', 'user'][Math.floor(Math.random() * 5)]
      }));
      
      setLogs(mockLogs);
      setTotalPages(5);
    } finally {
      setLoading(false);
    }
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.level && filters.level !== 'all' && { level: filters.level }),
        ...(filters.type && filters.type !== 'all' && { type: filters.type }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      });

      const response = await fetch(`/api/logs/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Sucesso",
          description: "Logs exportados com sucesso"
        });
      } else {
        throw new Error('Erro ao exportar logs');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível exportar os logs.",
        variant: "destructive"
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      level: 'all',
      type: 'all',
      search: ''
    });
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando logs...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <Button onClick={fetchLogs} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nível</label>
              <Select value={filters.level} onValueChange={(value) => setFilters(prev => ({ ...prev, level: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {logLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {logTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar mensagem, usuário..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ações</label>
              <div className="flex gap-2">
                <Button onClick={clearFilters} variant="outline" size="sm" className="flex-1">
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs ({logs.length} registros)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Nível</TableHead>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead className="w-[180px]">Data/Hora</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead className="w-[200px]">Usuário</TableHead>
                  <TableHead className="w-[120px]">IP</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getLevelIcon(log.level)}
                        <Badge variant={getLevelBadgeVariant(log.level)} className="text-xs">
                          {log.level}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div>{format(new Date(log.timestamp), 'dd/MM/yyyy')}</div>
                        <div className="text-muted-foreground text-xs">
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="truncate" title={log.message}>
                        {log.message}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.user_email ? (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{log.user_email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sistema</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {log.ip_address || '-'}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {getLevelIcon(log.level)}
                              Detalhes do Log
                            </DialogTitle>
                            <DialogDescription>
                              {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Nível</label>
                                <div className="flex items-center gap-2 mt-1">
                                  {getLevelIcon(log.level)}
                                  <Badge variant={getLevelBadgeVariant(log.level)}>
                                    {log.level}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Tipo</label>
                                <div className="mt-1">
                                  <Badge variant="outline">{log.type}</Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Mensagem</label>
                              <p className="mt-1 p-3 bg-muted rounded-md">{log.message}</p>
                            </div>
                            
                            {log.user_email && (
                              <div>
                                <label className="text-sm font-medium">Usuário</label>
                                <p className="mt-1">{log.user_email}</p>
                              </div>
                            )}
                            
                            {log.ip_address && (
                              <div>
                                <label className="text-sm font-medium">Endereço IP</label>
                                <p className="mt-1 font-mono">{log.ip_address}</p>
                              </div>
                            )}
                            
                            {log.action && (
                              <div>
                                <label className="text-sm font-medium">Ação</label>
                                <p className="mt-1">{log.action}</p>
                              </div>
                            )}
                            
                            {log.resource && (
                              <div>
                                <label className="text-sm font-medium">Recurso</label>
                                <p className="mt-1">{log.resource}</p>
                              </div>
                            )}
                            
                            {log.details && (
                              <div>
                                <label className="text-sm font-medium">Detalhes</label>
                                <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-auto">
                                  {log.details}
                                </pre>
                              </div>
                            )}
                            
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div>
                                <label className="text-sm font-medium">Metadados</label>
                                <pre className="mt-1 p-3 bg-muted rounded-md text-sm overflow-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
