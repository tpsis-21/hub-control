// @/app/(app)/financeiro/actions.ts
'use server';

import { createServerClient, createServerSupabaseClientForActions } from "@/lib/supabase/clients/server";

// Helper function to create server supabase client
async function createServerSupabaseClient() {
  return await createServerClient();
}
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { FinancialTransaction, FinancialSummary } from '@/lib/types';
// import { getFinancialSummary as getFinancialSummaryHelper } from '@/lib/financial-summary-helper';

export async function getFinancialData(): Promise<FinancialTransaction[]> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Erro ao buscar transações financeiras:', error);
    return [];
  }

  return data || [];
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  try {
    const supabase = await createServerClient();
    
    // Buscar dados dos últimos 12 meses
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .gte('transaction_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;
    
    return getFinancialSummaryFallback();
  } catch (error) {
    console.error('Erro ao buscar resumo financeiro:', error);
    return getFinancialSummaryFallback();
  }
}

// Função fallback para quando a view não existir
async function getFinancialSummaryFallback(): Promise<FinancialSummary> {
  const supabase = await createServerSupabaseClient();
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const previousMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  // Receitas do mês atual (pagamentos recebidos)
  const { data: currentMonthPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'Pago')
    .gte('date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
    .lt('date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

  // Receitas do mês anterior
  const { data: previousMonthPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'Pago')
    .gte('date', `${previousMonthYear}-${previousMonth.toString().padStart(2, '0')}-01`)
    .lt('date', `${previousMonthYear}-${currentMonth.toString().padStart(2, '0')}-01`);

  // Receitas do ano
  const { data: yearPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'Pago')
    .gte('date', `${currentYear}-01-01`)
    .lt('date', `${currentYear + 1}-01-01`);

  // Despesas do mês atual
  const { data: currentMonthExpenses } = await supabase
    .from('financial_transactions')
    .select('amount')
    .eq('type', 'expense')
    .gte('transaction_date', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
    .lt('transaction_date', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

  // Despesas do mês anterior
  const { data: previousMonthExpenses } = await supabase
    .from('financial_transactions')
    .select('amount')
    .eq('type', 'expense')
    .gte('transaction_date', `${previousMonthYear}-${previousMonth.toString().padStart(2, '0')}-01`)
    .lt('transaction_date', `${previousMonthYear}-${currentMonth.toString().padStart(2, '0')}-01`);

  // Despesas do ano
  const { data: yearExpenses } = await supabase
    .from('financial_transactions')
    .select('amount')
    .eq('type', 'expense')
    .gte('transaction_date', `${currentYear}-01-01`)
    .lt('transaction_date', `${currentYear + 1}-01-01`);

  // Calcular totais
  const receitasMesAtual = (currentMonthPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  const receitasMesAnterior = (previousMonthPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  const totalReceitas = (yearPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);
  const despesasMesAtual = (currentMonthExpenses || []).reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);
  const despesasMesAnterior = (previousMonthExpenses || []).reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);
  const totalDespesas = (yearExpenses || []).reduce((sum: number, e: any) => sum + Math.abs(e.amount), 0);

  const saldoMesAtual = receitasMesAtual - despesasMesAtual;
  const crescimentoReceitas = receitasMesAnterior > 0 ? ((receitasMesAtual - receitasMesAnterior) / receitasMesAnterior) * 100 : 0;
  const crescimentoDespesas = despesasMesAnterior > 0 ? ((despesasMesAtual - despesasMesAnterior) / despesasMesAnterior) * 100 : 0;

  return {
    receitaMes: receitasMesAtual,
    despesasMes: despesasMesAtual,
    lucroLiquido: saldoMesAtual,
    receitaAnual: totalReceitas,
    margemLucro: receitasMesAtual > 0 ? (saldoMesAtual / receitasMesAtual) * 100 : 0,
    crescimentoReceita: crescimentoReceitas || 0,
    crescimentoDespesas: crescimentoDespesas || 0
  };
}


export async function addFinancialTransaction(formData: FormData) {
  const supabase = await createServerSupabaseClientForActions();
  
  const type = formData.get('type') as 'receita' | 'despesa';
  const description = formData.get('description') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const category = formData.get('category') as string;
  const date = formData.get('date') as string;
  const notes = formData.get('notes') as string;

  if (!description || !amount || !category || !date) {
    throw new Error('Todos os campos obrigatórios devem ser preenchidos');
  }

  // Converter tipos do frontend para o banco de dados
  const dbType = type === 'receita' ? 'income' : 'expense';

  const { error } = await supabase
    .from('financial_transactions')
    .insert({
      type: dbType,
      description,
      amount: type === 'despesa' ? -Math.abs(amount) : Math.abs(amount),
      category,
      transaction_date: date,
      notes: notes || null
    });

  if (error) {
    console.error('Erro ao adicionar transação:', error);
    throw new Error('Erro ao adicionar transação financeira');
  }

  revalidatePath('/financeiro');
}

export async function deleteFinancialTransaction(id: string) {
  const supabase = await createServerSupabaseClientForActions();
  
  const { error } = await supabase
    .from('financial_transactions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar transação:', error);
    throw new Error('Erro ao deletar transação financeira');
  }

  revalidatePath('/financeiro');
}

export async function getFinancialCategories(): Promise<string[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('category')
    .order('category');

  if (error) {
    console.error('Erro ao buscar categorias:', error);
    return ['Assinaturas IPTV', 'Vendas', 'Operacional', 'Marketing', 'Estornos', 'Outros'];
  }

  const categories = [...new Set((data || []).map((t: any) => t.category))].filter(Boolean) as string[];
  return categories.length > 0 ? categories : ['Assinaturas IPTV', 'Vendas', 'Operacional', 'Marketing', 'Estornos', 'Outros'];
}

// Função para buscar dados consolidados de pagamentos e transações
export async function getPaymentsFinancialData() {
  const supabase = await createServerSupabaseClient();
  
  // Buscar pagamentos recentes
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, amount, status, date, payment_method, transaction_id, client_id, clients(name)')
    .order('date', { ascending: false })
    .limit(50);

  if (paymentsError) {
    console.error('Erro ao buscar pagamentos:', paymentsError);
  }

  // Buscar transações financeiras recentes
  const { data: transactions, error: transactionsError } = await supabase
    .from('financial_transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(50);

  if (transactionsError) {
    console.error('Erro ao buscar transações:', transactionsError);
  }

  return {
    payments: payments || [],
    transactions: transactions || []
  };
}

// Função para buscar relatório mensal detalhado
export async function getMonthlyFinancialReport(year: number, month: number) {
  const supabase = await createServerSupabaseClient();
  
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  // Buscar transações do mês
  const { data: transactions, error: transactionsError } = await supabase
    .from('financial_transactions')
    .select('*')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: false });

  if (transactionsError) {
    console.error('Erro ao buscar transações do mês:', transactionsError);
    return { transactions: [], summary: null };
  }

  // Buscar pagamentos do mês
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, amount, status, date, payment_method, clients(name)')
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('status', 'Pago')
    .order('date', { ascending: false });

  if (paymentsError) {
    console.error('Erro ao buscar pagamentos do mês:', paymentsError);
  }

  // Calcular resumo do mês
  const receitas = (transactions || []).filter((t: any) => t.type === 'income');
  const despesas = (transactions || []).filter((t: any) => t.type === 'expense');
  
  const totalReceitas = receitas.reduce((sum: number, t: any) => sum + t.amount, 0);
  const totalDespesas = despesas.reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
  const saldoLiquido = totalReceitas - totalDespesas;
  
  // Agrupar por categoria
  const receitasPorCategoria = receitas.reduce((acc: Record<string, number>, t: any) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);
  
  const despesasPorCategoria = despesas.reduce((acc: Record<string, number>, t: any) => {
    acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
    return acc;
  }, {} as Record<string, number>);

  return {
    transactions: transactions || [],
    payments: payments || [],
    summary: {
      totalReceitas,
      totalDespesas,
      saldoLiquido,
      qtdReceitas: receitas.length,
      qtdDespesas: despesas.length,
      qtdPagamentos: (payments || []).length,
      receitasPorCategoria,
      despesasPorCategoria
    }
  };
}
