const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente do Supabase não encontradas');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

// Função para importar pacotes
async function importPackages() {
  try {
    console.log('🔄 Iniciando importação dos pacotes The Best...');
    
    // Ler arquivo CSV
    const csvPath = path.join(__dirname, 'Pacotes Renovações TheBest 2025.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Arquivo CSV não encontrado:', csvPath);
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const packages = parseCSV(csvContent);
    
    console.log(`📦 ${packages.length} pacotes encontrados no CSV`);
    
    // Verificar se a tabela existe
    const { data: tableCheck, error: tableError } = await supabase
      .from('thebest_packages')
      .select('count')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Tabela thebest_packages não existe. Execute a migração primeiro.');
      console.error('Erro:', tableError.message);
      return;
    }
    
    // Limpar dados existentes (opcional)
    console.log('🧹 Limpando dados existentes...');
    const { error: deleteError } = await supabase
      .from('thebest_packages')
      .delete()
      .neq('id', 0); // Deleta todos os registros
    
    if (deleteError) {
      console.warn('⚠️ Aviso ao limpar dados:', deleteError.message);
    }
    
    // Inserir novos dados
    console.log('📥 Inserindo novos pacotes...');
    
    // Primeiro, precisamos de uma config_id válida
    // Vamos criar uma configuração padrão se não existir
    let configId;
    const { data: existingConfig } = await supabase
      .from('thebest_configs')
      .select('id')
      .limit(1)
      .single();
    
    if (existingConfig) {
      configId = existingConfig.id;
    } else {
      console.log('📝 Criando configuração padrão...');
      const { data: newConfig, error: configError } = await supabase
        .from('thebest_configs')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000', // UUID temporário
          api_url: 'https://api.thebest.com.br',
          api_key: 'temp_key',
          name: 'Configuração Padrão - Importação CSV'
        })
        .select('id')
        .single();
      
      if (configError) {
        console.error('❌ Erro ao criar configuração:', configError.message);
        return;
      }
      configId = newConfig.id;
    }

    const packagesToInsert = packages.map(pkg => ({
      config_id: configId,
      external_id: pkg.package_id.toString(),
      name: `${pkg.classificacao} - ${pkg.duracao} - ${pkg.telas} Tela${pkg.telas > 1 ? 's' : ''}`,
      classificacao: pkg.classificacao.replace(' ', '_').toUpperCase(),
      duracao: pkg.duracao.replace(' ', '_').toUpperCase(),
      telas: pkg.telas,
      creditos: pkg.creditos,
      description: `Pacote ${pkg.classificacao} com duração de ${pkg.duracao} para ${pkg.telas} tela${pkg.telas > 1 ? 's' : ''} (${pkg.creditos} créditos)`,
      is_active: true,
      is_available: true
    }));
    
    const { data: insertedData, error: insertError } = await supabase
      .from('thebest_packages')
      .insert(packagesToInsert)
      .select();
    
    if (insertError) {
      console.error('❌ Erro ao inserir pacotes:', insertError.message);
      return;
    }
    
    console.log(`✅ ${insertedData.length} pacotes importados com sucesso!`);
    
    // Mostrar resumo
    console.log('\n📊 Resumo da importação:');
    const summary = packages.reduce((acc, pkg) => {
      const key = pkg.classificacao;
      if (!acc[key]) acc[key] = 0;
      acc[key]++;
      return acc;
    }, {});
    
    Object.entries(summary).forEach(([classification, count]) => {
      console.log(`   ${classification}: ${count} pacotes`);
    });
    
    // Verificar dados importados
    console.log('\n🔍 Verificando dados importados...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('thebest_packages')
      .select('*')
      .order('package_id');
    
    if (verifyError) {
      console.error('❌ Erro ao verificar dados:', verifyError.message);
    } else {
      console.log(`✅ ${verifyData.length} pacotes encontrados no banco de dados`);
      
      // Mostrar alguns exemplos
      console.log('\n📋 Exemplos de pacotes importados:');
      verifyData.slice(0, 5).forEach(pkg => {
        console.log(`   ID ${pkg.package_id}: ${pkg.name} (${pkg.credits} créditos)`);
      });
      
      if (verifyData.length > 5) {
        console.log(`   ... e mais ${verifyData.length - 5} pacotes`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error.message);
  }
}

// Função auxiliar para converter duração em meses
function parseDuration(duration) {
  const durationLower = duration.toLowerCase();
  
  if (durationLower.includes('1 mês')) return 1;
  if (durationLower.includes('2 meses')) return 2;
  if (durationLower.includes('3 meses')) return 3;
  if (durationLower.includes('6 meses')) return 6;
  if (durationLower.includes('12 meses')) return 12;
  
  // Fallback: tentar extrair número
  const match = duration.match(/\d+/);
  return match ? parseInt(match[0]) : 1;
}

// Executar importação
if (require.main === module) {
  importPackages()
    .then(() => {
      console.log('\n🎉 Importação concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na importação:', error);
      process.exit(1);
    });
}

module.exports = { importPackages, parseCSV };