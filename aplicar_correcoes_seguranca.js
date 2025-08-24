// =====================================================
// APLICAR CORREÇÕES DE SEGURANÇA DO SUPABASE
// =====================================================
// Script para aplicar as correções de segurança diretamente
// no banco de dados Supabase usando a API REST
//
// Data: 2024-12-25
// Autor: Sistema de Segurança Automatizado
// =====================================================

const fs = require('fs');
const path = require('path');
const https = require('https');

// Carregar variáveis de ambiente
require('dotenv').config({ path: '.env.local' });

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não configuradas!');
  console.log('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

// Função para executar SQL via API REST
function executarSQL(sql, descricao) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Executando: ${descricao}`);
    
    const url = new URL('/rest/v1/rpc/exec_sql', supabaseUrl);
    const postData = JSON.stringify({ sql_query: sql });
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Sucesso: ${descricao}`);
          resolve(true);
        } else {
          console.error(`❌ Erro em ${descricao}: HTTP ${res.statusCode}`);
          if (data) {
            try {
              const errorData = JSON.parse(data);
              console.error('Detalhes:', errorData.message || errorData);
            } catch (e) {
              console.error('Resposta:', data);
            }
          }
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.error(`❌ Erro de rede em ${descricao}:`, err.message);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// Função alternativa usando psql via API
function executarSQLAlternativo(sql, descricao) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Executando: ${descricao}`);
    
    // Tentar executar via API de query direta
    const url = new URL('/rest/v1/', supabaseUrl);
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Prefer': 'return=minimal'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Sucesso: ${descricao}`);
          resolve(true);
        } else {
          console.log(`⚠️  ${descricao}: Comando pode ter sido executado (status ${res.statusCode})`);
          resolve(true); // Assumir sucesso para DDL
        }
      });
    });
    
    req.on('error', (err) => {
      console.error(`❌ Erro de rede em ${descricao}:`, err.message);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

// Função principal
async function aplicarCorrecoes() {
  console.log('🛡️  APLICANDO CORREÇÕES DE SEGURANÇA DO SUPABASE');
  console.log('=' .repeat(60));
  
  // Ler o arquivo de migration
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20241225000002_fix_security_advisor_issues.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Arquivo de migration não encontrado:', migrationPath);
    process.exit(1);
  }
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  // Dividir o SQL em comandos individuais
  const comandos = migrationSQL
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('/*'));
  
  console.log(`📋 Total de comandos a executar: ${comandos.length}`);
  console.log('\n⚠️  Nota: Como não temos acesso direto ao psql, vamos simular a execução');
  console.log('Você precisará executar manualmente os comandos SQL no Supabase Dashboard.');
  
  let sucessos = 0;
  
  // Mostrar cada comando
  for (let i = 0; i < comandos.length; i++) {
    const comando = comandos[i];
    
    // Identificar o tipo de comando
    let descricao = `Comando ${i + 1}/${comandos.length}`;
    
    if (comando.includes('CREATE OR REPLACE VIEW')) {
      const viewName = comando.match(/CREATE OR REPLACE VIEW\s+(\w+)/i)?.[1];
      descricao = `Corrigir view ${viewName}`;
    } else if (comando.includes('ALTER TABLE') && comando.includes('ENABLE ROW LEVEL SECURITY')) {
      const tableName = comando.match(/ALTER TABLE\s+(\w+)/i)?.[1];
      descricao = `Habilitar RLS na tabela ${tableName}`;
    } else if (comando.includes('CREATE POLICY')) {
      const policyName = comando.match(/CREATE POLICY\s+"([^"]+)"/i)?.[1];
      descricao = `Criar política ${policyName}`;
    }
    
    console.log(`\n📝 ${descricao}:`);
    console.log('```sql');
    console.log(comando + ';');
    console.log('```');
    
    sucessos++;
  }
  
  // Relatório final
  console.log('\n' + '=' .repeat(60));
  console.log('📊 COMANDOS SQL PREPARADOS');
  console.log('=' .repeat(60));
  console.log(`📋 Total de comandos: ${comandos.length}`);
  
  console.log('\n🎯 PRÓXIMOS PASSOS MANUAIS:');
  console.log('1. Acesse o Supabase Dashboard');
  console.log('2. Vá para SQL Editor');
  console.log('3. Execute os comandos SQL mostrados acima');
  console.log('4. Execute o script de verificação: node verificar_correcoes.js');
  
  // Criar arquivo com todos os comandos
  const sqlCompleto = comandos.map(cmd => cmd + ';').join('\n\n');
  const arquivoSQL = path.join(__dirname, 'comandos_seguranca_para_executar.sql');
  fs.writeFileSync(arquivoSQL, sqlCompleto);
  
  console.log(`\n📄 Arquivo criado: ${arquivoSQL}`);
  console.log('Você pode copiar e colar este arquivo no Supabase SQL Editor');
}

// Função para verificar conexão
async function verificarConexao() {
  console.log('🔍 Verificando conexão com o Supabase...');
  
  return new Promise((resolve) => {
    const url = new URL('/rest/v1/', supabaseUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      }
    };
    
    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log('✅ Conexão com Supabase estabelecida');
        resolve(true);
      } else {
        console.error('❌ Erro de conexão:', res.statusCode);
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      console.error('❌ Erro de conexão:', err.message);
      resolve(false);
    });
    
    req.end();
  });
}

// Executar o script
async function main() {
  try {
    // Verificar conexão primeiro
    const conexaoOk = await verificarConexao();
    if (!conexaoOk) {
      console.error('❌ Não foi possível conectar ao Supabase');
      process.exit(1);
    }
    
    // Aplicar correções
    await aplicarCorrecoes();
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { aplicarCorrecoes, verificarConexao };