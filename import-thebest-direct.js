const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://htwiupmnqlmwvzqzroal.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0d2l1cG1ucWxtd3Z6cXpyb2FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzI4NjIzMSwiZXhwIjoyMDY4ODYyMjMxfQ.R5aVBW9w_ushxXtW8WNLcMSWpeMdTuwssJ64BluXQN0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para processar CSV
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  const packages = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length === headers.length) {
      const packageData = {
        classificacao: values[0].trim(),
        duracao: values[1].trim(),
        telas: parseInt(values[2].replace(/\D/g, '')), // Extrai apenas números
        package_id: parseInt(values[3].trim()),
        creditos: parseInt(values[4].trim())
      };
      packages.push(packageData);
    }
  }
  
  return packages;
}

async function importPackagesDirect() {
  try {
    console.log('🔄 Iniciando importação direta dos pacotes The Best...');
    
    // Ler arquivo CSV
    const csvPath = path.join(__dirname, 'Pacotes Renovações TheBest 2025.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Arquivo CSV não encontrado:', csvPath);
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const packages = parseCSV(csvContent);
    
    console.log(`📦 ${packages.length} pacotes encontrados no CSV`);
    
    // Primeiro, criar uma configuração padrão usando SQL direto
    console.log('📝 Criando configuração padrão...');
    
    const configSql = `
      INSERT INTO thebest_configs (user_id, api_url, api_key, name, description)
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        'https://api.thebest.com.br',
        'temp_key_for_import',
        'Configuração Padrão - Importação CSV',
        'Configuração criada automaticamente durante a importação dos pacotes do CSV'
      )
      ON CONFLICT (user_id) DO UPDATE SET
        updated_at = NOW()
      RETURNING id;
    `;
    
    const { data: configResult, error: configError } = await supabase.rpc('exec_sql', {
      sql_query: configSql
    });
    
    if (configError) {
      console.error('❌ Erro ao criar configuração:', configError.message);
      return;
    }
    
    console.log('✅ Configuração criada com sucesso!');
    
    // Limpar dados existentes
    console.log('🧹 Limpando pacotes existentes...');
    
    const deleteSql = `DELETE FROM thebest_packages WHERE external_id IS NOT NULL;`;
    
    const { error: deleteError } = await supabase.rpc('exec_sql', {
      sql_query: deleteSql
    });
    
    if (deleteError) {
      console.warn('⚠️ Aviso ao limpar dados:', deleteError.message);
    }
    
    // Inserir novos pacotes usando SQL direto
    console.log('📥 Inserindo novos pacotes...');
    
    for (const pkg of packages) {
      const classificacao = pkg.classificacao.replace(' ', '_').toUpperCase();
      const duracao = pkg.duracao.replace(' ', '_').toUpperCase();
      
      const insertSql = `
        INSERT INTO thebest_packages (
          config_id,
          external_id,
          classificacao,
          duracao,
          telas,
          creditos,
          name,
          description,
          is_active,
          is_available
        )
        SELECT 
          c.id,
          '${pkg.package_id}',
          '${classificacao}',
          '${duracao}',
          ${pkg.telas},
          ${pkg.creditos},
          '${pkg.classificacao} - ${pkg.duracao} - ${pkg.telas} Tela${pkg.telas > 1 ? 's' : ''}',
          'Pacote ${pkg.classificacao} com duração de ${pkg.duracao} para ${pkg.telas} tela${pkg.telas > 1 ? 's' : ''} (${pkg.creditos} créditos)',
          true,
          true
        FROM thebest_configs c
        WHERE c.user_id = '00000000-0000-0000-0000-000000000000'
        LIMIT 1;
      `;
      
      const { error: insertError } = await supabase.rpc('exec_sql', {
        sql_query: insertSql
      });
      
      if (insertError) {
        console.warn(`⚠️ Erro ao inserir pacote ${pkg.package_id}:`, insertError.message);
      }
    }
    
    console.log('✅ Importação concluída!');
    
    // Verificar quantos pacotes foram inseridos
    const { data: countResult, error: countError } = await supabase.rpc('exec_sql', {
      sql_query: 'SELECT COUNT(*) as total FROM thebest_packages;'
    });
    
    if (!countError && countResult) {
      console.log(`📊 Total de pacotes no banco: ${countResult[0]?.total || 'N/A'}`);
    }
    
    // Mostrar resumo
    console.log('\n📊 Resumo da importação:');
    const summary = packages.reduce((acc, pkg) => {
      const key = pkg.classificacao;
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    }, {});
    
    Object.entries(summary).forEach(([classificacao, count]) => {
      console.log(`  ${classificacao}: ${count} pacotes`);
    });
    
  } catch (error) {
    console.error('❌ Erro na importação:', error.message);
  }
}

// Executar importação
importPackagesDirect();