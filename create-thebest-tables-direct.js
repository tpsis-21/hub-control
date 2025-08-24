// Script para criar tabelas The Best diretamente
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTables() {
  console.log('🚀 Criando tabelas The Best...');
  
  try {
    // 1. Criar tabela thebest_configs
    console.log('📝 Criando tabela thebest_configs...');
    const { error: configError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS thebest_configs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          api_url TEXT NOT NULL,
          api_key TEXT NOT NULL,
          username TEXT,
          password TEXT,
          config_data JSONB,
          is_active BOOLEAN DEFAULT true,
          last_used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE thebest_configs ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "thebest_configs_select" ON thebest_configs
          FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "thebest_configs_insert" ON thebest_configs
          FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "thebest_configs_update" ON thebest_configs
          FOR UPDATE USING (auth.uid() = user_id);
        
        CREATE POLICY IF NOT EXISTS "thebest_configs_delete" ON thebest_configs
          FOR DELETE USING (auth.uid() = user_id);
      `
    });
    
    if (configError) {
      console.error('❌ Erro ao criar thebest_configs:', configError);
    } else {
      console.log('✅ Tabela thebest_configs criada');
    }
    
    // 2. Criar tipos ENUM
    console.log('📝 Criando tipos ENUM...');
    const { error: enumError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ BEGIN
          CREATE TYPE thebest_package_classification AS ENUM ('COM_ADULTO', 'SEM_ADULTO');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        
        DO $$ BEGIN
          CREATE TYPE thebest_package_duration AS ENUM ('1_MES', '3_MESES', '6_MESES', '12_MESES');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        
        DO $$ BEGIN
          CREATE TYPE thebest_renewal_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        
        DO $$ BEGIN
          CREATE TYPE thebest_operation_type AS ENUM ('GET_PACKAGES', 'CREATE_RENEWAL', 'GET_RENEWAL', 'UPDATE_RENEWAL', 'CANCEL_RENEWAL', 'SYNC_PACKAGES', 'TEST_CONNECTION');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `
    });
    
    if (enumError) {
      console.error('❌ Erro ao criar tipos ENUM:', enumError);
    } else {
      console.log('✅ Tipos ENUM criados');
    }
    
    // 3. Criar tabela thebest_packages
    console.log('📝 Criando tabela thebest_packages...');
    const { error: packageError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS thebest_packages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          config_id UUID NOT NULL REFERENCES thebest_configs(id) ON DELETE CASCADE,
          external_id TEXT NOT NULL,
          classificacao thebest_package_classification NOT NULL,
          duracao thebest_package_duration NOT NULL,
          telas INTEGER NOT NULL,
          creditos INTEGER NOT NULL,
          name TEXT,
          description TEXT,
          price DECIMAL(10,2),
          currency TEXT DEFAULT 'BRL',
          is_active BOOLEAN DEFAULT true,
          is_available BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_sync_at TIMESTAMP WITH TIME ZONE,
          CONSTRAINT unique_config_external_id UNIQUE(config_id, external_id)
        );
        
        ALTER TABLE thebest_packages ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "thebest_packages_select" ON thebest_packages
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM thebest_configs 
              WHERE thebest_configs.id = thebest_packages.config_id 
              AND thebest_configs.user_id = auth.uid()
            )
          );
      `
    });
    
    if (packageError) {
      console.error('❌ Erro ao criar thebest_packages:', packageError);
    } else {
      console.log('✅ Tabela thebest_packages criada');
    }
    
    // 4. Criar tabela thebest_renewals
    console.log('📝 Criando tabela thebest_renewals...');
    const { error: renewalError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS thebest_renewals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          config_id UUID NOT NULL REFERENCES thebest_configs(id) ON DELETE CASCADE,
          package_id UUID NOT NULL REFERENCES thebest_packages(id) ON DELETE CASCADE,
          external_renewal_id TEXT,
          customer_id UUID REFERENCES profiles(id),
          customer_email TEXT,
          customer_name TEXT,
          package_external_id TEXT NOT NULL,
          package_name TEXT NOT NULL,
          package_classificacao thebest_package_classification NOT NULL,
          package_duracao thebest_package_duration NOT NULL,
          package_telas INTEGER NOT NULL,
          package_creditos INTEGER NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency TEXT DEFAULT 'BRL',
          status thebest_renewal_status DEFAULT 'PENDING',
          renewal_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expiry_date TIMESTAMP WITH TIME ZONE,
          processed_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB,
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        ALTER TABLE thebest_renewals ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "thebest_renewals_select" ON thebest_renewals
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM thebest_configs 
              WHERE thebest_configs.id = thebest_renewals.config_id 
              AND thebest_configs.user_id = auth.uid()
            )
          );
      `
    });
    
    if (renewalError) {
      console.error('❌ Erro ao criar thebest_renewals:', renewalError);
    } else {
      console.log('✅ Tabela thebest_renewals criada');
    }
    
    // 5. Criar tabela thebest_api_logs
    console.log('📝 Criando tabela thebest_api_logs...');
    const { error: logError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS thebest_api_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          config_id UUID NOT NULL REFERENCES thebest_configs(id) ON DELETE CASCADE,
          operation_type thebest_operation_type NOT NULL,
          endpoint TEXT NOT NULL,
          http_method TEXT NOT NULL,
          request_data JSONB,
          response_data JSONB,
          response_status INTEGER,
          duration_ms INTEGER,
          success BOOLEAN NOT NULL,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          user_id UUID REFERENCES auth.users(id)
        );
        
        ALTER TABLE thebest_api_logs ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY IF NOT EXISTS "thebest_api_logs_select" ON thebest_api_logs
          FOR SELECT USING (
            EXISTS (
              SELECT 1 FROM thebest_configs 
              WHERE thebest_configs.id = thebest_api_logs.config_id 
              AND thebest_configs.user_id = auth.uid()
            )
          );
      `
    });
    
    if (logError) {
      console.error('❌ Erro ao criar thebest_api_logs:', logError);
    } else {
      console.log('✅ Tabela thebest_api_logs criada');
    }
    
    console.log('\n🎉 Todas as tabelas foram criadas!');
    console.log('\n🔍 Verificando tabelas...');
    
    // Verificar se as tabelas foram criadas
    const tables = ['thebest_configs', 'thebest_packages', 'thebest_renewals', 'thebest_api_logs'];
    
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
          
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${table}: OK`);
        }
      } catch (err) {
        console.log(`❌ Tabela ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    process.exit(1);
  }
}

createTables().catch(console.error);