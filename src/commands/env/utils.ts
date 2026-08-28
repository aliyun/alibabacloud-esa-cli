import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'dotenv';
import { Argv } from 'yargs';

import { ApiService } from '../../libs/apiService.js';
import {
  RoutineEnvironment,
  RoutineEnvironmentVariable,
  RoutineEnvironmentVariableType
} from '../../libs/interface.js';
import logger from '../../libs/logger.js';
import { isRoutineExist } from '../../utils/checkIsRoutineCreated.js';
import { getProjectConfig } from '../../utils/fileUtils/index.js';
import { checkIsLoginSuccess } from '../utils.js';

export const MAX_ENVIRONMENT_VARIABLES = 50;
export const MAX_ENVIRONMENT_VARIABLE_KEY_LENGTH = 100;
export const MAX_ENVIRONMENT_VARIABLE_VALUE_LENGTH = 200;

const ENVIRONMENT_VARIABLE_KEY_PATTERN = /^[a-zA-Z0-9_]+$/;
const FORBIDDEN_ENVIRONMENT_VARIABLE_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype'
]);

export interface RoutineEnvironmentContext {
  name: string;
  environment: RoutineEnvironment;
}

export interface RoutineEnvironmentCommandArguments {
  [key: string]: unknown;
  name?: string;
  environment?: string;
}

export function addRoutineEnvironmentOptions(yargs: Argv): Argv {
  return yargs
    .option('environment', {
      alias: 'e',
      describe: 'Target environment',
      type: 'string',
      choices: ['staging', 'production'] as const,
      demandOption: true
    })
    .option('name', {
      alias: 'n',
      describe: 'Name of Functions & Pages',
      type: 'string'
    });
}

export async function resolveRoutineEnvironmentContext(
  argv: RoutineEnvironmentCommandArguments
): Promise<RoutineEnvironmentContext | null> {
  const environment = argv.environment;
  if (environment !== 'staging' && environment !== 'production') {
    logger.error('Environment must be staging or production.');
    return null;
  }

  const configuredName = getProjectConfig()?.name;
  const name = argv.name?.trim() || configuredName;
  if (!name) {
    logger.error(
      'Run this command in an ESA project or specify the project with --name.'
    );
    return null;
  }

  if (!(await checkIsLoginSuccess())) return null;

  if (!(await isRoutineExist(name))) {
    logger.error(
      `Project ${name} does not exist. Deploy it before managing environment variables.`
    );
    return null;
  }

  return { name, environment };
}

export function validateEnvironmentVariableKey(key: string): string | null {
  if (!key) return 'Environment variable key is required.';
  if (key.length > MAX_ENVIRONMENT_VARIABLE_KEY_LENGTH) {
    return `Environment variable key ${key} exceeds ${MAX_ENVIRONMENT_VARIABLE_KEY_LENGTH} characters.`;
  }
  if (!ENVIRONMENT_VARIABLE_KEY_PATTERN.test(key)) {
    return `Environment variable key ${key} may contain only letters, numbers, and underscores.`;
  }
  if (FORBIDDEN_ENVIRONMENT_VARIABLE_KEYS.has(key)) {
    return `Environment variable key ${key} is reserved.`;
  }
  return null;
}

export function validateEnvironmentVariableValue(
  key: string,
  value: string
): string | null {
  if (value.length > MAX_ENVIRONMENT_VARIABLE_VALUE_LENGTH) {
    return `Environment variable value for ${key} exceeds ${MAX_ENVIRONMENT_VARIABLE_VALUE_LENGTH} characters.`;
  }
  return null;
}

export function validateEnvironmentVariables(
  variables: Record<string, string>
): string | null {
  const entries = Object.entries(variables);
  if (entries.length === 0) return 'No environment variables were provided.';
  if (entries.length > MAX_ENVIRONMENT_VARIABLES) {
    return `A maximum of ${MAX_ENVIRONMENT_VARIABLES} environment variables is allowed.`;
  }

  for (const [key, value] of entries) {
    const keyError = validateEnvironmentVariableKey(key);
    if (keyError) return keyError;
    const valueError = validateEnvironmentVariableValue(key, value);
    if (valueError) return valueError;
  }
  return null;
}

