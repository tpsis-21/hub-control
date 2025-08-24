// Script simples para criar tabelas da integração The Best
// Usa comandos SQL diretos através do cliente Supabase

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
  console.error('Certifique-se de que NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão definidas no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTheBestTables() {
  console.log('🚀 Iniciando criação das tabelas da integração The Best...');
  
  try {
    // 1. Criar ENUM para status de pacotes
    console.log('📋 Criando ENUM thebest_package_status...');
    const { error: enumError } = await supabase.rpc('exec_sql', {
      query: `
        DO $$ BEGIN
          CREATE TYPE thebest_package_status AS ENUM ('active', 'suspended', 'cancelled', 'pending');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `
    });
    
    if (enumError) {
      console.log('⚠️ ENUM já existe ou erro:', enumError.message);
    } else {
      console.log('✅ ENUM thebest_package_status criado');
    }

    // 2. Criar tabela thebest_configs
    console.log('📋 Criando tabela thebest_configs...');
    const { error: configError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS thebest_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          api_key TEXT NOT NULL,
          api_url TEXT NOT NULL DEFAULT 'https://api.thebest.com.br',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `
    });
    
    if (configError) {
      console.log('❌ Erro ao criar thebest_configs:', configError.message);
    } else {
      console.log('✅ Tabela thebest_configs criada');
    }

    // 3. Criar tabela thebest_packages
    console.log('📋 Criando tabela thebest_packages...');
    const { error: packageError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS thebest_packages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          thebest_package_id TEXT NOT NULL,
          package_name TEXT NOT NULL,
          status thebest_package_status DEFAULT 'active',
          price DECIMAL(10,2),
          currency TEXT DEFAULT 'BRL',
          billing_cycle TEXT,
          next_due_date DATE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, thebest_package_id)
        );
      `
    });
    
    if (packageError) {
      console.log('❌ Erro ao criar thebest_packages:', packageError.message);
    } else {
      console.log('✅ Tabela thebest_packages criada');
    }

    // 4. Criar tabela thebest_renewals
    console.log('📋 Criando tabela thebest_renewals...');
    const { error: renewalError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS thebest_renewals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          package_id UUID NOT NULL REFERENCES thebest_packages(id) ON DELETE CASCADE,
          renewal_date DATE NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency TEXT DEFAULT 'BRL',
          status TEXT DEFAULT 'pending',
          payment_method TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (renewalError) {
      console.log('❌ Erro ao criar thebest_renewals:', renewalError.message);
    } else {
      console.log('✅ Tabela thebest_renewals criada');
    }

    // 5. Criar tabela thebest_api_logs
    console.log('📋 Criando tabela thebest_api_logs...');
    const { error: logError } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS thebest_api_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL,
          method TEXT NOT NULL,
          status_code INTEGER,
          request_data JSONB,
          response_data JSONB,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (logError) {
      console.log('❌ Erro ao criar thebest_api_logs:', logError.message);
    } else {
      console.log('✅ Tabela thebest_api_logs criada');
    }

    // 6. Criar políticas RLS
    console.log('🔐 Configurando políticas de segurança...');
    
    const policies = [
      {
        table: 'thebest_configs',
        policy: `
          ALTER TABLE thebest_configs ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Users can manage their own thebest configs" ON thebest_configs;
          CREATE POLICY "Users can manage their own thebest configs" ON thebest_configs
            FOR ALL USING (auth.uid() = user_id);
        `
      },
      {
        table: 'thebest_packages',
        policy: `
          ALTER TABLE thebest_packages ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Users can view their own thebest packages" ON thebest_packages;
          CREATE POLICY "Users can view their own thebest packages" ON thebest_packages
            FOR ALL USING (auth.uid() = user_id);
        `
      },
      {
        table: 'thebest_renewals',
        policy: `
          ALTER TABLE thebest_renewals ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Users can view renewals of their packages" ON thebest_renewals;
          CREATE POLICY "Users can view renewals of their packages" ON thebest_renewals
            FOR ALL USING (
              EXISTS (
                SELECT 1 FROM thebest_packages 
                WHERE thebest_packages.id = thebest_renewals.package_id 
                AND thebest_packages.user_id = auth.uid()
              )
            );
        `
      },
      {
        table: 'thebest_api_logs',
        policy: `
          ALTER TABLE thebest_api_logs ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Users can view their own api logs" ON thebest_api_logs;
          CREATE POLICY "Users can view their own api logs" ON thebest_api_logs
            FOR ALL USING (auth.uid() = user_id);
        `
      }
    ];

    for (const { table, policy } of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', {
        query: policy
      });
      
      if (policyError) {
        console.log(`⚠️ Erro ao configurar política para ${table}:`, policyError.message);
      } else {
        console.log(`✅ Política RLS configurada para ${table}`);
      }
    }

    // 7. Verificar se as tabelas foram criadas
    console.log('\n🔍 Verificando tabelas criadas...');
    const tables = ['thebest_configs', 'thebest_packages', 'thebest_renewals', 'thebest_api_logs'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Tabela ${table} não existe:`, error.message);
      } else {
        console.log(`✅ Tabela ${table} existe e está acessível`);
      }
    }

    console.log('\n🎉 Processo de criação das tabelas concluído!');
    console.log('\n📋 Resumo:');
    console.log('  - thebest_configs: Configurações da API por usuário');
    console.log('  - thebest_packages: Pacotes sincronizados da API');
    console.log('  - thebest_renewals: Renovações dos pacotes');
    console.log('  - thebest_api_logs: Logs das chamadas da API');
    console.log('\n🔐 Políticas RLS configuradas para todos os usuários');
    
  } catch (error) {
    console.error('❌ Erro durante a criação das tabelas:', error);
    console.log('\n💡 Dicas para resolver:');
    console.log('1. Verifique se as variáveis de ambiente estão corretas');
    console.log('2. Certifique-se de que a SUPABASE_SERVICE_ROLE_KEY tem permissões administrativas');
    console.log('3. Verifique se o projeto Supabase está ativo');
    console.log('4. Tente executar os comandos SQL manualmente no Dashboard do Supabase');
  } finally {
    process.exit(0);
  }
}

// Executar a criação das tabelas
createTheBestTables();