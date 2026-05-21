require('@testing-library/jest-dom');

// Mock para IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock para ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock para matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock para window.location - versão simplificada e robusta
const mockLocation = {
  href: 'http://localhost:3000/',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
  toString: jest.fn(() => 'http://localhost:3000/'),
  ancestorOrigins: {
    length: 0,
    contains: jest.fn(() => false),
    item: jest.fn(() => null)
  }
};

// Configurar apenas global.location para evitar conflitos
global.location = mockLocation;

// Mock para localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock para sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock para fetch
global.fetch = jest.fn();

// Mock para console.warn e console.error para testes mais limpos
const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.clearAllMocks();
});

// Mock para crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mocked-uuid-1234-5678-9012')
  }
});

// Mock para URL
global.URL = class URL {
  constructor(url, base) {
    this.href = url;
    this.origin = base || 'http://localhost:3000';
    this.protocol = 'http:';
    this.host = 'localhost:3000';
    this.hostname = 'localhost';
    this.port = '3000';
    this.pathname = '/';
    this.search = '';
    this.hash = '';
  }
  
  toString() {
    return this.href;
  }
};

// Mock para URLSearchParams
global.URLSearchParams = class URLSearchParams {
  constructor(params) {
    this.params = new Map();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        this.params.set(key, value);
      });
    }
  }
  
  get(key) {
    return this.params.get(key);
  }
  
  set(key, value) {
    this.params.set(key, value);
  }
  
  has(key) {
    return this.params.has(key);
  }
  
  delete(key) {
    this.params.delete(key);
  }
  
  toString() {
    const entries = Array.from(this.params.entries());
    return entries.map(([key, value]) => `${key}=${value}`).join('&');
  }
};

// Mock para TextEncoder/TextDecoder
global.TextEncoder = class TextEncoder {
  encode(str) {
    return new Uint8Array(Buffer.from(str, 'utf8'));
  }
};

global.TextDecoder = class TextDecoder {
  decode(buffer) {
    return Buffer.from(buffer).toString('utf8');
  }
};

// Mock para Supabase para evitar problemas de módulos ES6
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null })
    }))
  }))
}));

// Mock para isows
jest.mock('isows', () => ({
  WebSocket: class MockWebSocket {
    constructor() {}
    close() {}
    send() {}
  }
}));

// Configuração adicional para testes de segurança
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key-for-jest';