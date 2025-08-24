const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Script para configurar e verificar conexão com Supabase
async function setupSupabaseConfig() {
  console.log('🔧 CONFIGURAÇÃO DO SUPABASE');
  console.log('============================\n');
  
  try {
    // 1. Verificar se existe arquivo .env
    const envPath = path.join(__dirname, '.env');
    let envExists = fs.existsSync(envPath);
    
    console.log('1️⃣ Verificando arquivo .env...');
    if (envExists) {
      console.log('✅ Arquivo .env encontrado');
      
      // Ler conteúdo atual
      const envContent = fs.readFileSync(envPath, 'utf8');
      console.log('\n📄 Conteúdo atual do .env:');
      
      // Mascarar chaves sensíveis
      const lines = envContent.split('\n');
      lines.forEach(line => {
        if (line.includes('SUPABASE_URL')) {
          console.log(line);
        } else if (line.includes('SUPABASE_ANON_KEY')) {
          const parts = line.split('=');
          if (parts[1] && parts[1].length > 10) {
            console.log(`${parts[0]}=${parts[1].substring(0, 10)}...${parts[1].slice(-4)}`);
          } else {
            console.log(line);
          }
        } else if (line.trim()) {
          console.log(line);
        }
      });
    } else {
      console.log('⚠️  Arquivo .env não encontrado');
    }
    
    // 2. Verificar variáveis de ambiente
    console.log('\n2️⃣ Verificando variáveis de ambiente...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl) {
      console.log(`✅ SUPABASE_URL: ${supabaseUrl}`);
    } else {
      console.log('❌ SUPABASE_URL não definida');
    }
    
    if (supabaseKey) {
      const maskedKey = supabaseKey.length > 10 ? 
        `${supabaseKey.substring(0, 10)}...${supabaseKey.slice(-4)}` : 
        supabaseKey;
      console.log(`✅ SUPABASE_ANON_KEY: ${maskedKey}`);
    } else {
      console.log('❌ SUPABASE_ANON_KEY não definida');
    }
    
    // 3. Verificar CLI do Supabase
    console.log('\n3️⃣ Verificando CLI do Supabase...');
    try {
      const version = execSync('supabase --version', { encoding: 'utf8', stdio: 'pipe' });
      console.log(`✅ CLI do Supabase instalado: ${version.trim()}`);
      
      // Verificar status do projeto
      try {
        const status = execSync('supabase status', { 
          encoding: 'utf8', 
          stdio: 'pipe',
          cwd: __dirname 
        });
        console.log('\n📊 Status do projeto Supabase:');
        console.log(status);
      } catch (statusError) {
        console.log('⚠️  Não foi possível obter status do projeto');
        console.log('   Talvez o projeto não esteja inicializado localmente');
      }
      
    } catch (cliError) {
      console.log('❌ CLI do Supabase não encontrado');
      console.log('   💡 Instale com: npm install -g supabase');
    }
    
    // 4. Criar arquivo .env de exemplo se não existir
    if (!envExists) {
      console.log('\n4️⃣ Criando arquivo .env de exemplo...');
      const envExample = `# Configurações do Supabase
# Substitua pelos valores do seu projeto

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Configurações opcionais
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Para desenvolvimento local
# SUPABASE_URL=http://localhost:54321
# SUPABASE_ANON_KEY=local-anon-key
`;
      
      fs.writeFileSync(envPath, envExample);
      console.log('✅ Arquivo .env de exemplo criado');
      console.log('   📝 Edite o arquivo .env com suas credenciais do Supabase');
    }
    
    // 5. Verificar arquivos de configuração do Supabase
    console.log('\n5️⃣ Verificando configuração do projeto...');
    
    const supabaseDir = path.join(__dirname, 'supabase');
    if (fs.existsSync(supabaseDir)) {
      console.log('✅ Diretório supabase/ encontrado');
      
      const configPath = path.join(supabaseDir, 'config.toml');
      if (fs.existsSync(configPath)) {
        console.log('✅ Arquivo config.toml encontrado');
      } else {
        console.log('⚠️  Arquivo config.toml não encontrado');
      }
      
      const migrationsDir = path.join(supabaseDir, 'migrations');
      if (fs.existsSync(migrationsDir)) {
        const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
        console.log(`✅ ${migrations.length} migrações encontradas`);
        
        // Listar migrações mais recentes
        if (migrations.length > 0) {
          console.log('   📋 Migrações mais recentes:');
          migrations.slice(-3).forEach(migration => {
            console.log(`      - ${migration}`);
          });
        }
      } else {
        console.log('⚠️  Diretório migrations/ não encontrado');
      }
    } else {
      console.log('❌ Diretório supabase/ não encontrado');
      console.log('   💡 Execute: supabase init para inicializar o projeto');
    }
    
    // 6. Gerar instruções de configuração
    generateConfigInstructions();
    
  } catch (error) {
    console.error('❌ Erro na configuração:', error.message);
  }
}

