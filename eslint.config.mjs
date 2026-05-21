import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'anexos/**',
      'erros supabase/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'tests/**',
      'scripts/**',
      '**/__tests__/**',
      '**/*.test.{ts,tsx,js}',
      '**/*.spec.{ts,tsx}',
      'src/pages/**',
      'tailwind.config.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      // Textos PT-BR em JSX com aspas literais — baixo risco; evita centenas de falsos positivos
      'react/no-unescaped-entities': 'off',
    },
  },
];
