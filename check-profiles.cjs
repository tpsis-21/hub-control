require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkProfiles() {
  console.log('🔍 Verificando configuração da tabela profiles...');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variáveis de ambiente não configuradas:');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ Configurada' : '❌ Não configurada');
    return;
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Verificar se a tabela profiles existe
    console.log('\n📋 Verificando estrutura da tabela profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('❌ Erro ao acessar tabela profiles:', profilesError.message);
      
      // Verificar se a tabela existe consultando o schema
      console.log('\n🔍 Verificando se a tabela existe...');
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'profiles');
      
      if (tablesError) {
        console.error('❌ Erro ao verificar schema:', tablesError.message);
      } else if (tables && tables.length === 0) {
        console.log('❌ Tabela profiles não existe!');
        console.log('\n💡 Solução: Criar a tabela profiles com o seguinte SQL:');
        console.log(`
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Política para permitir que usuários atualizem seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política para permitir inserção de novos perfis
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`);
      } else {
        console.log('✅ Tabela profiles existe');
      }
    } else {
      console.log('✅ Tabela profiles acessível');
      console.log('📊 Dados encontrados:', profiles?.length || 0, 'registros');
      
      if (profiles && profiles.length > 0) {
        console.log('\n👥 Perfis existentes:');
        profiles.forEach(profile => {
          console.log(`  - ID: ${profile.id}`);
          console.log(`    Role: ${profile.role}`);
          console.log(`    Criado em: ${profile.created_at}`);
          console.log('');
        });
      }
    }
    
    // Verificar usuário atual
    console.log('\n🔍 Verificando usuário atual...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('❌ Não foi possível obter usuário atual:', userError.message);
      console.log('💡 Isso é normal para service role key');
    } else if (user) {
      console.log('✅ Usuário atual:', user.email);
    } else {
      console.log('ℹ️ Nenhum usuário autenticado (service role)');
    }
    
    // Verificar se o admin principal existe
    console.log('\n👑 Verificando admin principal...');
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', '2f67bed8-9448-446f-8f38-9306f773620d')
      .single();
    
    if (adminError) {
      console.log('❌ Admin principal não encontrado:', adminError.message);
      console.log('💡 Pode ser necessário criar o perfil do admin manualmente');
    } else {
      console.log('✅ Admin principal encontrado:');
      console.log(`  - ID: ${adminProfile.id}`);
      console.log(`  - Role: ${adminProfile.role}`);
    }
    
  } catch (error) {
    console.error('💥 Erro inesperado:', error);
  }
}

checkProfiles();