module.exports = {
  parser: '@typescript-eslint/parser',
  root: true,
  ignorePatterns: ['dist', '.eslintrc.cjs', 'devEntry.js', 'mock'],
  plugins: ['react', 'react-hooks'],
  overrides: [
    {
      files: 'src/**/*.ts',
      excludedFiles: '*.test.ts',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: true
      }
    }
  ],
  rules: {
    'no-console': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'space-before-function-paren': 'off'
  },
  globals: {
    NodeJS: true
  }
};
