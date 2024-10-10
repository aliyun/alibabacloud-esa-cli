import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';
import { DeleteRoutineReq } from '../../libs/interface.js';
import { ApiService } from '../../libs/apiService.js';
import t from '../../i18n/index.js';
import logger from '../../libs/logger.js';

const deleteCommand: CommandModule = {
  command: 'delete <routineName>',
  describe: `🗑  ${t('delete_describe').d('Delete a routine')}`,
  builder: (yargs: Argv) => {
    return yargs
      .positional('routineName', {
        describe: t('delete_routineName_positional_describe').d(
          'The name of the routine to delete'
        ),
        type: 'string',
        array: true,
        demandOption: true
      })
      .usage(`${t('common_usage').d('Usage')}: $0 delete <routineName>`);
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handleDelete(argv);
  }
};

export default deleteCommand;

export async function handleDelete(argv: ArgumentsCamelCase) {
  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;

  const routineName: string = argv.routineName as string;
  const req: DeleteRoutineReq = { Name: routineName };
  return await deleteRoutineFromUserAccount(req);
}

export async function deleteRoutineFromUserAccount(req: DeleteRoutineReq) {
  const server = await ApiService.getInstance();
  const res = await server.deleteRoutine(req);
  if (res?.Status === 'OK') {
    logger.success(t('delete_success').d('Delete success!'));
  } else {
    logger.error(t('delete_error').d('Delete error!'));
  }
}
