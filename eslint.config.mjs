import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', '.scratch/**', 'node_modules/**', 'next-env.d.ts', '.playwright-cli/**']),
  { rules: { '@next/next/no-img-element': 'off', 'react-hooks/set-state-in-effect': 'off', '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } },
  {
    files: ['src/components/**', 'src/views/**'],
    rules: {
      // The inherited editor keeps its existing contracts in this migration lot.
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
]);
