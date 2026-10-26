const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'storage/**', 'docs/screenshots/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['public/**/*.js', 'demo/public/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser },
    },
  },
  {
    files: ['docker/mongo/*.js'],
    languageOptions: {
      globals: { db: 'readonly', print: 'readonly' },
    },
  },
];
