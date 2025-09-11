import { execSync } from 'child_process';
import path from 'path';
import { exit } from 'process';

import { confirm as clackConfirm, isCancel, log, outro } from '@clack/prompts';
import chalk from 'chalk';
import fs from 'fs-extra';
import Haikunator from 'haikunator';
import { ArgumentsCamelCase } from 'yargs';

import { SelectItem } from '../../components/mutiLevelSelect.js';
import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import Template from '../../libs/templates/index.js';
import { execCommand } from '../../utils/command.js';
import { getDirName } from '../../utils/fileUtils/base.js';
import {
  generateConfigFile,
  getCliConfig,
  getProjectConfig,
  getTemplatesConfig,
  templateHubPath,
  TemplateItem,
  updateProjectConfigFile
} from '../../utils/fileUtils/index.js';
import promptParameter from '../../utils/prompt.js';
import { commitAndDeployVersion } from '../common/utils.js';

import { FrameworkConfig, InitArgv, initParams } from './types.js';

export const getTemplateInstances = (templateHubPath: string) => {
  return fs
    .readdirSync(templateHubPath)
    .filter((item) => {
      const itemPath = path.join(templateHubPath, item);
      return (
        fs.statSync(itemPath).isDirectory() &&
        !['.git', 'node_modules', 'lib'].includes(item)
      );
    })
    .map((item) => {
      const projectPath = path.join(templateHubPath, item);
      const projectConfig = getProjectConfig(projectPath);
      const templateName = projectConfig?.name ?? '';
      return new Template(projectPath, templateName);
    });
};

export const transferTemplatesToSelectItem = (
  configs: TemplateItem[],
  templateInstanceList: Template[],
  lang?: string
): SelectItem[] => {
  if (!configs) return [];
  return configs.map((config) => {
    const title = config.Title_EN;
    const value =
      templateInstanceList.find((template) => {
        return title === template.title;
      })?.path ?? '';
    const children = transferTemplatesToSelectItem(
      config.children,
      templateInstanceList,
      lang
    );
    return {
      label: lang === 'en' ? config.Title_EN : config.Title_ZH,
      value: value,
      hint: lang === 'en' ? config.Desc_EN : config.Desc_ZH,
      children
    };
  });
};

export const preInstallDependencies = async (targetPath: string) => {
  const packageJsonPath = path.join(targetPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    logger.log(t('init_install_dependence').d('⌛️ Installing dependencies...'));
    execSync('npm install', { stdio: 'inherit', cwd: targetPath });
    logger.success(
      t('init_install_dependencies_success').d(
        'Dependencies installed successfully.'
      )
    );

    // Read and parse package.json to check for build script
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (packageJson.scripts && packageJson.scripts.build) {
      logger.log(t('init_build_project').d('⌛️ Building project...'));
      execSync('npm run build', { stdio: 'inherit', cwd: targetPath });
      logger.success(
        t('init_build_project_success').d('Project built successfully.')
      );
    } else {
      logger.log(
        t('no_build_script').d(
          'No build script found in package.json, skipping build step.'
        )
      );
    }
    // After build, try to infer assets directory if not explicitly known
    try {
      const candidates = ['dist', 'build', 'out'];
      for (const dir of candidates) {
        const abs = path.join(targetPath, dir);
        if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
          // Update config file if present and assets not set
          const projectConfig = getProjectConfig(targetPath);
          if (projectConfig) {
            const { updateProjectConfigFile } = await import(
              '../../utils/fileUtils/index.js'
            );
            if (!projectConfig.assets || !projectConfig.assets.directory) {
              await updateProjectConfigFile(
                { assets: { directory: dir } },
                targetPath
              );
              logger.success(
                `Detected build output "${dir}" and updated assets.directory`
              );
            }
          }
          break;
        }
      }
    } catch {}
  }
};

