'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BookOpen, 
  Award, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Target,
  BarChart3,
  PieChart,
  GraduationCap,
  Shield,
  Zap,
  Eye,
  AlertCircle
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// 🎓 INTERFACES E TIPOS
interface TrainingModule {
  id: string;
  module_code: string;
  title: string;
  description: string;
  category: string;
  is_mandatory: boolean;
  difficulty_level: string;
  estimated_duration_minutes: number;
  has_quiz: boolean;
  passing_score: number;
  is_active: boolean;
}

interface UserProgress {
  id: string;
  user_id: string;
  module_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';
  progress_percentage: number;
  best_score: number;
  time_spent_minutes: number;
  certificate_expires_at?: string;
  user_name: string;
  user_email: string;
  user_role: string;
  module_title: string;
}

interface TrainingDashboardData {
  total_users_enrolled: number;
  total_modules: number;
  mandatory_modules: number;
  completed_trainings: number;
  in_progress_trainings: number;
  not_started_trainings: number;
  completion_rate: number;
  total_certificates_issued: number;
  valid_certificates: number;
  expired_certificates: number;
  avg_score: number;
  avg_time_spent_minutes: number;
}

interface UserPendingTraining {
  user_id: string;
  email: string;
  name: string;
  role: string;
  mandatory_modules_total: number;
  mandatory_modules_pending: number;
  expired_certificates: number;
  certificates_expiring_soon: number;
  compliance_percentage: number;
}

interface CertificateExpiring {
  id: string;
  certificate_number: string;
  email: string;
  name: string;
  role: string;
  module_title: string;
  expires_at: string;
  days_until_expiry: number;
  urgency_level: 'expired' | 'critical' | 'warning' | 'normal';
}

// 🎨 CORES E CONFIGURAÇÕES
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1'
};

const STATUS_COLORS = {
  completed: COLORS.success,
  in_progress: COLORS.info,
  not_started: COLORS.warning,
  failed: COLORS.danger,
  expired: COLORS.danger
};

const URGENCY_COLORS = {
  expired: COLORS.danger,
  critical: COLORS.danger,
  warning: COLORS.warning,
  normal: COLORS.success
};

const CATEGORY_ICONS = {
  security_fundamentals: Shield,
  secure_development: Zap,
  monitoring: Eye,
  incident_response: AlertCircle
};

