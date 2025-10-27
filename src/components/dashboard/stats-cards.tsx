"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Users,
  FlaskConical,
  Clock,
  UserCheck,
  Calendar,
  History,
  UserX,
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Target,
  BarChart3,
  CreditCard,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: {
    value: number;
    max: number;
  };
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  progress,
  variant = "default",
  className,
}: StatCardProps) {
  const variantStyles = {
    default: "border-border",
    success: "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50",
    warning: "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-950/50",
    destructive: "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    destructive: "text-red-600 dark:text-red-400",
  };

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconStyles[variant])} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.value > 0 ? "+" : ""}{trend.value}%
            </span>
          </div>
        )}
        {progress && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{progress.value}</span>
              <span>{progress.max}</span>
            </div>
            <Progress value={(progress.value / progress.max) * 100} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type StatsGridProps = {
  stats: Array<Omit<StatCardProps, "className">>;
  className?: string;
};

export function StatsGrid({ stats, className }: StatsGridProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

// Componentes pré-configurados para métricas específicas
export function RevenueCard({ value, trend }: { value: number; trend?: { value: number; isPositive: boolean } }) {
  return (
    <StatCard
      title="Receita Total"
      value={`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
      description="Receita do mês atual"
      icon={DollarSign}
      trend={trend}
      variant="success"
    />
  );
}

export function ClientsCard({ active, total }: { active: number; total: number }) {
  return (
    <StatCard
      title="Clientes Ativos"
      value={active}
      description={`${total} clientes no total`}
      icon={Users}
      progress={{ value: active, max: total }}
    />
  );
}

export function TestsCard({ value, trend }: { value: number; trend?: { value: number; isPositive: boolean } }) {
  return (
    <StatCard
      title="Testes Criados"
      value={value}
      description="Testes este mês"
      icon={FlaskConical}
      trend={trend}
      variant="default"
    />
  );
}

export function ServersCard({ online, total }: { online: number; total: number }) {
  const isHealthy = online / total >= 0.8;
  return (
    <StatCard
      title="Servidores Online"
      value={`${online}/${total}`}
      description="Status dos servidores"
      icon={Server}
      progress={{ value: online, max: total }}
      variant={isHealthy ? "success" : "warning"}
    />
  );
}

export function ConversionCard({ rate }: { rate: number }) {
  return (
    <StatCard
      title="Taxa de Conversão"
      value={`${rate.toFixed(1)}%`}
      description="Testes → Clientes"
      icon={Target}
      variant={rate >= 20 ? "success" : rate >= 10 ? "warning" : "destructive"}
    />
  );
}

export function ExpiringCard({ count }: { count: number }) {
  return (
    <StatCard
      title="Vencendo Hoje"
      value={count}
      description="Clientes para renovar"
      icon={AlertTriangle}
      variant={count > 0 ? "warning" : "success"}
    />
  );
}
