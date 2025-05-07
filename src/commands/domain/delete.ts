import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import {
  DeleteRoutineRelatedRecordReq,
  ListRoutineRelatedRecordsReq,
  RelatedRecordProps
} from '../../libs/interface.js';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';
import { ApiService } from '../../libs/apiService.js';
import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';

const deleteDomain: CommandModule = {
  command: 'delete <domain>',
  describe: `🗑  ${t('domain_delete_describe').d('Delete a related domain')}`,
  builder: (yargs: Argv) => {
    return yargs.positional('domains', {
      describe: t('domain_delete_positional_describe').d(
        'The names of the related domains to delete'
      ),
      type: 'string',
      array: true,
      demandOption: true
    });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handleDeleteDomain(argv);
  }
};

export default deleteDomain;

export async function handleDeleteDomain(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) {
    return;
  }
  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  await validRoutine(projectConfig.name);

  const server = await ApiService.getInstance();

  const req: ListRoutineRelatedRecordsReq = { Name: projectConfig.name || '' };
  const listRoutineRelatedRecordRes =
    await server.listRoutineRelatedRecords(req);
  if (!listRoutineRelatedRecordRes) return;

  const relatedRecords: RelatedRecordProps[] =
    listRoutineRelatedRecordRes.data?.RelatedRecords || [];
  const relatedDomain: string = argv.domain as string;

  const matchedSite = relatedRecords.find((item) => {
    return String(item.RecordName) === relatedDomain;
  });

  if (matchedSite === undefined) {
    logger.error(t('domain_delete_not_found').d("Domain doesn't exist"));
    return;
  }
  const record: DeleteRoutineRelatedRecordReq = {
    RecordName: matchedSite.RecordName,
    Name: projectConfig.name || '',
    SiteId: matchedSite.SiteId,
    SiteName: matchedSite.SiteName,
    RecordId: matchedSite.RecordId
  };

  const res = await server.deleteRoutineRelatedRecord(record);
  if (res?.data.Status === 'OK') {
    logger.success(t('domain_delete_success').d('Delete domain success'));
  } else {
    logger.error(t('domain_delete_failed').d('Delete domain failed'));
  }
}
