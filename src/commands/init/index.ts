import { execSync } from 'child_process';
import path from 'path';
import { exit } from 'process';

import fs from 'fs-extra';
import inquirer from 'inquirer';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import multiLevelSelect from '../../components/mutiLevelSelect.js';
import t from '../../i18n/index.js';
import { installGit } from '../../libs/git/index.js';
import logger from '../../libs/logger.js';
import Template from '../../libs/templates/index.js';
import {
  generateConfigFile,
  getCliConfig,
  getProjectConfig,
  getTemplatesConfig,
  templateHubPath,
  updateProjectConfigFile
} from '../../utils/fileUtils/index.js';
import { ProjectConfig } from '../../utils/fileUtils/interface.js';
import { quickDeployForInit } from '../common/utils.js';

import {
  checkAndUpdatePackage,
  getAllFrameworkConfig,
  getFrameworkConfig,
  getTemplateInstances,
  preInstallDependencies,
  transferTemplatesToSelectItem,
  applyFileEdits
} from './helper.js';

const init: CommandModule = {
  command: 'init [name]',
  describe: `📥 ${t('init_describe').d('Initialize a routine with a template')}`,
  builder: (yargs: Argv) => {
    return yargs
      .positional('name', {
        describe: t('init_project_name').d('Project name'),
        type: 'string'
      })
      .option('framework', {
        alias: 'f',
        describe: 'Choose a frontend framework (react/vue/nextjs)',
        type: 'string',
        choices: ['react', 'vue', 'nextjs'] as const
      })
      .option('language', {
        alias: 'l',
        describe: 'Choose programming language (typescript/javascript)',
        type: 'string',
        choices: ['typescript', 'javascript'] as const
      })
      .option('template', {
        alias: 't',
        describe: t('init_template_name').d('Template name to use'),
        type: 'string'
      })
      .option('config', {
        alias: 'c',
        describe: t('init_config_file').d(
          'Generate a config file for your project'
        ),
        type: 'boolean'
      })
      .option('templateParams', {
        describe: 'Generate a global template-params config file',
        type: 'boolean'
      })
      .option('yes', {
        alias: 'y',
        describe: t('init_yes').d('Answer "Yes" to all prompts.'),
        type: 'boolean',
        default: false
      })
      .option('skip', {
        alias: 's',
        describe: t('init_skip').d(
          'Answer "No" to any prompts for new projects.'
        ),
        type: 'boolean',
        default: false
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    await handleInit(argv);
    exit(0);
  }
};

export default init;

export function findTemplatePathByName(templateName: string): string | null {
  const templateInstanceList = getTemplateInstances(templateHubPath);
  const templateConfig = getTemplatesConfig();

  // find template recursively
  function findTemplateRecursive(configs: any[]): string | null {
    for (const config of configs) {
      const title = config.Title_EN;
      if (title === templateName) {
        const template = templateInstanceList.find((template) => {
          return config.Title_EN === template.title;
        });
        return template?.path || null;
      }
    }
    return null;
  }

  return findTemplateRecursive(templateConfig);
}

export function validateProjectName(name: string): boolean {
  const regex = /^[a-z0-9-]{2,}$/;
  return regex.test(name);
}

export async function promptProjectName(yes = false): Promise<string> {
  if (yes) {
    // Generate a default name when --yes is used
    const defaultName = `edge-routine-${Date.now()}`;
    logger.log(
      `${t('init_input_name').d('Enter the name of edgeRoutine:')} ${defaultName}`
    );

    logger.replacePrevLines(
      2,
      `├ ${t('init_input_name').d('Enter the name of edgeRoutine')}`
    );
    logger.StepKV('name', defaultName);
    logger.StepSpacer();
    return defaultName;
  }

  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: `${t('init_input_name').d('Enter the name of edgeRoutine:')}\n`,
      prefix: '╰',
      validate: (input) => {
        const regex = /^[a-z0-9-]{2,}$/;
        if (!regex.test(input)) {
          return t('init_name_error').d(
            'Error: The project name must be at least 2 characters long and can only contain lowercase letters, numbers, and hyphens.'
          );
        }
        return true;
      }
    }
  ]);
  logger.replacePrevLines(
    2,
    `├ ${t('init_input_name').d('Enter the name of edgeRoutine:')}`
  );
  logger.StepKV('ER Name', name);
  logger.StepSpacer();
  return name;
}

