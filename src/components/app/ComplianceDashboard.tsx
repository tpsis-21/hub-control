'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  Users, 
  Key, 
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Settings,
  Eye,
  UserCheck,
  UserX,
  Calendar,
  Target
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 🔒 TIPOS E INTERFACES
interface ComplianceMetrics {
  totalUsers: number;
  compliantUsers: number;
  partialUsers: number;
  nonCompliantUsers: number;
  complianceRate: number;
  avgPasswordScore: number;
  mfaEnabledUsers: number;
  avgComplianceScore: number;
  lastUpdated: string;
}

interface NonCompliantUser {
  userId: string;
  email: string;
  name: string;
  role: string;
  complianceStatus: 'partial' | 'non_compliant';
  overallScore: number;
  passwordCompliant: boolean;
  passwordScore: number;
  mfaEnabled: boolean;
  mfaEnforced: boolean;
  issues: string[];
  lastLogin: string;
  pendingActions: number;
}

interface RemediationAction {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  issue: string;
  actionType: 'force_password_change' | 'enable_mfa' | 'notification' | 'training';
  priority: 'overdue' | 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string;
  daysUntilDue: number;
}

interface ComplianceHistory {
  date: string;
  compliant: number;
  partial: number;
  nonCompliant: number;
  totalScore: number;
}

// 🎨 CORES PARA GRÁFICOS
const COLORS = {
  compliant: '#10b981', // green-500
  partial: '#f59e0b',   // amber-500
  nonCompliant: '#ef4444', // red-500
  primary: '#3b82f6',   // blue-500
  secondary: '#6b7280'  // gray-500
};

