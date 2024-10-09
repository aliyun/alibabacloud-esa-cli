import { CommandModule, ArgumentsCamelCase, Argv } from 'yargs';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import {
  DeleteRoutineRelatedRouteReq,
  GetRoutineReq,
  RelatedRouteProps
} from '../../libs/interface.js';
import { checkDirectory, checkIsLoginSuccess } from '../utils.js';
import { ApiService } from '../../libs/apiService.js';
import logger from '../../libs/logger.js';
import t from '../../i18n/index.js';
import { validRoutine } from '../../utils/checkIsRoutineCreated.js';

const deleteRoute: CommandModule = {
  command: 'delete <route>',
  describe: `🗑  ${t('route_delete_describe').d('Delete a related route')}`,
  builder: (yargs: Argv) => {
    return yargs.positional('route', {
      describe: t('route_delete_positional_describe').d(
        'The name of the routes to delete'
      ),
      type: 'string',
      demandOption: true
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

  const server = await ApiService.getInstance();

  const req: GetRoutineReq = { Name: projectConfig.name };
  const routineDetail = await server.getRoutine(req);
  if (!routineDetail) return;

  const relatedRoutes: RelatedRouteProps[] =
    routineDetail.data?.RelatedRoutes ?? [];
  const deleteDomain: string = argv.route as string;

  const matchedSite = relatedRoutes.find((item) => {
    return String(item.Route) === deleteDomain;
  });

  if (matchedSite === undefined) {
    logger.error(t('route_not_exist').d('Route not exist!'));
    return;
  }
  const request: DeleteRoutineRelatedRouteReq = {
    Name: projectConfig.name,
    SiteId: matchedSite.SiteId,
    SiteName: matchedSite.SiteName,
    Route: matchedSite.Route,
    RouteId: matchedSite.RouteId
  };

  const res = await server.deleteRoutineRelatedRoute(request);
  const isDeleteSuccess = res?.data.Status === 'OK';
  if (isDeleteSuccess) {
    logger.success(t('route_delete_success').d('Delete route success!'));
  } else {
    logger.error(t('route_delete_fail').d('Delete route fail!'));
  }
}
