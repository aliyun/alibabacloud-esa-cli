# ESLint Configuration Guide

This project has been configured with ESLint to check code quality, including the following features:

## Configured Check Rules

### 1. Import Order Check

- **Rule**: `import/order`
- **Function**: Automatically sorts import statements in the following order:
  1. Node.js built-in modules (e.g., `fs`, `path`)
  2. Third-party modules (e.g., `react`, `lodash`)
  3. Internal modules (project internal files)
  4. Parent modules (`../`)
  5. Sibling modules (`./`)
  6. Index files in current directory
- **Format**: Empty lines between groups, sorted alphabetically

### 2. Quote Check

- **Rule**: `quotes`, `@typescript-eslint/quotes`
- **Function**: Enforces single quotes
- **Exceptions**: Allows double quotes when escaping is needed, supports template literals

### 3. Unused Variables Check

- **Rule**: `@typescript-eslint/no-unused-vars`
- **Function**: Checks for unused variables, parameters, and imports
- **Exceptions**: Variables starting with `_` are ignored (e.g., `_unusedVariable`)

### 4. Other Checks

- **Duplicate Import Check**: `import/no-duplicates`
- **Unused Expression Check**: `no-unused-expressions`
- **TypeScript Type Check**: Warns against using `any` type

## Usage

### Check Code
```bash
npm run eslint
```

### Auto Fix
```bash
npm run eslint -- --fix
```

### Check Specific Files
```bash
npx eslint src/commands/example.ts
```

## Configuration Details

The configuration file is located at `.eslintrc.cjs` and includes:

- **Parser**: `@typescript-eslint/parser` for parsing TypeScript code
- **Plugins**:
  - `react` and `react-hooks` for React-related checks
  - `import` for import-related checks
  - `@typescript-eslint` for TypeScript-specific checks
- **Rules**: Detailed code quality rule configurations
- **Settings**: TypeScript import resolver configuration

## Notes

1. If you encounter TypeScript version warnings, this is normal and doesn't affect functionality
2. Unused variables should be prefixed with `_` so ESLint will ignore them
3. Auto-fix can resolve most formatting issues, but logic issues need manual fixes