export function prepareTemplateItems(): {
  label: string;
  value: string;
  children?: any;
}[] {
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

export async function selectTemplate(
  items: { label: string; value: string; children?: any }[],
  yes = false
): Promise<string | null> {
  if (yes) {
    // Select the first available template when --yes is used
    const firstTemplate = items[0];
    if (firstTemplate) {
      logger.log(`Select a template: ${firstTemplate.label}`);
      return firstTemplate.value;
    } else {
      logger.error(t('init_no_templates').d('No templates available.'));
      return null;
    }
  }

  logger.StepEnd();
  const selectedTemplatePath = await multiLevelSelect(
    items,
    'Select a template:'
  );
  if (!selectedTemplatePath) {
    logger.log(t('init_cancel').d('User canceled the operation.'));
    return null;
  }
  return selectedTemplatePath;
}

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
    logger.error(
      t('already_exist_file_error').d(
        'Error: The project already exists. It looks like a folder named "<project-name>" is already present in the current directory. Please try the following options: 1. Choose a different project name. 2. Delete the existing folder if it\'s not needed: `rm -rf <project-name>` (use with caution!). 3. Move to a different directory before running the init command.'
      )
    );
    return null;
  }

  await fs.copy(selectedTemplatePath, targetPath);
  projectConfig.name = name;
  await updateProjectConfigFile(projectConfig, targetPath);
  await preInstallDependencies(targetPath);

  return { template: selectTemplate, targetPath };
}

export async function handleGitInitialization(
  targetPath: string,
  yes = false
): Promise<void> {
  if (yes) {
    logger.log(
      `${t('init_git').d('Do you want to init git in your project?')} Yes`
    );
    const success = installGit(targetPath, false, false);
    if (success) {
      logger.StepKV(
        'git',
        t('git_installed_success').d('Git has been installed successfully.')
      );
      logger.StepSpacer();
    }
    return;
  }

  const { initGit } = await inquirer.prompt([
    {
      type: 'list',
      name: 'initGit',
      message: t('init_git').d('Do you want to init git in your project?'),
      prefix: '╰',
      choices: ['Yes', 'No']
    }
  ]);
  logger.replacePrevLine('├ Do you want to init git in your project?');

  if (initGit === 'Yes') {
    const success = installGit(targetPath, false, false); // Enable auto-install
    if (success) {
      logger.StepKV(
        'git',
        t('git_installed_success').d('Git has been installed successfully.')
      );
      logger.StepSpacer();
    }
  } else {
    logger.StepKV('git', t('init_skip_git').d('Git installation was skipped.'));
    logger.StepSpacer();
  }
}

// STEP 1 prepare
// 1. check is template latest
// 2. input project name
// 3. choose framework or template
// 4. select a framework/template
// 5. TODO: js/ts
// STEP 2 init
// 1. execute framework init command
// 2. install esa-cli
// 3. config toml/jsonc
// STEP 3 customize
// 1. git yes/no
// 2. deploy yes/no

