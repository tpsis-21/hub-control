"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Server,
  TestTube,
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReportData {
  customers: {
    total: number;
    active: number;
    inactive: number;
    byServer: { server: string; count: number; }[];
    growth: { date: string; total: number; active: number; }[];
    churnRate: number;
    newThisMonth: number;
    expiringThisWeek: number;
  };
  tests: {
    total: number;
    passed: number;
    failed: number;
    byType: { type: string; count: number; }[];
    trends: { date: string; passed: number; failed: number; }[];
  };
  servers: {
    total: number;
    online: number;
    offline: number;
    performance: { server: string; cpu: number; memory: number; }[];
  };
  financial: {
    revenue: number;
    expenses: number;
    profit: number;
    trends: { date: string; revenue: number; expenses: number; }[];
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const periodOptions = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '1y', label: 'Último ano' }
];

export default function RelatoriosPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/reports?period=${period}`);
      if (response.ok) {
        const reportData = await response.json();
        setData(reportData);
      } else {
        throw new Error('Erro ao carregar relatórios');
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados dos relatórios.",
        variant: "destructive"
      });
      
      // Dados mock para desenvolvimento
      setData({
        customers: {
          total: 1250,
          active: 1180,
          inactive: 70,
          byServer: [
            { server: 'Servidor 1', count: 450 },
            { server: 'Servidor 2', count: 380 },
            { server: 'Servidor 3', count: 350 },
            { server: 'Servidor 4', count: 70 }
          ],
          growth: Array.from({ length: 30 }, (_, i) => ({
            date: format(subDays(new Date(), 29 - i), 'dd/MM'),
            total: 1200 + Math.floor(Math.random() * 100),
            active: 1100 + Math.floor(Math.random() * 80)
          })),
          churnRate: 2.3,
          newThisMonth: 45,
          expiringThisWeek: 23
        },
        tests: {
          total: 8450,
          passed: 7890,
          failed: 560,
          byType: [
            { type: 'Velocidade', count: 3200 },
            { type: 'Conectividade', count: 2800 },
            { type: 'Latência', count: 1650 },
            { type: 'Outros', count: 800 }
          ],
          trends: Array.from({ length: 30 }, (_, i) => ({
            date: format(subDays(new Date(), 29 - i), 'dd/MM'),
            passed: 250 + Math.floor(Math.random() * 50),
            failed: 15 + Math.floor(Math.random() * 10)
          }))
        },
        servers: {
          total: 4,
          online: 4,
          offline: 0,
          performance: [
            { server: 'Servidor 1', cpu: 45, memory: 62 },
            { server: 'Servidor 2', cpu: 38, memory: 55 },
            { server: 'Servidor 3', cpu: 52, memory: 71 },
            { server: 'Servidor 4', cpu: 28, memory: 43 }
          ]
        },
        financial: {
          revenue: 125000,
          expenses: 78000,
          profit: 47000,
          trends: Array.from({ length: 12 }, (_, i) => ({
            date: format(subDays(new Date(), (11 - i) * 30), 'MMM'),
            revenue: 100000 + Math.floor(Math.random() * 50000),
            expenses: 60000 + Math.floor(Math.random() * 30000)
          }))
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/reports/export?format=${format}&period=${period}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${period}_${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Sucesso",
          description: `Relatório exportado em ${format.toUpperCase()}`
        });
      } else {
        throw new Error('Erro ao exportar relatório');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível exportar o relatório.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [period]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando relatórios...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Erro ao carregar dados</h3>
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar os dados dos relatórios.
          </p>
          <Button onClick={fetchReportData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchReportData} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={() => exportReport('pdf')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={() => exportReport('excel')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex w-full max-w-full overflow-x-auto md:grid md:grid-cols-5 md:overflow-visible">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="tests">Testes</TabsTrigger>
          <TabsTrigger value="servers">Servidores</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Clientes Ativos</p>
                    <p className="text-2xl font-bold">{data.customers.active.toLocaleString()}</p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{data.customers.newThisMonth} este mês
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taxa de Churn</p>
                    <p className="text-2xl font-bold">{data.customers.churnRate}%</p>
                    <p className="text-xs text-red-600 flex items-center mt-1">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      Meta: &lt;2%
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Testes Realizados</p>
                    <p className="text-2xl font-bold">{data.tests.total.toLocaleString()}</p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {((data.tests.passed / data.tests.total) * 100).toFixed(1)}% sucesso
                    </p>
                  </div>
                  <TestTube className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receita</p>
                    <p className="text-2xl font-bold">R$ {(data.financial.revenue / 1000).toFixed(0)}k</p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Lucro: R$ {(data.financial.profit / 1000).toFixed(0)}k
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de Visão Geral */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Crescimento de Clientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.customers.growth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="active" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Distribuição por Servidor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.customers.byServer}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ server, percent }) => `${server} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.customers.byServer.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{data.customers.total}</div>
                <div className="text-sm text-muted-foreground">Total de Clientes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600">{data.customers.active}</div>
                <div className="text-sm text-muted-foreground">Clientes Ativos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-red-600">{data.customers.churnRate}%</div>
                <div className="text-sm text-muted-foreground">Taxa de Churn</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Clientes por Servidor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.customers.byServer}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="server" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolução de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.customers.growth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="active" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{data.tests.total}</div>
                <div className="text-sm text-muted-foreground">Total de Testes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600">{data.tests.passed}</div>
                <div className="text-sm text-muted-foreground">Testes Aprovados</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-red-600">{data.tests.failed}</div>
                <div className="text-sm text-muted-foreground">Testes Falhados</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Testes por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.tests.byType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.tests.byType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendência de Testes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.tests.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="passed" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="failed" stroke="#ff7300" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="servers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">{data.servers.total}</div>
                <div className="text-sm text-muted-foreground">Total de Servidores</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600">{data.servers.online}</div>
                <div className="text-sm text-muted-foreground">Servidores Online</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-red-600">{data.servers.offline}</div>
                <div className="text-sm text-muted-foreground">Servidores Offline</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance dos Servidores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.servers.performance.map((server, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{server.server}</span>
                      <div className="flex gap-4 text-sm">
                        <span>CPU: {server.cpu}%</span>
                        <span>Memória: {server.memory}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>CPU</span>
                          <span>{server.cpu}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full transition-all",
                              server.cpu > 80 ? "bg-red-500" : server.cpu > 60 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${server.cpu}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Memória</span>
                          <span>{server.memory}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full transition-all",
                              server.memory > 80 ? "bg-red-500" : server.memory > 60 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${server.memory}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600">
                  R$ {(data.financial.revenue / 1000).toFixed(0)}k
                </div>
                <div className="text-sm text-muted-foreground">Receita</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-red-600">
                  R$ {(data.financial.expenses / 1000).toFixed(0)}k
                </div>
                <div className="text-sm text-muted-foreground">Despesas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  R$ {(data.financial.profit / 1000).toFixed(0)}k
                </div>
                <div className="text-sm text-muted-foreground">Lucro</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tendência Financeira</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.financial.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`R$ ${(Number(value) / 1000).toFixed(0)}k`, '']} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ff7300" fill="#ff7300" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
