// executar-limpeza-completa.js
// Script para executar limpeza completa do banco de dados
// Data: 2024-12-23
// ATENÇÃO: Este script remove TODOS os usuários e dados!

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas!')
  console.error('Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

// Cliente Supabase com Service Role (acesso total)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Executa SQL com tratamento de erro
 */
async function executarSQL(sql, descricao) {
  console.log(`\n🔄 ${descricao}...`)
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error(`❌ Erro em ${descricao}:`, error.message)
      return false
    }
    
    console.log(`✅ ${descricao} - Concluído`)
    return true
  } catch (err) {
    console.error(`❌ Erro em ${descricao}:`, err.message)
    return false
  }
}

/**
 * Carrega e executa script SQL
 */
async function executarScriptSQL(nomeArquivo, descricao) {
  const caminhoArquivo = path.join(__dirname, nomeArquivo)
  
  if (!fs.existsSync(caminhoArquivo)) {
    console.error(`❌ Arquivo não encontrado: ${nomeArquivo}`)
    return false
  }
  
  const sql = fs.readFileSync(caminhoArquivo, 'utf8')
  return await executarSQL(sql, descricao)
}

/**
 * Lista usuários atuais
 */
async function listarUsuarios() {
  console.log('\n📋 Listando usuários atuais...')
  
  try {
    // Listar usuários do auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Erro ao listar usuários auth:', authError.message)
      return
    }
    
    console.log(`\n👥 Usuários no auth.users: ${authUsers.users.length}`)
    authUsers.users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`)
    })
    
    // Listar perfis
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name')
    
    if (profilesError) {
      console.log('⚠️ Erro ao listar perfis (tabela pode não existir):', profilesError.message)
    } else {
      console.log(`\n👤 Perfis na tabela profiles: ${profiles.length}`)
      profiles.forEach((profile, index) => {
        console.log(`  ${index + 1}. ${profile.email} - ${profile.role} (${profile.full_name || 'Sem nome'})`)
      })
    }
    
  } catch (err) {
    console.error('❌ Erro ao listar usuários:', err.message)
  }
}

/**
 * Confirma ação com o usuário
 */
function confirmarAcao(mensagem) {
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  return new Promise((resolve) => {
    rl.question(`\n⚠️  ${mensagem} (digite 'CONFIRMO' para continuar): `, (resposta) => {
      rl.close()
      resolve(resposta.trim() === 'CONFIRMO')
    })
  })
}

// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================

async function executarLimpezaCompleta() {
  console.log('🧹 LIMPEZA COMPLETA DO SISTEMA DE AUTENTICAÇÃO')
  console.log('=' .repeat(60))
  console.log('⚠️  ATENÇÃO: Este script irá remover TODOS os usuários e dados!')
  console.log('⚠️  Esta ação é IRREVERSÍVEL!')
  
  // Listar usuários atuais
  await listarUsuarios()
  
  // Confirmar ação
  const confirmado = await confirmarAcao(
    'Tem certeza que deseja DELETAR TODOS os usuários e dados?'
  )
  
  if (!confirmado) {
    console.log('\n❌ Operação cancelada pelo usuário.')
    process.exit(0)
  }
  
  console.log('\n🚀 Iniciando limpeza completa...')
  
  // =====================================================
  // ETAPA 1: EXECUTAR SCRIPT DE LIMPEZA
  // =====================================================
  
  const sucesso1 = await executarScriptSQL(
    'limpar-todos-usuarios.sql',
    'Limpeza completa de usuários e dados'
  )
  
  if (!sucesso1) {
    console.error('\n❌ Falha na limpeza. Abortando...')
    process.exit(1)
  }
  
  // =====================================================
  // ETAPA 2: CRIAR ADMIN INICIAL
  // =====================================================
  
  const sucesso2 = await executarScriptSQL(
    'criar-admin-inicial.sql',
    'Criação do usuário administrador inicial'
  )
  
  if (!sucesso2) {
    console.error('\n❌ Falha na criação do admin. Continuando...')
  }
  
  // =====================================================
  // ETAPA 3: REORGANIZAR SISTEMA
  // =====================================================
  
  const sucesso3 = await executarScriptSQL(
    'reorganizar-sistema-auth.sql',
    'Reorganização do sistema de autenticação'
  )
  
  if (!sucesso3) {
    console.error('\n❌ Falha na reorganização. Continuando...')
  }
  
  // =====================================================
  // VERIFICAÇÃO FINAL
  // =====================================================
  
  console.log('\n🔍 Verificação final...')
  await listarUsuarios()
  
  console.log('\n' + '=' .repeat(60))
  console.log('✅ LIMPEZA COMPLETA FINALIZADA!')
  console.log('\n📋 PRÓXIMOS PASSOS:')
  console.log('1. Verificar se o admin foi criado: topplaytv7@gmail.com')
  console.log('2. Testar login com senha: Admin123!@#')
  console.log('3. Verificar se as APIs estão funcionando')
  console.log('4. Atualizar a senha do admin se necessário')
  console.log('\n⚠️  IMPORTANTE: Atualize a SUPABASE_SERVICE_ROLE_KEY no .env.local se necessário')
}

// =====================================================
// EXECUÇÃO
// =====================================================

if (require.main === module) {
  executarLimpezaCompleta().catch((error) => {
    console.error('\n❌ Erro fatal:', error.message)
    process.exit(1)
  })
}

module.exports = { executarLimpezaCompleta }

// =====================================================
// NOTAS DE USO:
// =====================================================
// 
// Para executar:
// node executar-limpeza-completa.js
// 
// Pré-requisitos:
// 1. .env.local configurado com SUPABASE_SERVICE_ROLE_KEY
// 2. Arquivos SQL na pasta raiz:
//    - limpar-todos-usuarios.sql
//    - criar-admin-inicial.sql
//    - reorganizar-sistema-auth.sql
// 
// ATENÇÃO:
// - Este script remove TODOS os dados de usuários
// - Ação irreversível
// - Use apenas em desenvolvimento
// =====================================================