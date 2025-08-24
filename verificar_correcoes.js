// =====================================================
// VERIFICAR CORREÇÕES DE SEGURANÇA DO SUPABASE
// =====================================================
// Script para verificar se as correções de segurança
// foram aplicadas corretamente no banco de dados
//
// Data: 2024-12-25
// Autor: Sistema de Segurança Automatizado
// =====================================================

const { createClient } = require('@supabase/supabase-js');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas!');
  process.exit(1);
}

// Cliente Supabase com Service Role
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Função para executar consulta SQL
async function consultarSQL(sql, descricao) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });
    
    if (error) {
      console.error(`❌ Erro em ${descricao}:`, error.message);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error(`❌ Exceção em ${descricao}:`, err.message);
    return null;
  }
}

// Verificar views sem SECURITY DEFINER
async function verificarViews() {
  console.log('\n🔍 VERIFICANDO VIEWS SEM SECURITY DEFINER');
  console.log('-'.repeat(50));
  
  const views = [
    'thebest_dashboard',
    'analytics_device_metrics', 
    'user_activity_summary',
    'analytics_popular_pages',
    'analytics_daily_active_users'
  ];
  
  let todasCorretas = true;
  
  for (const viewName of views) {
    const sql = `
      SELECT 
        schemaname,
        viewname,
        definition
      FROM pg_views 
      WHERE viewname = '${viewName}'
        AND schemaname = 'public';
    `;
    
    const resultado = await consultarSQL(sql, `Verificar view ${viewName}`);
    
    if (resultado && resultado.length > 0) {
      const definition = resultado[0].definition;
      const temSecurityDefiner = definition.includes('SECURITY DEFINER');
      
      if (temSecurityDefiner) {
        console.log(`❌ ${viewName}: Ainda tem SECURITY DEFINER`);
        todasCorretas = false;
      } else {
        console.log(`✅ ${viewName}: SECURITY DEFINER removido`);
      }
    } else {
      console.log(`⚠️  ${viewName}: View não encontrada`);
      todasCorretas = false;
    }
  }
  
  return todasCorretas;
}

// Verificar RLS habilitado nas tabelas
async function verificarRLS() {
  console.log('\n🛡️  VERIFICANDO RLS NAS TABELAS');
  console.log('-'.repeat(50));
  
  const tabelas = ['empresas', 'in_app_notifications', 'users', 'expenses'];
  let todasCorretas = true;
  
  for (const tabela of tabelas) {
    const sql = `
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE tablename = '${tabela}'
        AND schemaname = 'public';
    `;
    
    const resultado = await consultarSQL(sql, `Verificar RLS ${tabela}`);
    
    if (resultado && resultado.length > 0) {
      const rlsHabilitado = resultado[0].rowsecurity;
      
      if (rlsHabilitado) {
        console.log(`✅ ${tabela}: RLS habilitado`);
      } else {
        console.log(`❌ ${tabela}: RLS não habilitado`);
        todasCorretas = false;
      }
    } else {
      console.log(`⚠️  ${tabela}: Tabela não encontrada`);
      todasCorretas = false;
    }
  }
  
  return todasCorretas;
}

// Verificar políticas RLS
async function verificarPoliticas() {
  console.log('\n📋 VERIFICANDO POLÍTICAS RLS');
  console.log('-'.repeat(50));
  
  const sql = `
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename IN ('empresas', 'in_app_notifications', 'users', 'expenses')
    ORDER BY tablename, policyname;
  `;
  
  const resultado = await consultarSQL(sql, 'Verificar políticas RLS');
  
  if (resultado && resultado.length > 0) {
    const politicasPorTabela = {};
    
    resultado.forEach(politica => {
      if (!politicasPorTabela[politica.tablename]) {
        politicasPorTabela[politica.tablename] = [];
      }
      politicasPorTabela[politica.tablename].push(politica);
    });
    
    Object.keys(politicasPorTabela).forEach(tabela => {
      console.log(`\n📊 ${tabela}:`);
      politicasPorTabela[tabela].forEach(politica => {
        console.log(`  - ${politica.policyname} (${politica.cmd})`);
      });
    });
    
    return true;
  } else {
    console.log('❌ Nenhuma política RLS encontrada');
    return false;
  }
}

