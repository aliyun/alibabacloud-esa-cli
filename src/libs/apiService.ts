import * as $OpenApi from '@alicloud/openapi-client';
import FormData from 'form-data';
import fetch from 'node-fetch';

import t from '../i18n/index.js';
import { getApiConfig } from '../utils/fileUtils/index.js';
import { CliConfig } from '../utils/fileUtils/interface.js';

import {
  PublishRoutineCodeVersionReq,
  GetMatchSiteReq,
  GetMatchSiteRes,
  DeleteRoutineReq,
  DeleteRoutineRes,
  DeleteRoutineCodeVersionRes,
  DeleteRoutineCodeVersionReq,
  CreateRoutineRelatedRouteReq,
  CreateRoutineRelatedRouteRes,
  DeleteRoutineRelatedRouteReq,
  DeleteRoutineRelatedRouteRes,
  ListSitesReq,
  ListSitesRes,
  GetRoutineStagingEnvIpRes,
  GetRoutineRes,
  GetRoutineReq,
  EdgeRoutineProps,
  CreateRoutineReq,
  CreateRoutineRes,
  CommitRoutineStagingCodeReq,
  CommitRoutineStagingCodeRes,
  CreateRoutineRelatedRecordReq,
  CreateRoutineRelatedRecordRes,
  DeleteRoutineRelatedRecordReq,
  DeleteRoutineRelatedRecordRes,
  PublishRoutineCodeVersionRes,
  Environment,
  ListRoutineRelatedRecordsReq,
  ListRoutineRelatedRecordsRes,
  CreateRoutineRouteReq,
  CreateRoutineRouteRes,
  ListUserRoutinesRes,
  IOssConfig,
  CreateRoutineWithAssetsCodeVersionReq,
  CreateRoutineWithAssetsCodeVersionRes,
  CreateRoutineCodeDeploymentReq,
  CreateRoutineCodeDeploymentRes,
  GetRoutineCodeVersionInfoRes,
  GetRoutineCodeVersionInfoReq
} from './interface.js';

export class ApiService {
  private static instance: ApiService | null = null;
  private client: $OpenApi.default;

  constructor(cliConfig: CliConfig) {
    let apiConfig = new $OpenApi.Config({
      accessKeyId: cliConfig.auth?.accessKeyId,
      accessKeySecret: cliConfig.auth?.accessKeySecret,
      endpoint: cliConfig.endpoint
    });

    this.client = new $OpenApi.default.default(apiConfig);
  }

  public static async getInstance() {
    if (!ApiService.instance) {
      const config = getApiConfig();
      ApiService.instance = new ApiService(config);
    }
    return ApiService.instance;
  }

  public updateConfig(newConfig: CliConfig) {
    let apiConfig = new $OpenApi.Config({
      accessKeyId: newConfig.auth?.accessKeyId,
      accessKeySecret: newConfig.auth?.accessKeySecret,
      endpoint: newConfig.endpoint
    });
    this.client = new $OpenApi.default.default(apiConfig);
  }

