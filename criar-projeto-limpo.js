#!/usr/bin/env node

/**
 * 🆕 CRIADOR DE PROJETO SUPABASE LIMPO
 * 
 * Este script ajuda a criar um novo projeto Supabase
 * com apenas as tabelas essenciais e migrar dados importantes
 * do projeto atual.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do projeto atual
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Estrutura mínima essencial para o novo projeto
 */
const ESTRUTURA_ESSENCIAL = {
  tabelas: [
    {
      nome: 'profiles',
      sql: `
        CREATE TABLE profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
          avatar_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- RLS
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        
        -- Políticas
        CREATE POLICY "Users can view own profile" ON profiles
          FOR SELECT USING (auth.uid() = id);
          
        CREATE POLICY "Users can update own profile" ON profiles
          FOR UPDATE USING (auth.uid() = id);
          
        CREATE POLICY "Admins can view all profiles" ON profiles
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() AND role = 'admin'
            )
          );
      `
    },
    {
      nome: 'user_settings',
      sql: `
        CREATE TABLE user_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
          language TEXT DEFAULT 'pt-BR',
          notifications_enabled BOOLEAN DEFAULT true,
          email_notifications BOOLEAN DEFAULT true,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id)
        );
        
        -- RLS
        ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
        
        -- Políticas
        CREATE POLICY "Users can manage own settings" ON user_settings
          FOR ALL USING (auth.uid() = user_id);
      `
    },
    {
      nome: 'audit_logs',
      sql: `
        CREATE TABLE audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          action TEXT NOT NULL,
          table_name TEXT,
          record_id TEXT,
          old_values JSONB,
          new_values JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- RLS
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
        
        -- Políticas
        CREATE POLICY "Only admins can view audit logs" ON audit_logs
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM profiles 
              WHERE id = auth.uid() AND role = 'admin'
            )
          );
      `
    },
    {
      nome: 'notifications',
      sql: `
        CREATE TABLE notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
          read BOOLEAN DEFAULT false,
          data JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- RLS
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        
        -- Políticas
        CREATE POLICY "Users can view own notifications" ON notifications
          FOR SELECT USING (auth.uid() = user_id);
          
        CREATE POLICY "Users can update own notifications" ON notifications
          FOR UPDATE USING (auth.uid() = user_id);
      `
    }
  ],
  
  funcoes: [
    {
      nome: 'handle_new_user',
      sql: `
        CREATE OR REPLACE FUNCTION handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO profiles (id, email, name)
          VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
          );
          
          INSERT INTO user_settings (user_id)
          VALUES (NEW.id);
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Trigger
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION handle_new_user();
      `
    },
    {
      nome: 'update_updated_at',
      sql: `
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        -- Triggers para updated_at
        CREATE TRIGGER profiles_updated_at
          BEFORE UPDATE ON profiles
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
          
        CREATE TRIGGER user_settings_updated_at
          BEFORE UPDATE ON user_settings
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
      `
    }
  ]
};

/**
 * Exporta dados essenciais do projeto atual
 */
async function exportarDadosEssenciais() {
  console.log('📦 Exportando dados essenciais do projeto atual...');
  
  const dadosExportados = {
    usuarios: [],
    profiles: [],
    configuracoes: []
  };
  
  try {
    // Exportar usuários do auth.users
    console.log('   👥 Exportando usuários...');
    const { data: usuarios, error: errorUsuarios } = await supabase.auth.admin.listUsers();
    
    if (!errorUsuarios && usuarios?.users) {
      dadosExportados.usuarios = usuarios.users.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at,
        user_metadata: user.user_metadata
      }));
      console.log(`   ✅ ${dadosExportados.usuarios.length} usuários exportados`);
    }
    
    // Exportar profiles
    console.log('   👤 Exportando profiles...');
    const { data: profiles, error: errorProfiles } = await supabase
      .from('profiles')
      .select('*');
      
    if (!errorProfiles && profiles) {
      dadosExportados.profiles = profiles;
      console.log(`   ✅ ${profiles.length} profiles exportados`);
    }
    
    // Exportar configurações
    console.log('   ⚙️ Exportando configurações...');
    const { data: settings, error: errorSettings } = await supabase
      .from('user_settings')
      .select('*');
      
    if (!errorSettings && settings) {
      dadosExportados.configuracoes = settings;
      console.log(`   ✅ ${settings.length} configurações exportadas`);
    }
    
  } catch (error) {
    console.warn('⚠️ Erro ao exportar alguns dados:', error.message);
  }
  
  // Salvar dados em arquivo
  const nomeArquivo = `backup-dados-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(nomeArquivo, JSON.stringify(dadosExportados, null, 2));
  console.log(`💾 Dados salvos em: ${nomeArquivo}`);
  
  return dadosExportados;
}

/**
 * Gera SQL para criar estrutura essencial
 */
function gerarSQLEstrutura() {
  console.log('📝 Gerando SQL para estrutura essencial...');
  
  let sql = `-- ============================================\n`;
  sql += `-- 🆕 ESTRUTURA ESSENCIAL - PROJETO LIMPO\n`;
  sql += `-- Data: ${new Date().toISOString().split('T')[0]}\n`;
  sql += `-- ============================================\n\n`;
  
  // Extensões
  sql += `-- Extensões necessárias\n`;
  sql += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
  sql += `CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n`;
  
  // Tabelas
  sql += `-- ============================================\n`;
  sql += `-- TABELAS ESSENCIAIS\n`;
  sql += `-- ============================================\n\n`;
  
  ESTRUTURA_ESSENCIAL.tabelas.forEach(tabela => {
    sql += `-- Tabela: ${tabela.nome}\n`;
    sql += tabela.sql;
    sql += `\n\n`;
  });
  
  // Funções
  sql += `-- ============================================\n`;
  sql += `-- FUNÇÕES E TRIGGERS\n`;
  sql += `-- ============================================\n\n`;
  
  ESTRUTURA_ESSENCIAL.funcoes.forEach(funcao => {
    sql += `-- Função: ${funcao.nome}\n`;
    sql += funcao.sql;
    sql += `\n\n`;
  });
  
  // Salvar SQL
  const nomeArquivo = 'estrutura-essencial-novo-projeto.sql';
  fs.writeFileSync(nomeArquivo, sql);
  console.log(`✅ SQL gerado: ${nomeArquivo}`);
  
  return nomeArquivo;
}

/**
 * Gera instruções para o novo projeto
 */
function gerarInstrucoes(arquivoBackup, arquivoSQL) {
  const instrucoes = `
