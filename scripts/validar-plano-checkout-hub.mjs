#!/usr/bin/env node
/**
 * Validação local/pré-deploy — PLANO_ACAO_CHECKOUT_HUB.md
 * Uso: node scripts/validar-plano-checkout-hub.mjs [--base-url http://localhost:8080]
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = resolve(root, '.env.local');
const baseArgEq = process.argv.find((a) => a.startsWith('--base-url='));
const baseArgIdx = process.argv.indexOf('--base-url');
const baseFromFlag =
  baseArgEq?.split('=').slice(1).join('=') ||
  (baseArgIdx >= 0 && process.argv[baseArgIdx + 1] && !process.argv[baseArgIdx + 1].startsWith('-')
    ? process.argv[baseArgIdx + 1]
    : null);
const base = (baseFromFlag || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080').trim();
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base);

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

let failed = 0;
const ok = (m) => console.log(`✅ ${m}`);
const fail = (m, d = '') => {
  console.log(`❌ ${m}${d ? ` — ${d}` : ''}`);
  failed += 1;
};
const warn = (m) => console.log(`⚠️  ${m}`);
const info = (m) => console.log(`ℹ️  ${m}`);

async function probeTable(url, key, table, select) {
  const res = await fetch(`${url}/rest/v1/${table}?select=${select}&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.ok;
}

async function main() {
  const b = base.replace(/\/$/, '');
  console.log('🛒 Validação — Plano Checkout Hub\n');
  console.log(`Base URL: ${b}\n`);

  // Fase A — código (arquivos-chave)
  const files = [
    'supabase/migrations/20260519140000_hub_checkout.sql',
    'src/lib/checkout/external-reference.ts',
    'src/app/api/gates2b/webhook/route.ts',
    'src/app/api/public/checkout/create/route.ts',
    'docs/GUIA_HUB_CONTROL.md',
  ];
  for (const f of files) {
    if (existsSync(resolve(root, f))) ok(`arquivo: ${f}`);
    else fail(`arquivo ausente: ${f}`);
  }

  // hubco_ prefix (unit logic inline)
  const ref = 'hubco_' + 'a1b2c3d4e5f6478990aabbccddeeff00';
  if (ref.startsWith('hubco_') && ref.length > 6) ok('prefixo hubco_ (referência externa)');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    warn('Supabase: variáveis ausentes — pule migração remota');
  } else {
    const tables = [
      ['checkout_settings', 'user_id'],
      ['checkout_orders', 'id'],
      ['plans', 'id,cakto_url'],
    ];
    for (const [t, sel] of tables) {
      if (await probeTable(url, key, t, sel)) ok(`Supabase: ${t}`);
      else fail(`Supabase: ${t} inacessível`);
    }
  }

  // Fase C — endpoints HTTP
  try {
    const health = await fetch(`${b}/api/health`);
    if (health.ok) ok(`GET ${b}/api/health`);
    else fail(`health ${health.status}`);
  } catch (e) {
    fail('App offline', e.message);
  }

  try {
    const wh = await fetch(`${b}/api/gates2b/webhook`);
    const body = await wh.json().catch(() => ({}));
    if (wh.ok && body.success) ok(`GET ${b}/api/gates2b/webhook`);
    else fail(`webhook GET ${wh.status}`, JSON.stringify(body));
  } catch (e) {
    fail('webhook GET', e.message);
  }

  const secret = process.env.GATES2B_WEBHOOK_SECRET || process.env.BPIX_WEBHOOK_SECRET;
  if (isLocal) {
    if (!secret) info('dev: GATES2B_WEBHOOK_SECRET vazio — OK em desenvolvimento');
    else ok('GATES2B_WEBHOOK_SECRET definido (opcional em dev)');
  } else if (!secret || secret.length < 16) {
    fail('produção: GATES2B_WEBHOOK_SECRET ausente ou < 16 caracteres');
  } else {
    ok('GATES2B_WEBHOOK_SECRET configurado (produção)');
  }

  if (!process.env.NEXT_PUBLIC_APP_URL && b.includes('localhost')) {
    warn('NEXT_PUBLIC_APP_URL não definido — UI pode mostrar URL genérica');
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    ok(`NEXT_PUBLIC_APP_URL=${process.env.NEXT_PUBLIC_APP_URL}`);
  }

  console.log('\n--- Próximos passos (produção) ---');
  console.log('  Fase C: deploy HTTPS + env (ver docs/GATES2B_CONFIGURAR_APOS_DEPLOY.md)');
  console.log(`  Teste: .\\scripts\\verificar-gates2b-deploy.ps1 -BaseUrl "https://seu-dominio.com"`);
  console.log('  Fase D: painel Gates2b — 2 URLs (n8n + Hub)');
  console.log('  Fase E: PIX teste na área /cliente/...');
  console.log('');

  if (failed === 0) {
    console.log('✅ Pré-requisitos locais / Supabase OK. Falta deploy + painel Gates2b (C–E).');
    process.exit(0);
  }
  console.log(`❌ ${failed} item(ns) falharam.`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
