/**
 * Gera código SDK para update_workflow (n8n MCP) a partir do JSON patcheado.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const patched = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'n8n-eventos-gates2b-patched.json'), 'utf8')
)

function esc(str) {
  return JSON.stringify(str)
}

function varName(name) {
  return (
    'n_' +
    name
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 40) +
    '_' +
    Math.random().toString(36).slice(2, 6)
  )
}

const nameToVar = new Map()
for (const n of patched.nodes) {
  nameToVar.set(n.name, varName(n.name))
}

const lines = []
lines.push(`import { workflow, node, trigger, ifElse } from '@n8n/workflow-sdk';`)
lines.push('')

for (const n of patched.nodes) {
  const v = nameToVar.get(n.name)
  const isWebhook = n.type === 'n8n-nodes-base.webhook'
  const factory = isWebhook ? 'trigger' : 'node'
  const cfg = {
    name: n.name,
    parameters: n.parameters ?? {},
    position: n.position,
  }
  if (n.credentials) cfg.credentials = n.credentials
  if (n.onError) cfg.onError = n.onError
  if (n.disabled) cfg.disabled = n.disabled
  if (n.executeOnce) cfg.executeOnce = n.executeOnce

  lines.push(
    `const ${v} = ${factory}({ type: ${esc(n.type)}, version: ${n.typeVersion}, config: ${JSON.stringify(cfg)} });`
  )
}

lines.push('')
lines.push(`const __connections = ${JSON.stringify(patched.connections)};`)
lines.push(`const __nodesByName = {`)
for (const [name, v] of nameToVar) {
  lines.push(`  ${esc(name)}: ${v},`)
}
lines.push(`};`)
lines.push('')
lines.push(`function wire(connections) {`)
lines.push(`  const w = workflow('qCddX1iNW4lBs3cE', 'WF - Eventos - Gates2B');`)
lines.push(`  for (const [fromName, conn] of Object.entries(connections)) {`)
lines.push(`    const from = __nodesByName[fromName];`)
lines.push(`    if (!from || !conn?.main) continue;`)
lines.push(`    conn.main.forEach((outputs, outIdx) => {`)
lines.push(`      outputs.forEach((target) => {`)
lines.push(`        const to = __nodesByName[target.node];`)
lines.push(`        if (!to) return;`)
lines.push(`        if (from.config?.name === 'É checkout Hub Control (hubco_)?') {`)
lines.push(`          if (outIdx === 0) w.add(from).to(to);`)
lines.push(`          else w.add(from).to(to);`)
lines.push(`        } else {`)
lines.push(`          w.add(from).to(to);`)
lines.push(`        }`)
lines.push(`      });`)
lines.push(`    });`)
lines.push(`  }`)
lines.push(`  return w;`)
lines.push(`}`)
lines.push('')
lines.push(`export default wire(__connections);`)

const out = path.join(__dirname, 'n8n-eventos-gates2b-update.mjs')
fs.writeFileSync(out, lines.join('\n'))
console.log('Wrote', out, 'bytes', fs.statSync(out).size)
