module.exports = {
  parser: '@typescript-eslint/parser',
  root: true,
  ignorePatterns: ['dist', '.eslintrc.cjs', 'devEntry.js', 'mock'],
  plugins: ['react', 'react-hooks', 'import', '@typescript-eslint'],
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
    // 基础规则
    'no-console': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'space-before-function-paren': 'off',

    // 引号检查 - 强制使用单引号
    quotes: [
      'error',
      'single',
      { avoidEscape: true, allowTemplateLiterals: true }
    ],
    '@typescript-eslint/quotes': [
      'error',
      'single',
      { avoidEscape: true, allowTemplateLiterals: true }
    ],

    // 多余变量检查
    'no-unused-vars': 'off', // 关闭基础规则，使用TypeScript版本
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }
    ],
    'no-unused-expressions': 'error',

    // Import 排序和检查
    'import/order': [
      'error',
      {
        groups: [
          'builtin', // Node.js 内置模块
          'external', // 第三方模块
          'internal', // 内部模块
          'parent', // 父级模块
          'sibling', // 同级模块
          'index' // 当前目录的 index 文件
        ],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true
        }
      }
    ],
    'import/no-unresolved': 'off', // 在TypeScript项目中关闭，由TypeScript编译器处理
    'import/no-duplicates': 'error',
    'import/no-unused-modules': 'off', // 在开发环境中可能产生误报

    // TypeScript 特定规则
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-inferrable-types': 'error'
  },
  globals: {
    NodeJS: true
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  }
};
