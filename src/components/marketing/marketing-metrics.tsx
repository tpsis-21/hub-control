'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Mail, 
  Eye, 
  MousePointer, 
  UserX,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { MarketingDashboard } from '@/lib/types/marketing'

interface MarketingMetricsProps {
  dashboard: MarketingDashboard | null
}

export function MarketingMetrics({ dashboard }: MarketingMetricsProps) {
  if (!dashboard) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Dados para os gráficos
  const deliverabilityData = [
    { name: 'Entregues', value: dashboard.deliveryRate, color: '#22c55e' },
    { name: 'Bounced', value: dashboard.bounceRate, color: '#ef4444' },
    { name: 'Spam', value: dashboard.spamRate, color: '#f59e0b' }
  ]

  const engagementData = [
    { name: 'Enviados', value: dashboard.emailsSent, color: '#3b82f6' },
    { name: 'Abertos', value: Math.round(dashboard.emailsSent * (dashboard.openRate / 100)), color: '#22c55e' },
    { name: 'Clicados', value: Math.round(dashboard.emailsSent * (dashboard.clickRate / 100)), color: '#8b5cf6' }
  ]

  // Dados temporais simulados (em uma implementação real, viriam do backend)
  const timeSeriesData = [
    { date: '01/12', sent: 1200, opened: 480, clicked: 96 },
    { date: '02/12', sent: 1350, opened: 540, clicked: 108 },
    { date: '03/12', sent: 1100, opened: 440, clicked: 88 },
    { date: '04/12', sent: 1450, opened: 580, clicked: 116 },
    { date: '05/12', sent: 1600, opened: 640, clicked: 128 },
    { date: '06/12', sent: 1300, opened: 520, clicked: 104 },
    { date: '07/12', sent: 1750, opened: 700, clicked: 140 }
  ]

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { variant: 'default' as const, label: 'Excelente' }
    if (score >= 60) return { variant: 'secondary' as const, label: 'Bom' }
    return { variant: 'destructive' as const, label: 'Precisa Melhorar' }
  }

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Entrega</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.deliveryRate.toFixed(1)}%</div>
            <Progress value={dashboard.deliveryRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.deliveryRate >= 95 ? (
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="mr-1 h-3 w-3" /> Excelente
                </span>
              ) : (
                <span className="text-yellow-600 flex items-center">
                  <TrendingDown className="mr-1 h-3 w-3" /> Pode melhorar
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Abertura</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.openRate.toFixed(1)}%</div>
            <Progress value={dashboard.openRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Média da indústria: 21.3%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Clique</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.clickRate.toFixed(1)}%</div>
            <Progress value={dashboard.clickRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Média da indústria: 2.6%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Bounce</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.bounceRate.toFixed(1)}%</div>
            <Progress value={dashboard.bounceRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.bounceRate <= 2 ? (
                <span className="text-green-600">Dentro do ideal</span>
              ) : (
                <span className="text-red-600">Acima do recomendado</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Score de Entregabilidade */}
      <Card>
        <CardHeader>
          <CardTitle>Score de Entregabilidade</CardTitle>
          <CardDescription>
            Análise geral da qualidade dos seus envios de email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-4xl font-bold ${getScoreColor(dashboard.deliverabilityScore)}`}>
                {dashboard.deliverabilityScore}/100
              </div>
              <Badge {...getScoreBadge(dashboard.deliverabilityScore)}>
                {getScoreBadge(dashboard.deliverabilityScore).label}
              </Badge>
            </div>
            <div className="text-right space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Reputação do Domínio:</span>
                <span className="ml-2 font-medium">Boa</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Autenticação:</span>
                <span className="ml-2 font-medium text-green-600">SPF, DKIM ✓</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Lista de Bloqueio:</span>
                <span className="ml-2 font-medium text-green-600">Limpa ✓</span>
              </div>
            </div>
          </div>
          <Progress value={dashboard.deliverabilityScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de Entregabilidade */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Entregabilidade</CardTitle>
            <CardDescription>Como seus emails estão sendo entregues</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deliverabilityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deliverabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center space-x-4 mt-4">
              {deliverabilityData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}: {item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Engajamento */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de Engajamento</CardTitle>
            <CardDescription>Jornada dos seus emails</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={(entry) => entry.color} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tendência Temporal */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência dos Últimos 7 Dias</CardTitle>
          <CardDescription>Performance diária das suas campanhas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="sent" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Enviados"
              />
              <Line 
                type="monotone" 
                dataKey="opened" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Abertos"
              />
              <Line 
                type="monotone" 
                dataKey="clicked" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Clicados"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendações para Melhorar</CardTitle>
          <CardDescription>Dicas baseadas na sua performance atual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dashboard.openRate < 20 && (
              <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Melhore a Taxa de Abertura</h4>
                  <p className="text-sm text-yellow-700">
                    Teste diferentes linhas de assunto e horários de envio. Sua taxa atual está abaixo da média.
                  </p>
                </div>
              </div>
            )}
            
            {dashboard.clickRate < 2 && (
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <MousePointer className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-800">Aumente o Engajamento</h4>
                  <p className="text-sm text-blue-700">
                    Inclua calls-to-action mais claros e conteúdo mais relevante para seus clientes.
                  </p>
                </div>
              </div>
            )}
            
            {dashboard.bounceRate > 2 && (
              <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                <UserX className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Limpe sua Lista</h4>
                  <p className="text-sm text-red-700">
                    Alta taxa de bounce pode prejudicar sua reputação. Remova emails inválidos.
                  </p>
                </div>
              </div>
            )}
            
            {dashboard.deliverabilityScore >= 80 && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-800">Excelente Performance!</h4>
                  <p className="text-sm text-green-700">
                    Suas métricas estão ótimas. Continue mantendo a qualidade do conteúdo e segmentação.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}