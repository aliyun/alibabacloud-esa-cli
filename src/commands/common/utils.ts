import chalk from 'chalk';

import t from '../../i18n/index.js';
import { ApiService } from '../../libs/apiService.js';
import {
  CreateRoutineWithAssetsCodeVersionRes,
  GetRoutineReq,
  CreateRoutineWithAssetsCodeVersionReq
} from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import { ensureRoutineExists } from '../../utils/checkIsRoutineCreated.js';
import compress from '../../utils/compress.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { ProjectConfig } from '../../utils/fileUtils/interface.js';
import sleep from '../../utils/sleep.js';
import { checkIsLoginSuccess } from '../utils.js';

function normalizeNotFoundStrategy(value?: string): string | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower === 'singlepageapplication') {
    return 'SinglePageApplication';
  }
  return value;
}

export async function commitRoutineWithAssets(
  requestParams: CreateRoutineWithAssetsCodeVersionReq,
  zipBuffer: Buffer
): Promise<{
  isSuccess: boolean;
  res: CreateRoutineWithAssetsCodeVersionRes | null;
} | null> {
  try {
    const server = await ApiService.getInstance();
    const apiResult =
      await server.CreateRoutineWithAssetsCodeVersion(requestParams);

    if (!apiResult || !apiResult.data.OssPostConfig) {
      return {
        isSuccess: false,
        res: null
      };
    }

    const ossConfig = apiResult.data.OssPostConfig;

    if (
      !ossConfig.OSSAccessKeyId ||
      !ossConfig.Signature ||
      !ossConfig.Url ||
      !ossConfig.Key ||
      !ossConfig.Policy
    ) {
      console.error('Missing required OSS configuration fields');
      return {
        isSuccess: false,
        res: null
      };
    }

    let uploadSuccess = false;
    for (let i = 0; i < 3; i++) {
      uploadSuccess = await server.uploadToOss(
        {
          OSSAccessKeyId: ossConfig.OSSAccessKeyId,
          Signature: ossConfig.Signature,
          Url: ossConfig.Url,
          Key: ossConfig.Key,
          Policy: ossConfig.Policy,
          XOssSecurityToken: ossConfig.XOssSecurityToken || ''
        },
        zipBuffer
      );
      if (uploadSuccess) {
        break;
      }
      if (i < 2) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return {
      isSuccess: uploadSuccess,
      res: apiResult
    };
  } catch (error) {
    console.error('Error in createRoutineWithAssetsCodeVersion:', error);
    return {
      isSuccess: false,
      res: null
    };
  }
}

/**
 * 通用的项目验证和初始化函数
 * 包含目录检查、项目配置获取、登录检查、routine存在性检查
 */
export async function validateAndInitializeProject(
  name?: string,
  projectPath?: string
): Promise<{
  projectConfig: ProjectConfig | null;
  projectName: string;
} | null> {
  const projectConfig = getProjectConfig(projectPath);
  // allow missing config, derive name from cwd when not provided
  const projectName =
    name ||
    projectConfig?.name ||
    (process.cwd().split(/[\\/]/).pop() as string);
  if (!projectName) {
    logger.notInProject();
    return null;
  }
  logger.startSubStep('Checking login status');
  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) {
    logger.endSubStep('You are not logged in');
    return null;
  }
  logger.endSubStep('Logged in');

  await ensureRoutineExists(projectName);
  return { projectConfig: projectConfig || null, projectName };
}

/**
 * 通用的routine详情获取函数
 */
export async function getRoutineDetails(projectName: string) {
  const server = await ApiService.getInstance();
  const req: GetRoutineReq = { Name: projectName };
  return await server.getRoutine(req, false);
}

/**
 * 通用的代码压缩和提交函数
 * 支持assets和普通代码两种模式
 */