function generateConfigInstructions() {
  console.log('\n📋 INSTRUÇÕES DE CONFIGURAÇÃO');
  console.log('===============================');
  
  console.log('\n🔗 Para obter suas credenciais do Supabase:');
  console.log('1. Acesse https://app.supabase.com');
  console.log('2. Selecione seu projeto');
  console.log('3. Vá para Settings > API');
  console.log('4. Copie a URL e a chave anon/public');
  
  console.log('\n⚙️  Para configurar o projeto:');
  console.log('1. Edite o arquivo .env com suas credenciais');
  console.log('2. Execute: node test-complete-security.cjs');
  console.log('3. Se necessário, aplique as migrações manualmente');
  
  console.log('\n🚀 Para aplicar as migrações de segurança:');
  console.log('1. Acesse o painel do Supabase');
  console.log('2. Vá para SQL Editor');
  console.log('3. Execute o conteúdo de: security-implementation-optimized.sql');
  
  console.log('\n🔧 Para desenvolvimento local:');
  console.log('1. Execute: supabase start');
  console.log('2. Use as credenciais locais no .env');
  console.log('3. Execute: supabase db push');
  
  // Criar arquivo de instruções
  const instructionsPath = path.join(__dirname, 'SUPABASE_SETUP_INSTRUCTIONS.md');
  const instructions = `# Instruções de Configuração do Supabase

## 🔗 Obter Credenciais

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá para **Settings > API**
4. Copie:
   - **URL**: Project URL
   - **Chave Anon**: anon/public key

## ⚙️ Configurar Projeto

1. **Editar arquivo .env:**
   \`\`\`env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   \`\`\`

2. **Testar conectividade:**
   \`\`\`bash
   node test-complete-security.cjs
   \`\`\`

## 🚀 Aplicar Migrações de Segurança

### Método 1: Painel Web
1. Acesse o painel do Supabase
2. Vá para **SQL Editor**
3. Execute o conteúdo de: \`security-implementation-optimized.sql\`

### Método 2: CLI (se disponível)
\`\`\`bash
supabase db push
\`\`\`

## 🔧 Desenvolvimento Local

1. **Iniciar Supabase local:**
   \`\`\`bash
   supabase start
   \`\`\`

2. **Configurar .env para local:**
   \`\`\`env
   SUPABASE_URL=http://localhost:54321
   SUPABASE_ANON_KEY=local-anon-key
   \`\`\`

3. **Aplicar migrações:**
   \`\`\`bash
   supabase db push
   \`\`\`

## 📊 Verificar Implementação

Após configurar, execute:
\`\`\`bash
node test-complete-security.cjs
\`\`\`

## 🔒 Funcionalidades Implementadas

- ✅ **MFA para Administradores**
- ✅ **Cobertura RLS Completa**
- ✅ **Sistema de Alertas de Segurança**
- ✅ **Monitoramento de Atividades Suspeitas**
- ✅ **Configurações de Segurança**
- ✅ **Função Health Check**

## 🆘 Solução de Problemas

### Erro "fetch failed"
- Verifique as credenciais no .env
- Confirme se o projeto está ativo
- Teste a conectividade de rede

### Erro "function does not exist"
- Execute as migrações de segurança
- Verifique se as funções foram criadas

### Erro de RLS
- Confirme se as políticas foram aplicadas
- Verifique permissões do usuário

---
*Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}*
`;
  
  fs.writeFileSync(instructionsPath, instructions);
  console.log(`\n📄 Instruções detalhadas salvas em: ${instructionsPath}`);
}

// Executar se chamado diretamente
if (require.main === module) {
  setupSupabaseConfig()
    .then(() => {
      console.log('\n✅ Configuração concluída!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Erro na configuração:', error.message);
      process.exit(1);
    });
}

module.exports = { setupSupabaseConfig };