// 📊 COMPONENTE PRINCIPAL
export default function ComplianceDashboard() {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [nonCompliantUsers, setNonCompliantUsers] = useState<NonCompliantUser[]>([]);
  const [remediationActions, setRemediationActions] = useState<RemediationAction[]>([]);
  const [complianceHistory, setComplianceHistory] = useState<ComplianceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  // 🔄 SIMULAÇÃO DE DADOS (substituir por API real)
  const generateMockData = () => {
    // Métricas gerais
    const totalUsers = 150;
    const compliantUsers = Math.floor(totalUsers * 0.65);
    const partialUsers = Math.floor(totalUsers * 0.25);
    const nonCompliantUsers = totalUsers - compliantUsers - partialUsers;

    const mockMetrics: ComplianceMetrics = {
      totalUsers,
      compliantUsers,
      partialUsers,
      nonCompliantUsers,
      complianceRate: Math.round((compliantUsers / totalUsers) * 100),
      avgPasswordScore: 78,
      mfaEnabledUsers: Math.floor(totalUsers * 0.45),
      avgComplianceScore: 72,
      lastUpdated: new Date().toISOString()
    };

    // Usuários não conformes
    const mockNonCompliantUsers: NonCompliantUser[] = Array.from({ length: nonCompliantUsers + partialUsers }, (_, i) => ({
      userId: `user-${i + 1}`,
      email: `usuario${i + 1}@empresa.com`,
      name: `Usuário ${i + 1}`,
      role: ['user', 'operator', 'supervisor'][Math.floor(Math.random() * 3)],
      complianceStatus: Math.random() > 0.6 ? 'partial' : 'non_compliant',
      overallScore: Math.floor(Math.random() * 60) + 20,
      passwordCompliant: Math.random() > 0.4,
      passwordScore: Math.floor(Math.random() * 40) + 30,
      mfaEnabled: Math.random() > 0.7,
      mfaEnforced: Math.random() > 0.5,
      issues: [
        'Senha não atende aos critérios de segurança',
        'MFA não configurado',
        'Último login há mais de 90 dias'
      ].filter(() => Math.random() > 0.5),
      lastLogin: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      pendingActions: Math.floor(Math.random() * 3) + 1
    }));

    // Ações de remediação
    const mockRemediationActions: RemediationAction[] = Array.from({ length: 25 }, (_, i) => {
      const daysUntilDue = Math.floor(Math.random() * 14) - 3; // -3 a 11 dias
      let priority: RemediationAction['priority'] = 'low';
      
      if (daysUntilDue < 0) priority = 'overdue';
      else if (daysUntilDue <= 1) priority = 'urgent';
      else if (daysUntilDue <= 3) priority = 'high';
      else if (daysUntilDue <= 7) priority = 'medium';

      return {
        id: `action-${i + 1}`,
        userId: `user-${i + 1}`,
        email: `usuario${i + 1}@empresa.com`,
        name: `Usuário ${i + 1}`,
        role: ['user', 'operator', 'supervisor'][Math.floor(Math.random() * 3)],
        issue: [
          'Senha não atende aos critérios de segurança',
          'MFA não configurado ou obrigatório',
          'Conta inativa há muito tempo'
        ][Math.floor(Math.random() * 3)],
        actionType: [
          'force_password_change',
          'enable_mfa',
          'notification',
          'training'
        ][Math.floor(Math.random() * 4)] as RemediationAction['actionType'],
        priority,
        dueDate: new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilDue
      };
    });

    // Histórico de compliance (últimos 30 dias)
    const mockHistory: ComplianceHistory[] = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      
      const total = totalUsers + Math.floor(Math.random() * 10) - 5;
      const compliant = Math.floor(total * (0.6 + Math.random() * 0.2));
      const partial = Math.floor(total * (0.2 + Math.random() * 0.1));
      const nonCompliant = total - compliant - partial;

      return {
        date: date.toISOString().split('T')[0],
        compliant,
        partial,
        nonCompliant,
        totalScore: Math.floor(65 + Math.random() * 20)
      };
    });

    setMetrics(mockMetrics);
    setNonCompliantUsers(mockNonCompliantUsers);
    setRemediationActions(mockRemediationActions);
    setComplianceHistory(mockHistory);
    setLoading(false);
    setLastRefresh(new Date());
  };

  // 🔄 CARREGAR DADOS
  useEffect(() => {
    generateMockData();
    
    // Auto-refresh a cada 5 minutos
    const interval = setInterval(generateMockData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // 🎨 FUNÇÕES AUXILIARES
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'non_compliant': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'urgent': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'force_password_change': return 'Alterar Senha';
      case 'enable_mfa': return 'Habilitar MFA';
      case 'notification': return 'Notificação';
      case 'training': return 'Treinamento';
      default: return actionType;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados de compliance...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os dados de compliance.
        </AlertDescription>
      </Alert>
    );
  }

  // 📊 DADOS PARA GRÁFICOS
  const pieData = [
    { name: 'Conformes', value: metrics.compliantUsers, color: COLORS.compliant },
    { name: 'Parcialmente', value: metrics.partialUsers, color: COLORS.partial },
    { name: 'Não Conformes', value: metrics.nonCompliantUsers, color: COLORS.nonCompliant }
  ];

  const priorityData = remediationActions.reduce((acc, action) => {
    acc[action.priority] = (acc[action.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const priorityChartData = Object.entries(priorityData).map(([priority, count]) => ({
    priority: priority.charAt(0).toUpperCase() + priority.slice(1),
    count,
    color: {
      overdue: COLORS.nonCompliant,
      urgent: '#f97316', // orange-500
      high: COLORS.partial,
      medium: COLORS.primary,
      low: COLORS.secondary
    }[priority] || COLORS.secondary
  }));

  return (
    <div className="space-y-6">
      {/* 📊 CABEÇALHO */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Dashboard de Compliance
          </h1>
          <p className="text-muted-foreground">
            Monitoramento de conformidade de segurança em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Atualizado: {lastRefresh.toLocaleTimeString()}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={generateMockData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* 🚨 ALERTAS CRÍTICOS */}
      {metrics.complianceRate < 70 && (
        <Alert className="border-red-200 bg-red-50">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Taxa de Compliance Baixa</AlertTitle>
          <AlertDescription className="text-red-700">
            A taxa de compliance está em {metrics.complianceRate}%, abaixo do mínimo recomendado de 70%.
            Ação imediata necessária.
          </AlertDescription>
        </Alert>
      )}

      {/* 📊 MÉTRICAS PRINCIPAIS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Compliance</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {metrics.complianceRate}%
              {metrics.complianceRate >= 80 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </div>
            <Progress value={metrics.complianceRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.compliantUsers} de {metrics.totalUsers} usuários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Médio de Senha</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgPasswordScore}/100</div>
            <Progress value={metrics.avgPasswordScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.avgPasswordScore >= 80 ? 'Excelente' : 
               metrics.avgPasswordScore >= 60 ? 'Bom' : 'Precisa melhorar'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários com MFA</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((metrics.mfaEnabledUsers / metrics.totalUsers) * 100)}%
            </div>
            <Progress 
              value={(metrics.mfaEnabledUsers / metrics.totalUsers) * 100} 
              className="mt-2" 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.mfaEnabledUsers} usuários habilitados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações Pendentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {remediationActions.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {remediationActions.filter(a => a.priority === 'overdue').length} em atraso
            </div>
            <div className="text-xs text-muted-foreground">
              {remediationActions.filter(a => a.priority === 'urgent').length} urgentes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 📋 ABAS PRINCIPAIS */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
          <TabsTrigger value="trends">Tendências</TabsTrigger>
        </TabsList>

        {/* 📊 ABA: VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Distribuição de Compliance */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Compliance</CardTitle>
                <CardDescription>
                  Status de conformidade dos usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Prioridade das Ações */}
            <Card>
              <CardHeader>
                <CardTitle>Prioridade das Ações</CardTitle>
                <CardDescription>
                  Distribuição por urgência
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={priorityChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="priority" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 👥 ABA: USUÁRIOS NÃO CONFORMES */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Usuários Não Conformes ({nonCompliantUsers.length})
              </CardTitle>
              <CardDescription>
                Lista de usuários que precisam de atenção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nonCompliantUsers.slice(0, 10).map((user) => (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {user.complianceStatus === 'partial' ? (
                          <ShieldAlert className="h-8 w-8 text-yellow-500" />
                        ) : (
                          <ShieldX className="h-8 w-8 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {user.role}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(user.complianceStatus)}`}>
                            {user.complianceStatus === 'partial' ? 'Parcial' : 'Não Conforme'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{user.overallScore}/100</div>
                      <div className="text-sm text-muted-foreground">
                        {user.pendingActions} ações pendentes
                      </div>
                      <div className="flex gap-1 mt-2">
                        {!user.passwordCompliant && (
                          <Badge variant="destructive" className="text-xs">Senha</Badge>
                        )}
                        {!user.mfaEnabled && user.mfaEnforced && (
                          <Badge variant="destructive" className="text-xs">MFA</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {nonCompliantUsers.length > 10 && (
                  <div className="text-center">
                    <Button variant="outline">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver todos ({nonCompliantUsers.length - 10} restantes)
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ⚡ ABA: AÇÕES DE REMEDIAÇÃO */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Ações de Remediação ({remediationActions.length})
              </CardTitle>
              <CardDescription>
                Ações necessárias para melhorar compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {remediationActions
                  .sort((a, b) => {
                    const priorityOrder = { overdue: 0, urgent: 1, high: 2, medium: 3, low: 4 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                  })
                  .slice(0, 15)
                  .map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {action.priority === 'overdue' ? (
                            <XCircle className="h-6 w-6 text-red-500" />
                          ) : action.priority === 'urgent' ? (
                            <AlertTriangle className="h-6 w-6 text-orange-500" />
                          ) : (
                            <Clock className="h-6 w-6 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{action.name}</p>
                          <p className="text-sm text-muted-foreground">{action.email}</p>
                          <p className="text-sm">{action.issue}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={`mb-2 ${getPriorityColor(action.priority)}`}>
                          {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                        </Badge>
                        <div className="text-sm">
                          <div className="font-medium">{getActionTypeLabel(action.actionType)}</div>
                          <div className="text-muted-foreground">
                            {action.daysUntilDue < 0 
                              ? `${Math.abs(action.daysUntilDue)} dias em atraso`
                              : `${action.daysUntilDue} dias restantes`
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📈 ABA: TENDÊNCIAS */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução do Compliance (30 dias)</CardTitle>
              <CardDescription>
                Tendência histórica de conformidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={complianceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="compliant" 
                    stackId="1" 
                    stroke={COLORS.compliant} 
                    fill={COLORS.compliant}
                    name="Conformes"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="partial" 
                    stackId="1" 
                    stroke={COLORS.partial} 
                    fill={COLORS.partial}
                    name="Parciais"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="nonCompliant" 
                    stackId="1" 
                    stroke={COLORS.nonCompliant} 
                    fill={COLORS.nonCompliant}
                    name="Não Conformes"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Score Médio de Compliance</CardTitle>
              <CardDescription>
                Evolução do score geral de segurança
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={complianceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalScore" 
                    stroke={COLORS.primary} 
                    strokeWidth={3}
                    name="Score Médio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}