export async function checkAndUpdatePackage(
  packageName: string
): Promise<void> {
  try {
    const spinner = logger.ora;
    spinner.text = t('checking_template_update').d(
      'Checking esa-template updates...'
    );
    spinner.start();
    // 获取当前安装的版本
    const __dirname = getDirName(import.meta.url);
    const packageJsonPath = path.join(__dirname, '../../../');
    let versionInfo;
    try {
      versionInfo = execSync(`npm list ${packageName}`, {
        cwd: packageJsonPath
      }).toString();
    } catch (e) {
      spinner.text = t('template_updating').d(
        'Updating templates to latest...'
      );
      execSync(`rm -rf node_modules/${packageName}`, {
        cwd: packageJsonPath
      });
      execSync(`npm install ${packageName}@latest`, {
        cwd: packageJsonPath,
        stdio: 'inherit'
      });
      spinner.stop();
      logger.log(
        `├ ${t('template_updated_to_latest').d('Templates updated to latest.')}`
      );
      return;
    }

    const match = versionInfo.match(new RegExp(`(${packageName})@([0-9.]+)`));
    const currentVersion = match ? match[2] : '';
    // 获取最新版本

    const latestVersion: string = execSync(`npm view ${packageName} version`, {
      cwd: packageJsonPath
    })
      .toString()
      .trim();

    if (currentVersion !== latestVersion) {
      spinner.stop();
      logger.log(
        t('display_current_esa_template_version').d(
          `Current esa-template version:`
        ) +
          chalk.green(currentVersion) +
          '    ' +
          t('display_latest_esa_template_version').d(
            `Latest esa-template version:`
          ) +
          chalk.green(latestVersion)
      );

      logger.stopSpinner();
      const isUpdate = await clackConfirm({
        message: t('is_update_to_latest_version').d(
          'Do you want to update templates to latest version?'
        )
      });
      if (!isCancel(isUpdate) && isUpdate) {
        spinner.start(
          t('template_updating').d('Updating templates to latest...')
        );
        execSync(`rm -rf node_modules/${packageName}`, {
          cwd: packageJsonPath
        });
        execSync(`rm -rf package-lock.json`, {
          cwd: packageJsonPath
        });
        execSync(`npm install ${packageName}@latest`, {
          cwd: packageJsonPath,
          stdio: 'inherit'
        });
        spinner.stop();
        logger.log(
          `├ ${t('updated_esa_template_to_latest_version', { packageName }).d(
            `${packageName} updated successfully`
          )}`
        );
      }
    } else {
      spinner.stop();
      logger.log(
        ` ${t('checking_esa_template_finished').d(
          `Checking esa-template finished.`
        )}`
      );

      t('esa_template_is_latest_version', { packageName }).d(
        `${packageName} is latest.`
      );
      logger.divider();
    }
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      logger.ora.fail(
        t('check_and_update_package_error').d(
          'Error: An error occurred while checking and updating the package, skipping template update'
        )
      );
    }
  }
}

export const getFrameworkConfig = (framework: string): FrameworkConfig => {
  // 从init目录读取template.jsonc
  const templatePath = path.join(getDirName(import.meta.url), 'template.jsonc');
  const jsonc = fs.readFileSync(templatePath, 'utf-8');
  const json = JSON.parse(jsonc);
  console.log(json);
  return json[framework];
};

/**
 * 获取框架全部配置
 * @returns 框架全部配置
 */
export const getAllFrameworkConfig = () => {
  // 从init目录读取template.jsonc
  const templatePath = path.join(getDirName(import.meta.url), 'template.jsonc');
  const jsonc = fs.readFileSync(templatePath, 'utf-8');
  const json = JSON.parse(jsonc);
  return json;
};

export function getInitParamsFromArgv(argv: ArgumentsCamelCase): initParams {
  const a = argv as InitArgv;

  const HaikunatorCtor = Haikunator as unknown as new () => {
    haikunate: () => string;
  };
  const haikunator = new HaikunatorCtor();

  const params: initParams = {
    name: ''
  };
  if (a.yes) {
    params.name = haikunator.haikunate();
    params.git = true;
    params.deploy = true;
    params.template = 'Hello World';
    params.framework = undefined;
    params.language = undefined;
    params.yes = true;
  }

  if (typeof a.name === 'string') params.name = a.name;
  if (typeof a.template === 'string' && a.template) {
    params.template = a.template;
    params.framework = undefined;
    params.language = undefined;
    params.category = 'template';
  } else {
    const fw = a.framework as initParams['framework'] | undefined;
    const lang = a.language as initParams['language'] | undefined;
    if (fw) {
      params.framework = fw;
      params.category = 'framework';
    }
    if (lang) {
      params.language = lang;
    }
  }
  if (typeof a.git === 'boolean') params.git = Boolean(a.git);
  if (typeof a.deploy === 'boolean') params.deploy = Boolean(a.deploy);

  return params;
}

