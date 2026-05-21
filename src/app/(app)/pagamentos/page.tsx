// @/app/(app)/pagamentos/page.tsx
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { FormattedCurrency } from "@/components/ui/formatted-currency";
import { PaymentsContent } from "./payments-content";
import { getPayments, getPendingManualPayments } from "./actions";

export default async function PagamentosPage() {
  const [payments, pendingPayments] = await Promise.all([
    getPayments(),
    getPendingManualPayments()
  ]);

  const getStatusSummary = () => {
    const summary = {
      total: payments.length,
      ativados: payments.filter(p => p.status === 'Ativado').length,
      pendentes: pendingPayments.length,
      aguardando: payments.filter(p => p.status === 'Aguardando').length,
      confirmados: payments.filter(p => p.status === 'Confirmado').length,
      totalValue: payments.reduce((sum, p) => sum + p.amount, 0)
    };
    return summary;
  };

  const summary = getStatusSummary();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pagamentos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">
              Valor total: <FormattedCurrency value={summary.totalValue} />
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.ativados}</div>
            <p className="text-xs text-muted-foreground">
              {summary.total > 0 ? ((summary.ativados / summary.total) * 100).toFixed(1) : 0}% do total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes Ativação</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{summary.pendentes}</div>
            <p className="text-xs text-muted-foreground">
              Requer ação manual
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmados</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.confirmados}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando ativação
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.aguardando}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando confirmação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Carregando pagamentos...</span>
            </div>
          </CardContent>
        </Card>
      }>
        <PaymentsContent initialPayments={payments} />
      </Suspense>
    </div>
  );
}