// Verificar função auth.uid()
async function verificarAuthUid() {
  console.log('\n🔐 VERIFICANDO FUNÇÃO auth.uid()');
  console.log('-'.repeat(50));
  
  const sql = `
    SELECT 
      routine_name,
      routine_schema,
      routine_type
    FROM information_schema.routines 
    WHERE routine_schema = 'auth'
      AND routine_name = 'uid';
  `;
  
  const resultado = await consultarSQL(sql, 'Verificar função auth.uid()');
  
  if (resultado && resultado.length > 0) {
    console.log('✅ Função auth.uid() disponível');
    return true;
  } else {
    console.log('❌ Função auth.uid() não encontrada');
    return false;
  }
}

// Testar acesso às views
async function testarViews() {
  console.log('\n🧪 TESTANDO ACESSO ÀS VIEWS');
  console.log('-'.repeat(50));
  
  const views = [
    'thebest_dashboard',
    'analytics_device_metrics',
    'user_activity_summary', 
    'analytics_popular_pages',
    'analytics_daily_active_users'
  ];
  
  let todasFuncionando = true;
  
  for (const viewName of views) {
    const sql = `SELECT COUNT(*) as total FROM ${viewName} LIMIT 1;`;
    
    const resultado = await consultarSQL(sql, `Testar view ${viewName}`);
    
    if (resultado) {
      console.log(`✅ ${viewName}: Funcionando`);
    } else {
      console.log(`❌ ${viewName}: Erro no acesso`);
      todasFuncionando = false;
    }
  }
  
  return todasFuncionando;
}

// Função principal de verificação
async function verificarCorrecoes() {
  console.log('🔍 VERIFICAÇÃO DAS CORREÇÕES DE SEGURANÇA');
  console.log('='.repeat(60));
  
  const resultados = {
    views: await verificarViews(),
    rls: await verificarRLS(),
    politicas: await verificarPoliticas(),
    authUid: await verificarAuthUid(),
    testeViews: await testarViews()
  };
  
  // Relatório final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO FINAL DE VERIFICAÇÃO');
  console.log('='.repeat(60));
  
  console.log(`🔍 Views sem SECURITY DEFINER: ${resultados.views ? '✅' : '❌'}`);
  console.log(`🛡️  RLS habilitado nas tabelas: ${resultados.rls ? '✅' : '❌'}`);
  console.log(`📋 Políticas RLS criadas: ${resultados.politicas ? '✅' : '❌'}`);
  console.log(`🔐 Função auth.uid() disponível: ${resultados.authUid ? '✅' : '❌'}`);
  console.log(`🧪 Views funcionando: ${resultados.testeViews ? '✅' : '❌'}`);
  
  const todasCorretas = Object.values(resultados).every(r => r === true);
  
  if (todasCorretas) {
    console.log('\n🎉 TODAS AS CORREÇÕES FORAM APLICADAS COM SUCESSO!');
    console.log('\n📋 Próximos passos:');
    console.log('1. Acesse o Supabase Dashboard > Security Advisor');
    console.log('2. Confirme que não há mais alertas de segurança');
    console.log('3. Teste as funcionalidades da aplicação');
    console.log('4. Monitore os logs por possíveis problemas');
  } else {
    console.log('\n⚠️  ALGUMAS VERIFICAÇÕES FALHARAM');
    console.log('Revise os problemas acima e execute novamente as correções se necessário');
  }
  
  return todasCorretas;
}

// Executar o script
async function main() {
  try {
    await verificarCorrecoes();
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { verificarCorrecoes };