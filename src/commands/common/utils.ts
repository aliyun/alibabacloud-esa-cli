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
  name?: string
): Promise<{ projectConfig: ProjectConfig; projectName: string } | null> {
  const projectConfig = getProjectConfig();
  if (!projectConfig) {
    logger.notInProject();
    return null;
  }

  const projectName = name || projectConfig.name;

  const isSuccess = await checkIsLoginSuccess();
  if (!isSuccess) {
    return null;
  }
  await ensureRoutineExists(projectName);

  return { projectConfig, projectName };
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
  const zip = await compress(entry, assets, minify, projectPath);

  const projectConfig = getProjectConfig(projectPath);
  const notFoundStrategy = normalizeNotFoundStrategy(
    projectConfig?.assets?.notFoundStrategy
  );

  const requestParams: CreateRoutineWithAssetsCodeVersionReq = {
    Name: projectName,
    CodeDescription: description
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
    logger.success('Your code has been successfully committed');
    return {
      isSuccess: true,
      res: res?.res
    };
  } else {
    logger.error('Generate code version failed');
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
  projectConfig: ProjectConfig,
  scriptEntry?: string,
  assets?: string,
  description = '',
  projectPath?: string,
  env: 'staging' | 'production' | 'all' = 'production',
  minify = false,
  version?: string
): Promise<boolean> {
  if (version) {
    return await deployToEnvironments(projectConfig.name, version, env);
  } else {
    const res = await generateCodeVersion(
      projectConfig.name,
      description,
      scriptEntry || projectConfig.entry,
      assets || projectConfig.assets?.directory,
      minify || projectConfig.minify,
      projectPath
    );
    const isCommitSuccess = res?.isSuccess;
    if (isCommitSuccess) {
      const codeVersion = res?.res?.data?.CodeVersion;
      if (!codeVersion) {
        logger.error('Failed to read CodeVersion from response.');
        return false;
      }
      return await deployToEnvironments(projectConfig.name, codeVersion, env);
    } else {
      return false;
    }
  }
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
  const isReady = await waitForCodeVersionReady(name, codeVersion);
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
    logger.success(
      `Your code has been successfully deployed to ${chalk.cyan(environment)}`
    );
    return true;
  } else {
    logger.error('Your code has not been deployed');
    return false;
  }
}

/**
 * Poll routine code version status until it becomes ready
 */
export async function waitForCodeVersionReady(
  name: string,
  codeVersion: string,
  timeoutMs = 5 * 60 * 1000,
  intervalMs = 1000
): Promise<boolean> {
  if (!name || !codeVersion) {
    return false;
  }
  const server = await ApiService.getInstance();
  const start = Date.now();
  logger.log(
    `⏳ Waiting for code version ${chalk.cyan(codeVersion)} to be ready...`
  );

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
        logger.log(`✅ Code version ${chalk.cyan(codeVersion)} is ready.`);
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

  if (showDomainGuide) {
    logger.log(
      `👉 ${t('deploy_success_guide').d('Run this command to add domains')}: ${chalk.green('esa domain add <DOMAIN>')}`
    );
  }

  if (showRouteGuide) {
    logger.log(
      `👉 ${t('deploy_success_guide_2').d('Run this command to add routes')}: ${chalk.green('esa route add -r <ROUTE> -s <SITE>')}`
    );
  }

  logger.success(
    `${t('init_deploy_success').d('Project deployment completed. Visit: ')}${chalk.yellowBright(visitUrl)}`
  );

  logger.warn(
    t('deploy_url_warn').d(
      'The domain may take some time to take effect, please try again later.'
    )
  );
}

/**
 * 通用的快速部署函数（用于init命令）
 * 结合了登录检查、routine创建、代码提交和部署的完整流程
 */
export async function quickDeployForInit(
  targetPath: string,
  projectConfig: ProjectConfig,
  description = 'Quick deploy from init'
): Promise<boolean> {
  const isLoginSuccess = await checkIsLoginSuccess();
  if (!isLoginSuccess) {
    logger.log(
      chalk.yellow(
        t('not_login_auto_deploy').d(
          'You are not logged in, automatic deployment cannot be performed. Please log in later and manually deploy.'
        )
      )
    );
    return false;
  }

  await ensureRoutineExists(projectConfig.name);

  const isProdSuccess = await commitAndDeployVersion(
    projectConfig,
    projectConfig?.entry,
    projectConfig?.assets?.directory,
    description,
    targetPath,
    'all'
  );

  if (isProdSuccess) {
    await displayDeploySuccess(projectConfig?.name ?? '');
  }

  return isProdSuccess;
}
