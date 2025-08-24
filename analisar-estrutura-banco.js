#!/usr/bin/env node

/**
 * 🔍 ANALISADOR DE ESTRUTURA DO BANCO SUPABASE
 * 
 * Este script analisa todas as tabelas existentes no banco
 * e categoriza por funcionalidade para ajudar na decisão
 * de limpeza ou recriação do projeto.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.log('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Categorias de tabelas por funcionalidade
 */
const CATEGORIAS = {
  ESSENCIAIS: {
    nome: '🔑 ESSENCIAIS (Sistema Core)',
    descricao: 'Tabelas fundamentais para funcionamento básico',
    tabelas: ['profiles', 'user_settings', 'system_config']
  },
  AUTENTICACAO: {
    nome: '🔐 AUTENTICAÇÃO & SEGURANÇA',
    descricao: 'Tabelas relacionadas a auth, MFA e segurança',
    tabelas: ['mfa_tokens', 'security_alerts', 'user_sessions']
  },
  AUDITORIA: {
    nome: '📋 AUDITORIA & COMPLIANCE',
    descricao: 'Logs, auditoria e compliance',
    tabelas: ['audit_logs', 'audit_events', 'compliance_reports', 'compliance_findings']
  },
  MARKETING: {
    nome: '📧 MARKETING & AUTOMAÇÃO',
    descricao: 'Campanhas, templates e automação de marketing',
    tabelas: ['marketing_campaigns', 'email_templates', 'automation_rules']
  },
  NOTIFICACOES: {
    nome: '🔔 NOTIFICAÇÕES',
    descricao: 'Sistema de notificações e alertas',
    tabelas: ['notifications', 'notification_templates', 'notification_recipients', 'notification_deliveries']
  },
  INTEGRACAO: {
    nome: '🔗 INTEGRAÇÕES',
    descricao: 'Configurações de integrações externas',
    tabelas: ['integration_configs', 'webhook_logs']
  },
  UPLOADS: {
    nome: '📁 UPLOADS & ARQUIVOS',
    descricao: 'Gerenciamento de arquivos e uploads',
    tabelas: ['file_uploads', 'file_uploads_audit']
  },
  CONHECIMENTO: {
    nome: '📚 BASE DE CONHECIMENTO',
    descricao: 'Sistema de conhecimento e documentação',
    tabelas: ['knowledge_base', 'knowledge_categories']
  },
  NEGOCIO: {
    nome: '💼 REGRAS DE NEGÓCIO',
    descricao: 'Tabelas específicas do negócio',
    tabelas: ['servers', 'clients', 'transactions', 'plans']
  }
};

/**
 * Lista todas as tabelas do banco
 */
