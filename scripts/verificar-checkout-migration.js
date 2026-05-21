/**
 * Verifica se a migração hub_checkout foi aplicada no Supabase.
 * Uso: node scripts/verificar-checkout-migration.js
 */
const fs = require('fs')
const path = require('path')

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local não encontrado')
    process.exit(1)
  }
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i > 0) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes')
    process.exit(1)
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  }

  async function probe(table, select = 'id') {
    const res = await fetch(`${url}/rest/v1/${table}?select=${select}&limit=1`, { headers })
    return { ok: res.ok, status: res.status, table }
  }

  async function probePlansCakto() {
    const res = await fetch(`${url}/rest/v1/plans?select=id,cakto_url&limit=1`, { headers })
    return { ok: res.ok, status: res.status, table: 'plans.cakto_url' }
  }

  const checks = [
    await probe('checkout_settings', 'user_id'),
    await probe('checkout_orders'),
    await probePlansCakto(),
  ]

  let allOk = true
  for (const c of checks) {
    if (c.ok) {
      console.log(`✅ ${c.table} — OK`)
    } else {
      console.log(`❌ ${c.table} — HTTP ${c.status}`)
      allOk = false
    }
  }

  if (allOk) {
    console.log('\n✅ Migração checkout verificada com sucesso.')
    process.exit(0)
  }
  console.log('\n❌ Alguma verificação falhou. Revise o SQL no editor.')
  process.exit(1)
}

main().catch((e) => {
  console.error('❌ Erro:', e.message)
  process.exit(1)
})
