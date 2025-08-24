// migrate-supabase-imports.js
// Script para migrar imports dos clientes Supabase antigos para a nova estrutura consolidada

const fs = require('fs');
const path = require('path');

// Mapeamento de imports antigos para novos
const importMappings = {
  // supabase-client.ts
  'createClientSupabaseClient': 'createBrowserSupabaseClient',
  'getClientUser': 'getBrowserUser',
  'getClientUserRole': 'getBrowserUserRole',
  'isClientUserApproved': 'isBrowserUserApproved',
  'signInWithEmail': 'browserSignIn',
  'signUpWithEmail': 'browserSignUp',
  'signOut': 'browserSignOut',
  
  // supabase-server.ts
  'createServerSupabaseClient': 'createServerSupabaseClient',
  'createServerSupabaseClientForActions': 'createServerSupabaseClientForActions',
  'getServerUser': 'getServerUser',
  'isServerAuthenticated': 'isServerAuthenticated',
  'getServerUserRole': 'getServerUserRole',
  'getServerCookies': 'getServerCookies',
  'getServerCookie': 'getServerCookie',
  'getServerCookieValue': 'getServerCookieValue',
  
  // supabase-api.ts
  'createApiSupabaseClient': 'createApiSupabaseClient',
  'getApiUser': 'getApiUser',
  'isApiAuthenticated': 'isApiAuthenticated',
  'isUserAdmin': 'isUserAdmin',
  'getApiUserRole': 'getApiUserRole',
  
  // supabase-middleware.ts
  'createMiddlewareSupabaseClient': 'createMiddlewareSupabaseClient',
  'getUser': 'getMiddlewareUser',
  'getUserWithResponse': 'getUserWithResponse',
};

// Mapeamento de caminhos de arquivos
const pathMappings = {
  '@/lib/supabase-client': '@/lib/supabase',
  './supabase-client': '../supabase',
  '../lib/supabase-client': '../lib/supabase',
  
  '@/lib/supabase-server': '@/lib/supabase',
  './supabase-server': '../supabase',
  '../lib/supabase-server': '../lib/supabase',
  '../../../lib/supabase-server': '../../../lib/supabase',
  
  '@/lib/supabase-api': '@/lib/supabase',
  './supabase-api': '../supabase',
  '../lib/supabase-api': '../lib/supabase',
  '../supabase-api': '../supabase',
  
  '@/lib/supabase-middleware': '@/lib/supabase',
  './supabase-middleware': '../supabase',
  '../lib/supabase-middleware': '../lib/supabase',
};

// Lista de arquivos encontrados com imports antigos
const filesToMigrate = [
  'src/components/app/navbar.tsx',
  'src/services/reminder.service.ts',
  'src/lib/automation-workflow-system.ts',
  'src/hooks/usePushNotifications.ts',
  'src/app/api/message-queue/route.ts',
  'src/app/api/logs/export/route.ts',
  'src/app/api/reports/route.ts',
  'src/app/(app)/ajuda/actions.ts',
  'src/middleware/unified-middleware.ts',
  'src/middleware/security-middleware.ts',
  'src/lib/realtime-notification-system.ts',
  'src/lib/backup-recovery-system.ts',
  'src/components/app/main-nav.tsx',
  'src/app/api/push-notifications/route.ts',
  'src/lib/system-settings.ts',
  'src/app/api/messages/send-email/route.ts',
  'src/app/(app)/planos/actions.ts',
  'src/app/(app)/perfil/page.tsx',
  'src/app/(app)/pagamentos/actions.ts',
  'src/app/(app)/configuracoes/actions.ts',
  'src/lib/notifications.service.ts',
  'src/components/app/user-nav.tsx',
  'src/app/(app)/testes/supabase-actions.ts',
  'src/app/(app)/notificacoes/actions.ts',
  'src/lib/auth-utils.ts',
  'src/lib/client-status-updater.ts',
  'src/components/app/header.tsx',
  'src/lib/user.service.ts',
  'src/app/api/reports/export/route.ts',
  'src/lib/security-realtime-monitor.ts',
  'src/app/api/messages/route.ts',
  'src/hooks/useAuth.ts',
  'src/lib/performance/metrics-collector.ts',
  'src/app/api/marketing/send-campaign/route.ts',
  'src/components/app/NotificationCenter.tsx',
  'src/lib/intelligent-cache-system.ts',
  'src/lib/threat-detection.ts',
  'src/components/app/modern-header.tsx',
  'src/app/(app)/financeiro/actions.ts',
  'src/lib/audit-compliance-system.ts',
  'src/lib/analytics-reporting-system.ts',
  'src/lib/app-initialization.ts',
  'src/app/(app)/clientes/actions.ts',
  'src/components/auth/register-form.tsx',
  'src/app/(app)/servidores/actions.ts',
  'src/components/app/modern-sidebar.tsx',
  'src/app/reset-password/page.tsx',
  'src/services/automation.service.ts',
  'src/app/api/logs/route.ts',
  'src/components/auth/user-settings-form.tsx',
  'src/services/marketing.service.ts',
  'src/components/app/admin-panel.tsx',
  'src/app/api/reminders/route.ts',
  'src/app/(app)/testes/actions.ts',
  'src/components/auth/login-form.tsx',
  'src/app/(app)/admin/page.tsx'
];

function migrateFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Arquivo não encontrado: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Substituir caminhos de import
  for (const [oldPath, newPath] of Object.entries(pathMappings)) {
    const regex = new RegExp(`from ['"]${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `from "${newPath}"`);
      modified = true;
      console.log(`  📝 Substituído: ${oldPath} → ${newPath}`);
    }
  }
  
  // Substituir nomes de funções importadas (se necessário)
  for (const [oldName, newName] of Object.entries(importMappings)) {
    if (oldName !== newName && content.includes(oldName)) {
      // Substituir apenas se for uma importação ou uso direto
      const importRegex = new RegExp(`\\b${oldName}\\b`, 'g');
      if (importRegex.test(content)) {
        content = content.replace(importRegex, newName);
        modified = true;
        console.log(`  🔄 Função renomeada: ${oldName} → ${newName}`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Migrado: ${filePath}`);
    return true;
  } else {
    console.log(`⚪ Sem alterações: ${filePath}`);
    return false;
  }
}

function main() {
  console.log('🚀 Iniciando migração dos imports Supabase...');
  console.log(`📁 Total de arquivos para migrar: ${filesToMigrate.length}`);
  console.log('');
  
  let migratedCount = 0;
  let errorCount = 0;
  
  for (const filePath of filesToMigrate) {
    try {
      console.log(`🔍 Processando: ${filePath}`);
      const wasMigrated = migrateFile(filePath);
      if (wasMigrated) {
        migratedCount++;
      }
    } catch (error) {
      console.error(`❌ Erro ao migrar ${filePath}:`, error.message);
      errorCount++;
    }
    console.log('');
  }
  
  console.log('📊 Resumo da Migração:');
  console.log(`✅ Arquivos migrados: ${migratedCount}`);
  console.log(`⚪ Arquivos sem alterações: ${filesToMigrate.length - migratedCount - errorCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  
  if (migratedCount > 0) {
    console.log('');
    console.log('🎉 Migração concluída com sucesso!');
    console.log('📝 Próximos passos:');
    console.log('1. Testar a aplicação para verificar se tudo funciona');
    console.log('2. Remover os arquivos Supabase antigos após confirmação');
    console.log('3. Atualizar a documentação');
  }
}

if (require.main === module) {
  main();
}

module.exports = { migrateFile, importMappings, pathMappings };