// 配置项目名称
export const configProjectName = async (initParams: initParams) => {
  if (initParams.name) {
    log.step(`Project name configured ${initParams.name}`);
    return;
  }
  const HaikunatorCtor = Haikunator as unknown as new () => {
    haikunate: () => string;
  };
  const haikunator = new HaikunatorCtor();
  const defaultName = haikunator.haikunate();

  const name = (await promptParameter<string>({
    type: 'text',
    question: `${t('init_input_name').d('Enter the name of edgeRoutine:')}`,
    label: 'Project name',
    defaultValue: defaultName,
    validate: (input: string) => {
      if (input === '' || input === undefined) {
        initParams.name = defaultName;
        return true;
      }
      const regex = /^[a-z0-9-]{2,}$/;
      if (!regex.test(input)) {
        return t('init_name_error').d(
          'Error: The project name must be at least 2 characters long and can only contain lowercase letters, numbers, and hyphens.'
        );
      }
      return true;
    }
  })) as string;
  initParams.name = name;
};

export const configCategory = async (initParams: initParams) => {
  if (initParams.category || initParams.framework || initParams.template) {
    return;
  }
  const initMode = (await promptParameter<'framework' | 'template'>({
    type: 'select',
    question: 'How would you like to initialize the project?',
    label: 'Init mode',
    choices: [
      { name: 'Framework Starter', value: 'framework' },
      {
        name: 'Function Template',
        value: 'template'
      }
    ]
  })) as 'framework' | 'template';
  initParams.category = initMode;
};

/*
选择模板
如果选择的是framework，则选择具体的模版 vue /react等
如果选择的是template，则选择具体的模版 esa template
*/
export const configTemplate = async (initParams: initParams) => {
  if (initParams.template) {
    log.step(`Template configured ${initParams.template}`);
    return;
  }
  if (initParams.framework) {
    log.step(`Framework configured ${initParams.framework}`);
    return;
  }

  if (initParams.category === 'template') {
    const templateItems = prepareTemplateItems();
    const selectedTemplatePath = await promptParameter<string>({
      type: 'multiLevelSelect',
      question: 'Select a template:',
      treeItems: templateItems
    });
    if (!selectedTemplatePath) return null;
    // TODO
    initParams.template = selectedTemplatePath as string;
  } else {
    const allFrameworkConfig = getAllFrameworkConfig();
    const fw = (await promptParameter<
      'react' | 'vue' | 'nextjs' | 'astro' | 'react-router'
    >({
      type: 'select',
      question: 'Select a framework',
      label: 'Framework',
      choices: Object.keys(allFrameworkConfig).map((fw) => ({
        name: allFrameworkConfig[fw].label,
        value: fw as 'react' | 'vue' | 'nextjs' | 'astro' | 'react-router',
        hint: allFrameworkConfig[fw]?.hint
      }))
    })) as 'react' | 'vue' | 'nextjs';
    initParams.framework = fw;
  }
};

export const configLanguage = async (initParams: initParams) => {
  if (initParams.language) {
    log.info(`Language configured ${initParams.language}`);
    return;
  }
  const framework = initParams.framework;
  if (!framework) {
    log.info('Framework config not configured, language skipped');
    return;
  }
  const frameworkConfig = getFrameworkConfig(framework);
  if (frameworkConfig.language) {
    const language = (await promptParameter<'typescript' | 'javascript'>({
      type: 'select',
      question: t('init_language_select').d('Select programming language:'),
      label: 'Language',
      choices: [
        {
          name: t('init_language_typescript').d(
            'TypeScript (.ts) - Type-safe JavaScript, recommended'
          ),
          value: 'typescript'
        },
        {
          name: t('init_language_javascript').d(
            'JavaScript (.js) - Traditional JavaScript'
          ),
          value: 'javascript'
        }
      ],
      defaultValue: 'typescript'
    })) as 'typescript' | 'javascript';

    initParams.language = language;
  }
};