async function listarTodasTabelas() {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      // Fallback: tentar query SQL direta
      const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', {
        sql_query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `
      });

      if (sqlError) {
        console.error('❌ Erro ao listar tabelas:', sqlError.message);
        return [];
      }
      
      return sqlData || [];
    }

    return data.map(row => row.table_name);
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return [];
  }
}

/**
 * Conta registros em uma tabela
 */
async function contarRegistros(tabela) {
  try {
    const { count, error } = await supabase
      .from(tabela)
      .select('*', { count: 'exact', head: true });

    if (error) {
      return 'N/A';
    }

    return count || 0;
  } catch (error) {
    return 'Erro';
  }
}

/**
 * Categoriza uma tabela
 */
function categorizarTabela(nomeTabela) {
  for (const [chave, categoria] of Object.entries(CATEGORIAS)) {
    if (categoria.tabelas.some(t => nomeTabela.includes(t) || t.includes(nomeTabela))) {
      return categoria.nome;
    }
  }
  return '❓ NÃO CATEGORIZADA';
}

/**
 * Análise principal
 */
async function analisarEstrutura() {
  console.log('\n🔍 ANALISANDO ESTRUTURA DO BANCO SUPABASE\n');
  console.log('=' .repeat(60));

  // Listar todas as tabelas
  const tabelas = await listarTodasTabelas();
  
  if (tabelas.length === 0) {
    console.log('❌ Nenhuma tabela encontrada ou erro na consulta');
    return;
  }

  console.log(`📊 Total de tabelas encontradas: ${tabelas.length}\n`);

  // Agrupar por categoria
  const tabelasPorCategoria = {};
  const tabelasNaoCategorizada = [];

  for (const tabela of tabelas) {
    const categoria = categorizarTabela(tabela);
    
    if (categoria === '❓ NÃO CATEGORIZADA') {
      tabelasNaoCategorizada.push(tabela);
    } else {
      if (!tabelasPorCategoria[categoria]) {
        tabelasPorCategoria[categoria] = [];
      }
      tabelasPorCategoria[categoria].push(tabela);
    }
  }

  // Exibir por categoria
  for (const [categoria, listaTabelas] of Object.entries(tabelasPorCategoria)) {
    console.log(`\n${categoria}`);
    console.log('-'.repeat(50));
    
    for (const tabela of listaTabelas) {
      const registros = await contarRegistros(tabela);
      console.log(`  📋 ${tabela.padEnd(30)} | ${registros.toString().padStart(8)} registros`);
    }
  }

  // Tabelas não categorizadas
  if (tabelasNaoCategorizada.length > 0) {
    console.log('\n❓ TABELAS NÃO CATEGORIZADAS');
    console.log('-'.repeat(50));
    
    for (const tabela of tabelasNaoCategorizada) {
      const registros = await contarRegistros(tabela);
      console.log(`  📋 ${tabela.padEnd(30)} | ${registros.toString().padStart(8)} registros`);
    }
  }

  // Recomendações
  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMENDAÇÕES');
  console.log('='.repeat(60));
  
  const totalTabelas = tabelas.length;
  const tabelasEssenciais = tabelasPorCategoria['🔑 ESSENCIAIS (Sistema Core)']?.length || 0;
  const tabelasMarketing = tabelasPorCategoria['📧 MARKETING & AUTOMAÇÃO']?.length || 0;
  const tabelasAuditoria = tabelasPorCategoria['📋 AUDITORIA & COMPLIANCE']?.length || 0;
  
  console.log(`\n📊 ESTATÍSTICAS:`);
  console.log(`   • Total de tabelas: ${totalTabelas}`);
  console.log(`   • Essenciais: ${tabelasEssenciais}`);
  console.log(`   • Marketing: ${tabelasMarketing}`);
  console.log(`   • Auditoria: ${tabelasAuditoria}`);
  console.log(`   • Não categorizadas: ${tabelasNaoCategorizada.length}`);

  console.log(`\n🎯 DECISÃO RECOMENDADA:`);
  
  if (totalTabelas > 20) {
    console.log('   ✅ CRIAR PROJETO NOVO');
    console.log('   📝 Motivos:');
    console.log('      • Muitas tabelas desnecessárias');
    console.log('      • Estrutura complexa demais');
    console.log('      • Melhor começar limpo');
  } else if (tabelasEssenciais >= 3 && totalTabelas <= 15) {
    console.log('   🧹 LIMPAR TABELAS DESNECESSÁRIAS');
    console.log('   📝 Motivos:');
    console.log('      • Estrutura essencial já existe');
    console.log('      • Poucas tabelas para limpar');
    console.log('      • Mais rápido que recriar');
  } else {
    console.log('   🤔 ANÁLISE MANUAL NECESSÁRIA');
    console.log('   📝 Considere:');
    console.log('      • Complexidade vs benefício');
    console.log('      • Tempo de desenvolvimento');
    console.log('      • Dados importantes existentes');
  }

  console.log('\n📋 PRÓXIMOS PASSOS:');
  console.log('   1. Revisar tabelas não categorizadas');
  console.log('   2. Identificar dados importantes');
  console.log('   3. Decidir: limpar ou recriar');
  console.log('   4. Executar ação escolhida');
  
  console.log('\n' + '='.repeat(60));
}

// Executar análise
if (require.main === module) {
  analisarEstrutura()
    .then(() => {
      console.log('\n✅ Análise concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na análise:', error.message);
      process.exit(1);
    });
}

module.exports = { analisarEstrutura, listarTodasTabelas, contarRegistros };