import { execSync } from 'child_process';
import fs from 'fs';

import { ListRoutineCodeVersionsResponseBodyCodeVersions } from '@alicloud/esa20240910/dist/models/ListRoutineCodeVersionsResponseBodyCodeVersions.js';
import chalk from 'chalk';

import { Option } from '../components/filterSelector.js';
import t from '../i18n/index.js';
import api from '../libs/api.js';
import { ApiService } from '../libs/apiService.js';
import { isInstalledGit } from '../libs/git/index.js';
import {
  CreateRoutineRelatedRecordReq,
  GetMatchSiteReq,
  ListSitesReq
} from '../libs/interface.js';
import logger from '../libs/logger.js';
import { getRoot } from '../utils/fileUtils/base.js';
import { getCliConfig, projectConfigPath } from '../utils/fileUtils/index.js';

import { getRoutineDetails } from './common/utils.js';

export const checkDirectory = (isCheckGit = false): boolean => {
  const root = getRoot();
  if (fs.existsSync(projectConfigPath)) {
    try {
      if (isCheckGit && isInstalledGit()) {
        const gitStatus = execSync('git status --porcelain', {
          cwd: root
        }).toString();
        if (gitStatus) {
          logger.warn(
            t('utils_git_not_commit').d(
              'There are uncommitted changes in the repository.'
            )
          );
          return false;
        }
      }
    } catch (error) {
      logger.error(
        `${t('utils_git_error').d('An error occurred while checking the Git status')}: ${error}`
      );
      return false;
    }

    return true;
  } else {
    logger.notInProject();
    return false;
  }
};

export const bindRoutineWithDomain = async (name: string, domain: string) => {
  const server = await ApiService.getInstance();

  const req: GetMatchSiteReq = { RecordName: domain };
  const res = await server.getMatchSite(req);
  if (res) {
    const record = res;
    const createReq: CreateRoutineRelatedRecordReq = {
      Name: name,
      SiteId: record.data.SiteId,
      SiteName: record.data.SiteName,
      RecordName: domain
    };
    const response = await server.createRoutineRelatedRecord(createReq);

    const isBindSuccess = response?.data.Status === 'OK';
    if (isBindSuccess) {
      logger.success(
        t('utils_bind_success', { domain }).d(
          `Binding domain ${domain} to routine successfully`
        )
      );
    } else {
      logger.error(
        t('utils_bind_error', { domain }).d(
          `Binding domain ${domain} to routine failed`
        )
      );
    }
  } else {
    logger.error(t('utils_domain_error').d('Domain is not active'));
  }
};

export function validName(name: any): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(name);
}

// Validate if domain is valid
export function validDomain(domain: any): boolean {
  return /^(?:[a-z0-9-](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(
    domain
  );
}

export async function checkIsLoginSuccess(): Promise<boolean> {
  let accessKeyId = process.env.ESA_ACCESS_KEY_ID;
  let accessKeySecret = process.env.ESA_ACCESS_KEY_SECRET;
  let endpoint = process.env.ESA_ENDPOINT;
  const cliConfig = getCliConfig();
  if (!accessKeyId || !accessKeySecret) {
    accessKeyId = cliConfig?.auth?.accessKeyId;
    accessKeySecret = cliConfig?.auth?.accessKeySecret;
  }

  if (!endpoint) {
    endpoint = cliConfig?.endpoint;
  }

  const namedCommand = chalk.green('esa login');
  if (!accessKeyId || !accessKeySecret) {
    logger.log(
      `❌ ${t('utils_login_error').d('Maybe you are not logged in yet.')}`
    );
    logger.log(
      `🔔 ${t('utils_login_error_config', { namedCommand }).d(`Please run command to login: ${namedCommand}`)}`
    );
    return false;
  }

  return await validateLoginCredentials(
    accessKeyId,
    accessKeySecret,
    endpoint,
    namedCommand
  );
}

/**
 * 验证登录凭据的公共函数
 * @param accessKeyId AccessKey ID
 * @param accessKeySecret AccessKey Secret
 * @param namedCommand 命令名称（用于错误提示）
 * @param showError 是否显示错误信息
 * @returns 登录是否成功
 */
export async function validateLoginCredentials(
  accessKeyId: string,
  accessKeySecret: string,
  endpoint?: string,
  namedCommand?: string,
  showError = true
): Promise<boolean> {
  const server = await ApiService.getInstance();
  server.updateConfig({
    auth: {
      accessKeyId,
      accessKeySecret
    },
    endpoint: endpoint
  });
  const res = await server.checkLogin();

  if (res.success) {
    return true;
  }

  if (showError) {
    logger.log(res.message || '');
    logger.log(
      `❌ ${t('utils_login_error').d('Maybe you are not logged in yet.')}`
    );
    if (namedCommand) {
      logger.log(
        `🔔 ${t('utils_login_error_config', { namedCommand }).d(`Please run command to login: ${namedCommand}`)}`
      );
    }
  }
  return false;
}

export function isValidRouteForDomain(route: string, domain: string): boolean {
  // Build a regex that allows subdomains and arbitrary paths
  // For example, match URLs like *.example.com/*
  return route.includes(domain);
}

export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& represents the entire matched string
}

export const getAllSites = async (): Promise<Option[]> => {
  const server = await ApiService.getInstance();
  const res = [];
  while (true) {
    const req: ListSitesReq = {
      SiteSearchType: 'fuzzy',
      Status: 'active',
      PageNumber: res.length + 1,
      PageSize: 500
    };

    const response = await server.listSites(req);
    if (response?.data?.Sites) {
      res.push(...response.data.Sites);
    } else {
      break;
    }
  }
  return res.map((site: any) => {
    return {
      label: site.SiteName,
      value: site.SiteId
    };
  });
};

export const getRoutineCodeVersions = async (
  projectName: string
): Promise<{
  allVersions: ListRoutineCodeVersionsResponseBodyCodeVersions[];
  stagingVersions: string[];
  productionVersions: string[];
}> => {
  const routineDetail = await getRoutineDetails(projectName);
  const req = { name: projectName };
  const res = await api.listRoutineCodeVersions(req);
  const allVersions = res.body?.codeVersions ?? [];

  const stagingVersions =
    routineDetail?.data?.Envs?.find(
      (item) => item.Env === 'staging'
    )?.CodeDeploy?.CodeVersions?.map((item) => item.CodeVersion) || [];
  const productionVersions =
    routineDetail?.data?.Envs?.find(
      (item) => item.Env === 'production'
    )?.CodeDeploy?.CodeVersions?.map((item) => item.CodeVersion) || [];
  return { allVersions, stagingVersions, productionVersions };
};
