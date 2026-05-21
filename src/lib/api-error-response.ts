/**
 * Respostas de API — não expor detalhes internos em 5xx em produção (P2.2).
 */

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Remove `details` de payloads JSON em erros 5xx quando em produção. */
export function stripInternalDetailsForResponse<T extends Record<string, unknown>>(
  body: T,
  status: number
): T {
  if (status < 500 || !isProductionRuntime() || !('details' in body)) {
    return body;
  }
  const { details: _removed, ...safe } = body;
  return safe as T;
}
