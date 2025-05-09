import fs from 'fs';
import { execSync } from 'child_process';
import { isInstalledGit } from '../libs/git/index.js';
import {
  CodeVersionProps,
  CreateRoutineRelatedRecordReq,
  GetMatchSiteReq,
  GetRoutineReq,
  GetRoutineRes,
  ListSitesReq
} from '../libs/interface.js';
import { getCliConfig, projectConfigPath } from '../utils/fileUtils/index.js';
import { getRoot } from '../utils/fileUtils/base.js';
import chalk from 'chalk';
import t from '../i18n/index.js';
import { ApiService } from '../libs/apiService.js';
import logger from '../libs/logger.js';
import { Option } from '../components/filterSelector.js';
import api from '../libs/api.js';
import { ListRoutineCodeVersionsResponseBodyCodeVersions } from '@alicloud/esa20240910/dist/models/ListRoutineCodeVersionsResponseBodyCodeVersions.js';

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

export const getRoutineVersionList = async (
  name: string
): Promise<ListRoutineCodeVersionsResponseBodyCodeVersions[]> => {
  const req = { name };
  const res = await api.listRoutineCodeVersions(req as any);
  return res.body?.codeVersions ?? [];
};

export function validName(name: any): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(name);
}

// 校验域名是否有效
export function validDomain(domain: any): boolean {
  return /^(?:[a-z0-9-](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(
    domain
  );
}

export async function checkIsLoginSuccess(): Promise<boolean> {
  const cliConfig = getCliConfig();
  const namedCommand = chalk.green('esa login');
  if (!cliConfig || !cliConfig.auth) {
    return false;
  }
  if (!cliConfig.auth.accessKeyId || !cliConfig.auth.accessKeySecret) {
    logger.log(
      `❌ ${t('utils_login_error').d('Maybe you are not logged in yet.')}`
    );
    logger.log(
      `🔔 ${t('utils_login_error_config', { namedCommand }).d(`Please run command to login: ${namedCommand}`)}`
    );
    return false;
  }
  const server = await ApiService.getInstance();
  server.updateConfig(cliConfig);
  const res = await server.checkLogin();

  if (res.success) {
    return true;
  }
  logger.log(res.message || '');
  logger.log(
    `❌ ${t('utils_login_error').d('Maybe you are not logged in yet.')}`
  );
  logger.log(
    `🔔 ${t('utils_login_error_config', { namedCommand }).d(`Please run command to login: ${namedCommand}`)}`
  );
  return false;
}

export function isValidRouteForDomain(route: string, domain: string): boolean {
  // 构建一个允许子域和任意路径的正则表达式
  // 例如，匹配形式如 *.example.com/* 的URL
  return route.includes(domain);
}

export function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& 表示整个被匹配的字符串
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