# 🆕 INSTRUÇÕES PARA CRIAR PROJETO LIMPO

## 📋 PASSOS PARA CRIAR NOVO PROJETO:

### 1. 🆕 Criar Novo Projeto Supabase
\`\`\`
1. Acesse: https://supabase.com/dashboard
2. Clique em "New Project"
3. Escolha organização e região
4. Nome: "hub-control-limpo" (ou similar)
5. Aguarde criação (2-3 minutos)
\`\`\`

### 2. 🔧 Configurar Estrutura
\`\`\`
1. Acesse SQL Editor do novo projeto
2. Cole o conteúdo de: ${arquivoSQL}
3. Execute o SQL
4. Verifique se todas as tabelas foram criadas
\`\`\`

### 3. 📊 Migrar Dados (Opcional)
\`\`\`
1. Dados exportados em: ${arquivoBackup}
2. Use Supabase Admin API para recriar usuários
3. Importe profiles e configurações via SQL
\`\`\`

### 4. ⚙️ Atualizar Aplicação
\`\`\`
1. Copie nova URL e chaves do projeto
2. Atualize .env.local:
   - NEXT_PUBLIC_SUPABASE_URL=nova_url
   - NEXT_PUBLIC_SUPABASE_ANON_KEY=nova_chave
   - SUPABASE_SERVICE_ROLE_KEY=nova_service_key
3. Teste a aplicação
\`\`\`

## 📊 DADOS EXPORTADOS:
- 👥 Usuários: Salvos para migração manual
- 👤 Profiles: Prontos para importar
- ⚙️ Configurações: Prontas para importar

## ✅ VANTAGENS DO PROJETO LIMPO:
- 🧼 Zero tabelas desnecessárias
- 🚀 Performance otimizada
- 🔒 Segurança desde o início
- 📚 Estrutura bem documentada
- 🎯 Foco apenas no essencial

## 💡 PRÓXIMOS PASSOS:
1. Criar novo projeto
2. Executar SQL de estrutura
3. Testar funcionamento básico
4. Migrar dados se necessário
5. Atualizar aplicação
6. Deletar projeto antigo (opcional)
`;
  
  fs.writeFileSync('INSTRUCOES_PROJETO_LIMPO.md', instrucoes);
  console.log('📋 Instruções salvas: INSTRUCOES_PROJETO_LIMPO.md');
}

/**
 * Função principal
 */
async function criarProjetoLimpo() {
  console.log('\n🆕 PREPARANDO CRIAÇÃO DE PROJETO SUPABASE LIMPO\n');
  console.log('=' .repeat(60));
  
  try {
    // 1. Exportar dados essenciais
    const dadosExportados = await exportarDadosEssenciais();
    
    console.log('\n' + '-'.repeat(60));
    
    // 2. Gerar SQL da estrutura
    const arquivoSQL = gerarSQLEstrutura();
    
    console.log('\n' + '-'.repeat(60));
    
    // 3. Gerar instruções
    const arquivoBackup = `backup-dados-${new Date().toISOString().split('T')[0]}.json`;
    gerarInstrucoes(arquivoBackup, arquivoSQL);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PREPARAÇÃO CONCLUÍDA!');
    console.log('='.repeat(60));
    
    console.log('\n📁 ARQUIVOS CRIADOS:');
    console.log(`   📊 ${arquivoBackup} - Backup dos dados`);
    console.log(`   📝 ${arquivoSQL} - SQL da estrutura`);
    console.log(`   📋 INSTRUCOES_PROJETO_LIMPO.md - Guia completo`);
    
    console.log('\n🎯 PRÓXIMO PASSO:');
    console.log('   Leia o arquivo INSTRUCOES_PROJETO_LIMPO.md');
    console.log('   e siga os passos para criar o novo projeto.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  criarProjetoLimpo()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Erro fatal:', error.message);
      process.exit(1);
    });
}

module.exports = { criarProjetoLimpo, exportarDadosEssenciais, gerarSQLEstrutura };