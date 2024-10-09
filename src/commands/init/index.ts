import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import SelectItems, { SelectItem } from '../../components/selectInput.js';
import { rename } from 'fs/promises';
import fs from 'fs';

import Template from '../../libs/templates/index.js';
import { cloneRepository, installGit } from '../../libs/git/index.js';
import { descriptionInput } from '../../components/descriptionInput.js';
import {
  generateConfigFile,
  getProjectConfig,
  updateProjectConfigFile
} from '../../utils/fileUtils/index.js';
import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import { quickDeploy } from '../deploy/index.js';
import { ProjectConfig } from '../../utils/fileUtils/interface.js';
import chalk from 'chalk';
import { ApiService } from '../../libs/apiService.js';
import { exit } from 'process';
import { checkRoutineExist } from '../../utils/checkIsRoutineCreated.js';
import path from 'path';

const secondSetOfItems = [
  { label: 'Yes', value: 'yesInstall' },
  { label: 'No', value: 'noInstall' }
];

const init: CommandModule = {
  command: 'init',
  describe: `📥 ${t('init_describe').d('Initialize a routine with a template')}`,
  builder: (yargs: Argv) => {
    return yargs.option('config', {
      alias: 'c',
      describe: t('init_config_file').d(
        'Generate a config file for your project'
      ),
      type: 'boolean'
    });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    await handleInit(argv);
  }
};

export default init;

const downloadEntireTemplates = async (entry?: string) => {
  await cloneRepository(
    'https://github.com/aliyun/alibabacloud-esa-er-templates.git',
    entry
  );
};

export async function handleInit(argv: ArgumentsCamelCase) {
  const { config } = argv;
  if (config !== undefined) {
    await generateConfigFile(String(config));
    return;
  }

  const name = await descriptionInput(
    `🖊️ ${t('init_input_name').d('Enter the name of edgeRoutine:')}`,
    true
  );
  const regex = /^[a-z0-9-]{2,}$/;

  if (!regex.test(name)) {
    logger.error(
      t('init_name_error').d(
        'Error: The project name must be at least 2 characters long and can only contain lowercase letters, numbers, and hyphens.'
      )
    );
    return;
  }

  let hiddenFolder = process.cwd() + '/.hidden';

  // 删除隐藏文件夹
  if (fs.existsSync(hiddenFolder)) {
    fs.rmdirSync(hiddenFolder, { recursive: true });
  }

  // 下载所有模板到隐藏文件夹
  await downloadEntireTemplates(hiddenFolder);

  //获取隐藏文件夹所有子目录
  const templatePaths = fs.readdirSync(hiddenFolder).filter((item) => {
    const itemPath = path.join(hiddenFolder, item);
    const stats = fs.statSync(itemPath);
    return stats.isDirectory() && item !== '.git';
  });

  const templateList = templatePaths.map((item) => {
    const projectPath = hiddenFolder + '/' + item;
    const projectConfig = getProjectConfig(projectPath);
    const templateName = projectConfig?.name ?? '';
    return new Template(projectPath, templateName);
  });

  const firstSetOfItems = templateList.map((template, index: number) => {
    return { label: template.title, value: template.path };
  });

  let selectTemplate: Template;
  let targetPath: string;
  let projectConfig: ProjectConfig | null;

  const handleSecondSelection = (item: SelectItem) => {
    if (item.value === 'yesInstall') {
      installGit(targetPath);
    } else {
      logger.info(t('init_skip_git').d('Git installation was skipped.'));
    }
    logger.info(t('auto_deploy').d('Do you want to deploy your project?'));
    SelectItems({
      items: secondSetOfItems,
      handleSelect: handleThirdSelection
    });
  };

  const handleFirstSelection = async (item: SelectItem) => {
    const configPath = item.value;
    selectTemplate = new Template(configPath, name);

    projectConfig = getProjectConfig(configPath);
    if (!projectConfig) return logger.notInProject();

    const newPath = process.cwd() + '/' + name;
    targetPath = newPath;
    if (fs.existsSync(newPath)) {
      fs.rmdirSync(hiddenFolder, { recursive: true });
      logger.error(
        t('already_exist_file_error').d(
          'Error: The project already exists. It looks like a folder named "<project-name>" is already present in the current directory. Please try the following options: 1. Choose a different project name. 2. Delete the existing folder if it\'s not needed: `rm -rf <project-name>` (use with caution!). 3. Move to a different directory before running the init command.'
        )
      );
      return;
    }
    await rename(configPath, newPath);

    projectConfig.name = name;
    updateProjectConfigFile(projectConfig, newPath);

    logger.info(t('init_git').d('Do you want to init git in your project?'));
    SelectItems({
      items: secondSetOfItems,
      handleSelect: handleSecondSelection
    });
  };

  const handleThirdSelection = async (item: SelectItem) => {
    // 选择自动生成版本并发布
    if (item.value === 'yesInstall') {
      await checkRoutineExist(projectConfig?.name ?? '', targetPath);
      projectConfig && (await quickDeploy(targetPath, projectConfig));
      const service = await ApiService.getInstance();
      const res = await service.getRoutine({ Name: projectConfig?.name ?? '' });
      const defaultUrl = res?.data?.DefaultRelatedRecord;
      const visitUrl = defaultUrl ? 'http://' + defaultUrl : '';
      logger.success(
        `${t('init_deploy_success').d('Project deployment completed. Visit: ')}${chalk.yellowBright(visitUrl)}`
      );
      logger.warn(
        t('deploy_url_warn').d(
          'The domain may take some time to take effect, please try again later.'
        )
      );
    }
    selectTemplate.printSummary();
    exit();
  };

  try {
    SelectItems({
      items: firstSetOfItems,
      handleSelect: handleFirstSelection
    });
  } catch (error) {
    logger.error(t('init_error').d('An error occurred while initializing.'));
    console.log(error);
    fs.rmdirSync(hiddenFolder, { recursive: true });
  }
}