export async function generateCodeVersion(
  projectName: string,
  description: string,
  entry?: string,
  assets?: string,
  minify = false,
  projectPath?: string
): Promise<{
  isSuccess: boolean;
  res: CreateRoutineWithAssetsCodeVersionRes | null;
} | null> {
  const { zip, sourceList, dynamicSources } = await compress(
    entry,
    assets,
    minify,
    projectPath
  );

  // Pretty print upload directory tree
  const buildTree = (
    paths: string[],
    decorateTopLevel: (name: string) => string
  ): string[] => {
    type Node = { children: Map<string, Node>; isFile: boolean };
    const root: Node = { children: new Map(), isFile: false };
    const sorted = [...paths].sort((a, b) => a.localeCompare(b));
    for (const p of sorted) {
      const parts = p.split('/').filter(Boolean);
      let node = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!node.children.has(part)) {
          node.children.set(part, { children: new Map(), isFile: false });
        }
        const child = node.children.get(part)!;
        if (i === parts.length - 1) child.isFile = true;
        node = child;
      }
    }
    const lines: string[] = [];
    const render = (node: Node, prefix: string, depth: number) => {
      const entries = [...node.children.entries()];
      entries.forEach(([_name, _child], idx) => {
        const isLast = idx === entries.length - 1;
        const connector = isLast ? '└ ' : '├ ';
        const nextPrefix = prefix + (isLast ? '   ' : '│  ');
        const displayName = depth === 0 ? decorateTopLevel(_name) : _name;
        lines.push(prefix + connector + displayName);
        render(_child, nextPrefix, depth + 1);
      });
    };
    render(root, '', 0);
    return lines.length ? lines : ['-'];
  };

  const header =
    chalk.hex('#22c55e')('UPLOAD') + ' Files to be uploaded (source paths)';
  logger.block();
  logger.log(header);

  const dynamicSet = new Set(dynamicSources);
  const LIMIT = 300;
  const staticPaths = sourceList
    .filter((p) => !dynamicSet.has(p))
    .sort((a, b) => a.localeCompare(b));
  const dynamicPaths = sourceList
    .filter((p) => dynamicSet.has(p))
    .sort((a, b) => a.localeCompare(b));

  let omitted = 0;
  let shownStatic = staticPaths;
  if (staticPaths.length > LIMIT) {
    shownStatic = staticPaths.slice(0, LIMIT);
    omitted = staticPaths.length - LIMIT;
  }

  // Compute top-level markers based on whether a top-level bucket contains dynamic/static files
  const topLevelStats = new Map<
    string,
    { hasDynamic: boolean; hasStatic: boolean }
  >();
  const addStat = (p: string, isDynamic: boolean) => {
    const top = p.split('/')[0] || p;
    const stat = topLevelStats.get(top) || {
      hasDynamic: false,
      hasStatic: false
    };
    if (isDynamic) stat.hasDynamic = true;
    else stat.hasStatic = true;
    topLevelStats.set(top, stat);
  };
  dynamicPaths.forEach((p) => addStat(p, true));
  shownStatic.forEach((p) => addStat(p, false));

  const dynamicMarker = chalk.bold.yellowBright(' (dynamic)');
  const staticMarker = chalk.bold.greenBright(' (static)');
  const decorateTopLevel = (name: string) => {
    const stat = topLevelStats.get(name);
    if (!stat) return name;
    if (stat.hasDynamic && stat.hasStatic) {
      return `${name}${dynamicMarker}${staticMarker}`;
    }
    if (stat.hasDynamic) return `${name}${dynamicMarker}`;
    if (stat.hasStatic) return `${name}${staticMarker}`;
    return name;
  };

  const combined = [...dynamicPaths, ...shownStatic];
  const treeLines = buildTree(combined, decorateTopLevel);
  for (const line of treeLines) {
    logger.log(line);
  }
  if (omitted > 0) {
    const note = chalk.gray(
      `Only show the first ${LIMIT} static files, omitted ${omitted} files`
    );
    logger.log(note);
  }
  logger.block();

  const projectConfig = getProjectConfig(projectPath);
  const notFoundStrategy = normalizeNotFoundStrategy(
    projectConfig?.assets?.notFoundStrategy
  );
  logger.startSubStep('Generating code version');
  const requestParams: CreateRoutineWithAssetsCodeVersionReq = {
    Name: projectName,
    CodeDescription: description,
    ExtraInfo: JSON.stringify({ Source: 'CLI' })
  };

  if (notFoundStrategy) {
    requestParams.ConfOptions = {
      NotFoundStrategy: notFoundStrategy
    };
  }

  const res = await commitRoutineWithAssets(
    requestParams,
    zip?.toBuffer() as Buffer
  );

  if (res?.isSuccess) {
    return {
      isSuccess: true,
      res: res?.res
    };
  } else {
    return {
      isSuccess: false,
      res: null
    };
  }
}

