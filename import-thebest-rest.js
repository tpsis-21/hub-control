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

async function importPackagesRest() {
  try {
    console.log('🔄 Iniciando importação REST dos pacotes The Best...');
    
    // Ler arquivo CSV
    const csvPath = path.join(__dirname, 'Pacotes Renovações TheBest 2025.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Arquivo CSV não encontrado:', csvPath);
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const packages = parseCSV(csvContent);
    
    console.log(`📦 ${packages.length} pacotes encontrados no CSV`);
    
    // Primeiro, verificar se existe uma configuração
    console.log('🔍 Verificando configuração existente...');
    
    let configId;
    const { data: existingConfigs, error: configError } = await supabase
      .from('thebest_configs')
      .select('id')
      .limit(1);
    
    if (configError) {
      console.error('❌ Erro ao verificar configurações:', configError.message);
      return;
    }
    
    if (existingConfigs && existingConfigs.length > 0) {
      configId = existingConfigs[0].id;
      console.log('✅ Configuração existente encontrada:', configId);
    } else {
      // Criar nova configuração usando REST API
      console.log('📝 Criando nova configuração...');
      
      const { data: newConfig, error: createError } = await supabase
        .from('thebest_configs')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          api_url: 'https://api.thebest.com.br',
          api_key: 'temp_key_for_import'
        })
        .select('id')
        .single();
      
      if (createError) {
        console.error('❌ Erro ao criar configuração:', createError.message);
        return;
      }
      
      configId = newConfig.id;
      console.log('✅ Nova configuração criada:', configId);
    }
    
    // Limpar pacotes existentes
    console.log('🧹 Limpando pacotes existentes...');
    
    const { error: deleteError } = await supabase
      .from('thebest_packages')
      .delete()
      .not('thebest_package_id', 'is', null);
    
    if (deleteError) {
      console.warn('⚠️ Aviso ao limpar dados:', deleteError.message);
    }
    
    // Preparar dados para inserção
    console.log('📥 Preparando dados para inserção...');
    
    const packagesToInsert = packages.map(pkg => {
      return {
        user_id: '00000000-0000-0000-0000-000000000000',
        thebest_package_id: pkg.package_id.toString(),
        package_name: `${pkg.classificacao} - ${pkg.duracao} - ${pkg.telas} Tela${pkg.telas > 1 ? 's' : ''} (${pkg.creditos} créditos)`,
        status: 'active',
        billing_cycle: pkg.duracao,
        currency: 'BRL'
      };
    });
    
    // Inserir pacotes em lotes
    console.log('📥 Inserindo pacotes...');
    
    const batchSize = 10;
    let insertedCount = 0;
    
    for (let i = 0; i < packagesToInsert.length; i += batchSize) {
      const batch = packagesToInsert.slice(i, i + batchSize);
      
      const { data: insertedData, error: insertError } = await supabase
        .from('thebest_packages')
        .insert(batch)
        .select('id');
      
      if (insertError) {
        console.warn(`⚠️ Erro no lote ${Math.floor(i/batchSize) + 1}:`, insertError.message);
      } else {
        insertedCount += insertedData.length;
        console.log(`✅ Lote ${Math.floor(i/batchSize) + 1}: ${insertedData.length} pacotes inseridos`);
      }
    }
    
    console.log(`\n🎉 Importação concluída! ${insertedCount} pacotes inseridos.`);
    
    // Verificar total no banco
    const { data: countData, error: countError } = await supabase
      .from('thebest_packages')
      .select('id', { count: 'exact' });
    
    if (!countError) {
      console.log(`📊 Total de pacotes no banco: ${countData.length}`);
    }
    
    // Mostrar resumo por classificação
    console.log('\n📊 Resumo por classificação:');
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
importPackagesRest();