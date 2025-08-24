'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  AlertTriangle,
  Users,
  Activity,
  Lock,
  Eye,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  Mail,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Tipos para os dados de segurança
interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  status: 'good' | 'warning' | 'critical';
  icon: React.ReactNode;
  description: string;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  message: string;
  timestamp: string;
  status: 'active' | 'investigating' | 'resolved';
  user_email?: string;
  ip_address?: string;
}

interface ThreatData {
  timestamp: string;
  threats_blocked: number;
  login_attempts: number;
  suspicious_activities: number;
}

interface ComplianceData {
  category: string;
  score: number;
  total: number;
  percentage: number;
}

const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [threatData, setThreatData] = useState<ThreatData[]>([]);
  const [complianceData, setComplianceData] = useState<ComplianceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Simular dados em tempo real (em produção, viria da API)
  const generateMockData = () => {
    const mockMetrics: SecurityMetric[] = [
      {
        id: 'active_threats',
        name: 'Ameaças Ativas',
        value: Math.floor(Math.random() * 5),
        change: Math.floor(Math.random() * 10) - 5,
        status: Math.random() > 0.7 ? 'critical' : 'good',
        icon: <AlertTriangle className="h-4 w-4" />,
        description: 'Ameaças detectadas e bloqueadas'
      },
      {
        id: 'failed_logins',
        name: 'Logins Falharam (24h)',
        value: Math.floor(Math.random() * 50),
        change: Math.floor(Math.random() * 20) - 10,
        status: Math.random() > 0.8 ? 'warning' : 'good',
        icon: <Lock className="h-4 w-4" />,
        description: 'Tentativas de login falharam nas últimas 24h'
      },
      {
        id: 'active_users',
        name: 'Usuários Ativos',
        value: Math.floor(Math.random() * 100) + 50,
        change: Math.floor(Math.random() * 10),
        status: 'good',
        icon: <Users className="h-4 w-4" />,
        description: 'Usuários ativos no sistema'
      },
      {
        id: 'mfa_coverage',
        name: 'Cobertura MFA',
        value: Math.floor(Math.random() * 20) + 80,
        change: Math.floor(Math.random() * 5),
        status: Math.random() > 0.9 ? 'warning' : 'good',
        icon: <Shield className="h-4 w-4" />,
        description: 'Porcentagem de usuários com MFA ativo'
      },
      {
        id: 'security_score',
        name: 'Score de Segurança',
        value: Math.floor(Math.random() * 10) + 90,
        change: Math.floor(Math.random() * 3),
        status: 'good',
        icon: <TrendingUp className="h-4 w-4" />,
        description: 'Score geral de segurança do sistema'
      },
      {
        id: 'blocked_ips',
        name: 'IPs Bloqueados',
        value: Math.floor(Math.random() * 20),
        change: Math.floor(Math.random() * 5),
        status: 'good',
        icon: <Globe className="h-4 w-4" />,
        description: 'IPs bloqueados por atividade suspeita'
      }
    ];

    const mockAlerts: SecurityAlert[] = [
      {
        id: '1',
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'CRITICAL',
        message: 'Múltiplas tentativas de login detectadas do IP 192.168.1.100',
        timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        status: 'active',
        user_email: 'admin@example.com',
        ip_address: '192.168.1.100'
      },
      {
        id: '2',
        type: 'UNUSUAL_ACTIVITY',
        severity: 'HIGH',
        message: 'Acesso fora do horário comercial detectado',
        timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString(),
        status: 'investigating',
        user_email: 'user@example.com'
      },
      {
        id: '3',
        type: 'PRIVILEGE_ESCALATION',
        severity: 'MEDIUM',
        message: 'Tentativa de acesso a recursos restritos',
        timestamp: new Date(Date.now() - Math.random() * 10800000).toISOString(),
        status: 'resolved'
      }
    ];

    const mockThreatData: ThreatData[] = Array.from({ length: 24 }, (_, i) => ({
      timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString().split('T')[1].split(':')[0] + ':00',
      threats_blocked: Math.floor(Math.random() * 10),
      login_attempts: Math.floor(Math.random() * 50) + 10,
      suspicious_activities: Math.floor(Math.random() * 5)
    }));

    const mockComplianceData: ComplianceData[] = [
      { category: 'Senhas Seguras', score: 85, total: 100, percentage: 85 },
      { category: 'MFA Ativo', score: 92, total: 100, percentage: 92 },
      { category: 'Políticas RLS', score: 98, total: 100, percentage: 98 },
      { category: 'Auditoria', score: 88, total: 100, percentage: 88 },
      { category: 'Monitoramento', score: 95, total: 100, percentage: 95 }
    ];

    setMetrics(mockMetrics);
    setAlerts(mockAlerts);
    setThreatData(mockThreatData);
    setComplianceData(mockComplianceData);
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    generateMockData();
    
    if (autoRefresh) {
      const interval = setInterval(generateMockData, 30000); // Atualizar a cada 30 segundos
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <XCircle className="h-4 w-4" />;
      case 'HIGH': return <AlertCircle className="h-4 w-4" />;
      case 'MEDIUM': return <AlertTriangle className="h-4 w-4" />;
      case 'LOW': return <Info className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dashboard de segurança...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🔒 Dashboard de Segurança</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real da segurança do Hub Control
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Última atualização: {lastUpdate.toLocaleTimeString()}</span>
          </Badge>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto' : 'Manual'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateMockData}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.id} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
              {metric.icon}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {metric.name.includes('Score') || metric.name.includes('Cobertura') 
                    ? `${metric.value}%` 
                    : metric.value.toLocaleString()}
                </div>
                {getStatusIcon(metric.status)}
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                {metric.change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : metric.change < 0 ? (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                ) : null}
                <span className={metric.change > 0 ? 'text-green-600' : metric.change < 0 ? 'text-red-600' : ''}>
                  {metric.change > 0 ? '+' : ''}{metric.change}
                </span>
                <span>vs. período anterior</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alertas Críticos */}
      {alerts.filter(alert => alert.severity === 'CRITICAL' || alert.severity === 'HIGH').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Atenção:</strong> {alerts.filter(alert => alert.severity === 'CRITICAL' || alert.severity === 'HIGH').length} alerta(s) crítico(s) requer(em) atenção imediata.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs para diferentes visualizações */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="threats">Ameaças</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        {/* Tab: Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Ameaças por Hora */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Atividade de Segurança (24h)</span>
                </CardTitle>
                <CardDescription>
                  Monitoramento de ameaças e atividades suspeitas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={threatData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="threats_blocked" 
                      stackId="1" 
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      name="Ameaças Bloqueadas"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="suspicious_activities" 
                      stackId="1" 
                      stroke="#f97316" 
                      fill="#f97316" 
                      name="Atividades Suspeitas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico de Tentativas de Login */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="h-5 w-5" />
                  <span>Tentativas de Login (24h)</span>
                </CardTitle>
                <CardDescription>
                  Monitoramento de tentativas de acesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={threatData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="login_attempts" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Tentativas de Login"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Ameaças */}
        <TabsContent value="threats" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Ameaças Recentes */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Ameaças Detectadas</span>
                </CardTitle>
                <CardDescription>
                  Últimas ameaças identificadas pelo sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div>
                          <p className="font-medium">{alert.message}</p>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                            {alert.user_email && <span>• {alert.user_email}</span>}
                            {alert.ip_address && <span>• {alert.ip_address}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge variant={alert.status === 'active' ? 'destructive' : alert.status === 'investigating' ? 'default' : 'secondary'}>
                        {alert.status === 'active' ? 'Ativo' : alert.status === 'investigating' ? 'Investigando' : 'Resolvido'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Estatísticas de Ameaças */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Estatísticas</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ameaças Ativas</span>
                    <Badge variant="destructive">{alerts.filter(a => a.status === 'active').length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Em Investigação</span>
                    <Badge variant="default">{alerts.filter(a => a.status === 'investigating').length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Resolvidas</span>
                    <Badge variant="secondary">{alerts.filter(a => a.status === 'resolved').length}</Badge>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Taxa de Resolução</span>
                      <span className="text-sm font-bold text-green-600">
                        {Math.round((alerts.filter(a => a.status === 'resolved').length / alerts.length) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Compliance */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Status de Compliance</span>
                </CardTitle>
                <CardDescription>
                  Conformidade com políticas de segurança
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={complianceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="percentage"
                    >
                      {complianceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Detalhes de Compliance */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes de Compliance</CardTitle>
                <CardDescription>
                  Pontuação detalhada por categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {complianceData.map((item, index) => (
                    <div key={item.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.category}</span>
                        <span className="text-sm font-bold">{item.percentage}%</span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.score} de {item.total}</span>
                        <span className={item.percentage >= 90 ? 'text-green-600' : item.percentage >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {item.percentage >= 90 ? 'Excelente' : item.percentage >= 70 ? 'Bom' : 'Requer Atenção'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Alertas */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Todos os Alertas</span>
              </CardTitle>
              <CardDescription>
                Histórico completo de alertas de segurança
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${getSeverityColor(alert.severity)}`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{alert.message}</p>
                          <Badge variant="outline">{alert.type}</Badge>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          </span>
                          {alert.user_email && (
                            <span className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{alert.user_email}</span>
                            </span>
                          )}
                          {alert.ip_address && (
                            <span className="flex items-center space-x-1">
                              <Globe className="h-3 w-3" />
                              <span>{alert.ip_address}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={alert.status === 'active' ? 'destructive' : alert.status === 'investigating' ? 'default' : 'secondary'}
                      >
                        {alert.status === 'active' ? 'Ativo' : alert.status === 'investigating' ? 'Investigando' : 'Resolvido'}
                      </Badge>
                      <Badge variant="outline">{alert.severity}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityDashboard;