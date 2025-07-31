# ESLint 配置说明

本项目已配置ESLint来检查代码质量，包括以下功能：

## 已配置的检查规则

### 1. Import 排序检查

- **规则**: `import/order`
- **功能**: 自动排序import语句，按照以下顺序：
  1. Node.js 内置模块 (如 `fs`, `path`)
  2. 第三方模块 (如 `react`, `lodash`)
  3. 内部模块 (项目内部文件)
  4. 父级模块 (`../`)
  5. 同级模块 (`./`)
  6. 当前目录的 index 文件
- **格式**: 每组之间用空行分隔，按字母顺序排列

### 2. 引号检查

- **规则**: `quotes`, `@typescript-eslint/quotes`
- **功能**: 强制使用单引号
- **例外**: 允许在需要转义的情况下使用双引号，支持模板字符串

### 3. 多余变量检查

- **规则**: `@typescript-eslint/no-unused-vars`
- **功能**: 检查未使用的变量、参数和导入
- **例外**: 以 `_` 开头的变量会被忽略（如 `_unusedVariable`）

### 4. 其他检查

- **重复导入检查**: `import/no-duplicates`
- **未使用表达式检查**: `no-unused-expressions`
- **TypeScript类型检查**: 警告使用 `any` 类型

## 使用方法

### 检查代码

```bash
npm run eslint
```

### 自动修复

```bash
npm run eslint -- --fix
```

### 检查特定文件

```bash
npx eslint src/commands/example.ts
```

## 配置说明

配置文件位于 `.eslintrc.cjs`，主要包含：

- **解析器**: `@typescript-eslint/parser` 用于解析TypeScript代码
- **插件**:
  - `react` 和 `react-hooks` 用于React相关检查
  - `import` 用于import相关检查
  - `@typescript-eslint` 用于TypeScript特定检查
- **规则**: 详细的代码质量规则配置
- **设置**: TypeScript import解析器配置

## 注意事项

1. 如果遇到TypeScript版本警告，这是正常的，不影响功能
2. 未使用的变量请以 `_` 开头命名，这样ESLint会忽略它们
3. 自动修复功能可以解决大部分格式问题，但逻辑问题需要手动修复
