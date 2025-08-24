import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { securityAuditor, SecurityAuditResult } from '../../../lib/security-audit';
import { logger } from '../../../lib/logger';
import { supabase } from '../../../lib/supabase';

/**
 * API para gerenciar auditorias de segurança
 * 
 * GET /api/security/audit - Lista auditorias ou executa nova auditoria
 * POST /api/security/audit - Executa nova auditoria
 * PUT /api/security/audit - Resolve issues de segurança
 * DELETE /api/security/audit - Remove auditorias antigas
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Verificar se usuário tem permissão de admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('email', session.user.email)
      .single();

    if (userData?.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado - apenas administradores' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    logger.error('Erro na API de auditoria de segurança', { error, method: req.method });
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

/**
 * GET - Lista auditorias ou executa nova auditoria
 */
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { action, limit = '10', offset = '0', audit_id } = req.query;

  try {
    if (action === 'run') {
      // Executar nova auditoria
      logger.info('Iniciando auditoria de segurança via API');
      
      const result = await securityAuditor.runFullAudit();
      
      return res.status(200).json({
        message: 'Auditoria de segurança concluída',
        audit: result
      });
    }

    if (audit_id) {
      // Buscar auditoria específica
      const { data: audit, error } = await supabase
        .from('security_audits')
        .select(`
          *,
          security_issues(*)
        `)
        .eq('audit_id', audit_id)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Auditoria não encontrada' });
      }

      return res.status(200).json({ audit });
    }

    // Listar auditorias
    const { data: audits, error, count } = await supabase
      .from('security_audits')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      throw error;
    }

    return res.status(200).json({
      audits,
      pagination: {
        total: count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: count ? (parseInt(offset as string) + parseInt(limit as string)) < count : false
      }
    });
  } catch (error) {
    logger.error('Erro ao processar GET de auditoria', { error });
    return res.status(500).json({ error: 'Erro ao buscar auditorias' });
  }
}

/**
 * POST - Executa nova auditoria com configurações personalizadas
 */
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { config, async: runAsync = false } = req.body;

  try {
    if (runAsync) {
      // Executar auditoria em background
      setImmediate(async () => {
        try {
          await securityAuditor.runFullAudit();
          logger.info('Auditoria assíncrona concluída');
        } catch (error) {
          logger.error('Erro em auditoria assíncrona', { error });
        }
      });

      return res.status(202).json({
        message: 'Auditoria iniciada em background',
        status: 'running'
      });
    }

    // Executar auditoria síncrona
    const result = await securityAuditor.runFullAudit();
    
    return res.status(200).json({
      message: 'Auditoria concluída',
      audit: result
    });
  } catch (error) {
    logger.error('Erro ao executar auditoria', { error });
    return res.status(500).json({ error: 'Erro ao executar auditoria' });
  }
}

/**
 * PUT - Resolve issues de segurança
 */
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { issue_ids, action, resolution_notes } = req.body;

  if (!issue_ids || !Array.isArray(issue_ids)) {
    return res.status(400).json({ error: 'IDs dos issues são obrigatórios' });
  }

  if (!['resolve', 'acknowledge', 'false_positive'].includes(action)) {
    return res.status(400).json({ error: 'Ação inválida' });
  }

  try {
    const updateData: any = {
      resolved: action === 'resolve',
      acknowledged: action === 'acknowledge',
      false_positive: action === 'false_positive',
      resolved_at: new Date().toISOString(),
      resolution_notes
    };

    const { data, error } = await supabase
      .from('security_issues')
      .update(updateData)
      .in('id', issue_ids)
      .select();

    if (error) {
      throw error;
    }

    logger.info('Issues de segurança atualizados', {
      issue_ids,
      action,
      count: data?.length
    });

    return res.status(200).json({
      message: `${data?.length} issues atualizados`,
      updated_issues: data
    });
  } catch (error) {
    logger.error('Erro ao atualizar issues', { error });
    return res.status(500).json({ error: 'Erro ao atualizar issues' });
  }
}

/**
 * DELETE - Remove auditorias antigas
 */
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { older_than_days = 90, audit_ids } = req.body;

  try {
    if (audit_ids && Array.isArray(audit_ids)) {
      // Remover auditorias específicas
      const { error } = await supabase
        .from('security_audits')
        .delete()
        .in('audit_id', audit_ids);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        message: `${audit_ids.length} auditorias removidas`
      });
    }

    // Remover auditorias antigas
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - older_than_days);

    const { data, error } = await supabase
      .from('security_audits')
      .delete()
      .lt('started_at', cutoffDate.toISOString())
      .select('audit_id');

    if (error) {
      throw error;
    }

    logger.info('Auditorias antigas removidas', {
      older_than_days,
      removed_count: data?.length
    });

    return res.status(200).json({
      message: `${data?.length} auditorias antigas removidas`,
      removed_audits: data?.map(a => a.audit_id)
    });
  } catch (error) {
    logger.error('Erro ao remover auditorias', { error });
    return res.status(500).json({ error: 'Erro ao remover auditorias' });
  }
}

/**
 * Endpoint para obter estatísticas de segurança
 */
export async function getSecurityStats() {
  try {
    // Última auditoria
    const { data: lastAudit } = await supabase
      .from('security_audits')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    // Issues ativos por severidade
    const { data: activeIssues } = await supabase
      .from('security_issues')
      .select('severity')
      .eq('resolved', false);

    const issuesBySeverity = activeIssues?.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Tendência de score de segurança (últimas 10 auditorias)
    const { data: recentAudits } = await supabase
      .from('security_audits')
      .select('score, started_at')
      .order('started_at', { ascending: false })
      .limit(10);

    return {
      lastAudit,
      activeIssues: {
        total: activeIssues?.length || 0,
        bySeverity: issuesBySeverity
      },
      scoreHistory: recentAudits?.map(audit => ({
        score: audit.score,
        date: audit.started_at
      })) || []
    };
  } catch (error) {
    logger.error('Erro ao obter estatísticas de segurança', { error });
    throw error;
  }
}