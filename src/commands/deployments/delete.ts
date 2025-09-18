import chalk from 'chalk';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import {
  displayMultiSelectTable,
  TableItem
} from '../../components/mutiSelectTable.js';
import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import { DeleteRoutineCodeVersionReq } from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import {
  checkDirectory,
  checkIsLoginSuccess,
  getRoutineCodeVersions
} from '../utils.js';

const deploymentsDelete: CommandModule = {
  command: 'delete [deploymentId..]',
  describe: `🗑  ${t('deployments_delete_describe').d('Delete one or more deployment versions')}`,
  builder: (yargs: Argv) => {
    return yargs
      .positional('deploymentId', {
        describe: t('deployments_delete_id_describe').d(
          'The ID of the deployments to delete'
        ),
        type: 'string',
        demandOption: true
      })
      .option('i', {
        describe: t('delete_interactive_mode').d(
          'Delete deployments by using interactive mode'
        ),
        type: 'boolean'
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handleDeleteDeployments(argv);
  }
};

export default deploymentsDelete;

export async function handleDeleteDeployments(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) {
    return;
  }
  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  await validRoutine(projectConfig.name);

  const server = await ApiService.getInstance();

  let versions: string[] = argv.deploymentId as string[];
  const isInteractive = argv.i;
  if (isInteractive) {
    const { allVersions, stagingVersions, productionVersions } =
      await getRoutineCodeVersions(projectConfig.name);

    // Show information about versions being deployed
    if (stagingVersions.length > 0 || productionVersions.length > 0) {
      logger.log(chalk.yellow('⚠️  Currently deploying versions:'));
      if (stagingVersions.length > 0) {
        logger.log(chalk.yellow(`   Staging: ${stagingVersions.join(',')}`));
      }
      if (productionVersions.length > 0) {
        logger.log(
          chalk.yellow(`   Production: ${productionVersions.join(',')}`)
        );
      }
      logger.log('');
    }

    logger.log(
      t('delete_deployments_table_title').d(
        '  Version ID            Description'
      )
    );

    // Filter out versions being deployed
    const selectList: TableItem[] = allVersions
      .filter((item) => {
        if (stagingVersions.length === 0 && productionVersions.length === 0)
          return true;
        return (
          !stagingVersions.includes(item.codeVersion ?? '') &&
          !productionVersions.includes(item.codeVersion ?? '')
        );
      })
      .map((item) => {
        return {
          label: item.codeVersion + '   ' + item.codeDescription
        };
      });

    if (selectList.length === 0) {
      logger.error(
        'No deletable versions found. All versions are currently deployed.'
      );
      return;
    }

    versions = (await displayMultiSelectTable(selectList, 1, 100)).map((item) =>
      item.slice(0, item.indexOf(' '))
    );
  }
  for (let i = 0; i < versions.length; i++) {
    const version = versions[i];
    const req: DeleteRoutineCodeVersionReq = {
      Name: projectConfig.name,
      CodeVersion: version
    };
    const res = await server.deleteRoutineCodeVersion(req);
    if (res?.Status === 'OK') {
      logger.success(
        `${t('deployments_delete_success').d('Delete success')}: ${version}`
      );
    } else {
      logger.error(
        `🙅 ${t('deployments_delete_failed').d('Delete failed')}: ${version}`
      );
    }
  }
}
