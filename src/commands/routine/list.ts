import chalk from 'chalk';
import Table from 'cli-table3';
import moment from 'moment';
import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';

import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import { EdgeFunctionItem } from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import { checkIsLoginSuccess } from '../utils.js';

const list: CommandModule = {
  command: 'list',
  describe: `📋 ${t('list_describe').d('List all your routines')}`,
  builder: (yargs: Argv) => {
    return yargs
      .option('keyword', {
        alias: 'k',
        describe: t('deploy_option_keyword').d(
          'Keyword to search for routines'
        ),
        type: 'string'
      })
      .usage(`${t('common_usage').d('Usage')}: \$0 list [--keyword <keyword>]`);
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handleList(argv);
  }
};

export default list;

export async function getAllRoutines(options?: {
  RegionId?: string;
  SearchKeyWord?: string;
  PageSize?: number;
}): Promise<EdgeFunctionItem[]> {
  const server = await ApiService.getInstance();
  const allRoutines: EdgeFunctionItem[] = [];

  let pageNumber = 1;
  const pageSize = options?.PageSize || 50;

  while (true) {
    const res = await server.listUserRoutines({
      RegionId: options?.RegionId,
      PageNumber: pageNumber,
      PageSize: pageSize,
      SearchKeyWord: options?.SearchKeyWord
    });

    if (!res?.body?.Routines) {
      break;
    }

    allRoutines.push(...res.body.Routines);

    const totalCount = res.body.TotalCount;
    const currentCount = allRoutines.length;

    if (currentCount >= totalCount) {
      break;
    }

    pageNumber++;
  }

  return allRoutines;
}

export async function handleList(argv: ArgumentsCamelCase) {
  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  const routineList = await getAllRoutines({
    SearchKeyWord: argv.keyword as string
  });
  if (routineList) {
    logger.log(
      chalk.bold.bgGray(
        `📃 ${t('list_routine_name_title').d('List all of routine')}:`
      )
    );
    displayRoutineList(routineList);
  }
}

export async function displayRoutineList(versionList: EdgeFunctionItem[]) {
  const table = new Table({
    head: ['Name', 'Created', 'Description'],
    colWidths: [20, 25, 30]
  });
  versionList.forEach((version) => {
    table.push([
      version.RoutineName,
      moment(version.CreateTime).format('YYYY/MM/DD HH:mm:ss'),
      version.Description
    ]);
  });
  console.table(table.toString());
}
