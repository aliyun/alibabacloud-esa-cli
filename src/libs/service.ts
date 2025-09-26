import * as $ESA from '@alicloud/esa20240910';
import FormData from 'form-data';
import chain from 'lodash';
import fetch from 'node-fetch';
import ora, { Ora } from 'ora';

import t from '../i18n/index.js';

import api from './api.js';
import {
  EdgeRoutineProps,
  IOssConfig,
  OptionalProps,
  Environment
} from './interface.js';
import logger from './logger.js';

export const checkLogin = async (): Promise<ServiceOutput> => {
  const result = new ServiceOutput();
  try {
    const response = await api.getErService();

    if (response.statusCode === 200) {
      result.success = true;
      result.message = t('login_success').d('Login success!');
    } else if (response.statusCode === 403) {
      result.message = t('login_permission_denied').d(
        'Permission denied: Access key or secret is incorrect, or does not have the necessary permissions.'
      );
    } else {
      result.message = `${t('common_error_occurred').d('An error occurred')}: ${response.statusCode}`;
    }
  } catch (error) {
    result.message = t('login_failed').d(
      'An error occurred while trying to log in.'
    );
  }
  return result;
};

const commonUploadCodeError = t('upload_code_failed').d(
  'An error occurred while trying to upload the code.'
);

export const getRoutineStagingCodeUploadInfo = async (
  edgeRoutine: EdgeRoutineProps
): Promise<ServiceOutput> => {
  const result = new ServiceOutput();
  let ossConfig: IOssConfig;
  try {
    const uploadResult = await api.getRoutineStagingCodeUploadInfo({
      name: edgeRoutine.name
    });
    ossConfig = chain(uploadResult).get('body.OssPostConfig');
    if (!ossConfig) {
      result.message = t('oss_config_not_found').d(
        'Failed to retrieve OSS configuration information.'
      );
      return result;
    }
  } catch (error) {
    result.message = commonUploadCodeError;
    return result;
  }
  try {
    const {
      OSSAccessKeyId,
      Signature,
      callback,
      Url,
      key,
      policy
    }: IOssConfig = ossConfig;

    const formData = new FormData();

    formData.append('OSSAccessKeyId', OSSAccessKeyId);
    formData.append('Signature', Signature);
    formData.append('callback', callback);
    formData.append('x:codeDescription', ossConfig['x:codeDescription']);
    formData.append('policy', policy);
    formData.append('key', key);
    formData.append('file', edgeRoutine.code);

    const ossRes = await fetch(Url, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    if (ossRes && ossRes.status === 200) {
      result.success = true;
      result.message = t('upload_oss_success').d('Upload code success!');
    } else {
      logger.error(
        `${t('oss_upload_failed').d('Failed to upload to OSS')}: ${ossRes.status}, ${ossRes.statusText}}`
      );
      result.message = commonUploadCodeError;
    }
    return result;
  } catch (error) {
    const err = error as Error;
    logger.error(err.message);
    result.message = commonUploadCodeError;
    return result;
  }
};

export const commitRoutineStagingCode = async (
  params: OptionalProps<$ESA.CommitRoutineStagingCodeRequest>
): Promise<ServiceOutput> => {
  const result = new ServiceOutput();
  try {
    const res = await api.commitRoutineStagingCode(params);
    if (res.statusCode === 200 && res.body) {
      result.success = true;
      result.message = t('commit_success').d('Generate code version success!');
      result.data = {
        code: res.statusCode,
        data: {
          RequestId: res.body.RequestId,
          CodeVersion: res.body.CodeVersion
        }
      };
    }
    return result;
  } catch (error) {
    result.message = commonUploadCodeError;
    return result;
  }
};

const publishRoutineCodeVersion = async (
  params: OptionalProps<$ESA.PublishRoutineCodeVersionRequest>
): Promise<ServiceOutput> => {
  const result = new ServiceOutput();
  try {
    const res = await api.publishRoutineCodeVersion(params);

    if (res.statusCode === 200 && res.body) {
      result.success = true;
      result.message = t('publish_success').d('Publish success!');
      result.data = {
        code: res.statusCode,
        data: {
          CodeVersion: res.body.CodeVersion,
          RequestId: res.body.RequestId
        }
      };
    }
    return result;
  } catch (error) {
    result.message = commonUploadCodeError;
    return result;
  }
};

export const quickDeployRoutine = async (
  edgeRoutineProps: EdgeRoutineProps
): Promise<ServiceOutput> => {
  const result = new ServiceOutput();
  result.success = true;
  const steps = [
    {
      action: () => getRoutineStagingCodeUploadInfo(edgeRoutineProps),
      message: t('upload_code').d('Uploading code...')
    },
    {
      action: () =>
        commitRoutineStagingCode({
          name: edgeRoutineProps.name,
          codeDescription: edgeRoutineProps.description
        }),
      message: t('commit_code').d('Generating code version...')
    },
    {
      action: () =>
        publishRoutineCodeVersion({
          Name: edgeRoutineProps.name,
          CodeVersion: '',
          Env: Environment.Staging
        }),
      message: t('publish_code').d(
        'Publishing code to production environment...'
      )
    }
  ];
  const spinner: Ora = ora(
    t('start_quick_deploy').d('Starting quick deploy...')
  ).start();
  for (const step of steps) {
    spinner.text = step.message;
    const stepRes = await step.action();
    if (stepRes.success) {
      spinner.succeed(stepRes.message);
    } else {
      result.success = false;
      spinner.fail('Error: ' + stepRes.message);
      result.message = stepRes.message;
      break;
    }
  }
  return result;
};

export class ServiceOutput {
  success = false;
  message = '';
  data: { [key: string]: any } = {};
}
