const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/src/__tests__/integration/',
    '<rootDir>/tests/automation/',
    '<rootDir>/src/pages/',
    '<rootDir>/src/app/(app)/testes/add-test-form.test.tsx',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(isows|@supabase|ws|@types)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^lucide-react$': '<rootDir>/__mocks__/lucide-react.js',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^next/cache$': '<rootDir>/__mocks__/next-cache.js',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/app/**/page.tsx',
    '!src/app/**/loading.tsx',
    '!src/app/**/error.tsx',
    '!src/app/**/not-found.tsx',
    '!src/lib/supabase-client.ts',
    '!src/middleware.ts',
    '!**/*.stories.*',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  resetMocks: true,
  clearMocks: true,
}

module.exports = createJestConfig(customJestConfig)
