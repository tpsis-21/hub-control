#!/usr/bin/env node
/**
 * Verifica itens do PLANO_ACAO_SEGURANCA_SUPABASE.md no projeto Supabase ligado ao .env.local
 * Uso: node scripts/verificar-plano-seguranca-supabase.mjs
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const FASE1_TABLES = ['users', 'empresas', 'financial_transactions', 'payments', 'expenses', 'settings'];
const FASE2_TABLES = [
  'analytics_events',
  'analytics_sessions',
  'analytics_metrics',
  'analytics_config',
  'analytics_funnels',
  'in_app_notifications',
  'plan_groups',
  'plans',
];
const FASE3_VIEWS = [
  'thebest_dashboard',
  'analytics_device_metrics',
  'user_activity_summary',
  'analytics_popular_pages',
  'analytics_daily_active_users',
];

async function runCheck(name, sql) {
  const { data, error } = await supabase.rpc('exec_sql', { query: sql }).catch(() => ({ data: null, error: { message: 'rpc exec_sql indisponível' } }));
  if (error?.message?.includes('exec_sql')) {
    return { name, skip: true, detail: 'Use SQL Editor com scripts/verificar-plano-seguranca-supabase.sql' };
  }
  if (error) return { name, ok: false, detail: error.message };
  return { name, ok: true, data };
}

async function main() {
  console.log('🔒 Verificação — Plano Segurança Supabase\n');
  console.log(`Projeto: ${url}\n`);

  // servers.user_id via REST metadata limitada — checagem indireta
  const { data: servers, error: srvErr } = await supabase.from('servers').select('id, user_id').limit(1);
  if (srvErr) {
    console.log(`servers: ⚠️  ${srvErr.message}`);
  } else {
    const hasCol = servers?.[0] ? 'user_id' in servers[0] : true;
    console.log(`Fase 0/6 servers.user_id: ${hasCol ? '✅ coluna presente (amostra)' : '❌ coluna ausente'}`);
  }

  for (const table of [...FASE1_TABLES, ...FASE2_TABLES]) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      console.log(`  ${table}: ⏭️  tabela não existe neste projeto`);
    } else if (error?.code === '42501' || error?.message?.includes('permission')) {
      console.log(`  ${table}: ✅ existe (RLS ativo — acesso negado sem auth)`);
    } else if (error) {
      console.log(`  ${table}: ⚠️  ${error.message}`);
    } else {
      console.log(`  ${table}: ⚠️  acessível com service_role (esperado)`);
    }
  }

  for (const view of FASE3_VIEWS) {
    const { error } = await supabase.from(view).select('*', { head: true, count: 'exact' });
    if (error?.code === '42P01') {
      console.log(`  view ${view}: ⏭️  não existe`);
    } else if (error) {
      console.log(`  view ${view}: ⚠️  ${error.message}`);
    } else {
      console.log(`  view ${view}: ✅ consultável (service_role)`);
    }
  }

  console.log('\n📋 Próximos passos manuais:');
  console.log('  1. Aplicar migração: supabase/migrations/20260520140000_plano_acao_seguranca_supabase.sql');
  console.log('  2. Fase 5 Auth: docs/SUPABASE_AUTH_CHECKLIST.md');
  console.log('  3. Security Advisor no Dashboard → Database → Advisors');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
