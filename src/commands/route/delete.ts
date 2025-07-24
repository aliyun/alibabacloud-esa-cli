import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';
import logger from '../../libs/logger.js';
import t from '../../i18n/index.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';
import api from '../../libs/api.js';

const deleteRoute: CommandModule = {
  command: 'delete <routeName>',
  describe: `🗑  ${t('route_delete_describe').d('Delete a related route')}`,
  builder: (yargs: Argv) => {
    return yargs
      .positional('routeName', {
        describe: t('route_delete_positional_describe').d(
          'The name of the routes to delete'
        ),
        type: 'string',
        demandOption: true
      })
      .fail((msg, err, yargsIns) => {
        console.log(msg, err);
        if (err) throw err;
        if (msg) {
          yargsIns.showHelp('log');
        }
        process.exit(1);
      });
  },
  handler: async (argv: ArgumentsCamelCase) => {
    handleDeleteRoute(argv);
  }
};

export default deleteRoute;

export async function handleDeleteRoute(argv: ArgumentsCamelCase) {
  if (!checkDirectory()) {
    return;
  }

  const projectConfig = getProjectConfig();
  if (!projectConfig) return logger.notInProject();

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) return;
  await validRoutine(projectConfig.name);

  const req = {
    routineName: projectConfig.name
  };

  const res = await api.listRoutineRoutes(req as any);
  const configs = res.body?.configs || [];

  const deleteRouteName: string = argv.routeName as string;

  const matchedRoute = configs.find(
    (config) => config.routeName === deleteRouteName
  );

  if (!matchedRoute) {
    logger.error(
      t('no_route_found').d('No route found! Please check the route name.')
    );
    return;
  }

  const siteId = matchedRoute?.siteId;
  const configId = matchedRoute?.configId;

  const deleteRouteReq = {
    siteId: siteId,
    configId: configId
  };

  const deleteRouteRes = await api.deleteRoutineRoute(deleteRouteReq);
  const isDeleteSuccess = deleteRouteRes.statusCode === 200;

  if (isDeleteSuccess) {
    logger.success(t('route_delete_success').d('Delete route success!'));
  } else {
    logger.error(t('route_delete_fail').d('Delete route fail!'));
  }
}