/**
 * 根据 env 在一个或多个环境部署
 */
export async function deployToEnvironments(
  name: string,
  codeVersion: string,
  env: 'staging' | 'production' | 'all'
): Promise<boolean> {
  if (env === 'all') {
    const isStagingSuccess = await deployCodeVersion(
      name,
      codeVersion,
      'staging'
    );
    const isProdSuccess = await deployCodeVersion(
      name,
      codeVersion,
      'production'
    );
    return isStagingSuccess && isProdSuccess;
  }
  return await deployCodeVersion(name, codeVersion, env);
}

/**
 * 通用的快速部署函数
 * 结合了压缩、提交和部署的完整流程
 */
export async function commitAndDeployVersion(
  projectName?: string,
  scriptEntry?: string,
  assets?: string,
  description = '',
  projectPath?: string,
  env: 'staging' | 'production' | 'all' = 'production',
  minify = false,
  version?: string
): Promise<boolean> {
  const projectInfo = await validateAndInitializeProject(
    projectName,
    projectPath
  );

  if (!projectInfo) {
    return false;
  }
  const { projectConfig } = projectInfo;

  // 2) Use existing version or generate a new one
  if (version) {
    logger.startSubStep(`Using existing version ${version}`);
    const deployed = await deployToEnvironments(
      projectInfo.projectName,
      version,
      env
    );
    logger.endSubStep(deployed ? 'Deploy finished' : 'Deploy failed');
    return deployed;
  }

  const res = await generateCodeVersion(
    projectInfo.projectName,
    description,
    scriptEntry || projectConfig?.entry,
    assets || projectConfig?.assets?.directory,
    minify || projectConfig?.minify,
    projectPath
  );
  const isCommitSuccess = res?.isSuccess;
  if (!isCommitSuccess) {
    logger.endSubStep('Generate version failed');
    return false;
  }

  const codeVersion = res?.res?.data?.CodeVersion;
  if (!codeVersion) {
    logger.endSubStep('Missing CodeVersion in response');
    return false;
  }
  logger.endSubStep(`Version generated: ${codeVersion}`);

  // 3) Deploy to specified environment(s)
  const deployed = await deployToEnvironments(
    projectInfo.projectName,
    codeVersion,
    env
  );

  return deployed;
}

/**
 * 通用的版本部署函数
 */
export async function deployCodeVersion(
  name: string,
  codeVersion: string,
  environment: 'staging' | 'production'
): Promise<boolean> {
  const server = await ApiService.getInstance();
  // Ensure the committed code version is ready before deploying
  const isReady = await waitForCodeVersionReady(name, codeVersion, environment);
  if (!isReady) {
    logger.error('The code version is not ready for deployment.');
    return false;
  }

  const res = await server.createRoutineCodeDeployment({
    Name: name,
    CodeVersions: [{ Percentage: 100, CodeVersion: codeVersion }],
    Strategy: 'percentage',
    Env: environment
  });

  if (res) {
    return true;
  } else {
    return false;
  }
}

/**
 * Poll routine code version status until it becomes ready
 */
