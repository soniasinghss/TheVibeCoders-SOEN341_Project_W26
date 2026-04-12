module.exports = {
  root: true,
  extends: ['google'],
  env: {
    es2022: true,
    browser: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script',
  },
  rules: {
    'linebreak-style': 'off',
    'max-len': 'off',
    'require-jsdoc': 'off',
    'no-unused-vars': ['warn', {'argsIgnorePattern': '^_'}],
  },
};
