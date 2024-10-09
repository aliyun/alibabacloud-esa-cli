import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';
import logger from '../../libs/logger.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { GetRoutineReq, RelatedRecordProps } from '../../libs/interface.js';
import { ApiService } from '../../libs/apiService.js';
import t from '../../i18n/index.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';

const listDomain: CommandModule = {
  command: 'list',
  describe: `🔍 ${t('domain_list_describe').d('List all related domains')}`,
  handler: async (argv: ArgumentsCamelCase) => {
    handleListDomains(argv);
  }
};

export default listDomain;

export async function handleListDomains(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) {
    return;
  }

  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  await validRoutine(projectConfig.name);

  const server = await ApiService.getInstance();

  const req: GetRoutineReq = { Name: projectConfig.name };
  const routineDetail = await server.getRoutine(req);

  if (!routineDetail) return;
  const relatedRecords: RelatedRecordProps[] =
    routineDetail.data?.RelatedRecords ?? [];

  if (relatedRecords.length === 0) {
    logger.log(`🙅 ${t('domain_list_empty').d('No related domains found')}`);
    return;
  }
  const domainList = relatedRecords.map((record) => record.RecordName);
  logger.log(`📃 ${t('domain_list_title').d('Related domains:')}`);
  logger.tree(domainList);
}