export const createProject = async (initParams: initParams) => {
  if (initParams.template) {
    // resolve template value: it may be a filesystem path or a template title
    let selectedTemplatePath = initParams.template;
    if (
      !path.isAbsolute(selectedTemplatePath) ||
      !fs.existsSync(selectedTemplatePath)
    ) {
      const instances = getTemplateInstances(templateHubPath);
      const matched = instances.find((it) => it.title === initParams.template);
      if (matched) {
        selectedTemplatePath = matched.path;
      }
    }

    if (!fs.existsSync(selectedTemplatePath)) {
      outro(
        `Project creation failed: cannot resolve template "${initParams.template}"`
      );
      exit(1);
    }

    const res = await initializeProject(selectedTemplatePath, initParams.name);
    if (!res) {
      outro(`Project creation failed`);
      exit(1);
    }
  }

  if (initParams.framework) {
    const framework = initParams.framework;
    const frameworkConfig = getFrameworkConfig(framework);
    const command = frameworkConfig.command;
    const templateFlag =
      frameworkConfig.language?.[initParams.language || 'typescript'] || '';

    const extraParams = frameworkConfig.params || '';
    const full =
      `${command} ${initParams.name} ${templateFlag} ${extraParams}`.trim();
    const res = await execCommand(['sh', '-lc', full], {
      interactive: true,
      startText: `Starting to execute framework command ${chalk.gray(full)}`,
      doneText: `Framework command executed  ${chalk.gray(full)}`
    });
    if (!res.success) {
      outro(`Framework command execution failed`);
      exit(1);
    }
  }
};

export const installDependencies = async (initParams: initParams) => {
  if (initParams.template) {
    return;
  }
  const targetPath = path.join(process.cwd(), initParams.name);
  const res = await execCommand(['npm', 'install'], {
    cwd: targetPath,
    useSpinner: true,
    silent: true,
    startText: 'Installing dependencies',
    doneText: 'Dependencies installed'
  });
  if (!res.success) {
    outro(`Dependencies installation failed`);
    exit(1);
  }
};

/**
 * Apply configured file edits (方式1: overwrite) after project scaffold
 */
export const applyFileEdits = async (
  initParams: initParams
): Promise<boolean> => {
  if (!initParams.framework) {
    return true;
  }
  const frameworkConfig = getFrameworkConfig(initParams.framework || '');
  const edits = frameworkConfig.fileEdits || [];

  if (!edits.length) return true;

  logger.startSubStep(`Applying file edits`);
  const __dirname = getDirName(import.meta.url);

  try {
    const toRegexFromGlob = (pattern: string): RegExp => {
      // Very small glob subset: *, ?, {a,b,c}
      let escaped = pattern
        .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&') // escape regex specials first
        .replace(/\\\*/g, '.*')
        .replace(/\\\?/g, '.');
      // restore and convert {a,b} to (a|b)
      escaped = escaped.replace(/\\\{([^}]+)\\\}/g, (_, inner) => {
        const parts = inner.split(',').map((s: string) => s.trim());
        return `(${parts.join('|')})`;
      });
      return new RegExp('^' + escaped + '$');
    };

    const targetPath = path.join(process.cwd(), initParams.name);

    const listRootFiles = (): string[] => {
      try {
        return fs.readdirSync(targetPath);
      } catch {
        return [];
      }
    };

    for (const edit of edits) {
      if (edit.when?.language && initParams.language) {
        if (edit.when.language !== initParams.language) continue;
      }

      const createIfMissing = edit.createIfMissing !== false;

      let matchedFiles: string[] = [];
      if (edit.matchType === 'exact') {
        matchedFiles = [edit.match];
      } else if (edit.matchType === 'glob') {
        const regex = toRegexFromGlob(edit.match);
        matchedFiles = listRootFiles().filter((name) => regex.test(name));
      } else if (edit.matchType === 'regex') {
        const regex = new RegExp(edit.match);
        matchedFiles = listRootFiles().filter((name) => regex.test(name));
      }

      // if no matched files and allowed to create, provide a reasonable default for common patterns
      if (!matchedFiles.length && createIfMissing) {
        if (edit.matchType === 'exact') {
          matchedFiles = [edit.match];
        } else if (
          edit.matchType === 'glob' &&
          /next\.config\.\{.*\}/.test(edit.match)
        ) {
          matchedFiles = ['next.config.ts'];
        }
      }

      if (!matchedFiles.length) continue;

      // resolve content
      let payload: string | null = null;
      if (edit.fromFile) {
        const absFrom = path.isAbsolute(edit.fromFile)
          ? edit.fromFile
          : path.join(__dirname, edit.fromFile);
        payload = fs.readFileSync(absFrom, 'utf-8');
      } else if (typeof edit.content === 'string') {
        payload = edit.content;
      }

      for (const rel of matchedFiles) {
        const abs = path.join(targetPath, rel);
        if (payload == null) continue;
        fs.ensureDirSync(path.dirname(abs));
        fs.writeFileSync(abs, payload, 'utf-8');
      }
    }
    logger.endSubStep('File edits applied');
    return true;
  } catch {
    outro(`File edits application failed`);
    exit(1);
  }
};

