import { NextRequest } from 'next/server';

export type ParsedResponse<T = unknown> = {
  status: number;
  json: T;
};

export function createRequest(
  path: string,
  options: {
    method?: string;
    body?: string | object;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const url = path.startsWith('http') ? path : `http://localhost:8080${path}`;
  const headers = new Headers(options.headers);

  let body: string | undefined;
  if (typeof options.body === 'string') {
    body = options.body;
  } else if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
  }

  return new NextRequest(url, {
    method: options.method ?? 'GET',
    headers,
    body,
  });
}

export async function parseResponse<T = Record<string, unknown>>(
  response: Response
): Promise<ParsedResponse<T>> {
  const json = (await response.json()) as T;
  return { status: response.status, json };
}
