import fs from 'fs';

import { ListRoutineCodeVersionsResponseBodyCodeVersions } from '@alicloud/esa20240910/dist/models/ListRoutineCodeVersionsResponseBodyCodeVersions.js';

import { descriptionInput } from '../../components/descriptionInput.js';
import SelectItems, { SelectItem } from '../../components/selectInput.js';
import { yesNoPrompt } from '../../components/yesNoPrompt.js';
import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import { CreateRoutineReq, PublishType } from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import compress from '../../utils/compress.js';
import { readEdgeRoutineFile } from '../../utils/fileUtils/index.js';
import {
  createEdgeRoutine,
  releaseOfficialVersion,
  uploadEdgeRoutineCode
} from '../commit/index.js';
import prodBuild from '../commit/prodBuild.js';

import { ProjectConfig } from './../../utils/fileUtils/interface.js';

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

export async function createAndDeployVersion(
  projectConfig: ProjectConfig,
  createUnstable = false,
  hasAssets = false,
  customEntry?: string
) {
  try {
    const description = await descriptionInput(
      createUnstable
        ? `🖊️ ${t('deploy_description_routine').d('Enter the description of the routine')}:`
        : `🖊️ ${t('deploy_description_version').d('Enter the description of the code version')}:`,
      false
    );
    let code = '';
    if (customEntry && fs.existsSync(customEntry)) {
      await prodBuild(false, customEntry);
      code = readEdgeRoutineFile() || '';
    } else {
      code = '';
    }

    const edgeRoutine: CreateRoutineReq = {
      name: projectConfig.name,
      code: code || '',
      description: description
    };

    if (createUnstable) {
      return await createEdgeRoutine(edgeRoutine);
    } else {
      if (hasAssets) {
        const server = await ApiService.getInstance();
        const zip = await compress();
        const isSuccess = await server.createRoutineWithAssetsCodeVersion(
          {
            Name: projectConfig.name,
            CodeDescription: description
          },
          zip?.toBuffer() as Buffer
        );
        return isSuccess ?? false;
      } else {
        const uploadResult = await uploadEdgeRoutineCode(edgeRoutine);
        if (!uploadResult) {
          return false;
        }
        return await releaseOfficialVersion(edgeRoutine);
      }
    }
  } catch (error) {
    logger.error(`
      ${t('deploy_error').d(
        'An error occurred during the creation or publishing process'
      )}: ${error}`);
    return false;
  }
}
