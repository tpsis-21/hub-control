const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.node.js'],
  testMatch: ['<rootDir>/src/__tests__/integration/**/*.{test,spec}.{js,ts}'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  resetMocks: true,
  clearMocks: true,
};

module.exports = createJestConfig(customJestConfig);
