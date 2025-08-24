import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/clients/server";
import { createStandardErrorResponse, attachSecurityHeaders } from '@/middleware/shared/helpers'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';
    const period = searchParams.get('period') || '30d';

    const supabase = await createServerSupabaseClient();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return attachSecurityHeaders(
        createStandardErrorResponse('UNAUTHORIZED', 'Não autorizado', 401)
      );
    }

    // Verificar permissões de admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return attachSecurityHeaders(
        createStandardErrorResponse('FORBIDDEN', 'Acesso negado', 403)
      );
    }

    // Buscar dados do relatório
    const reportResponse = await fetch(`${request.nextUrl.origin}/api/reports?period=${period}`, {
      headers: {
        'Cookie': request.headers.get('cookie') || ''
      }
    });

    if (!reportResponse.ok) {
      return attachSecurityHeaders(
        createStandardErrorResponse('INTERNAL_ERROR', 'Erro ao buscar dados do relatório', 500)
      );
    }

    const reportData = await reportResponse.json();

    if (format === 'pdf') {
      // Gerar PDF (implementação simplificada)
      const pdfContent = generatePDFContent(reportData, period);
      const res = new NextResponse(pdfContent, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="relatorio_${period}.pdf"`
        }
      });
      return attachSecurityHeaders(res);
    } else if (format === 'excel') {
      // Gerar Excel (implementação simplificada)
      const excelContent = generateExcelContent(reportData, period);
      const res = new NextResponse(excelContent, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="relatorio_${period}.xlsx"`
        }
      });
      return attachSecurityHeaders(res);
    }

    return attachSecurityHeaders(
      createStandardErrorResponse('VALIDATION_ERROR', 'Formato não suportado', 400)
    );

  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500)
    );
  }
}

function generatePDFContent(data: any, period: string): Buffer {
  // Implementação simplificada - em produção, use uma biblioteca como puppeteer ou jsPDF
  const content = `
    RELATÓRIO DE ANÁLISE - ${period.toUpperCase()}
    =====================================
    
    CLIENTES:
    - Total: ${data.customers.total}
    - Ativos: ${data.customers.active}
    - Taxa de Churn: ${data.customers.churnRate}%
    
    TESTES:
    - Total: ${data.tests.total}
    - Aprovados: ${data.tests.passed}
    - Falhados: ${data.tests.failed}
    
    SERVIDORES:
    - Total: ${data.servers.total}
    - Online: ${data.servers.online}
    - Offline: ${data.servers.offline}
    
    FINANCEIRO:
    - Receita: R$ ${(data.financial.revenue / 1000).toFixed(0)}k
    - Despesas: R$ ${(data.financial.expenses / 1000).toFixed(0)}k
    - Lucro: R$ ${(data.financial.profit / 1000).toFixed(0)}k
  `;
  
  return Buffer.from(content, 'utf-8');
}

function generateExcelContent(data: any, period: string): Buffer {
  // Implementação simplificada - em produção, use uma biblioteca como exceljs
  const csvContent = [
    'Categoria,Métrica,Valor',
    `Clientes,Total,${data.customers.total}`,
    `Clientes,Ativos,${data.customers.active}`,
    `Clientes,Taxa de Churn,${data.customers.churnRate}%`,
    `Testes,Total,${data.tests.total}`,
    `Testes,Aprovados,${data.tests.passed}`,
    `Testes,Falhados,${data.tests.failed}`,
    `Servidores,Total,${data.servers.total}`,
    `Servidores,Online,${data.servers.online}`,
    `Servidores,Offline,${data.servers.offline}`,
    `Financeiro,Receita,${data.financial.revenue}`,
    `Financeiro,Despesas,${data.financial.expenses}`,
    `Financeiro,Lucro,${data.financial.profit}`
  ].join('\n');
  
  return Buffer.from(csvContent, 'utf-8');
}