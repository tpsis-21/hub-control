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
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ModernStatCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
    period?: string;
  };
  progress?: {
    value: number;
    max: number;
    label?: string;
  };
  variant?: "default" | "success" | "warning" | "destructive" | "info";
  className?: string;
  showGradient?: boolean;
};

export function ModernStatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  progress,
  variant = "default",
  className,
  showGradient = true,
}: ModernStatCardProps) {
  const variantStyles = {
    default: {
      card: "border-border hover:border-border/80",
      gradient: "from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50",
      icon: "text-slate-600 dark:text-slate-400",
      iconBg: "bg-slate-100 dark:bg-slate-800",
    },
    success: {
      card: "border-green-200 hover:border-green-300 dark:border-green-800 dark:hover:border-green-700",
      gradient: "from-green-50 to-emerald-50/50 dark:from-green-950 dark:to-emerald-950/50",
      icon: "text-green-600 dark:text-green-400",
      iconBg: "bg-green-100 dark:bg-green-900",
    },
    warning: {
      card: "border-yellow-200 hover:border-yellow-300 dark:border-yellow-800 dark:hover:border-yellow-700",
      gradient: "from-yellow-50 to-orange-50/50 dark:from-yellow-950 dark:to-orange-950/50",
      icon: "text-yellow-600 dark:text-yellow-400",
      iconBg: "bg-yellow-100 dark:bg-yellow-900",
    },
    destructive: {
      card: "border-red-200 hover:border-red-300 dark:border-red-800 dark:hover:border-red-700",
      gradient: "from-red-50 to-rose-50/50 dark:from-red-950 dark:to-rose-950/50",
      icon: "text-red-600 dark:text-red-400",
      iconBg: "bg-red-100 dark:bg-red-900",
    },
    info: {
      card: "border-blue-200 hover:border-blue-300 dark:border-blue-800 dark:hover:border-blue-700",
      gradient: "from-blue-50 to-blue-100/50 dark:from-blue-950 dark:to-blue-900/50",
      icon: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-100 dark:bg-blue-900",
    },
  };

  const styles = variantStyles[variant];

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.isPositive) return <ArrowUpRight className="h-3 w-3" />;
    if (trend.value === 0) return <Minus className="h-3 w-3" />;
    return <ArrowDownRight className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.isPositive) return "text-green-600 dark:text-green-400";
    if (trend.value === 0) return "text-muted-foreground";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card
      className={cn(
        "modern-card relative overflow-hidden group animate-fade-in transition-all duration-300 hover:shadow-lg",
        styles.card,
        className
      )}
    >
      {showGradient && (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-50",
            styles.gradient
          )}
        />
      )}
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex flex-col space-y-1">
          <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide">
            {title}
          </CardTitle>
        </div>
        <div className={cn("rounded-xl p-3 transition-all duration-300 group-hover:scale-110", styles.iconBg)}>
          <Icon className={cn("h-5 w-5", styles.icon)} />
        </div>
      </CardHeader>
      <CardContent className="relative pt-2">
        <div className="space-y-3">
          <div className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">{value}</div>
          
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
          
          {trend && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1 text-xs font-medium border-0 px-2 py-1 rounded-full",
                  getTrendColor(),
                  trend.isPositive
                    ? "bg-green-100 dark:bg-green-900/30"
                    : trend.value === 0
                    ? "bg-muted"
                    : "bg-red-100 dark:bg-red-900/30"
                )}
              >
                {getTrendIcon()}
                {Math.abs(trend.value)}%
              </Badge>
              {trend.period && (
                <span className="text-xs text-muted-foreground">
                  {trend.period}
                </span>
              )}
            </div>
          )}
          
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">{progress.label || "Progresso"}</span>
                <span className="text-foreground">
                  {progress.value}/{progress.max}
                </span>
              </div>
              <Progress
                value={(progress.value / progress.max) * 100}
                className="h-2.5"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type ModernStatsGridProps = {
  stats: Array<Omit<ModernStatCardProps, "className">>;
  className?: string;
  columns?: 2 | 3 | 4;
};

export function ModernStatsGrid({
  stats,
  className,
  columns = 4,
}: ModernStatsGridProps) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {stats.map((stat, index) => (
        <ModernStatCard key={index} {...stat} />
      ))}
    </div>
  );
}

// Componentes pré-configurados para métricas específicas
export function RevenueCard({
  value = 0,
  trend,
  period = "este mês",
}: {
  value?: number;
  trend?: { value: number; isPositive: boolean };
  period?: string;
}) {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  
  return (
    <ModernStatCard
      title="Receita Total"
      value={`R$ ${safeValue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`}
      description={`Receita ${period}`}
      icon={TrendingUp}
      trend={trend ? { ...trend, period } : undefined}
      variant="success"
    />
  );
}

export function ClientsCard({
  active = 0,
  total = 0,
  newThisMonth,
}: {
  active?: number;
  total?: number;
  newThisMonth?: number;
}) {
  const safeActive = typeof active === 'number' && !isNaN(active) ? active : 0;
  const safeTotal = typeof total === 'number' && !isNaN(total) ? total : 0;
  const safeNewThisMonth = typeof newThisMonth === 'number' && !isNaN(newThisMonth) ? newThisMonth : undefined;
  
  return (
    <ModernStatCard
      title="Clientes Ativos"
      value={safeActive.toLocaleString("pt-BR")}
      description={safeNewThisMonth ? `+${safeNewThisMonth} novos este mês` : undefined}
      icon={TrendingUp}
      progress={{
        value: safeActive,
        max: safeTotal || 1,
        label: "Do total",
      }}
      variant="info"
    />
  );
}

export function TestsCard({
  total = 0,
  conversionRate,
}: {
  total?: number;
  conversionRate?: number;
}) {
  const safeTotal = typeof total === 'number' && !isNaN(total) ? total : 0;
  const safeConversionRate = typeof conversionRate === 'number' && !isNaN(conversionRate) ? conversionRate : undefined;
  
  return (
    <ModernStatCard
      title="Testes Ativos"
      value={safeTotal.toLocaleString("pt-BR")}
      description="Testes em andamento"
      icon={TrendingUp}
      trend={
        safeConversionRate
          ? {
              value: safeConversionRate,
              isPositive: safeConversionRate > 0,
              period: "conversão",
            }
          : undefined
      }
      variant="warning"
    />
  );
}

export function ExpiringCard({
  today = 0,
  tomorrow = 0,
  thisWeek = 0,
}: {
  today?: number;
  tomorrow?: number;
  thisWeek?: number;
}) {
  const safeToday = typeof today === 'number' && !isNaN(today) ? today : 0;
  const safeTomorrow = typeof tomorrow === 'number' && !isNaN(tomorrow) ? tomorrow : 0;
  const safeThisWeek = typeof thisWeek === 'number' && !isNaN(thisWeek) ? thisWeek : 0;
  
  const total = safeToday + safeTomorrow + safeThisWeek;
  const urgency = safeToday > 0 ? "destructive" : safeTomorrow > 0 ? "warning" : "default";

  return (
    <ModernStatCard
      title="Vencimentos"
      value={total.toLocaleString("pt-BR")}
      description={`${safeToday} hoje, ${safeTomorrow} amanhã`}
      icon={TrendingDown}
      progress={{
        value: safeToday + safeTomorrow,
        max: total || 1,
        label: "Próximos 2 dias",
      }}
      variant={urgency}
    />
  );
}