export const installESACli = async (initParams: initParams) => {
  const targetPath = path.join(process.cwd(), initParams.name);
  const res = await execCommand(['npm', 'install', '-D', 'esa-cli'], {
    cwd: targetPath,
    useSpinner: true,
    silent: true,
    startText: 'Installing ESA CLI',
    doneText: 'ESA CLI installed in the project'
  });
  if (!res.success) {
    outro(`ESA CLI installation failed`);
    exit(1);
  }
};

export const updateConfigFile = async (initParams: initParams) => {
  const targetPath = path.join(process.cwd(), initParams.name);
  const configFormat = 'jsonc';
  logger.startSubStep(`Updating config file`);
  try {
    if (initParams.framework) {
      const frameworkConfig = getFrameworkConfig(initParams.framework);
      const assetsDirectory = frameworkConfig.assets?.directory;
      const notFoundStrategy = frameworkConfig.assets?.notFoundStrategy;
      await generateConfigFile(
        initParams.name,
        {
          assets: assetsDirectory ? { directory: assetsDirectory } : undefined
        },
        targetPath,
        configFormat,
        notFoundStrategy
      );
    } else {
      // TODO revise template config file later
      // console.log(
      //   'test:',
      //   initParams.name,
      //   undefined,
      //   targetPath,
      //   configFormat
      // );
      // logger.startSubStep(`Updating config file`);
      // await generateConfigFile(initParams.name, undefined, targetPath, 'toml');
    }
    logger.endSubStep('Config file updated');
  } catch {
    outro(`Config file update failed`);
    exit(1);
  }
};

export const initGit = async (initParams: initParams): Promise<boolean> => {
  const frameworkConfig = getFrameworkConfig(initParams.framework || '');
  if (frameworkConfig?.useGit === false) {
    log.step('Git skipped');
    return true;
  }
  const gitInstalled = await isGitInstalled();
  if (!gitInstalled) {
    log.step('You have not installed Git, Git skipped');
    return true;
  }

  if (!initParams.git) {
    const initGit = (await promptParameter<boolean>({
      type: 'confirm',
      question: t('init_git').d('Do you want to init git in your project?'),
      label: 'Init git',
      defaultValue: false
    })) as boolean;
    initParams.git = initGit;
  }
  if (initParams.git) {
    const targetPath = path.join(process.cwd(), initParams.name);
    const res = await execCommand(['git', 'init'], {
      cwd: targetPath,
      silent: true,
      startText: 'Initializing git',
      doneText: 'Git initialized'
    });
    if (!res.success) {
      outro(`Git initialization failed`);
      exit(1);
    }

    // Ensure .gitignore exists and has sensible defaults
    await ensureGitignore(targetPath, frameworkConfig?.assets?.directory);
  }
  return true;
};

export async function getGitVersion() {
  try {
    const stdout = await execCommand(['git', '--version'], {
      useSpinner: false,
      silent: true,
      captureOutput: true
    });
    const gitVersion = stdout.stdout.replace(/^git\s+version\s+/, '');
    return gitVersion;
  } catch {
    log.error('Failed to get Git version');
    return null;
  }
}

export async function isGitInstalled() {
  return (await getGitVersion()) !== null;
}

/**
 * Create or update .gitignore in project root with sensible defaults.
 * - Preserves existing entries and comments
 * - Avoids duplicates
 * - Adds framework assets directory if provided
 */
