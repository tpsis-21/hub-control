/**
 * Aplica filtro hubco_ no WF - Eventos - Gates2B via API n8n (patch cirúrgico no workflow live).
 * Requer N8N_API_URL e N8N_API_KEY.
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKFLOW_ID = 'qCddX1iNW4lBs3cE'
const baseUrl = (process.env.N8N_API_URL || 'https://n8n.tplay21.in').replace(/\/$/, '')
const apiKey = process.env.N8N_API_KEY

if (!apiKey) {
  console.error('Defina N8N_API_KEY')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-N8N-API-KEY': apiKey,
}

function patchWorkflow(workflow) {
  const nodes = [...workflow.nodes]
  const connections = { ...workflow.connections }

  const hubcoIfName = 'É checkout Hub Control (hubco_)?'
  const hubcoNoopName = 'Ignorar — Hub Control (hubco_)'

  if (nodes.some((n) => n.name === hubcoIfName)) {
    return { nodes, connections, alreadyPatched: true }
  }

  const webhook = nodes.find((n) => n.name === 'Webhook Status Bpix')
  const tratar = nodes.find((n) => n.name === 'Tratar Dados Bpix')
  if (!webhook || !tratar) {
    throw new Error('Nós Webhook Status Bpix ou Tratar Dados Bpix não encontrados')
  }

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
            operator: { type: 'string', operation: 'startsWith' },
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
    id: crypto.randomUUID(),
    name: hubcoIfName,
  }

  const hubcoNoop = {
    parameters: {},
    type: 'n8n-nodes-base.noOp',
    typeVersion: 1,
    position: [hubcoIf.position[0] + 280, hubcoIf.position[1] - 120],
    id: crypto.randomUUID(),
    name: hubcoNoopName,
  }

  const assignments = tratar.parameters?.assignments?.assignments
  if (Array.isArray(assignments) && !assignments.some((a) => a.name === 'external_reference')) {
    assignments.push({
      id: crypto.randomUUID(),
      name: 'external_reference',
      value: "={{ $json.body.external_reference || '' }}",
      type: 'string',
    })
  }

  nodes.push(hubcoIf, hubcoNoop)

  connections['Webhook Status Bpix'] = {
    main: [[{ node: hubcoIfName, type: 'main', index: 0 }]],
  }
  connections[hubcoIfName] = {
    main: [
      [{ node: hubcoNoopName, type: 'main', index: 0 }],
      [{ node: tratar.name, type: 'main', index: 0 }],
    ],
  }
  connections[hubcoNoopName] = { main: [[]] }

  return { nodes, connections, alreadyPatched: false }
}

const getRes = await fetch(`${baseUrl}/api/v1/workflows/${WORKFLOW_ID}`, { headers })
if (!getRes.ok) {
  console.error('GET failed', getRes.status, await getRes.text())
  process.exit(1)
}
const current = await getRes.json()

const { nodes, connections, alreadyPatched } = patchWorkflow(current)

if (alreadyPatched) {
  const hasRef = current.nodes
    ?.find((n) => n.name === 'Tratar Dados Bpix')
    ?.parameters?.assignments?.assignments?.some((a) => a.name === 'external_reference')
  console.log('OK: patch hubco_ já está no workflow', WORKFLOW_ID)
  console.log('  - nós hubco_: presentes')
  console.log('  - external_reference em Tratar Dados Bpix:', hasRef ? 'sim' : 'não')
  console.log('  - ativo:', current.active)
  process.exit(0)
}

const allowedSettings = [
  'executionOrder',
  'timezone',
  'saveDataErrorExecution',
  'saveDataSuccessExecution',
  'saveManualExecutions',
  'saveExecutionProgress',
  'callerPolicy',
  'errorWorkflow',
]
const settings = {}
const rawSettings = current.settings ?? {}
for (const key of allowedSettings) {
  if (rawSettings[key] !== undefined) settings[key] = rawSettings[key]
}

const body = {
  name: current.name,
  nodes,
  connections,
  ...(Object.keys(settings).length > 0 ? { settings } : {}),
  ...(current.staticData != null ? { staticData: current.staticData } : {}),
}

const putRes = await fetch(`${baseUrl}/api/v1/workflows/${WORKFLOW_ID}`, {
  method: 'PUT',
  headers,
  body: JSON.stringify(body),
})

const text = await putRes.text()
if (!putRes.ok) {
  console.error('PUT failed', putRes.status, text)
  process.exit(1)
}

const result = JSON.parse(text)
const hasHubco = result.nodes?.some((n) => n.name?.includes('hubco_'))
console.log('OK:', result.id, result.name)
console.log('nodes:', result.nodes?.length, alreadyPatched ? '(já existia)' : '(patch aplicado)')
console.log('filtro hubco_:', hasHubco ? 'presente' : 'AUSENTE — verificar')
