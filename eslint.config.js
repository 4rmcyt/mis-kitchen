import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const unusedVarsRule = ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }];

export default [
  { ignores: ['dist/**', 'node_modules/**', 'e2e/**'] },

  {
    ...js.configs.recommended,
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2020 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars':              unusedVarsRule,
      'no-var':                      'error',
      'prefer-const':                'error',
      'eqeqeq':                      ['error', 'always'],
      'no-async-promise-executor':   'error',
      'no-promise-executor-return':  'error',
      'no-console':                  ['warn', { allow: ['error', 'warn'] }],
    },
  },

  // React + hooks
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: '19' } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types':                'off',
      'react/self-closing-comp':         ['error', { component: true, html: false }],
      'react-hooks/rules-of-hooks':      'error',
      'react-hooks/exhaustive-deps':     'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },

  // TypeScript overrides
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parser: tsParser },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-unused-vars':                        'off',
      '@typescript-eslint/no-unused-vars':     unusedVarsRule,
      '@typescript-eslint/no-explicit-any':    'warn',
    },
  },
];
