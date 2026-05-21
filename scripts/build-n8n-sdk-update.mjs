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

const nodesByName = Object.fromEntries(patched.nodes.map((n) => [n.name, n]))
const connections = patched.connections

function safeVar(name) {
  let v =
    'n_' +
    name
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 48)
  if (/^\d/.test(v)) v = 'n_' + v
  return v
}

const nameToVar = new Map()
for (const n of patched.nodes) {
  let v = safeVar(n.name)
  while ([...nameToVar.values()].includes(v)) v += '_x'
  nameToVar.set(n.name, v)
}

const lines = []
lines.push(`import { workflow, node, trigger, ifElse, switchCase } from '@n8n/workflow-sdk';`)
lines.push('')

for (const n of patched.nodes) {
  const v = nameToVar.get(n.name)
  const isWebhook = n.type === 'n8n-nodes-base.webhook'
  const factory = isWebhook ? 'trigger' : n.type === 'n8n-nodes-base.if' ? 'ifElse' : n.type === 'n8n-nodes-base.switch' ? 'switchCase' : 'node'
  const cfg = {
    name: n.name,
    parameters: n.parameters ?? {},
    position: n.position,
  }
  if (n.credentials) cfg.credentials = n.credentials
  if (n.onError) cfg.onError = n.onError
  if (n.disabled) cfg.disabled = n.disabled
  if (n.executeOnce) cfg.executeOnce = n.executeOnce

  const version = n.typeVersion
  lines.push(
    `const ${v} = ${factory}({ type: ${JSON.stringify(n.type)}, version: ${version}, config: ${JSON.stringify(cfg)} });`
  )
}

const chainLines = []
const visitedPairs = new Set()

function chainExpr(fromName) {
  const outs = connections[fromName]?.main
  if (!outs || outs.length === 0) return null

  const fromNode = nodesByName[fromName]
  const fromVar = nameToVar.get(fromName)

  if (fromNode?.type === 'n8n-nodes-base.if' || fromNode?.type === 'n8n-nodes-base.switch') {
    return null
  }

  const targets = outs[0] ?? []
  if (targets.length === 0) return null
  if (targets.length === 1) {
    const t = targets[0].node
    const down = buildToChain(t)
    return down ? `${fromVar}.to(${down})` : fromVar
  }
  return null
}

function buildToChain(startName, depth = 0) {
  if (depth > 40) return nameToVar.get(startName)
  const n = nodesByName[startName]
  const v = nameToVar.get(startName)
  if (!n) return null

  if (n.type === 'n8n-nodes-base.if') {
    const outs = connections[startName]?.main ?? []
    const trueT = outs[0]?.[0]?.node
    const falseT = outs[1]?.[0]?.node
    const trueChain = trueT ? buildToChain(trueT, depth + 1) : null
    const falseChain = falseT ? buildToChain(falseT, depth + 1) : null
    let expr = v
    if (trueChain) expr += `.onTrue(${trueChain})`
    if (falseChain) expr += `.onFalse(${falseChain})`
    return expr
  }

  if (n.type === 'n8n-nodes-base.switch') {
    const outs = connections[startName]?.main ?? []
    let expr = v
    outs.forEach((branch, idx) => {
      const first = branch?.[0]?.node
      if (first) {
        const c = buildToChain(first, depth + 1)
        if (c) expr += `.onCase(${idx}, ${c})`
      }
    })
    return expr
  }

  const outs = connections[startName]?.main?.[0] ?? []
  if (outs.length === 1) {
    const next = outs[0].node
    const nextChain = buildToChain(next, depth + 1)
    return nextChain ? `${v}.to(${nextChain})` : v
  }
  return v
}

const webhookVar = nameToVar.get('Webhook Status Bpix')
const hubcoIfVar = nameToVar.get('É checkout Hub Control (hubco_)?')
const hubcoNoopVar = nameToVar.get('Ignorar — Hub Control (hubco_)')
const tratarVar = nameToVar.get('Tratar Dados Bpix')
const tratarDown = buildToChain('Tratar Dados Bpix')

const extraAdds = []

// Parallel / error branches: .add(source).to(target)
for (const [fromName, conn] of Object.entries(connections)) {
  if (!conn?.main) continue
  const fromVar = nameToVar.get(fromName)
  conn.main.forEach((outputs, outIdx) => {
    if (!outputs) return
    const fromNode = nodesByName[fromName]
    if (fromNode?.type === 'n8n-nodes-base.if' || fromNode?.type === 'n8n-nodes-base.switch') {
      return
    }
    outputs.forEach((target) => {
      const key = `${fromName}|${outIdx}|${target.node}`
      if (visitedPairs.has(key)) return
      visitedPairs.add(key)
      const toVar = nameToVar.get(target.node)
      if (!toVar || fromName === 'Webhook Status Bpix') return
      if (fromName === 'Tratar Dados Bpix' && target.node === 'Pagamento confirmado?') return
      extraAdds.push(`  .add(${fromVar}).to(${toVar})`)
    })
  })
}

// IF/Switch branches via .add().to() for non-primary outputs
for (const [fromName, conn] of Object.entries(connections)) {
  const fromNode = nodesByName[fromName]
  if (fromNode?.type !== 'n8n-nodes-base.if' && fromNode?.type !== 'n8n-nodes-base.switch') continue
  const fromVar = nameToVar.get(fromName)
  conn.main?.forEach((outputs, outIdx) => {
    outputs?.forEach((target) => {
      const toVar = nameToVar.get(target.node)
      if (!toVar) return
      const key = `ifsw|${fromName}|${outIdx}|${target.node}`
      if (visitedPairs.has(key)) return
      visitedPairs.add(key)
      if (fromNode.type === 'n8n-nodes-base.if' && outIdx === 0 && fromName === 'É checkout Hub Control (hubco_)?') return
      if (fromNode.type === 'n8n-nodes-base.if' && outIdx === 1 && fromName === 'É checkout Hub Control (hubco_)?') return
      extraAdds.push(`  .add(${fromVar}).to(${toVar})`)
    })
  })
}

lines.push('')
lines.push(`export default workflow('qCddX1iNW4lBs3cE', 'WF - Eventos - Gates2B')`)
lines.push(`  .add(${webhookVar})`)
lines.push(
  `  .to(${hubcoIfVar}.onTrue(${hubcoNoopVar}).onFalse(${tratarDown || tratarVar}))`
)
for (const addLine of extraAdds) {
  lines.push(addLine)
}
lines.push(';')

const outPath = path.join(__dirname, 'n8n-eventos-gates2b-update-code.mjs')
fs.writeFileSync(outPath, lines.join('\n'))
console.log('Wrote', outPath, fs.statSync(outPath).size, 'bytes')