  /**
   * Checks if the user is logged in.
   * @returns A promise that resolves to an object with the following properties:
   *   - success: A boolean indicating if the login check was successful.
   *   - message: (Optional) A string providing additional information in case of failure.
   */
  async checkLogin(): Promise<{ success: boolean; message?: string }> {
    try {
      let params = {
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
      let request = new $OpenApi.OpenApiRequest({
        query: {}
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };

      const response = await this.client.callApi(params, request, runtime);

      if (response.statusCode === 200) {
        return { success: true };
      } else if (response.statusCode === 403) {
        return {
          success: false,
          message: t('login_permission_denied').d(
            'Permission denied: Access key or secret is incorrect, or does not have the necessary permissions.'
          )
        };
      } else {
        return {
          success: false,
          message: `${t('common_error_occurred').d('An error occurred')}: ${response.statusCode}`
        };
      }
    } catch (error) {
      console.log('error', error);
      return {
        success: false,
        message: t('login_failed').d(
          'An error occurred while trying to log in.'
        )
      };
    }
  }

  async quickDeployRoutine(edgeRoutine: EdgeRoutineProps) {
    try {
      // 上传代码到unstable版本
      const stagingRes =
        await this.getRoutineStagingCodeUploadInfo(edgeRoutine);

      if (stagingRes) {
        // 生产版本
        const commitRes = await this.commitRoutineStagingCode({
          Name: edgeRoutine.name,
          CodeDescription: edgeRoutine.description
        });

        // 发布到生产环境
        if (commitRes) {
          const deployRes = await this.publishRoutineCodeVersion({
            Name: edgeRoutine.name,
            CodeVersion: commitRes.data.CodeVersion,
            Env: Environment.Production
          });

          return deployRes && Number(deployRes.code) === 200;
        }
      }
      return false;
    } catch (error) {
      console.log(error);
    }
    return false;
  }

  async publishRoutineCodeVersion(
    requestParams: PublishRoutineCodeVersionReq
  ): Promise<PublishRoutineCodeVersionRes | null> {
    try {
      let params = {
        action: 'PublishRoutineCodeVersion',
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
      let request = new $OpenApi.OpenApiRequest({
        query: {
          Env: requestParams.Env,
          Name: requestParams.Name,
          CodeVersion: requestParams.CodeVersion
        }
      });

      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);

      if (res.statusCode === 200 && res.body) {
        const ret: PublishRoutineCodeVersionRes = {
          code: res.statusCode,
          data: {
            CodeVersion: res.body.CodeVersion,
            RequestId: res.body.RequestId
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async getMatchSite(
    requestParams: GetMatchSiteReq
  ): Promise<GetMatchSiteRes | null> {
    try {
      let params = {
        action: 'GetMatchSite',
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
      let request = new $OpenApi.OpenApiRequest({
        query: {
          RecordName: requestParams.RecordName
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: GetMatchSiteRes = {
          code: res.statusCode,
          data: {
            SiteId: res.body.SiteId,
            SiteName: res.body.SiteName
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async listUserRoutines(): Promise<ListUserRoutinesRes | null> {
    try {
      let params = {
        action: 'ListUserRoutines',
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
      let request = new $OpenApi.OpenApiRequest();
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        return res as ListUserRoutinesRes;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async deleteRoutine(requestParams: DeleteRoutineReq) {
    try {
      let params = {
        action: 'DeleteRoutine',
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
      let request = new $OpenApi.OpenApiRequest({
        query: {
          Name: requestParams.Name
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);

      if (res.statusCode === 200 && res.body) {
        const ret: DeleteRoutineRes = {
          Status: res.body.Status
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async deleteRoutineCodeVersion(
    requestParams: DeleteRoutineCodeVersionReq
  ): Promise<DeleteRoutineCodeVersionRes | null> {
    try {
      let params = {
        action: 'DeleteRoutineCodeVersion',
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
      let request = new $OpenApi.OpenApiRequest({
        query: {
          Name: requestParams.Name,
          CodeVersion: requestParams.CodeVersion
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);

      if (res.statusCode === 200 && res.body) {
        const ret: DeleteRoutineCodeVersionRes = {
          Status: res.body.Status
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async createRoutineRelatedRoute(
    requestParams: CreateRoutineRelatedRouteReq
  ): Promise<CreateRoutineRelatedRouteRes | null> {
    try {
      let params = {
        action: 'CreateRoutineRelatedRoute',
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

      let request = new $OpenApi.OpenApiRequest({
        query: {
          Route: requestParams.Route,
          SiteId: requestParams.SiteId,
          SiteName: requestParams.SiteName,
          Name: requestParams.Name
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: CreateRoutineRelatedRouteRes = {
          code: res.statusCode,
          data: {
            RequestId: res.body.RequestId,
            Status: res.body.Status
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async deleteRoutineRelatedRoute(
    requestParams: DeleteRoutineRelatedRouteReq
  ): Promise<DeleteRoutineRelatedRouteRes | null> {
    try {
      let params = {
        action: 'DeleteRoutineRelatedRoute',
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

      let request = new $OpenApi.OpenApiRequest({
        query: {
          Route: requestParams.Route,
          RouteId: requestParams.RouteId,
          SiteId: requestParams.SiteId,
          SiteName: requestParams.SiteName,
          Name: requestParams.Name
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: DeleteRoutineRelatedRouteRes = {
          code: res.statusCode,
          data: {
            RequestId: res.body.RequestId,
            Status: res.body.Status
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }
  async listSites(requestParams: ListSitesReq): Promise<ListSitesRes | null> {
    try {
      let params = {
        action: 'ListSites',
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

      let request = new $OpenApi.OpenApiRequest({
        query: requestParams
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200) {
        const response = {
          code: res.statusCode,
          data: {
            TotalCount: res.body.TotalCount,
            RequestId: res.body.RequestId,
            PageSize: res.body.PageSize,
            PageNumber: res.body.PageNumber,
            Sites: res.body.Sites
          }
        };
        return response;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async getRoutineStagingEnvIp(): Promise<GetRoutineStagingEnvIpRes | null> {
    try {
      let params = {
        action: 'GetRoutineStagingEnvIp',
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

      let request = new $OpenApi.OpenApiRequest({});
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200) {
        const response: GetRoutineStagingEnvIpRes = {
          code: res.statusCode,
          data: {
            IPV4: res.body.IPV4,
            RequestId: res.body.RequestId
          }
        };
        return response;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async getRoutine(
    requestParams: GetRoutineReq,
    isShowError = true
  ): Promise<GetRoutineRes | null> {
    try {
      let params = {
        action: 'GetRoutine',
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
      let request = new $OpenApi.OpenApiRequest({
        query: {
          Name: requestParams.Name
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const routineResponse: GetRoutineRes = {
          code: res.statusCode,
          data: res.body
        };
        return routineResponse;
      }
    } catch (error) {
      if (isShowError) {
        console.log(error);
      }
    }
    return null;
  }

  async createRoutine(
    edgeRoutine: CreateRoutineReq
  ): Promise<CreateRoutineRes | null> {
    let params = {
      action: 'CreateRoutine',
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
    let request = new $OpenApi.OpenApiRequest({
      query: {
        Name: edgeRoutine.name,
        Description: edgeRoutine.description,
        HasAssets: edgeRoutine.hasAssets
      }
    });
    let runtime = {
      toMap: function () {
        return this;
      }
    };
    try {
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: CreateRoutineRes = {
          code: res.statusCode,
          data: {
            RequestId: res.body.RequestId,
            Status: res.body.Status
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async getRoutineStagingCodeUploadInfo(
    edgeRoutine: EdgeRoutineProps
  ): Promise<boolean> {
    try {
      let params = {
        action: 'GetRoutineStagingCodeUploadInfo',
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
      let request = new $OpenApi.OpenApiRequest({
        query: {
          Name: edgeRoutine.name
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const uploadResult = await this.client.callApi(params, request, runtime);
      const ossConfig = uploadResult.body.OssPostConfig;

      if (uploadResult.statusCode !== 200 || !ossConfig) {
        return false;
      }

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
        return true;
      }
      return false;
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  async commitRoutineStagingCode(
    requestParams: CommitRoutineStagingCodeReq
  ): Promise<CommitRoutineStagingCodeRes | null> {
    try {
      let params = {
        action: 'CommitRoutineStagingCode',
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
      let request = new $OpenApi.OpenApiRequest({
        query: {
          Name: requestParams.Name,
          CodeDescription: requestParams.CodeDescription
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: CommitRoutineStagingCodeRes = {
          code: res.statusCode,
          data: {
            RequestId: res.body.RequestId,
            CodeVersion: res.body.CodeVersion
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async createRoutineRelatedRecord(
    requestParams: CreateRoutineRelatedRecordReq
  ): Promise<CreateRoutineRelatedRecordRes | null> {
    try {
      let params = {
        action: 'CreateRoutineRelatedRecord',
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

      let request = new $OpenApi.OpenApiRequest({
        query: {
          RecordName: requestParams.RecordName,
          SiteId: requestParams.SiteId,
          SiteName: requestParams.SiteName,
          Name: requestParams.Name
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: CreateRoutineRelatedRecordRes = {
          code: res.statusCode,
          data: {
            Status: res.body.Status,
            RequestId: res.body.RequestId
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async deleteRoutineRelatedRecord(
    requestParams: DeleteRoutineRelatedRecordReq
  ): Promise<DeleteRoutineRelatedRecordRes | null> {
    try {
      let params = {
        action: 'DeleteRoutineRelatedRecord',
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

      let request = new $OpenApi.OpenApiRequest({
        query: {
          RecordName: requestParams.RecordName,
          SiteId: requestParams.SiteId,
          SiteName: requestParams.SiteName,
          Name: requestParams.Name,
          RecordId: requestParams.RecordId
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: DeleteRoutineRelatedRecordRes = {
          code: res.statusCode,
          data: {
            Status: res.body.Status,
            RequestId: res.body.RequestId
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async listRoutineRelatedRecords(
    requestParams: ListRoutineRelatedRecordsReq
  ): Promise<ListRoutineRelatedRecordsRes | null> {
    try {
      let params = {
        action: 'ListRoutineRelatedRecords',
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

      let request = new $OpenApi.OpenApiRequest({
        query: {
          Name: requestParams.Name,
          PageNumber: requestParams.PageNumber,
          PageSize: requestParams.PageSize,
          SearchKeyWord: requestParams.SearchKeyWord
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: ListRoutineRelatedRecordsRes = {
          code: res.statusCode,
          data: {
            PageNumber: res.body.PageNumber,
            PageSize: res.body.PageSize,
            TotalCount: res.body.TotalCount,
            RelatedRecords: res.body.RelatedRecords
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async createRoutineRoute(
    requestParams: CreateRoutineRouteReq
  ): Promise<CreateRoutineRouteRes | null> {
    try {
      let params = {
        action: 'CreateRoutineRoute',
        version: '2024-09-10',
        protocol: 'https',
        method: 'POST',
        authType: 'AK',
        bodyType: 'json',
        reqBodyType: 'json',
        style: 'RPC',
        pathname: '/',
        toMap: function () {
          return this;
        }
      };

      let request = new $OpenApi.OpenApiRequest({
        query: {
          SiteId: requestParams.SiteId,
          RoutineName: requestParams.RoutineName,
          RouteName: requestParams.RouteName,
          RouteEnable: 'on',
          Rule: requestParams.Rule,
          Bypass: requestParams.Bypass,
          Mode: 'simple'
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: CreateRoutineRouteRes = {
          code: res.statusCode,
          data: {
            RequestId: res.body.RequestId,
            ConfigId: res.body.ConfigId
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  /**
   * 调用 CreateRoutineWithAssetsCodeVersion API 获取 OSS 上传配置
   */
  async CreateRoutineWithAssetsCodeVersion(
    requestParams: CreateRoutineWithAssetsCodeVersionReq
  ): Promise<CreateRoutineWithAssetsCodeVersionRes | null> {
    try {
      let params = {
        action: 'CreateRoutineWithAssetsCodeVersion',
        version: '2024-09-10',
        protocol: 'https',
        method: 'POST',
        authType: 'AK',
        bodyType: 'json',
        reqBodyType: 'json',
        style: 'RPC',
        pathname: '/',
        toMap: function () {
          return this;
        }
      };

      let request = new $OpenApi.OpenApiRequest({
        body: {
          Name: requestParams.Name,
          CodeDescription: requestParams.CodeDescription,
          ConfOptions: {
            NotFoundStrategy: requestParams.ConfOptions?.NotFoundStrategy
          }
        }
      });
      let runtime = {
        toMap: function () {
          return this;
        }
      };

      const result = await this.client.callApi(params, request, runtime);
      if (result.statusCode === 200 && result.body) {
        return {
          code: result.statusCode.toString(),
          data: {
            RequestId: result.body.RequestId,
            CodeVersion: result.body.CodeVersion,
            Status: result.body.Status,
            OssPostConfig: result.body.OssPostConfig
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error calling CreateRoutineWithAssetsCodeVersion:', error);
      return null;
    }
  }

  /**
   * 上传文件到 OSS
   */
  async uploadToOss(
    ossConfig: {
      OSSAccessKeyId: string;
      Signature: string;
      Url: string;
      Key: string;
      Policy: string;
      XOssSecurityToken: string;
    },
    zipBuffer: Buffer
  ): Promise<boolean> {
    try {
      const { OSSAccessKeyId, Signature, Url, Key, Policy, XOssSecurityToken } =
        ossConfig;

      const formData = new FormData();
      formData.append('OSSAccessKeyId', OSSAccessKeyId);
      formData.append('Signature', Signature);
      formData.append('x-oss-security-token', XOssSecurityToken);
      formData.append('policy', Policy);
      formData.append('key', Key);
      formData.append('file', zipBuffer);

      const ossRes = await fetch(Url, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
      });

      return ossRes && (ossRes.status === 200 || ossRes.status === 204);
    } catch (error) {
      console.error('Error uploading to OSS:', error);
      return false;
    }
  }

  async createRoutineCodeDeployment(
    requestParams: CreateRoutineCodeDeploymentReq
  ): Promise<CreateRoutineCodeDeploymentRes | null> {
    try {
      let params = {
        action: 'CreateRoutineCodeDeployment',
        version: '2024-09-10',
        protocol: 'https',
        method: 'POST',
        authType: 'AK',
        bodyType: 'json',
        reqBodyType: 'json',
        style: 'RPC',
        pathname: '/',
        toMap: function () {
          return this;
        }
      };

      let request = new $OpenApi.OpenApiRequest({
        query: {
          Name: requestParams.Name,
          Env: requestParams.Env,
          Strategy: requestParams.Strategy,
          CodeVersions: JSON.stringify(requestParams.CodeVersions)
        }
      });

      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: CreateRoutineCodeDeploymentRes = {
          code: res.statusCode,
          data: {
            RequestId: res.body.RequestId,
            Strategy: res.body.Strategy,
            DeploymentId: res.body.DeploymentId,
            CodeVersions: res.body.CodeVersions
          }
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }

  async getRoutineCodeVersionInfo(
    requestParams: GetRoutineCodeVersionInfoReq
  ): Promise<GetRoutineCodeVersionInfoRes | null> {
    try {
      let params = {
        action: 'GetRoutineCodeVersionInfo',
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

      let request = new $OpenApi.OpenApiRequest({
        query: {
          Name: requestParams.Name,
          CodeVersion: requestParams.CodeVersion
        }
      });

      let runtime = {
        toMap: function () {
          return this;
        }
      };
      const res = await this.client.callApi(params, request, runtime);
      if (res.statusCode === 200 && res.body) {
        const ret: GetRoutineCodeVersionInfoRes = {
          code: res.statusCode,
          data: res.body
        };
        return ret;
      }
    } catch (error) {
      console.log(error);
    }
    return null;
  }
}
