// Script para testar autenticação no lado do cliente
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não configuradas');
  console.log('SUPABASE_URL:', !!supabaseUrl);
  console.log('ANON_KEY:', !!supabaseAnonKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('🔍 Testando autenticação...');
  
  try {
    // Verificar sessão atual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Erro ao obter sessão:', sessionError);
      return;
    }
    
    if (session) {
      console.log('✅ Sessão ativa encontrada:');
      console.log('- Email:', session.user.email);
      console.log('- ID:', session.user.id);
      console.log('- Criado em:', session.user.created_at);
    } else {
      console.log('❌ Nenhuma sessão ativa');
      
      // Tentar fazer login
      console.log('🔑 Tentando fazer login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'topplaytv7@gmail.com',
        password: 'sua_senha_aqui' // Substitua pela senha correta
      });
      
      if (error) {
        console.error('❌ Erro no login:', error.message);
      } else {
        console.log('✅ Login realizado com sucesso!');
        console.log('- Email:', data.user.email);
        console.log('- ID:', data.user.id);
      }
    }
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

testAuth();