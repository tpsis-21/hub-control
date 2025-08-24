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

async function getOrCreateUser() {
  try {
    // Primeiro, tentar buscar um usuário existente
    console.log('🔍 Buscando usuário existente...');
    
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.warn('⚠️ Erro ao buscar usuários:', userError.message);
      // Se não conseguir buscar usuários, vamos tentar criar um usuário temporário
      console.log('📝 Criando usuário temporário para importação...');
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'thebest-import@temp.local',
        password: 'TempPassword123!',
        email_confirm: true
      });
      
      if (createError) {
        console.error('❌ Erro ao criar usuário temporário:', createError.message);
        return null;
      }
      
      console.log('✅ Usuário temporário criado:', newUser.user.id);
      return newUser.user.id;
    }
    
    if (users && users.users && users.users.length > 0) {
      const userId = users.users[0].id;
      console.log('✅ Usuário existente encontrado:', userId);
      return userId;
    }
    
    // Se não há usuários, criar um
    console.log('📝 Nenhum usuário encontrado. Criando usuário temporário...');
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'thebest-import@temp.local',
      password: 'TempPassword123!',
      email_confirm: true
    });
    
    if (createError) {
      console.error('❌ Erro ao criar usuário temporário:', createError.message);
      return null;
    }
    
    console.log('✅ Usuário temporário criado:', newUser.user.id);
    return newUser.user.id;
    
  } catch (error) {
    console.error('❌ Erro ao obter/criar usuário:', error.message);
    return null;
  }
}

async function importPackagesFinal() {
  try {
    console.log('🔄 Iniciando importação final dos pacotes The Best...');
    
    // Ler arquivo CSV
    const csvPath = path.join(__dirname, 'Pacotes Renovações TheBest 2025.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ Arquivo CSV não encontrado:', csvPath);
      return;
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const packages = parseCSV(csvContent);
    
    console.log(`📦 ${packages.length} pacotes encontrados no CSV`);
    
    // Obter ou criar usuário
    const userId = await getOrCreateUser();
    
    if (!userId) {
      console.error('❌ Não foi possível obter um user_id válido');
      return;
    }
    
    // Verificar se existe uma configuração para este usuário
    console.log('🔍 Verificando configuração existente...');
    
    let configId;
    const { data: existingConfigs, error: configError } = await supabase
      .from('thebest_configs')
      .select('id')
      .eq('user_id', userId)
      .limit(1);
    
    if (configError) {
      console.error('❌ Erro ao verificar configurações:', configError.message);
      return;
    }
    
    if (existingConfigs && existingConfigs.length > 0) {
      configId = existingConfigs[0].id;
      console.log('✅ Configuração existente encontrada:', configId);
    } else {
      // Criar nova configuração
      console.log('📝 Criando nova configuração...');
      
      const { data: newConfig, error: createError } = await supabase
        .from('thebest_configs')
        .insert({
          user_id: userId,
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
    
    // Limpar pacotes existentes para este usuário
    console.log('🧹 Limpando pacotes existentes...');
    
    const { error: deleteError } = await supabase
      .from('thebest_packages')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) {
      console.warn('⚠️ Aviso ao limpar dados:', deleteError.message);
    }
    
    // Preparar dados para inserção
    console.log('📥 Preparando dados para inserção...');
    
    const packagesToInsert = packages.map(pkg => {
      return {
        user_id: userId,
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
      .select('id', { count: 'exact' })
      .eq('user_id', userId);
    
    if (!countError) {
      console.log(`📊 Total de pacotes no banco para este usuário: ${countData.length}`);
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
    
    console.log('\n✅ Integração The Best pronta para uso!');
    console.log(`🔑 User ID: ${userId}`);
    console.log(`⚙️ Config ID: ${configId}`);
    
  } catch (error) {
    console.error('❌ Erro na importação:', error.message);
  }
}

// Executar importação
importPackagesFinal();