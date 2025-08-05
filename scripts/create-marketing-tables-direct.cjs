// scripts/create-marketing-tables-direct.cjs
require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas.');
  process.exit(1);
}

async function createMarketingTables() {
  try {
    console.log('🚀 Criando tabelas de marketing via SQL direto...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID,
        name VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        template_id UUID,
        status VARCHAR(50) DEFAULT 'draft',
        scheduled_at TIMESTAMP WITH TIME ZONE,
        sent_at TIMESTAMP WITH TIME ZONE,
        total_recipients INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        delivered_count INTEGER DEFAULT 0,
        opened_count INTEGER DEFAULT 0,
        clicked_count INTEGER DEFAULT 0,
        bounced_count INTEGER DEFAULT 0,
        unsubscribed_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Criar RLS policy
      ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY IF NOT EXISTS "Users can view their own campaigns" ON public.marketing_campaigns
        FOR SELECT USING (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can insert their own campaigns" ON public.marketing_campaigns
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can update their own campaigns" ON public.marketing_campaigns
        FOR UPDATE USING (auth.uid() = user_id);
      
      CREATE POLICY IF NOT EXISTS "Users can delete their own campaigns" ON public.marketing_campaigns
        FOR DELETE USING (auth.uid() = user_id);
    `;
    
    console.log('📋 Executando SQL via REST API...');
    
    // Usar a API REST do Supabase para executar SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: createTableSQL
      })
    });
    
    if (response.ok) {
      console.log('✅ Tabela marketing_campaigns criada com sucesso!');
    } else {
      const errorText = await response.text();
      console.log('⚠️ Resposta da API:', response.status, errorText);
      
      // Tentar uma abordagem alternativa usando o endpoint de query
      console.log('💡 Tentando abordagem alternativa...');
      
      const altResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sql',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: createTableSQL
      });
      
      if (altResponse.ok) {
        console.log('✅ Tabela criada via abordagem alternativa!');
      } else {
        console.log('❌ Falha na abordagem alternativa:', await altResponse.text());
      }
    }
    
    // Verificar se a tabela foi criada
    console.log('🔍 Verificando se a tabela foi criada...');
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1/marketing_campaigns?select=count&limit=0`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Prefer': 'count=exact'
      }
    });
    
    if (checkResponse.ok) {
      console.log('✅ Tabela marketing_campaigns verificada com sucesso!');
      console.log('🎉 Processo concluído!');
    } else {
      console.log('❌ Tabela ainda não existe:', await checkResponse.text());
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

createMarketingTables();