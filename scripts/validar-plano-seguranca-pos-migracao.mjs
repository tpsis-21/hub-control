#!/usr/bin/env node
/**
 * Validações pós-migração do PLANO_ACAO_SEGURANCA_SUPABASE.md
 * Uso: node scripts/validar-plano-seguranca-pos-migracao.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');

function loadEnv() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('❌ Configure NEXT_PUBLIC_SUPABASE_URL, ANON_KEY e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const service = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let failed = 0;

function ok(msg) {
  console.log(`✅ ${msg}`);
}
function fail(msg, detail = '') {
  console.log(`❌ ${msg}${detail ? ` — ${detail}` : ''}`);
  failed += 1;
}
function warn(msg) {
  console.log(`⚠️  ${msg}`);
}

async function main() {
  console.log('🔒 Validação pós-migração — Segurança Supabase\n');

  const { data: servers, error: srvErr } = await service.from('servers').select('id, name, user_id');
  if (srvErr) fail('Ler servers (service_role)', srvErr.message);
  else {
    const orfaos = (servers || []).filter((s) => !s.user_id);
    if (orfaos.length === 0) ok(`servers: ${servers?.length ?? 0} registros, 0 sem user_id`);
    else fail(`servers: ${orfaos.length} sem user_id`, orfaos.map((s) => s.name).join(', '));
  }

  const { data: anonServers, error: anonSrvErr } = await anon.from('servers').select('id').limit(5);
  if (anonSrvErr) ok(`anon não lê servers (${anonSrvErr.code || anonSrvErr.message})`);
  else if (!anonServers?.length) ok('anon: SELECT servers retornou vazio');
  else fail(`anon conseguiu ler ${anonServers.length} servidor(es) — revisar grants/RLS`);

  const { data: anonSettings, error: anonSetErr } = await anon.from('settings').select('id').limit(1);
  if (anonSetErr) ok(`anon não lê settings (${anonSetErr.code || 'erro'})`);
  else if (!anonSettings?.length) ok('anon: settings vazio');
  else fail('anon leu settings — revoke pode ter falhado');

  const { data: anonProfiles, error: anonProfErr } = await anon.from('profiles').select('id').limit(1);
  if (anonProfErr) ok(`anon não lê profiles (${anonProfErr.code || 'erro'})`);
  else if (!anonProfiles?.length) ok('anon: profiles vazio');
  else fail('anon leu profiles');

  const { data: plans, error: plansErr } = await anon.from('plans').select('id').limit(3);
  if (plansErr) warn(`anon plans: ${plansErr.message} (ok se RLS bloquear tudo)`);
  else ok(`anon pode consultar plans (esperado para planos públicos): ${plans?.length ?? 0} linha(s)`);

  const rpcNames = [
    'check_rate_limit',
    'security_health_check',
    'hub_control_is_admin',
  ];
  for (const rpc of rpcNames) {
    const { error } = await anon.rpc(rpc, rpc === 'check_rate_limit'
      ? { p_identifier: 'test', p_action: 'login', p_max_attempts: 1, p_window_minutes: 1 }
      : rpc === 'hub_control_is_admin'
        ? {}
        : {});
    if (error) ok(`anon.rpc(${rpc}) bloqueado`);
    else fail(`anon.rpc(${rpc}) executou — deveria estar revogado`);
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
  try {
    const health = await fetch(`${base}/api/health`);
    if (health.ok) ok(`App ${base}/api/health OK`);
    else fail(`Health ${health.status}`);
  } catch (e) {
    warn(`App offline em ${base} — rode npm run dev (${e.message})`);
  }

  console.log('');
  if (failed === 0) {
    console.log('✅ Todas as validações automáticas passaram.');
    console.log('   Manual: login → /servidores + Fase 5 Auth (SUPABASE_AUTH_CHECKLIST.md)');
    process.exit(0);
  }
  console.log(`❌ ${failed} validação(ões) falharam.`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