export async function handleInit(argv: ArgumentsCamelCase) {
  await checkAndUpdatePackage('esa-template');
  // Step 1 of 3: Planning selections (Cloudflare-like)
  logger.StepHeader('Create an ESA application', 1, 3);

  if (argv.config) {
    const configFormat = await promptConfigFormat(argv.yes as boolean);
    await generateConfigFile(undefined, undefined, undefined, configFormat);
    exit(0);
  }
  // Update the template package (currently commented out)

  // If config option is provided, generate config file and exit
  const config = getCliConfig();
  if (config === undefined) {
    const configFormat = await promptConfigFormat(argv.yes as boolean);
    await generateConfigFile(
      String(config),
      undefined,
      undefined,
      configFormat
    );
  }

  // Handle project name parameter
  let name = argv.name as string;
  if (!name) {
    name = await promptProjectName(argv.yes as boolean);
  } else {
    if (!validateProjectName(name)) {
      logger.error(
        t('init_name_error').d(
          'Error: The project name must be at least 2 characters long and can only contain lowercase letters, numbers, and hyphens.'
        )
      );
      return;
    }
  }

  // Show chosen directory
  logger.StepItem('In which directory do you want to create your application?');
  logger.StepKV('dir', `./${name}`);
  logger.StepSpacer();

  // Decide between framework or template if neither provided and not --yes
  let framework = argv.framework as 'react' | 'vue' | 'nextjs' | undefined;
  let language = argv.language as 'typescript' | 'javascript' | undefined;
  const allFrameworkConfig = getAllFrameworkConfig();

  if (!framework && !argv.template && !argv.yes) {
    const { initMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'initMode',
        message: 'How would you like to initialize the project?',
        prefix: '╰',
        choices: [
          { name: 'Use a framework (React/Vue/Next.js)', value: 'framework' },
          {
            name: 'Use ESA template (recommended for EdgeRoutine demos)',
            value: 'template'
          }
        ]
      }
    ]);

    logger.replacePrevLine('├ How would you like to initialize the project?');
    logger.StepKV(
      'category',
      initMode === 'framework' ? 'Framework Starter' : 'ESA Template'
    );
    logger.StepSpacer();
    if (initMode === 'framework') {
      const { fw } = await inquirer.prompt([
        {
          type: 'list',
          name: 'fw',
          message: 'Select a framework',
          prefix: '╰',
          choices: Object.keys(allFrameworkConfig).map((fw) => ({
            name: allFrameworkConfig[fw].label,
            value: fw
          }))
        }
      ]);
      logger.replacePrevLine('├ Select a framework');
      framework = fw;
      logger.StepKV('framework', String(framework));
      const frameworkConfig = getFrameworkConfig(framework as string);

      if (frameworkConfig.templates) {
        if (!language) {
          language = await promptLanguage(argv.yes as boolean);
        }
        logger.StepKV(t('init_language_selected').d('Language'), language);
      }

      logger.StepEnd('Configuration collected');
    } else if (initMode === 'template') {
      // Use ESA Template creation method
      const templateItems = prepareTemplateItems();
      const selectedTemplatePath = await selectTemplate(
        templateItems,
        argv.yes as boolean
      );
      if (!selectedTemplatePath) {
        return;
      }

      logger.StepEnd('Template selected');

      // Step 2 of 3: Scaffold project
      logger.StepHeader('Scaffold project', 2, 3);

      const { template, targetPath } =
        (await initializeProject(selectedTemplatePath, name)) || {};
      if (!template || !targetPath) {
        return;
      }

      logger.StepSpacer();
      logger.StepEnd('Project initialized');

      // Step 3 of 3: Configure and finalize
      logger.StepHeader('Configure and finalize', 3, 3);

      if (!argv.skip) {
        await handleGitInitialization(targetPath, argv.yes as boolean);
      }

      // Deployment prompt relies on config file just generated
      if (!argv.skip) {
        const projectConfig = getProjectConfig(targetPath);
        if (projectConfig) {
          await initDeployment(
            targetPath,
            projectConfig,
            argv.yes as boolean,
            initMode
          );
        }
      }

      logger.success('Project created successfully.');
      return;
    }
  }
  const frameworkConfig = getFrameworkConfig(framework || '');

  if (framework) {
    const targetPath = path.join(process.cwd(), name);
    if (fs.existsSync(targetPath)) {
      logger.error(
        t('already_exist_file_error').d(
          'Error: The project already exists. It looks like a folder named "<project-name>" is already present in the current directory. Please try the following options: 1. Choose a different project name. 2. Delete the existing folder if it\'s not needed: `rm -rf <project-name>` (use with caution!). 3. Move to a different directory before running the init command.'
        )
      );
      return;
    }

    // Step 2 of 3: Scaffold project
    logger.StepHeader('Scaffold project', 2, 3);

    const command = frameworkConfig.command;
    const templateFlag =
      frameworkConfig.templates?.[language || 'typescript'] || '';
    const extraParams = frameworkConfig.params || '';
    const fullCommand =
      `${command} ${name} ${templateFlag} ${extraParams}`.trim();

    logger.StepItem(`Continue with ${framework} via \`${fullCommand}\``);
    logger.StepKV('dir', `./${name}`);
    logger.StepSpacer();
    logger.log(`Creating ${framework} app in ${targetPath} ...`);

    // Execute the command with proper arguments
    if (templateFlag || extraParams) {
      execSync(`${command} ${name} ${templateFlag} ${extraParams}`.trim(), {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } else {
      execSync(`${command} ${name}`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
    }
    logger.StepSpacer();

    // install dependencies
    logger.StepItem('Install dependencies');
    execSync('npm install', {
      stdio: 'inherit',
      cwd: targetPath
    });
    logger.StepSpacer();
    // Apply post-scaffold file edits if configured (方式1)

    await applyFileEdits(targetPath, frameworkConfig, { language });
    logger.StepEnd('Project initialized');

    const assetsDirectory = frameworkConfig.assets?.directory;
    const notFoundStrategy = frameworkConfig.assets?.notFoundStrategy;
    // Step 3 of 3: Configure and finalize
    logger.StepHeader('Configure and finalize', 3, 3);
    const configFormat = await promptConfigFormat(argv.yes as boolean);

    logger.StepKV('format', configFormat);
    logger.StepSpacer();
    await generateConfigFile(
      name,
      {
        assets: assetsDirectory ? { directory: assetsDirectory } : undefined
      } as any,
      targetPath,
      configFormat,
      notFoundStrategy
    );

    if (!argv.skip) {
      await handleGitInitialization(targetPath, argv.yes as boolean);
    }
    // Deployment prompt relies on config file just generated
    if (!argv.skip) {
      const projectConfig = getProjectConfig(targetPath);
      if (projectConfig) {
        await initDeployment(targetPath, projectConfig, argv.yes as boolean);
      }
    }
    logger.success('Project created successfully.');
    return;
  }
}

export async function initDeployment(
  targetPath: string,
  projectConfig: ProjectConfig,
  yes = false,
  initMode: 'framework' | 'template' = 'framework'
): Promise<void> {
  if (yes) {
    logger.log(
      `${t('auto_deploy').d('Do you want to deploy your project?')} Yes`
    );
    await quickDeployForInit(targetPath, projectConfig);
    return;
  }
  const { deploy } = await inquirer.prompt([
    {
      type: 'list',
      name: 'deploy',
      message: t('auto_deploy').d('Do you want to deploy your project?'),
      prefix: '╰',
      choices: ['Yes', 'No']
    }
  ]);
  logger.replacePrevLine('├ Do you want to deploy your project?');
  if (deploy === 'Yes') {
    if (initMode === 'framework') {
      execSync('npm run build', { stdio: 'inherit', cwd: targetPath });
    }
    await quickDeployForInit(targetPath, projectConfig);
  }
}

async function promptConfigFormat(yes: boolean): Promise<'jsonc' | 'toml'> {
  if (yes) {
    return 'jsonc';
  }

  const { configFormat } = await inquirer.prompt([
    {
      type: 'list',
      name: 'configFormat',
      message: t('init_config_format_select').d(
        'Select configuration file format:'
      ),
      prefix: '╰',
      choices: [
        {
          name: t('init_config_format_jsonc').d(
            'JSONC (.jsonc) - JSON with comments, recommended'
          ),
          value: 'jsonc'
        },
        {
          name: t('init_config_format_toml').d(
            'TOML (.toml) - Traditional format'
          ),
          value: 'toml'
        }
      ],
      default: 'jsonc'
    }
  ]);
  logger.replacePrevLine('├ Select configuration file format:');

  return configFormat;
}

async function promptLanguage(
  yes: boolean
): Promise<'typescript' | 'javascript'> {
  if (yes) {
    return 'typescript';
  }

  const { language } = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: t('init_language_select').d('Select programming language:'),
      prefix: '╰',
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
      default: 'typescript'
    }
  ]);
  logger.replacePrevLine('├ Select programming language:');

  return language;
}

