import { it, describe, expect, vi, afterEach, beforeEach } from 'vitest';

import { handlerAddRoute } from '../../../src/commands/route/add.js';
import { checkDirectory } from '../../../src/commands/utils.js';
import { routeBuilder } from '../../../src/components/routeBuilder.js';
import { ApiService } from '../../../src/libs/apiService.js';
import logger from '../../../src/libs/logger.js';

const mockListSites = vi.fn();
const mockCreateRoutineRoute = vi.fn();

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn()
  }
}));
vi.mock('../../../src/components/routeBuilder.js', () => ({
  routeBuilder: vi.fn()
}));
vi.mock('../../../src/commands/utils.js', () => ({
  checkDirectory: vi.fn().mockReturnValue(true),
  checkIsLoginSuccess: vi.fn().mockResolvedValue(true),
  validDomain: vi.fn(),
  validName: vi.fn()
}));
vi.mock('../../../src/utils/checkIsRoutineCreated.js', () => ({
  validRoutine: vi.fn().mockResolvedValue(undefined)
}));
vi.mock('../../../src/utils/fileUtils/index.js', () => ({
  getProjectConfig: vi.fn().mockReturnValue({ name: 'test-routine' }),
  getProjectConfigPath: vi.fn().mockReturnValue('/tmp/esa.jsonc'),
  projectConfigPath: '/tmp/esa.jsonc',
  cliConfigPath: '/tmp/config.toml',
  getCliConfig: vi.fn(),
  getCliConfigPath: vi.fn(),
  getTemplatesConfig: vi.fn(),
  templateHubPath: '/tmp',
  updateProjectConfigFile: vi.fn(),
  generateConfigFile: vi.fn()
}));
vi.mock('../../../src/utils/fileUtils/base.js', () => ({
  getRoot: vi.fn().mockReturnValue('/test/root'),
  getDirName: vi.fn().mockReturnValue('/test/dir')
}));
vi.mock('../../../src/libs/apiService.js', () => ({
  ApiService: {
    getInstance: vi.fn()
  }
}));
vi.mock('../../../src/libs/logger.js', () => ({
  default: {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    notInProject: vi.fn()
  }
}));
vi.mock('../../../src/i18n/index.js', () => ({
  default: (key: string) => ({ d: (v: string) => v })
}));

function setupMockServer(sites = [{ SiteName: 'test.site', SiteId: 4589034801 }], routeCode = 200) {
  mockListSites.mockResolvedValue({ data: { Sites: sites } });
  mockCreateRoutineRoute.mockResolvedValue({ code: routeCode });
  vi.mocked(ApiService.getInstance).mockResolvedValue({
    listSites: mockListSites,
    createRoutineRoute: mockCreateRoutineRoute
  } as any);
}

describe('handle add routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkDirectory).mockReturnValue(true);
    setupMockServer();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle adding route success with argv params', async () => {
    await handlerAddRoute({
      alias: 'test-route',
      site: 'test.site',
      route: 'test.site/*',
      _: [],
      $0: ''
    });

    expect(mockCreateRoutineRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        RoutineName: 'test-routine',
        RouteName: 'test-route',
        SiteId: 4589034801,
        RouteEnable: 'on',
        Bypass: 'off'
      })
    );
    expect(logger.success).toHaveBeenCalledWith(
      expect.stringContaining('Add route success')
    );
  });

  it('should handle adding route with inquirer prompts and routeBuilder', async () => {
    const inquirer = (await import('inquirer')).default;
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ routeName: 'my-route' })
      .mockResolvedValueOnce({ routeSite: 4589034801 });

    vi.mocked(routeBuilder).mockResolvedValue('test.site/*');

    await handlerAddRoute({ _: [], $0: '' });

    expect(inquirer.prompt).toHaveBeenCalledTimes(2);
    expect(routeBuilder).toHaveBeenCalledWith('test.site');
    expect(mockCreateRoutineRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        RoutineName: 'test-routine',
        RouteName: 'my-route',
        SiteId: 4589034801
      })
    );
    expect(logger.success).toHaveBeenCalledWith(
      expect.stringContaining('Add route success')
    );
  });

  it('should handle adding route fail', async () => {
    setupMockServer([{ SiteName: 'test.site', SiteId: 4589034801 }], 500);

    await handlerAddRoute({
      alias: 'test-route',
      site: 'test.site',
      route: 'test.site/*',
      _: [],
      $0: ''
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Add route fail')
    );
  });

  it('should return early if checkDirectory fails', async () => {
    vi.mocked(checkDirectory).mockReturnValue(false);

    await handlerAddRoute({ _: [], $0: '' });

    expect(ApiService.getInstance).not.toHaveBeenCalled();
  });

  it('should return early if no active sites found', async () => {
    setupMockServer([]);

    await handlerAddRoute({
      alias: 'test-route',
      _: [],
      $0: ''
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('No active sites found')
    );
  });

  it('should return early if site name not found', async () => {
    await handlerAddRoute({
      alias: 'test-route',
      site: 'nonexistent.site',
      route: 'nonexistent.site/*',
      _: [],
      $0: ''
    });

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('not found')
    );
  });
});
