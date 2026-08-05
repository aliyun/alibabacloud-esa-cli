import * as $OpenApi from '@alicloud/openapi-client';
import chalk from 'chalk';

import t from '../i18n/index.js';
import logger from '../libs/logger.js';

import { maskAccessKey } from './maskAccessKey.js';

export type SiteType = 'domestic' | 'international';

export interface ValidateCredentialsResult {
  valid: boolean;
  siteType?: SiteType;
  endpoint?: string;
  message?: string;
}

// Domestic site endpoint
const DOMESTIC_ENDPOINT = 'esa.cn-hangzhou.aliyuncs.com';
// International site endpoint
const INTERNATIONAL_ENDPOINT = 'esa.ap-southeast-1.aliyuncs.com';

/**
 * Validate credentials for a single endpoint
 * @param securityToken - Optional STS SecurityToken; when provided, uses STS auth
 */
async function validateEndpoint(
  accessKeyId: string,
  accessKeySecret: string,
  endpoint: string,
  securityToken?: string
): Promise<{ valid: boolean; message?: string }> {
  try {
    const apiConfig = new $OpenApi.Config({
      accessKeyId,
      accessKeySecret,
      endpoint,
      ...(securityToken ? { securityToken } : {})
    });

    const client = new $OpenApi.default.default(apiConfig);

    const params = {
      action: 'GetErService',
      version: '2024-09-10',
      protocol: 'https',
      method: 'GET',
      authType: 'AK',
      bodyType: 'json',
      reqBodyType: 'json',
      style: 'RPC',
      pathname: '/',
      toMap: function () {
        return this;
      }
    };

    const request = new $OpenApi.OpenApiRequest({
      query: {}
    });

    const runtime = {
      toMap: function () {
        return this;
      }
    };

    const response = await client.callApi(params, request, runtime);

    if (response.statusCode === 200) {
      if (response.body.Status === 'Running') {
        return { valid: true };
      } else {
        return {
          valid: false,
          message: 'Functions and Pages is not active'
        };
      }
    } else if (response.statusCode === 403) {
      return {
        valid: false,
        message: 'Permission denied: Access key or secret is incorrect'
      };
    } else {
      return {
        valid: false,
        message: `Error: ${response.statusCode}`
      };
    }
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate if AK/SK/endpoint are valid (supports STS when securityToken is provided)
 *
 * @param accessKeyId - AccessKey ID
 * @param accessKeySecret - AccessKey Secret
 * @param securityToken - Optional STS SecurityToken for temporary credentials
 * @returns Validation result, including whether valid, site type and endpoint
 */
export async function validateCredentials(
  accessKeyId: string,
  accessKeySecret: string,
  securityToken?: string
): Promise<ValidateCredentialsResult> {
  const maskedAk = maskAccessKey(accessKeyId);
  logger.log(
    chalk.gray(
      `🔍 ${t('validate_credentials_start', { maskedAk }).d(`Validating credentials: AccessKey ID ${maskedAk}`)}${securityToken ? ` ${t('validate_credentials_with_sts').d('(with STS token)')}` : ''}`
    )
  );
  const withToken = async (endpoint: string) => {
    const result = await validateEndpoint(
      accessKeyId,
      accessKeySecret,
      endpoint,
      securityToken
    );
    if (result.valid) {
      logger.log(
        chalk.gray(
          `  ✓ ${t('validate_endpoint_ok', { endpoint }).d(`Credentials valid at ${endpoint}`)}`
        )
      );
    } else {
      const message = result.message || '';
      logger.log(
        chalk.gray(
          `  ✗ ${t('validate_endpoint_failed', { endpoint, message }).d(`Credential check failed at ${endpoint}: ${message}`)}`
        )
      );
    }
    return result;
  };

  if (process.env.CUSTOM_ENDPOINT) {
    const endpoint = process.env.CUSTOM_ENDPOINT;
    logger.log(
      chalk.gray(
        `  ${t('validate_custom_endpoint', { endpoint }).d(`Using custom endpoint from CUSTOM_ENDPOINT: ${endpoint}`)}`
      )
    );
    const result = await withToken(endpoint);
    if (result.valid) {
      return { valid: true, endpoint };
    }
    return { valid: false, message: result.message };
  }

  const domesticResult = await withToken(DOMESTIC_ENDPOINT);
  if (domesticResult.valid) {
    return {
      valid: true,
      siteType: 'domestic',
      endpoint: DOMESTIC_ENDPOINT
    };
  }

  const internationalResult = await withToken(INTERNATIONAL_ENDPOINT);
  if (internationalResult.valid) {
    return {
      valid: true,
      siteType: 'international',
      endpoint: INTERNATIONAL_ENDPOINT
    };
  }

  return {
    valid: false,
    message:
      domesticResult.message ||
      internationalResult.message ||
      'Invalid credentials'
  };
}