// 🎓 COMPONENTE PRINCIPAL
export default function TrainingDashboard() {
  const [dashboardData, setDashboardData] = useState<TrainingDashboardData | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserPendingTraining[]>([]);
  const [expiringCertificates, setExpiringCertificates] = useState<CertificateExpiring[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // 📊 DADOS SIMULADOS (substituir por chamadas reais à API)
  useEffect(() => {
    const loadTrainingData = async () => {
      setLoading(true);
      
      // Simular delay de carregamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados simulados do dashboard
      setDashboardData({
        total_users_enrolled: 156,
        total_modules: 6,
        mandatory_modules: 5,
        completed_trainings: 423,
        in_progress_trainings: 89,
        not_started_trainings: 234,
        completion_rate: 68.5,
        total_certificates_issued: 387,
        valid_certificates: 342,
        expired_certificates: 45,
        avg_score: 87.3,
        avg_time_spent_minutes: 78.5
      });
      
      // Módulos simulados
      setModules([
        {
          id: '1',
          module_code: 'SEC_FUND_001',
          title: 'Fundamentos de Segurança',
          description: 'Conceitos básicos de segurança da informação',
          category: 'security_fundamentals',
          is_mandatory: true,
          difficulty_level: 'beginner',
          estimated_duration_minutes: 45,
          has_quiz: true,
          passing_score: 80,
          is_active: true
        },
        {
          id: '2',
          module_code: 'SEC_DEV_001',
          title: 'Desenvolvimento Seguro',
          description: 'Práticas de desenvolvimento seguro',
          category: 'secure_development',
          is_mandatory: true,
          difficulty_level: 'intermediate',
          estimated_duration_minutes: 60,
          has_quiz: true,
          passing_score: 85,
          is_active: true
        },
        {
          id: '3',
          module_code: 'SEC_DEV_002',
          title: 'Row Level Security (RLS)',
          description: 'Implementação de RLS no Supabase',
          category: 'secure_development',
          is_mandatory: true,
          difficulty_level: 'advanced',
          estimated_duration_minutes: 90,
          has_quiz: true,
          passing_score: 90,
          is_active: true
        },
        {
          id: '4',
          module_code: 'SEC_MON_001',
          title: 'Monitoramento de Segurança',
          description: 'Dashboard e alertas de segurança',
          category: 'monitoring',
          is_mandatory: true,
          difficulty_level: 'intermediate',
          estimated_duration_minutes: 75,
          has_quiz: true,
          passing_score: 85,
          is_active: true
        },
        {
          id: '5',
          module_code: 'SEC_INC_001',
          title: 'Resposta a Incidentes',
          description: 'Procedimentos de resposta a incidentes',
          category: 'incident_response',
          is_mandatory: true,
          difficulty_level: 'advanced',
          estimated_duration_minutes: 120,
          has_quiz: true,
          passing_score: 90,
          is_active: true
        },
        {
          id: '6',
          module_code: 'SEC_ADV_001',
          title: 'OWASP Top 10',
          description: 'Vulnerabilidades mais comuns',
          category: 'security_fundamentals',
          is_mandatory: false,
          difficulty_level: 'advanced',
          estimated_duration_minutes: 180,
          has_quiz: true,
          passing_score: 95,
          is_active: true
        }
      ]);
      
      // Usuários com treinamento pendente
      setPendingUsers([
        {
          user_id: '1',
          email: 'joao.silva@hubcontrol.com',
          name: 'João Silva',
          role: 'operator',
          mandatory_modules_total: 4,
          mandatory_modules_pending: 2,
          expired_certificates: 1,
          certificates_expiring_soon: 0,
          compliance_percentage: 50
        },
        {
          user_id: '2',
          email: 'maria.santos@hubcontrol.com',
          name: 'Maria Santos',
          role: 'supervisor',
          mandatory_modules_total: 5,
          mandatory_modules_pending: 1,
          expired_certificates: 0,
          certificates_expiring_soon: 1,
          compliance_percentage: 80
        },
        {
          user_id: '3',
          email: 'carlos.oliveira@hubcontrol.com',
          name: 'Carlos Oliveira',
          role: 'user',
          mandatory_modules_total: 2,
          mandatory_modules_pending: 2,
          expired_certificates: 0,
          certificates_expiring_soon: 0,
          compliance_percentage: 0
        }
      ]);
      
      // Certificados expirando
      setExpiringCertificates([
        {
          id: '1',
          certificate_number: 'CERT-ABC123-2024-0001',
          email: 'ana.costa@hubcontrol.com',
          name: 'Ana Costa',
          role: 'admin',
          module_title: 'Fundamentos de Segurança',
          expires_at: '2024-02-15T00:00:00Z',
          days_until_expiry: 5,
          urgency_level: 'critical'
        },
        {
          id: '2',
          certificate_number: 'CERT-DEF456-2024-0002',
          email: 'pedro.lima@hubcontrol.com',
          name: 'Pedro Lima',
          role: 'supervisor',
          module_title: 'Desenvolvimento Seguro',
          expires_at: '2024-02-28T00:00:00Z',
          days_until_expiry: 18,
          urgency_level: 'warning'
        }
      ]);
      
      setLoading(false);
    };
    
    loadTrainingData();
  }, []);

  // 📊 DADOS PARA GRÁFICOS
  const progressChartData = [
    { name: 'Jan', completed: 45, in_progress: 23, not_started: 32 },
    { name: 'Fev', completed: 52, in_progress: 28, not_started: 20 },
    { name: 'Mar', completed: 61, in_progress: 25, not_started: 14 },
    { name: 'Abr', completed: 68, in_progress: 22, not_started: 10 },
    { name: 'Mai', completed: 75, in_progress: 18, not_started: 7 },
    { name: 'Jun', completed: 82, in_progress: 15, not_started: 3 }
  ];
  
  const moduleCompletionData = modules.map(module => {
    const IconComponent = CATEGORY_ICONS[module.category as keyof typeof CATEGORY_ICONS] || BookOpen;
    return {
      name: module.title.substring(0, 20) + '...',
      completion: Math.floor(Math.random() * 40) + 60, // Simular dados
      icon: IconComponent
    };
  });
  
  const categoryDistribution = [
    { name: 'Fundamentos', value: 35, color: COLORS.primary },
    { name: 'Desenvolvimento', value: 28, color: COLORS.success },
    { name: 'Monitoramento', value: 22, color: COLORS.warning },
    { name: 'Resposta a Incidentes', value: 15, color: COLORS.danger }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados de treinamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 📊 HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            Dashboard de Treinamento
          </h1>
          <p className="text-gray-600 mt-1">
            Monitoramento de progresso e compliance de treinamento em segurança
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Relatório Mensal
          </Button>
          <Button size="sm">
            <Target className="h-4 w-4 mr-2" />
            Definir Metas
          </Button>
        </div>
      </div>

      {/* 🚨 ALERTAS CRÍTICOS */}
      {expiringCertificates.filter(cert => cert.urgency_level === 'critical').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Atenção:</strong> {expiringCertificates.filter(cert => cert.urgency_level === 'critical').length} certificado(s) 
            expirando em menos de 7 dias. Ação imediata necessária.
          </AlertDescription>
        </Alert>
      )}

      {/* 📊 MÉTRICAS PRINCIPAIS */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {dashboardData.completion_rate.toFixed(1)}%
              </div>
              <Progress value={dashboardData.completion_rate} className="mt-2" />
              <p className="text-xs text-gray-600 mt-2">
                {dashboardData.completed_trainings} de {dashboardData.completed_trainings + dashboardData.in_progress_trainings + dashboardData.not_started_trainings} treinamentos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboardData.total_users_enrolled}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {dashboardData.in_progress_trainings} em progresso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificados Válidos</CardTitle>
              <Award className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {dashboardData.valid_certificates}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                {dashboardData.expired_certificates} expirados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {dashboardData.avg_score.toFixed(1)}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Tempo médio: {Math.round(dashboardData.avg_time_spent_minutes)}min
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 📋 TABS DE CONTEÚDO */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="progress">Progresso</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="certificates">Certificados</TabsTrigger>
        </TabsList>

        {/* 📊 VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Progresso Temporal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Progresso ao Longo do Tempo
                </CardTitle>
                <CardDescription>
                  Evolução das conclusões de treinamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={progressChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stackId="1" 
                      stroke={COLORS.success} 
                      fill={COLORS.success} 
                      name="Concluídos"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="in_progress" 
                      stackId="1" 
                      stroke={COLORS.info} 
                      fill={COLORS.info} 
                      name="Em Progresso"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="not_started" 
                      stackId="1" 
                      stroke={COLORS.warning} 
                      fill={COLORS.warning} 
                      name="Não Iniciados"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição por Categoria */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição por Categoria
                </CardTitle>
                <CardDescription>
                  Participação de cada categoria de treinamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 📚 MÓDULOS */}
        <TabsContent value="modules" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => {
              const IconComponent = CATEGORY_ICONS[module.category as keyof typeof CATEGORY_ICONS] || BookOpen;
              const completionRate = moduleCompletionData.find(m => m.name.includes(module.title.substring(0, 10)))?.completion || 0;
              
              return (
                <Card key={module.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">{module.title}</CardTitle>
                          <CardDescription className="text-sm">
                            {module.module_code}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {module.is_mandatory && (
                          <Badge variant="destructive" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {module.difficulty_level}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      {module.description}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {module.estimated_duration_minutes}min
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          {module.passing_score}% mínimo
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Taxa de Conclusão</span>
                          <span className="font-medium">{completionRate}%</span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>
                      
                      <Button className="w-full" size="sm">
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* 📈 PROGRESSO */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conclusão por Módulo</CardTitle>
              <CardDescription>
                Taxa de conclusão de cada módulo de treinamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={moduleCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="completion" fill={COLORS.primary} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ COMPLIANCE */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Usuários com Treinamento Pendente
              </CardTitle>
              <CardDescription>
                Usuários que precisam completar treinamentos obrigatórios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">
                          {user.compliance_percentage}% compliance
                        </span>
                        <Progress value={user.compliance_percentage} className="w-20 h-2" />
                      </div>
                      
                      <div className="flex gap-2 text-xs">
                        {user.mandatory_modules_pending > 0 && (
                          <Badge variant="destructive">
                            {user.mandatory_modules_pending} pendentes
                          </Badge>
                        )}
                        {user.expired_certificates > 0 && (
                          <Badge variant="destructive">
                            {user.expired_certificates} expirados
                          </Badge>
                        )}
                        {user.certificates_expiring_soon > 0 && (
                          <Badge variant="secondary">
                            {user.certificates_expiring_soon} expirando
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🏆 CERTIFICADOS */}
        <TabsContent value="certificates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                Certificados Próximos ao Vencimento
              </CardTitle>
              <CardDescription>
                Certificados que expiram nos próximos 60 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expiringCertificates.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        cert.urgency_level === 'critical' ? 'bg-red-100' :
                        cert.urgency_level === 'warning' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>
                        <Award className={`h-5 w-5 ${
                          cert.urgency_level === 'critical' ? 'text-red-600' :
                          cert.urgency_level === 'warning' ? 'text-yellow-600' : 'text-green-600'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-medium">{cert.name}</h4>
                        <p className="text-sm text-gray-600">{cert.module_title}</p>
                        <p className="text-xs text-gray-500">{cert.certificate_number}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge 
                        variant={cert.urgency_level === 'critical' ? 'destructive' : 
                                cert.urgency_level === 'warning' ? 'secondary' : 'outline'}
                        className="mb-2"
                      >
                        {cert.days_until_expiry > 0 ? 
                          `${cert.days_until_expiry} dias` : 
                          'Expirado'
                        }
                      </Badge>
                      <p className="text-xs text-gray-600">
                        Expira em: {new Date(cert.expires_at).toLocaleDateString('pt-BR')}
                      </p>
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
}
