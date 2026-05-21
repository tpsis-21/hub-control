/**
 * Define senha de um usuário Auth SEM e-mail (Admin API + service_role).
 *
 * Uso:
 *   node scripts/definir-senha-admin.js
 *   node scripts/definir-senha-admin.js --email topplaytv7@gmail.com --password "SuaSenhaNova123!"
 *
 * Requer no .env.local (ou variáveis de ambiente):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    email: 'topplaytv7@gmail.com',
    password: null,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) out.email = args[++i];
    else if (args[i] === '--password' && args[i + 1]) out.password = args[++i];
  }
  return out;
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { email, password: argPassword } = parseArgs();

  if (!url || !serviceKey) {
    console.error('❌ Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local');
    process.exit(1);
  }

  const password =
    argPassword ||
    process.env.ADMIN_NEW_PASSWORD ||
    process.env.NEW_ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    console.error('❌ Informe a senha nova:');
    console.error('   node scripts/definir-senha-admin.js --password "MinhaSenhaSegura123!"');
    console.error('   ou variável ADMIN_NEW_PASSWORD no .env.local (não commite!)');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`🔍 Buscando usuário: ${email}`);

  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    console.error('❌ Erro ao listar usuários:', listError.message);
    process.exit(1);
  }

  const user = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.error(`❌ Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  console.log(`👤 UID: ${user.id}`);
  console.log('🔐 Atualizando senha via Admin API...');

  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
  });

  if (error) {
    console.error('❌ Falha ao atualizar senha:', error.message);
    process.exit(1);
  }

  console.log('');
  console.log('✅ Senha definida com sucesso!');
  console.log('═══════════════════════════════════════');
  console.log('📧 E-mail:', email);
  console.log('🆔 UID:  ', data.user?.id || user.id);
  console.log('═══════════════════════════════════════');
  console.log('➡️  Teste: http://localhost:8080/login');
  console.log('');
  console.log('⚠️  Não commite a senha. Troque depois do primeiro login se quiser.');
}

main().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
