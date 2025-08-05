// @/app/(app)/financeiro/page.tsx
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Calendar, PieChart, BarChart3, Plus } from "lucide-react";
import { FormattedCurrency } from "@/components/ui/formatted-currency";
import { FinanceiroContent } from "./financeiro-content";
import { getFinancialData, getFinancialSummary } from "./actions";
import { Button } from "@/components/ui/button";
import { AddTransactionForm } from "./add-transaction-form";

export const dynamic = 'force-dynamic';

export default async function FinanceiroPage() {
  const [financialData, summary] = await Promise.all([
    getFinancialData(),
    getFinancialSummary()
  ]);

  return (
    <div className="space-y-6">
      
      {/* Resumo Financeiro */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <FormattedCurrency value={summary.receitaMes} />
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.crescimentoReceita > 0 ? '+' : ''}{summary.crescimentoReceita.toFixed(1)}% vs mês anterior
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              <FormattedCurrency value={summary.despesasMes} />
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.crescimentoDespesas > 0 ? '+' : ''}{summary.crescimentoDespesas.toFixed(1)}% vs mês anterior
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.lucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <FormattedCurrency value={summary.lucroLiquido} />
            </div>
            <p className="text-xs text-muted-foreground">
              Margem: {summary.margemLucro.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Anual</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              <FormattedCurrency value={summary.receitaAnual} />
            </div>
            <p className="text-xs text-muted-foreground">
              Acumulado {new Date().getFullYear()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="flex gap-2">
        <AddTransactionForm type="receita" />
        <AddTransactionForm type="despesa" />
      </div>

      {/* Conteúdo Principal */}
      <Suspense fallback={
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Carregando dados financeiros...</span>
            </div>
          </CardContent>
        </Card>
      }>
        <FinanceiroContent initialData={financialData} />
      </Suspense>
    </div>
  );
}