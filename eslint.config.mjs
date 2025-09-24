import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.vite/**',
      'apps/renderer/dist/**',
      'packages/ai-integration/src/mcp/tools.ts',
      'packages/storage/temp-types/**',
    ],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    rules: {
      // TypeScript recommended
      ...(tsPlugin.configs.recommended?.rules || {}),
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      // Import ordering
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
        },
      ],
    },
  },
  // TypeScript-specific rule adjustments
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Types are erased at runtime; core rule misfires on TS types
      'no-undef': 'off',
      // Keep as warnings to avoid blocking commits for placeholder code
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Allow temporary empty blocks during development
      'no-empty': 'warn',
    },
  },
  // Renderer (browser) environment
  {
    files: ['apps/renderer/**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        React: 'readonly',
      },
    },
  },
  // Desktop (Electron main) uses Node.js globals
  {
    files: ['apps/desktop/**/*.{ts,js}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  // Node-based config/build scripts (Vite, ts configs, etc.)
  {
    files: [
      '**/vite.config.{ts,js}',
      '**/tsup.config.{ts,js}',
      '**/tsconfig*.{ts,js}',
      '**/*.config.{ts,js}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        __dirname: 'readonly',
      },
    },
  },
  // Disable formatting-related rules (let Prettier handle formatting)
  prettier,
];