export async function waitForCodeVersionReady(
  name: string,
  codeVersion: string,
  env: 'staging' | 'production',
  timeoutMs = 5 * 60 * 1000,
  intervalMs = 1000
): Promise<boolean> {
  if (!name || !codeVersion) {
    return false;
  }
  const server = await ApiService.getInstance();
  const start = Date.now();

  logger.startSubStep(`Waiting for code version ${codeVersion} to be ready...`);
  while (Date.now() - start < timeoutMs) {
    try {
      const info = await server.getRoutineCodeVersionInfo({
        Name: name,
        CodeVersion: codeVersion
      });

      const status = info?.data?.Status?.toLowerCase();
      if (status === 'init') {
        await sleep(intervalMs);
        continue;
      } else if (status === 'available') {
        logger.endSubStep(
          `Code version ${chalk.cyan(codeVersion)} is deployed to ${env}.`
        );
        return true;
      } else {
        logger.error(
          `Code version ${chalk.cyan(codeVersion)} build ${status}.`
        );
        return false;
      }
    } catch (e) {
      // swallow and retry until timeout
    }
  }
  logger.error(
    `⏰ Waiting for code version ${chalk.cyan(codeVersion)} timed out.`
  );
  return false;
}

/**
 * 通用的部署成功显示函数
 * 显示部署成功信息、访问链接和后续操作指南
 */
export async function displayDeploySuccess(
  projectName: string,
  showDomainGuide = true,
  showRouteGuide = true
): Promise<void> {
  const service = await ApiService.getInstance();
  const res = await service.getRoutine({ Name: projectName });
  const defaultUrl = res?.data?.DefaultRelatedRecord;
  const visitUrl = defaultUrl ? 'https://' + defaultUrl : '';

  const accent = chalk.hex('#7C3AED');
  const label = chalk.hex('#22c55e');
  const subtle = chalk.gray;

  const title = `${chalk.bold('🚀 ')}${chalk.bold(
    t('init_deploy_success').d('Deploy Success')
  )}`;
  const lineUrl = `${label('URL')}  ${visitUrl ? chalk.yellowBright(visitUrl) : subtle('-')}`;
  const lineProject = `${label('APP')}  ${chalk.cyan(projectName || '-')}`;
  const lineCd = projectName
    ? `${label('TIP')}  ${t('deploy_success_cd').d('Enter project directory')}: ${chalk.green(
        `cd ${projectName}`
      )}`
    : '';
  const guides: string[] = [];
  if (showDomainGuide) {
    guides.push(
      `${label('TIP')}  ${t('deploy_success_guide').d('Add a custom domain')}: ${chalk.green(
        'esa-cli domain add <DOMAIN>'
      )}`
    );
  }
  if (showRouteGuide) {
    guides.push(
      `${label('TIP')}  ${t('deploy_success_guide_2').d('Add routes for a site')}: ${chalk.green(
        'esa-cli route add -r <ROUTE> -s <SITE>'
      )}`
    );
  }
  const tip = `${subtle(
    t('deploy_url_warn').d(
      'The domain may take some time to take effect, please try again later.'
    )
  )}`;

  const lines = [
    accent(title),
    '',
    lineProject,
    lineUrl,
    lineCd ? '' : '',
    lineCd || '',
    guides.length ? '' : '',
    ...guides,
    guides.length ? '' : '',
    tip
  ];

  const stripAnsi = (s: string) => s.replace(/\x1B\[[0-?]*[ -\/]*[@-~]/g, '');
  const contentWidth = Math.max(...lines.map((l) => stripAnsi(l).length));

  const borderColor = chalk.hex('#00D4FF').bold;
  const top = `${borderColor('╔')}${borderColor(
    '═'.repeat(contentWidth + 2)
  )}${borderColor('╗')}`;
  const bottom = `${borderColor('╚')}${borderColor(
    '═'.repeat(contentWidth + 2)
  )}${borderColor('╝')}`;

  const boxLines = [
    top,
    ...lines.map((l) => {
      const pad = ' '.repeat(contentWidth - stripAnsi(l).length);
      const left = borderColor('║');
      const right = borderColor('║');
      return `${left} ${l}${pad} ${right}`;
    }),
    bottom
  ];

  logger.block();
  boxLines.forEach((l) => logger.log(l));
  logger.block();
}
