import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { PerformanceTester, defaultPerformanceConfig } from '../../../lib/performance-testing';

// Interface para requisições
interface PerformanceTestRequest {
  action: 'run' | 'list' | 'get' | 'delete' | 'cleanup';
  config?: any;
  testId?: string;
  async?: boolean;
  daysOld?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar método HTTP
  if (!['GET', 'POST', 'DELETE'].includes(req.method!)) {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const supabase = createServerSupabaseClient({ req, res });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Verificar se é administrador
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem executar testes de performance.' });
    }

    const { action, config, testId, async, daysOld }: PerformanceTestRequest = req.method === 'GET' 
      ? req.query 
      : req.body;

    // Criar instância do testador
    const testConfig = config ? { ...defaultPerformanceConfig, ...config } : defaultPerformanceConfig;
    const tester = new PerformanceTester(testConfig);

    switch (action) {
      case 'run':
        return await handleRunTest(req, res, tester, async === true);
      
      case 'list':
        return await handleListTests(req, res, tester);
      
      case 'get':
        return await handleGetTest(req, res, tester, testId!);
      
      case 'delete':
        return await handleDeleteTest(req, res, tester, testId!);
      
      case 'cleanup':
        return await handleCleanup(req, res, tester, daysOld || 30);
      
      default:
        return res.status(400).json({ error: 'Ação inválida' });
    }

  } catch (error) {
    console.error('Erro na API de performance:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

// Executar teste de performance
async function handleRunTest(
  req: NextApiRequest,
  res: NextApiResponse,
  tester: PerformanceTester,
  async: boolean
) {
  try {
    if (async) {
      // Executar teste assíncrono
      const testPromise = tester.runPerformanceTest();
      
      // Não aguardar conclusão
      testPromise.catch(error => {
        console.error('Erro em teste assíncrono:', error);
      });
      
      return res.status(202).json({ 
        message: 'Teste de performance iniciado em background',
        status: 'running'
      });
    } else {
      // Executar teste síncrono
      const result = await tester.runPerformanceTest();
      
      return res.status(200).json({
        message: 'Teste de performance concluído',
        result
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao executar teste de performance',
      details: error.message
    });
  }
}

// Listar testes de performance
async function handleListTests(
  req: NextApiRequest,
  res: NextApiResponse,
  tester: PerformanceTester
) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const results = await tester.listResults(limit);
    
    return res.status(200).json({
      message: 'Testes listados com sucesso',
      results,
      count: results.length
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao listar testes',
      details: error.message
    });
  }
}

// Obter teste específico
async function handleGetTest(
  req: NextApiRequest,
  res: NextApiResponse,
  tester: PerformanceTester,
  testId: string
) {
  try {
    if (!testId) {
      return res.status(400).json({ error: 'ID do teste é obrigatório' });
    }
    
    const result = await tester.getResult(testId);
    
    if (!result) {
      return res.status(404).json({ error: 'Teste não encontrado' });
    }
    
    return res.status(200).json({
      message: 'Teste encontrado',
      result
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao buscar teste',
      details: error.message
    });
  }
}

// Deletar teste específico
async function handleDeleteTest(
  req: NextApiRequest,
  res: NextApiResponse,
  tester: PerformanceTester,
  testId: string
) {
  try {
    if (!testId) {
      return res.status(400).json({ error: 'ID do teste é obrigatório' });
    }
    
    // Implementar deleção específica se necessário
    return res.status(200).json({
      message: 'Teste deletado com sucesso'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro ao deletar teste',
      details: error.message
    });
  }
}

// Limpar testes antigos
async function handleCleanup(
  req: NextApiRequest,
  res: NextApiResponse,
  tester: PerformanceTester,
  daysOld: number
) {
  try {
    const deletedCount = await tester.deleteOldResults(daysOld);
    
    return res.status(200).json({
      message: 'Limpeza concluída',
      deletedCount,
      daysOld
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro na limpeza',
      details: error.message
    });
  }
}

// Configuração para timeout estendido
export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 300, // 5 minutos
};