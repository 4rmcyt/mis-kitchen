module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: '18.3' } },
  rules: {
    'no-unused-vars':              ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-var':                      'error',
    'prefer-const':                'error',
    'eqeqeq':                      ['error', 'always'],
    'no-async-promise-executor':   'error',
    'no-promise-executor-return':  'error',
    'no-console':                  ['warn', { allow: ['error', 'warn'] }],
    'react/prop-types':            'off',
    'react/self-closing-comp':     ['error', { component: true, html: false }],
    'react-hooks/rules-of-hooks':  'error',
    'react-hooks/exhaustive-deps': 'off',
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/purity': 'off',
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
}
