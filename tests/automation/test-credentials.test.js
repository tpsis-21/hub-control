/**
 * Testes de Validação das Credenciais de Automação
 * Verifica se todas as credenciais de teste estão válidas e funcionais
 */

const fs = require('fs');
const path = require('path');

// Mock do ambiente de teste
process.env.NODE_ENV = 'test';

// Variável global para armazenar as variáveis de ambiente de teste
let testEnvVars;

// Carrega variáveis do .env.test antes de todos os testes
beforeAll(() => {
  const envTestPath = path.join(process.cwd(), '.env.test');
  
  if (fs.existsSync(envTestPath)) {
    const envContent = fs.readFileSync(envTestPath, 'utf8');
    testEnvVars = {};
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        testEnvVars[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
});

describe('Validação das Credenciais de Teste', () => {
  describe('Configurações do Supabase', () => {
    test('deve ter URL do Supabase válida', () => {
      expect(testEnvVars.NEXT_PUBLIC_SUPABASE_URL).toBeDefined();
      expect(testEnvVars.NEXT_PUBLIC_SUPABASE_URL).toMatch(/^https:\/\/.+\.supabase\.co$/);
    });

    test('deve ter chave anônima do Supabase válida', () => {
      expect(testEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
      expect(testEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY).toMatch(/^eyJ/); // JWT format
      expect(testEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY.length).toBeGreaterThan(100);
    });

    test('deve ter service role key do Supabase válida', () => {
      expect(testEnvVars.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
      expect(testEnvVars.SUPABASE_SERVICE_ROLE_KEY).toMatch(/^eyJ/); // JWT format
      expect(testEnvVars.SUPABASE_SERVICE_ROLE_KEY.length).toBeGreaterThan(100);
    });
  });

  describe('Configurações do NextAuth', () => {
    test('deve ter URL base configurada', () => {
      expect(testEnvVars.NEXTAUTH_URL).toBeDefined();
      expect(testEnvVars.NEXTAUTH_URL).toMatch(/^https?:\/\//);
    });

    test('deve ter secret do NextAuth configurado', () => {
      expect(testEnvVars.NEXTAUTH_SECRET).toBeDefined();
      expect(testEnvVars.NEXTAUTH_SECRET.length).toBeGreaterThan(32);
    });
  });

  describe('Credenciais de Usuários de Teste', () => {
    test('deve ter credenciais de usuário de teste', () => {
      expect(testEnvVars.TEST_USER_EMAIL).toBeDefined();
      expect(testEnvVars.TEST_USER_EMAIL).toMatch(/^.+@.+\..+$/);
      expect(testEnvVars.TEST_USER_PASSWORD).toBeDefined();
    });

    test('deve ter credenciais de admin de teste', () => {
      expect(testEnvVars.TEST_ADMIN_EMAIL).toBeDefined();
      expect(testEnvVars.TEST_ADMIN_EMAIL).toMatch(/^.+@.+\..+$/);
      expect(testEnvVars.TEST_ADMIN_PASSWORD).toBeDefined();
    });

    test('deve ter credenciais de usuário limitado', () => {
      expect(testEnvVars.TEST_LIMITED_USER_EMAIL).toBeDefined();
      expect(testEnvVars.TEST_LIMITED_USER_EMAIL).toMatch(/^.+@.+\..+$/);
      expect(testEnvVars.TEST_LIMITED_USER_PASSWORD).toBeDefined();
    });
  });

  describe('Configurações de API', () => {
    test('deve ter chaves de API configuradas', () => {
      expect(testEnvVars.TMDB_API_KEY).toBeDefined();
      expect(testEnvVars.BOT_API_TOKEN).toBeDefined();
      expect(testEnvVars.NATV_API_KEY).toBeDefined();
    });
  });

  describe('Configurações de Notificação', () => {
    test('deve ter chaves VAPID configuradas', () => {
      expect(testEnvVars.NEXT_PUBLIC_VAPID_PUBLIC_KEY).toBeDefined();
      expect(testEnvVars.VAPID_PRIVATE_KEY).toBeDefined();
    });
  });

  describe('Configurações de Email', () => {
    test('deve ter configurações SMTP válidas', () => {
      expect(testEnvVars.SMTP_HOST).toBeDefined();
      expect(testEnvVars.SMTP_PORT).toBeDefined();
      expect(testEnvVars.SMTP_USER).toBeDefined();
      expect(testEnvVars.SMTP_PASS).toBeDefined();
      
      const port = parseInt(testEnvVars.SMTP_PORT);
      expect(port).toBeGreaterThan(0);
      expect(port).toBeLessThan(65536);
    });
  });

  describe('Configurações de Ambiente', () => {
    test('deve estar configurado para ambiente de teste', () => {
      expect(testEnvVars.NODE_ENV).toBe('test');
      expect(testEnvVars.DATABASE_URL).toBeDefined();
      expect(testEnvVars.DATABASE_URL).toContain('test');
    });
  });

  describe('Configurações de Segurança', () => {
    test('deve ter chave de criptografia configurada', () => {
      expect(testEnvVars.ENCRYPTION_KEY).toBeDefined();
      expect(testEnvVars.ENCRYPTION_KEY.length).toBeGreaterThanOrEqual(32);
    });
  });

  describe('Configurações de Rate Limiting', () => {
    test('deve ter configurações permissivas para automação', () => {
      if (testEnvVars.RATE_LIMIT_MAX_REQUESTS) {
        const maxRequests = parseInt(testEnvVars.RATE_LIMIT_MAX_REQUESTS);
        expect(maxRequests).toBeGreaterThan(1000);
      }
    });
  });

  describe('Configurações de CORS', () => {
    test('deve permitir origens de desenvolvimento', () => {
      expect(testEnvVars.ALLOWED_ORIGINS).toBeDefined();
      expect(testEnvVars.ALLOWED_ORIGINS).toContain('localhost');
    });
  });

  describe('Configurações de Monitoramento', () => {
    test('deve ter monitoramento desabilitado para testes', () => {
      expect(testEnvVars.MONITORING_ENABLED).toBe('false');
      expect(testEnvVars.BACKUP_ENABLED).toBe('false');
      expect(testEnvVars.CACHE_ENABLED).toBe('false');
    });
  });
});

describe('Validação de Estrutura JWT', () => {
  function isValidJWTStructure(token) {
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    try {
      parts.forEach(part => {
        if (part.length === 0) throw new Error('Empty part');
        const padded = part + '='.repeat((4 - part.length % 4) % 4);
        atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
      });
      return true;
    } catch {
      return false;
    }
  }

  test('chaves JWT devem ter estrutura válida', () => {
    const jwtKeys = [
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    jwtKeys.forEach(key => {
      const token = testEnvVars[key];
      if (token) {
        expect(isValidJWTStructure(token)).toBe(true);
      }
    });
  });
});

describe('Validação de Segurança das Credenciais', () => {
  test('não deve conter indicadores de produção', () => {
    const productionIndicators = [
      'prod',
      'production', 
      'live',
      'real',
      'actual'
    ];

    Object.entries(testEnvVars || {}).forEach(([key, value]) => {
      if (typeof value === 'string') {
        productionIndicators.forEach(indicator => {
          expect(value.toLowerCase()).not.toContain(indicator);
        });
      }
    });
  });

  test('deve usar indicadores de teste nas credenciais', () => {
    const testIndicators = ['test', 'automation', 'mock', 'fake', 'demo'];
    
    let hasTestIndicators = false;
    
    Object.entries(testEnvVars || {}).forEach(([key, value]) => {
      if (typeof value === 'string') {
        testIndicators.forEach(indicator => {
          if (value.toLowerCase().includes(indicator)) {
            hasTestIndicators = true;
          }
        });
      }
    });
    
    expect(hasTestIndicators).toBe(true);
  });

  test('senhas devem atender critérios mínimos de segurança', () => {
    const passwordFields = [
      'TEST_ADMIN_PASSWORD',
      'TEST_USER_PASSWORD', 
      'TEST_LIMITED_USER_PASSWORD'
    ];

    passwordFields.forEach(field => {
      const password = testEnvVars?.[field];
      if (password) {
        expect(password.length).toBeGreaterThanOrEqual(8);
        expect(password).toMatch(/[A-Z]/);
        expect(password).toMatch(/[a-z]/);
        expect(password).toMatch(/[0-9]/);
        expect(password).toMatch(/[!@#$%^&*]/);
      }
    });
  });
});