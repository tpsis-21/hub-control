/**
 * Insere filtro hubco_ no WF - Eventos - Gates2B (export live ou anexo).
 * Uso: node scripts/patch-n8n-eventos-hubco.js [caminho-json-entrada]
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const inputPath =
  process.argv[2] ||
  path.join(__dirname, 'n8n-eventos-gates2b-live.json')

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const nodes = raw.nodes
const connections = raw.connections || {}

const webhook = nodes.find((n) => n.name === 'Webhook Status Bpix')
const tratar = nodes.find((n) => n.name === 'Tratar Dados Bpix')
if (!webhook || !tratar) {
  console.error('Nós Webhook Status Bpix ou Tratar Dados Bpix não encontrados')
  process.exit(1)
}

const ifId = crypto.randomUUID()
const noopId = crypto.randomUUID()

const hubcoIf = {
  parameters: {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: '',
        typeValidation: 'strict',
        version: 2,
      },
      conditions: [
        {
          id: 'hubco-prefix-check',
          leftValue:
            "={{ String($json.body?.external_reference || $json.external_reference || '').trim() }}",
          rightValue: 'hubco_',
          operator: {
            type: 'string',
            operation: 'startsWith',
          },
        },
      ],
      combinator: 'and',
    },
    options: {},
  },
  type: 'n8n-nodes-base.if',
  typeVersion: 2.2,
  position: [
    (webhook.position[0] + tratar.position[0]) / 2,
    webhook.position[1],
  ],
  id: ifId,
  name: 'É checkout Hub Control (hubco_)?',
}

const hubcoNoop = {
  parameters: {},
  type: 'n8n-nodes-base.noOp',
  typeVersion: 1,
  position: [hubcoIf.position[0] + 280, hubcoIf.position[1] - 120],
  id: noopId,
  name: 'Ignorar — Hub Control (hubco_)',
}

// external_reference no Set para debug/rotas futuras
const tratarAssignments = tratar.parameters?.assignments?.assignments
if (Array.isArray(tratarAssignments)) {
  const hasExt = tratarAssignments.some((a) => a.name === 'external_reference')
  if (!hasExt) {
    tratarAssignments.push({
      id: crypto.randomUUID(),
      name: 'external_reference',
      value: "={{ $json.body.external_reference || '' }}",
      type: 'string',
    })
  }
}

nodes.push(hubcoIf, hubcoNoop)

connections['Webhook Status Bpix'] = {
  main: [[{ node: hubcoIf.name, type: 'main', index: 0 }]],
}

connections[hubcoIf.name] = {
  main: [
    [{ node: hubcoNoop.name, type: 'main', index: 0 }],
    [{ node: tratar.name, type: 'main', index: 0 }],
  ],
}

connections[hubcoNoop.name] = { main: [[]] }

const outPath = path.join(__dirname, 'n8n-eventos-gates2b-patched.json')
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      name: raw.name || 'WF - Eventos - Gates2B',
      nodes,
      connections,
      settings: raw.settings,
      pinData: raw.pinData,
    },
    null,
    2
  )
)

console.log('OK:', outPath)
console.log('Novos nós:', hubcoIf.name, '→', hubcoNoop.name, '| false →', tratar.name)
