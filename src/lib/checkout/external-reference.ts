const PREFIX = 'hubco_'

export function buildCheckoutExternalReference(orderId: string): string {
  return `${PREFIX}${orderId.replace(/-/g, '')}`
}

/** Usado no roteamento n8n → Hub (prefixo na cobrança Gates2b). */
export function isHubControlCheckoutExternalReference(
  externalReference: string | undefined | null
): boolean {
  if (!externalReference || typeof externalReference !== 'string') return false
  return externalReference.trim().startsWith(PREFIX)
}

export function parseCheckoutExternalReference(
  externalReference: string | undefined | null
): string | null {
  if (!externalReference || typeof externalReference !== 'string') return null
  const trimmed = externalReference.trim()
  if (!trimmed.startsWith(PREFIX)) return null
  const raw = trimmed.slice(PREFIX.length)
  if (!/^[0-9a-f]{32}$/i.test(raw)) return null
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`
}
