/**
 * Setup para testes de integração (ambiente node + Next.js Web APIs).
 */
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:8080';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

if (typeof global.Request === 'undefined') {
  const primitives = require('next/dist/compiled/@edge-runtime/primitives');
  global.Request = primitives.Request;
  global.Response = primitives.Response;
  global.Headers = primitives.Headers;
  global.fetch = primitives.fetch;
}

const { webcrypto } = require('crypto');
if (!global.crypto?.subtle) {
  global.crypto = webcrypto;
}
