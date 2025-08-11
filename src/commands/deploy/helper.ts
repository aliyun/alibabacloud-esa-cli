import { ListRoutineCodeVersionsResponseBodyCodeVersions } from '@alicloud/esa20240910/dist/models/ListRoutineCodeVersionsResponseBodyCodeVersions.js';
import chalk from 'chalk';
import moment from 'moment';

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

export function displaySelectDeployEnv(): Promise<PublishType> {
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

export async function displayVersionList(
  allVersions: ListRoutineCodeVersionsResponseBodyCodeVersions[],
  stagingVersions: string[],
  productionVersions: string[]
) {
  logger.log(
    `${chalk.bgYellow('Active')} ${t('deploy_env_staging').d('Staging')}`
  );
  logger.log(
    `${chalk.bgGreen('Active')} ${t('deploy_env_production').d('Production')}`
  );

  const data: string[][] = [];
  for (let i = 0; i < allVersions.length; i++) {
    const version = allVersions[i];
    const createTime = moment(version.createTime).format('YYYY/MM/DD HH:mm:ss');
    const tags = [
      stagingVersions.includes(version.codeVersion ?? '')
        ? chalk.bgYellow('Active')
        : '',
      productionVersions.includes(version.codeVersion ?? '')
        ? chalk.bgGreen('Active')
        : ''
    ];

    data.push([
      `${version.codeVersion} ${tags.join(' ')}`,
      createTime,
      version.codeDescription ?? ''
    ]);
  }

  logger.table(
    [
      t('deploy_table_header_version').d('Version'),
      t('deploy_table_header_created').d('Created'),
      t('deploy_table_header_description').d('Description')
    ],
    data
  );
}