async function ensureGitignore(
  projectRoot: string,
  assetsDirectory?: string
): Promise<void> {
  try {
    const gitignorePath = path.join(projectRoot, '.gitignore');

    const defaults: string[] = [
      '# Logs',
      'logs',
      '*.log',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      'pnpm-debug.log*',
      '',
      '# Node modules',
      'node_modules/',
      '',
      '# Build output',
      'dist/',
      'build/',
      'out/',
      '.next/',
      '.nuxt/',
      'coverage/',
      '.vite/',
      '',
      '# Env files',
      '.env',
      '.env.local',
      '.env.development.local',
      '.env.test.local',
      '.env.production.local',
      '',
      '# IDE/editor',
      '.DS_Store',
      '.idea/',
      '.vscode/',
      '',
      '# Misc caches',
      '.eslintcache',
      '.parcel-cache/',
      '.turbo/',
      '.cache/'
    ];

    // Include assets directory if provided and not a common default
    if (
      assetsDirectory &&
      !['dist', 'build', 'out'].includes(assetsDirectory.replace(/\/$/, ''))
    ) {
      defaults.push('', '# Project assets output', `${assetsDirectory}/`);
    }

    let existingContent = '';
    if (fs.existsSync(gitignorePath)) {
      existingContent = fs.readFileSync(gitignorePath, 'utf-8');
    }

    const existingLines = new Set(
      existingContent.split(/\r?\n/).map((l) => l.trimEnd())
    );

    const toAppend: string[] = [];
    for (const line of defaults) {
      if (!existingLines.has(line)) {
        toAppend.push(line);
        existingLines.add(line);
      }
    }

    // If nothing to add, keep as is
    if (!toAppend.length) return;

    const newContent = existingContent
      ? `${existingContent.replace(/\n$/, '')}\n${toAppend.join('\n')}\n`
      : `${toAppend.join('\n')}\n`;

    fs.writeFileSync(gitignorePath, newContent, 'utf-8');
    logger.log('Updated .gitignore');
  } catch {
    // Do not fail init due to .gitignore issues
  }
}

export const buildProject = async (initParams: initParams) => {
  if (initParams.template) {
    return;
  }
  const targetPath = path.join(process.cwd(), initParams.name);
  const res = await execCommand(['npm', 'run', 'build'], {
    useSpinner: true,
    silent: true,
    startText: 'Building project',
    doneText: 'Project built',
    cwd: targetPath
  });
  if (!res.success) {
    outro(`Build project failed`);
    exit(1);
  }
};

export function prepareTemplateItems(): SelectItem[] {
  const templateInstanceList = getTemplateInstances(templateHubPath);
  const templateConfig = getTemplatesConfig();
  const cliConfig = getCliConfig();
  const lang = cliConfig?.lang ?? 'en';
  return transferTemplatesToSelectItem(
    templateConfig,
    templateInstanceList,
    lang
  );
}

export const deployProject = async (initParams: initParams) => {
  if (!initParams.deploy) {
    log.step('Deploy project skipped');
    return;
  }

  const targetPath = path.join(process.cwd(), initParams.name);

  const res = await commitAndDeployVersion(
    initParams.name,
    undefined,
    undefined,
    'Init project',
    targetPath,
    'all'
  );
  if (!res) {
    outro(`Deploy project failed`);
    exit(1);
  }
};

export async function initializeProject(
  selectedTemplatePath: string,
  name: string
): Promise<{ template: Template; targetPath: string } | null> {
  const selectTemplate = new Template(selectedTemplatePath, name);
  const projectConfig = getProjectConfig(selectedTemplatePath);
  if (!projectConfig) {
    logger.notInProject();
    return null;
  }

  const targetPath = path.join(process.cwd(), name);
  if (fs.existsSync(targetPath)) {
    logger.block();
    logger.tree([
      `${chalk.bgRed(' ERROR ')} ${chalk.bold.red(
        t('init_abort').d('Initialization aborted')
      )}`,
      `${chalk.gray(t('reason').d('Reason:'))} ${chalk.red(
        t('dir_already_exists').d('Target directory already exists')
      )}`,
      `${chalk.gray(t('path').d('Path:'))} ${chalk.cyan(targetPath)}`,
      chalk.gray(t('try').d('Try one of the following:')),
      `- ${chalk.white(t('try_diff_name').d('Choose a different project name'))}`,
      `- ${chalk.white(t('try_remove').d('Remove the directory:'))} ${chalk.yellow(
        `rm -rf "${name}”`
      )}`,
      `- ${chalk.white(
        t('try_another_dir').d('Run the command in another directory')
      )}`
    ]);
    logger.block();
    return null;
  }

  await fs.copy(selectedTemplatePath, targetPath);
  projectConfig.name = name;
  await updateProjectConfigFile(projectConfig, targetPath);
  await preInstallDependencies(targetPath);

  return { template: selectTemplate, targetPath };
}