/**
 * Configure Next.js for static export by modifying next.config.ts/js
 * @param targetPath Path to the Next.js project
 */
export async function configureNextJsForStaticExport(
  targetPath: string
): Promise<void> {
  const nextConfigTsPath = path.join(targetPath, 'next.config.ts');
  const nextConfigJsPath = path.join(targetPath, 'next.config.js');
  const nextConfigMjsPath = path.join(targetPath, 'next.config.mjs');

  let configPath: string | null = null;

  // Check which config file exists
  if (fs.existsSync(nextConfigTsPath)) {
    configPath = nextConfigTsPath;
  } else if (fs.existsSync(nextConfigJsPath)) {
    configPath = nextConfigJsPath;
  } else if (fs.existsSync(nextConfigMjsPath)) {
    configPath = nextConfigMjsPath;
  }

  if (!configPath) {
    // Create a new next.config.ts file if none exists
    configPath = nextConfigTsPath;
    const newConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export"
};

export default nextConfig;`;

    fs.writeFileSync(configPath, newConfig, 'utf-8');
    logger.success('Created next.config.ts with static export configuration');
    return;
  }

  const newConfig = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export"
};

export default nextConfig;`;

  // Write the new config to file, overwriting existing content
  fs.writeFileSync(configPath, newConfig, 'utf-8');

  logger.success(
    'Next.js config file overwritten with static export configuration'
  );
}