export function parseEnvironmentVariableAssignment(assignment: string): {
  key: string;
  value: string;
} {
  const separatorIndex = assignment.indexOf('=');
  if (separatorIndex <= 0) {
    throw new Error('Expected an environment variable in KEY=VALUE format.');
  }
  return {
    key: assignment.slice(0, separatorIndex),
    value: assignment.slice(separatorIndex + 1)
  };
}

export async function parseEnvironmentVariableFile(
  filePath: string
): Promise<Record<string, string>> {
  const absolutePath = path.resolve(filePath);
  const contents = await readFile(absolutePath);
  const expectedKeys = validateDotenvSyntax(contents.toString());
  const parsed = parse(contents);
  for (const key of expectedKeys) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
      throw new Error('The dotenv file could not be parsed completely.');
    }
  }
  const variables: Record<string, string> = Object.create(null);
  for (const [key, value] of Object.entries(parsed)) {
    variables[key] = value;
  }
  return variables;
}

function validateDotenvSyntax(source: string): Set<string> {
  const lines = source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const expectedKeys = new Set<string>();
  let openQuote: { quote: string; lineNumber: number } | null = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNumber = index + 1;

    if (openQuote) {
      const closingIndex = findUnescapedQuote(line, openQuote.quote, 0);
      if (closingIndex === -1) continue;
      validateQuotedValueSuffix(line.slice(closingIndex + 1), lineNumber);
      openQuote = null;
      continue;
    }

    const trimmedLine = line.trimStart();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const assignment = trimmedLine.match(
      /^(?:export\s+)?([a-zA-Z0-9_]+)(?:\s*=\s*|:\s+)(.*)$/
    );
    if (!assignment) throw invalidDotenvLine(lineNumber);

    const [, key, rawValue] = assignment;
    expectedKeys.add(key);
    const value = rawValue.trimStart();
    const quote = value[0];
    if (quote !== "'" && quote !== '"' && quote !== '`') continue;

    const closingIndex = findUnescapedQuote(value, quote, 1);
    if (closingIndex === -1) {
      openQuote = { quote, lineNumber };
      continue;
    }
    validateQuotedValueSuffix(value.slice(closingIndex + 1), lineNumber);
  }

  if (openQuote) throw invalidDotenvLine(openQuote.lineNumber);
  return expectedKeys;
}

function findUnescapedQuote(
  value: string,
  quote: string,
  startIndex: number
): number {
  for (let index = startIndex; index < value.length; index++) {
    if (value[index] !== quote) continue;
    if (index === 0 || value[index - 1] !== '\\') return index;
  }
  return -1;
}

function validateQuotedValueSuffix(suffix: string, lineNumber: number): void {
  const trimmedSuffix = suffix.trimStart();
  if (trimmedSuffix && !trimmedSuffix.startsWith('#')) {
    throw invalidDotenvLine(lineNumber);
  }
}

function invalidDotenvLine(lineNumber: number): Error {
  return new Error(`Invalid dotenv syntax at line ${lineNumber}.`);
}

export async function listAllRoutineEnvironmentVariables(
  context: RoutineEnvironmentContext
): Promise<Record<string, RoutineEnvironmentVariable> | null> {
  const server = await ApiService.getInstance();
  const variables: Record<string, RoutineEnvironmentVariable> =
    Object.create(null);
  const pageSize = 50;

  for (let pageNumber = 1; pageNumber <= 100; pageNumber++) {
    const result = await server.listRoutineEnvironmentVariables({
      Name: context.name,
      Env: context.environment,
      PageNumber: pageNumber,
      PageSize: pageSize
    });
    if (!result) return null;

    const pageVariables = result.data.EnvironmentVariables;
    for (const [key, value] of Object.entries(pageVariables)) {
      variables[key] = value;
    }

    const pageCount = Object.keys(pageVariables).length;
    if (
      pageCount === 0 ||
      Object.keys(variables).length >= result.data.TotalCount
    ) {
      return variables;
    }
  }

  return variables;
}

