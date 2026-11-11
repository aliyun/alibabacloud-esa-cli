import * as OpenApi from '@alicloud/openapi-client';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { integrationConfig } from './integration-config.mjs';

export async function cloudApi(action, query = {}) {
  const config = integrationConfig(process.env);
  const client = new OpenApi.default.default(
    new OpenApi.Config({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: config.endpoint,
      ...(config.securityToken ? { securityToken: config.securityToken } : {})
    })
  );
  const params = {
    action,
    version: '2024-09-10',
    protocol: 'https',
    method: 'GET',
    authType: 'AK',
    bodyType: 'json',
    reqBodyType: 'json',
    style: 'RPC',
    pathname: '/',
    toMap() {
      return this;
    }
  };
  const runtime = {
    connectTimeout: 10000,
    readTimeout: 15000,
    autoretry: false,
    toMap() {
      return this;
    }
  };
  try {
    const response = await client.callApi(
      params,
      new OpenApi.OpenApiRequest({ query }),
      runtime
    );
    if (response.statusCode !== 200 || !response.body || response.body.Code)
      throw new Error('Unsuccessful response');
    return response.body;
  } catch (error) {
    // SDK errors can carry signed request headers. Do not put them in JSON artifacts.
    const rawCode = String(error?.code ?? 'RequestFailed');
    const code = /^[A-Za-z0-9_.-]{1,100}$/.test(rawCode)
      ? rawCode
      : 'RequestFailed';
    throw new Error(`${action} failed: ${code}`);
  }
}

const journal = 'reports/cloud-resources.json';
export function resources() {
  return existsSync(journal) ? JSON.parse(readFileSync(journal, 'utf8')) : [];
}
export function recordResource(name, remove = false) {
  if (!/^esa-ci-[a-z0-9-]+$/.test(name))
    throw new Error('Not a generated integration resource');
  const names = new Set(resources());
  if (remove) names.delete(name);
  else names.add(name);
  mkdirSync('reports', { recursive: true });
  writeFileSync(journal, JSON.stringify([...names]) + '\n');
}

export async function deleteTestProject(name) {
  if (!/^esa-ci-[a-z0-9-]+$/.test(name))
    throw new Error('Refusing to clean an unrelated resource');
  const result = await cloudApi('DeleteRoutine', { Name: name });
  if (result.Status !== 'OK') throw new Error(`Cleanup failed for ${name}`);
  recordResource(name, true);
}
