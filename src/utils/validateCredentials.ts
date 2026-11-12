import * as $OpenApi from '@alicloud/openapi-client';
import { RuntimeOptions } from '@alicloud/tea-util';

import { enableSdkProxy } from '../libs/proxy.js';

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

type ComputePlanResult = { valid: true } | { valid: false; message: string };

export async function checkComputePlan(
  client: Pick<$OpenApi.default, 'callApi'>
): Promise<ComputePlanResult> {
  let action: 'GetSubscriptionPlan' | 'GetErService' = 'GetSubscriptionPlan';
  async function query() {
    const params = new $OpenApi.Params({
      action,
      version: '2024-09-10',
      protocol: 'https',
      method: 'GET',
      authType: 'AK',
      bodyType: 'json',
      reqBodyType: 'json',
      style: 'RPC',
      pathname: '/'
    });
    const response = await client.callApi(
      params,
      new $OpenApi.OpenApiRequest({ query: {} }),
      new RuntimeOptions({})
    );
    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}`);
    }
    return response.body;
  }

  try {
    const plan = await query();
    if (plan?.Purchased === true) return { valid: true };
    if (plan?.Purchased !== false) {
      return {
        valid: false,
        message: 'GetSubscriptionPlan returned an invalid Purchased value'
      };
    }

    action = 'GetErService';
    const legacy = await query();
    switch (legacy?.Status) {
      case 'Running':
        return { valid: true };
      case 'Creating':
        return {
          valid: false,
          message: 'Functions and Pages is being activated. Try again later.'
        };
      case 'NotOpened':
      case 'NotOpen':
      case 'Discarded':
        return { valid: false, message: 'Functions and Pages is not active' };
      default:
        return {
          valid: false,
          message: 'GetErService returned an unknown service status'
        };
    }
  } catch (error) {
    return {
      valid: false,
      message: `${action} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function validateEndpoint(
  accessKeyId: string,
  accessKeySecret: string,
  endpoint: string,
  securityToken?: string
): Promise<ComputePlanResult> {
  try {
    enableSdkProxy();
    const apiConfig = new $OpenApi.Config({
      accessKeyId,
      accessKeySecret,
      endpoint,
      ...(securityToken ? { securityToken } : {})
    });
    return checkComputePlan(new $OpenApi.default.default(apiConfig));
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Invalid configuration'
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
  const withToken = (ep: string) =>
    validateEndpoint(accessKeyId, accessKeySecret, ep, securityToken);

  if (process.env.CUSTOM_ENDPOINT) {
    const result = await withToken(process.env.CUSTOM_ENDPOINT);
    if (result.valid) {
      return { valid: true, endpoint: process.env.CUSTOM_ENDPOINT };
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
      domesticResult.message === internationalResult.message
        ? domesticResult.message
        : `${DOMESTIC_ENDPOINT}: ${domesticResult.message}\n${INTERNATIONAL_ENDPOINT}: ${internationalResult.message}`
  };
}
