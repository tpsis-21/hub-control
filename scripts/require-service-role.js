/**
 * Carrega SUPABASE_SERVICE_ROLE_KEY do ambiente.
 * Nunca use fallback com JWT hardcoded.
 */
require('dotenv').config({ path: '.env.local' });

function requireServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.length < 20) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY é obrigatória em .env.local');
    console.error('   Configure a chave no painel Supabase e reinicie o script.');
    process.exit(1);
  }
  return key;
}

function requireSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL é obrigatória em .env.local');
    process.exit(1);
  }
  return url;
}

module.exports = { requireServiceRoleKey, requireSupabaseUrl };
