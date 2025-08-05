"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar } from "lucide-react";

type RevenueData = {
  date: string;
  revenue: number;
  clients: number;
  tests: number;
};

type RevenueChartProps = {
  data: RevenueData[];
  className?: string;
};

const chartConfig = {
  revenue: {
    label: "Receita",
    color: "hsl(var(--primary))",
  },
  clients: {
    label: "Novos Clientes",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig;

export function RevenueChart({ data, className }: RevenueChartProps) {
  const [timeRange, setTimeRange] = React.useState("30d");
  
  // Filtrar dados baseado no período selecionado
  const filteredData = React.useMemo(() => {
    const now = new Date();
    const daysToSubtract = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const startDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
    
    return data.filter(item => new Date(item.date) >= startDate);
  }, [data, timeRange]);

  // Calcular métricas
  const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
  const totalClients = filteredData.reduce((sum, item) => sum + item.clients, 0);
  const averageRevenue = totalRevenue / filteredData.length || 0;
  
  // Calcular tendência (comparar primeira e última semana)
  const firstWeekRevenue = filteredData.slice(0, 7).reduce((sum, item) => sum + item.revenue, 0);
  const lastWeekRevenue = filteredData.slice(-7).reduce((sum, item) => sum + item.revenue, 0);
  const trend = firstWeekRevenue > 0 ? ((lastWeekRevenue - firstWeekRevenue) / firstWeekRevenue) * 100 : 0;
  const isPositiveTrend = trend >= 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">Receita ao Longo do Tempo</CardTitle>
          <CardDescription>
            Acompanhe a evolução da receita e novos clientes
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isPositiveTrend ? "default" : "destructive"} className="flex items-center gap-1">
            {isPositiveTrend ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend).toFixed(1)}%
          </Badge>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Receita Total</p>
            <p className="text-lg font-semibold">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Novos Clientes</p>
            <p className="text-lg font-semibold">{totalClients}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Média Diária</p>
            <p className="text-lg font-semibold">
              R$ {averageRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('pt-BR', {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[200px]"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    });
                  }}
                  formatter={(value, name) => {
                    if (name === 'revenue') {
                      return [
                        `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        'Receita'
                      ];
                    }
                    return [value, name === 'clients' ? 'Novos Clientes' : name];
                  }}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-revenue)"
              fill="url(#fillRevenue)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Componente para gráfico de conversão de testes
export function TestConversionChart({ data }: { data: Array<{ date: string; tests: number; conversions: number }> }) {
  const conversionConfig = {
    tests: {
      label: "Testes",
      color: "hsl(var(--muted-foreground))",
    },
    conversions: {
      label: "Conversões",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Taxa de Conversão</CardTitle>
        <CardDescription>Testes que se tornaram clientes</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={conversionConfig} className="h-[200px] w-full">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              }}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="tests"
              stackId="1"
              stroke="var(--color-tests)"
              fill="var(--color-tests)"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="conversions"
              stackId="1"
              stroke="var(--color-conversions)"
              fill="var(--color-conversions)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}