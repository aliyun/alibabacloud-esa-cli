import { ListRoutineCodeVersionsResponseBodyCodeVersions } from '@alicloud/esa20240910/dist/models/ListRoutineCodeVersionsResponseBodyCodeVersions.js';

import SelectItems, { SelectItem } from '../../components/selectInput.js';
import { yesNoPrompt } from '../../components/yesNoPrompt.js';
import t from '../../i18n/index.js';
import { PublishType } from '../../libs/interface.js';
import logger from '../../libs/logger.js';

export function yesNoPromptAndExecute(
  message: string,
  execute: () => Promise<boolean>
): Promise<boolean> {
  return new Promise((resolve) => {
    yesNoPrompt(async (item: SelectItem) => {
      if (item.value === 'yes') {
        const result = await execute();
        resolve(result);
      } else {
        resolve(false);
      }
    }, message);
  });
}

export function promptSelectVersion(
  versionList: ListRoutineCodeVersionsResponseBodyCodeVersions[]
) {
  const items = versionList
    .filter((version) => version.codeVersion !== 'unstable')
    .map((version, index) => ({
      label: version.codeVersion ?? '',
      value: String(index)
    }));
  return new Promise<string>((resolve) => {
    const handleSelection = async (item: SelectItem) => {
      resolve(item.label);
    };

    SelectItems({ items, handleSelect: handleSelection });
  });
}

export function displaySelectDeployType(): Promise<PublishType> {
  logger.log(
    `📃 ${t('deploy_env_select_description').d('Please select which environment you want to deploy')}`
  );
  const selectItems: SelectItem[] = [
    { label: t('deploy_env_staging').d('Staging'), value: PublishType.Staging },
    {
      label: t('deploy_env_production').d('Production'),
      value: PublishType.Production
    }
  ];
  return new Promise<PublishType>((resolve) => {
    const handleSelection = async (item: SelectItem) => {
      resolve(item.value as PublishType);
    };
    SelectItems({ items: selectItems, handleSelect: handleSelection });
  });
}

export async function quickDeploy(entry: string, projectConfig: ProjectConfig) {
  const server = await ApiService.getInstance();

  const routineType = checkConfigRoutineType();

  if (
    routineType === EDGE_ROUTINE_TYPE.ASSETS_ONLY ||
    routineType === EDGE_ROUTINE_TYPE.JS_AND_ASSETS
  ) {
    // Handle assets project
    logger.log(
      `🔔 ${t('quick_deploy_assets_detected').d('Static assets detected, deploying with assets support')}`
    );

    // Compress assets and code
    const zip = await compress();

    const res = await commitRoutineWithAssets(
      {
        Name: projectConfig.name,
        CodeDescription: 'Quick deploy with assets'
      },
      zip?.toBuffer() as Buffer
    );

    if (res) {
      logger.success(
        t('quick_deploy_assets_success').d(
          'Your code with assets has been successfully deployed'
        )
      );
      logger.log(
        `👉 ${t('quick_deploy_success_guide').d('Run this command to add domains')}: ${chalk.green('esa domain add <DOMAIN>')}`
      );
    } else {
      logger.error(
        t('quick_deploy_assets_failed').d('Quick deploy with assets failed')
      );
      throw Error(
        t('quick_deploy_assets_failed').d('Quick deploy with assets failed')
      );
    }
  } else {
    // Handle regular project without assets
    const entryFile = path.resolve(entry ?? '', 'src/index.js');

    await prodBuild(false, entryFile, entry);
    const code = readEdgeRoutineFile(entry) || '';

    const res = await server.quickDeployRoutine({
      name: projectConfig.name,
      code: code
    });

    if (res) {
      logger.success(
        t('quick_deploy_success').d('Your code has been successfully deployed')
      );
      logger.log(
        `👉 ${t('quick_deploy_success_guide').d('Run this command to add domains')}: ${chalk.green('esa domain add <DOMAIN>')}`
      );
    } else {
      logger.error(t('quick_deploy_failed').d('Quick deploy failed'));
      throw Error(t('quick_deploy_failed').d('Quick deploy failed'));
    }
  }
}
