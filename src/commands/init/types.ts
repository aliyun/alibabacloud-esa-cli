import { ArgumentsCamelCase } from 'yargs';

export type InitArgv = ArgumentsCamelCase & initParams;

export interface initParams {
  name: string; // project name eg. edge-routine-123
  template?: string; // template path
  framework?: 'react' | 'vue' | 'nextjs' | 'react-router' | 'astro';
  language?: 'typescript' | 'javascript';
  git?: boolean; // true/false
  deploy?: boolean; // true/false
  category?: 'framework' | 'template';
  yes?: boolean;
  skip?: boolean;
  installEsaCli?: boolean;
}

export type FileEdit = {
  /**
   * Target path matcher relative to project root, e.g. "next.config.{ts,js,mjs}"
   */
  match: string;
  /**
   * Matcher type
   */
  matchType: 'exact' | 'glob' | 'regex';
  /**
   * Operation type. Currently only 'overwrite' is supported for 方式1
   */
  action: 'overwrite';
  /**
   * Inline content to write. If both provided, fromFile takes precedence
   */
  content?: string;
  /**
   * Source file relative to init module directory (src/commands/init)
   */
  fromFile?: string;
  /**
   * Create file if missing. Default: true
   */
  createIfMissing?: boolean;
  /**
   * Conditional execution
   */
  when?: {
    language?: 'typescript' | 'javascript';
  };
};

/**
 * 获取template.jsonc配置
 * @param framework 框架名称
 * @returns 框架配置
 */

export type FrameworkConfig = {
  label: string;
  command: string;
  interactive?: boolean;
  useGit?: boolean; // is skip git
  hint?: string;
  /**
   * Extra params appended after project name, e.g. "--no-install"
   */
  params?: string;
  language?: {
    typescript?: string;
    javascript?: string;
  };
  assets?: {
    directory: string;
    notFoundStrategy: string;
  };
  /**
   * Post-scaffold file operations
   */
  fileEdits?: FileEdit[];
};
