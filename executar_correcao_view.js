require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executarCorrecaoView() {
  console.log('🔧 EXECUTANDO CORREÇÃO DA VIEW thebest_dashboard');
  console.log('=' .repeat(60));
  
  try {
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'corrigir_view_thebest_dashboard.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir o SQL em comandos individuais
    const comandos = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📋 Executando ${comandos.length} comandos SQL...\n`);
    
    for (let i = 0; i < comandos.length; i++) {
      const comando = comandos[i];
      
      if (comando.includes('SELECT') && comando.includes('status')) {
        console.log(`${i + 1}. Verificando status...`);
      } else if (comando.includes('DROP VIEW')) {
        console.log(`${i + 1}. Removendo view existente...`);
      } else if (comando.includes('CREATE OR REPLACE VIEW')) {
        console.log(`${i + 1}. Criando nova view...`);
      } else if (comando.includes('COMMENT ON VIEW')) {
        console.log(`${i + 1}. Adicionando comentário...`);
      } else if (comando.includes('SELECT') && comando.includes('thebest_dashboard')) {
        console.log(`${i + 1}. Testando a view...`);
      } else {
        console.log(`${i + 1}. Executando comando...`);
      }
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: comando
        });
        
        if (error) {
          console.error(`   ❌ Erro: ${error.message}`);
          if (comando.includes('DROP VIEW') && error.message.includes('does not exist')) {
            console.log('   ℹ️  View não existia, continuando...');
          } else {
            throw error;
          }
        } else {
          console.log('   ✅ Sucesso');
          if (data && Array.isArray(data) && data.length > 0) {
            console.log(`   📊 Resultado: ${data.length} registros`);
            if (comando.includes('thebest_dashboard') && comando.includes('LIMIT')) {
              console.log('   📋 Primeiros registros da view:');
              data.slice(0, 3).forEach((row, idx) => {
                console.log(`      ${idx + 1}. ${row.name || row.package_id} - ${row.status} (${row.active_subscriptions} ativos)`);
              });
            }
          }
        }
      } catch (cmdError) {
        console.error(`   ❌ Erro no comando: ${cmdError.message}`);
        if (!comando.includes('DROP VIEW')) {
          throw cmdError;
        }
      }
      
      console.log(''); // Linha em branco
    }
    
    console.log('🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('=' .repeat(60));
    console.log('✅ A view thebest_dashboard foi corrigida e está funcionando.');
    console.log('✅ Agora você pode usar a view no SQL Editor sem erros.');
    
  } catch (error) {
    console.error('❌ ERRO NA CORREÇÃO:', error.message);
    console.log('\n🔧 SOLUÇÃO ALTERNATIVA:');
    console.log('1. Copie o conteúdo do arquivo corrigir_view_thebest_dashboard.sql');
    console.log('2. Cole no SQL Editor do Supabase');
    console.log('3. Execute comando por comando');
  }
}

// Executar correção
executarCorrecaoView()
  .then(() => {
    console.log('\n✅ Script finalizado!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Erro no script:', error.message);
    process.exit(1);
  });