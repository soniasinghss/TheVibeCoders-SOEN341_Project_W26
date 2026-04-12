module.exports = {
  root: true,
  extends: ['google'],
  parserOptions: {
    ecmaVersion: 2022,
  },
  ignorePatterns: ['node_modules/'],
  rules: {
    'linebreak-style': 'off',
    'max-len': 'off',
    'require-jsdoc': 'off',
    'guard-for-in': 'off',
    'no-unused-vars': ['warn', {'argsIgnorePattern': '^_'}],
    'new-cap': ['error', {'capIsNewExceptions': ['Router']}],
  },
  overrides: [
    {
      files: ['src/**/*.js', 'tests/**/*.js'],
      env: {
        es2022: true,
        node: true,
        jest: true,
      },
      parserOptions: {
        sourceType: 'module',
      },
    },
  ],
};
