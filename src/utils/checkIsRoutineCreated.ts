import { exit } from 'process';

import { log } from '@clack/prompts';
import chalk from 'chalk';

import t from '../i18n/index.js';
import { ApiService } from '../libs/apiService.js';
import { GetRoutineReq } from '../libs/interface.js';
import logger from '../libs/logger.js';

export async function isRoutineExist(name: string) {
  const server = await ApiService.getInstance();
  const req: GetRoutineReq = { Name: name };
  const response = await server.getRoutine(req, false);
  return !!response;
}

export async function validRoutine(name: string) {
  const isCreatedRoutine = await isRoutineExist(name);
  if (!isCreatedRoutine) {
    logger.warn(
      `${t('routine_not_exist').d(
        'Routine does not exist, please create a new one. Run command:'
      )} ${chalk.greenBright('esa deploy')}`
    );
    exit(0);
  }
}

/**
 * Ensure routine exists, if not, create a new routine
 * @param name - Routine name
 */
export async function ensureRoutineExists(name: string) {
  const isExist = await isRoutineExist(name);

  // If routine does not exist, create a new routine
  if (!isExist) {
    logger.startSubStep(`Creating routine ${chalk.gray(name)}`);
    const server = await ApiService.getInstance();
    const createRes = await server.createRoutine({
      name: name,
      description: '',
      hasAssets: true
    });
    const isSuccess = createRes?.data.Status === 'OK';
    if (isSuccess) {
      logger.endSubStep('Routine created successfully');
    } else {
      logger.endSubStep('Routine created failed');
      exit();
    }
  } else {
    log.step('Routine has already exists');
  }
}
