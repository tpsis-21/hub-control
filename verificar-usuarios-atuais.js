// verificar-usuarios-atuais.js
// Script para verificar usuários atuais no sistema
// Data: 2024-12-23

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas!')
  console.error('Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local')
  process.exit(1)
}

// Cliente Supabase com chave anônima
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// =====================================================
// FUNÇÕES
// =====================================================

/**
 * Verifica usuários e tabelas atuais
 */
async function verificarSistema() {
  console.log('🔍 VERIFICAÇÃO DO SISTEMA ATUAL')
  console.log('=' .repeat(50))
  
  try {
    // =====================================================
    // 1. VERIFICAR TABELA PROFILES
    // =====================================================
    
    console.log('\n📋 Verificando tabela profiles...')
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, role, full_name, created_at')
      .limit(10)
    
    if (profilesError) {
      console.log('❌ Erro ao acessar profiles:', profilesError.message)
      console.log('   Possível causa: Tabela não existe ou sem permissão')
    } else {
      console.log(`✅ Tabela profiles encontrada: ${profiles.length} registros`)
      
      if (profiles.length > 0) {
        console.log('\n👤 Usuários encontrados:')
        profiles.forEach((profile, index) => {
          console.log(`  ${index + 1}. ${profile.email || 'Sem email'} - ${profile.role || 'Sem role'}`)
          console.log(`     Nome: ${profile.full_name || 'Não informado'}`)
          console.log(`     Criado: ${profile.created_at || 'Data não disponível'}`)
          console.log()
        })
      } else {
        console.log('   📭 Nenhum usuário encontrado na tabela profiles')
      }
    }
    
    // =====================================================
    // 2. VERIFICAR OUTRAS TABELAS RELACIONADAS
    // =====================================================
    
    console.log('\n📋 Verificando outras tabelas...')
    
    // User Settings
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('user_id')
      .limit(5)
    
    if (settingsError) {
      console.log('❌ Tabela user_settings:', settingsError.message)
    } else {
      console.log(`✅ Tabela user_settings: ${userSettings.length} registros`)
    }
    
    // Audit Logs
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('id')
      .limit(5)
    
    if (auditError) {
      console.log('❌ Tabela audit_logs:', auditError.message)
    } else {
      console.log(`✅ Tabela audit_logs: ${auditLogs.length} registros`)
    }
    
    // =====================================================
    // 3. TESTAR AUTENTICAÇÃO
    // =====================================================
    
    console.log('\n🔐 Testando sistema de autenticação...')
    
    // Verificar se conseguimos acessar dados do usuário atual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.log('ℹ️  Nenhum usuário logado (esperado para este script)')
    } else {
      console.log('✅ Usuário logado:', user?.email)
    }
    
    // =====================================================
    // 4. VERIFICAR CONFIGURAÇÕES
    // =====================================================
    
    console.log('\n⚙️  Verificando configurações...')
    console.log(`📍 URL Supabase: ${SUPABASE_URL}`)
    console.log(`🔑 Chave Anônima: ${SUPABASE_ANON_KEY.substring(0, 20)}...`)
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey || serviceRoleKey === 'sua_service_role_key_aqui') {
      console.log('⚠️  Service Role Key: NÃO CONFIGURADA')
      console.log('   Para operações administrativas, configure a SUPABASE_SERVICE_ROLE_KEY')
    } else {
      console.log('✅ Service Role Key: CONFIGURADA')
    }
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error.message)
  }
  
  // =====================================================
  // 5. INSTRUÇÕES
  // =====================================================
  
  console.log('\n' + '=' .repeat(50))
  console.log('📋 PRÓXIMOS PASSOS:')
  console.log()
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'sua_service_role_key_aqui') {
    console.log('1. 🔑 CONFIGURAR SERVICE ROLE KEY:')
    console.log('   - Acesse: https://supabase.com/dashboard/project/htwiupmnqlmwvzqzroal/settings/api')
    console.log('   - Copie a "service_role" key')
    console.log('   - Atualize SUPABASE_SERVICE_ROLE_KEY no .env.local')
    console.log()
  }
  
  console.log('2. 🧹 PARA LIMPEZA COMPLETA:')
  console.log('   - Configure a Service Role Key primeiro')
  console.log('   - Execute: node executar-limpeza-completa.js')
  console.log()
  
  console.log('3. 🔐 PARA TESTAR LOGIN:')
  console.log('   - Acesse: http://localhost:3002/login')
  console.log('   - Tente fazer login com usuários existentes')
  console.log()
  
  console.log('4. 📊 PARA MONITORAR:')
  console.log('   - Execute este script novamente: node verificar-usuarios-atuais.js')
}

// =====================================================
// EXECUÇÃO
// =====================================================

if (require.main === module) {
  verificarSistema().catch((error) => {
    console.error('\n❌ Erro fatal:', error.message)
    process.exit(1)
  })
}

module.exports = { verificarSistema }

// =====================================================
// NOTAS:
// =====================================================
// 
// Este script usa apenas a chave anônima do Supabase
// para verificar o estado atual do sistema.
// 
// Para operações administrativas (como deletar usuários),
// é necessário configurar a SUPABASE_SERVICE_ROLE_KEY.
// =====================================================