export async function setRoutineEnvironmentVariableValues(
  context: RoutineEnvironmentContext,
  values: Record<string, string>,
  type: RoutineEnvironmentVariableType
): Promise<boolean> {
  const validationError = validateEnvironmentVariables(values);
  if (validationError) {
    logger.error(validationError);
    return false;
  }

  const currentVariables = await listAllRoutineEnvironmentVariables(context);
  if (!currentVariables) {
    logger.error('Unable to read the current environment variables.');
    return false;
  }
  const resultingKeys = new Set([
    ...Object.keys(currentVariables),
    ...Object.keys(values)
  ]);
  if (resultingKeys.size > MAX_ENVIRONMENT_VARIABLES) {
    logger.error(
      `This update would exceed the ${MAX_ENVIRONMENT_VARIABLES} variable limit.`
    );
    return false;
  }

  const environmentVariables: Record<string, RoutineEnvironmentVariable> =
    Object.create(null);
  for (const [key, value] of Object.entries(values)) {
    environmentVariables[key] = { Type: type, Value: value };
  }

  const server = await ApiService.getInstance();
  const result = await server.setRoutineEnvironmentVariables({
    Name: context.name,
    Env: context.environment,
    EnvironmentVariables: environmentVariables
  });
  if (!result) {
    logger.error('Failed to set environment variables.');
    return false;
  }

  const requestedKeys = Object.keys(values);
  const setKeys = new Set(result.data.SetKeys);
  const failedKeys = requestedKeys.filter((key) => !setKeys.has(key));
  if (failedKeys.length > 0) {
    if (setKeys.size > 0) {
      logger.warn(`Set ${setKeys.size} key${setKeys.size === 1 ? '' : 's'}.`);
      logDeployActivationHint(context.environment);
    }
    logger.error(`Failed to set: ${failedKeys.join(', ')}.`);
    return false;
  }

  logger.success(
    `Set ${requestedKeys.length} ${type === 'secret_text' ? 'secret' : 'environment variable'}${requestedKeys.length === 1 ? '' : 's'} for ${context.environment}.`
  );
  logDeployActivationHint(context.environment);
  return true;
}

export async function deleteRoutineEnvironmentVariableKeys(
  context: RoutineEnvironmentContext,
  keys: string[]
): Promise<boolean> {
  if (keys.length === 0) {
    logger.error('At least one environment variable key is required.');
    return false;
  }
  for (const key of keys) {
    const validationError = validateEnvironmentVariableKey(key);
    if (validationError) {
      logger.error(validationError);
      return false;
    }
  }

  const server = await ApiService.getInstance();
  const result = await server.deleteRoutineEnvironmentVariables({
    Name: context.name,
    Env: context.environment,
    EnvironmentVariableKeys: keys
  });
  if (!result) {
    logger.error('Failed to delete environment variables.');
    return false;
  }

  const deletedKeys = new Set(result.data.DeletedKeys);
  const failedKeys = new Set(result.data.FailedKeys);
  const unsuccessfulKeys = keys.filter(
    (key) => failedKeys.has(key) || !deletedKeys.has(key)
  );
  if (unsuccessfulKeys.length > 0) {
    if (deletedKeys.size > 0) {
      logger.warn(
        `Deleted ${deletedKeys.size} key${deletedKeys.size === 1 ? '' : 's'}.`
      );
      logDeployActivationHint(context.environment);
    }
    logger.error(`Failed to delete: ${unsuccessfulKeys.join(', ')}.`);
    return false;
  }

  logger.success(
    `Deleted ${keys.length} environment variable${keys.length === 1 ? '' : 's'} from ${context.environment}.`
  );
  logDeployActivationHint(context.environment);
  return true;
}

export function logDeployActivationHint(environment: RoutineEnvironment): void {
  logger.warn(
    `Run esa deploy --environment ${environment} to bind this environment's latest variable snapshot to a new version.`
  );
}
