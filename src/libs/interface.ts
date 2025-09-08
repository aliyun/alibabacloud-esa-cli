import * as $Util from '@alicloud/tea-util';

export type OptionalProps<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]: T[K];
};

export interface CodeVersionProps {
  codeVersion: string;
  codeDescription: string;
  createTime: string;
}

/**
 * Represents the properties of an routine.
 * @param name - 函数名称
 * @param description - 函数描述
 * @param code - 边缘函数代码
 */

export interface EdgeRoutineProps {
  name: string;
  description?: string;
  code: string;
}

export interface CreateRoutineReq {
  name: string;
  description?: string;
  hasAssets: boolean;
}

export interface CreateRoutineRes {
  code: string;
  data: { RequestId: string; Status: string };
}

export interface CreateRoutineRelatedRecordReq {
  Name?: string;
  SiteId: number;
  SiteName: string;
  RecordName: string;
}

export interface CreateRoutineRelatedRecordRes {
  code: string;
  data: { RequestId: string; Status: string };
}

export interface DeleteRoutineRelatedRecordReq {
  Name: string;
  RecordId: number;
  RecordName: string;
  RegionId?: string;
  SiteId: number;
  SiteName: string;
}

export interface DeleteRoutineRelatedRecordRes {
  code: string;
  data: { RequestId: string; Status: string };
}
export interface Summary {
  title: string;
  command: string;
  projectName?: string; //暂时用不到
}

export interface CommitRoutineStagingCodeReq {
  Name: string;
  CodeDescription?: string;
}

export interface CommitRoutineStagingCodeRes {
  code: string;
  data: { RequestId: string; CodeVersion: string };
}

export enum Environment {
  Production = 'production',
  Staging = 'staging'
}
export enum PublishType {
  Staging = 'staging',
  Production = 'production'
}
export interface PublishRoutineCodeVersionReq {
  Name: string;
  Env: Environment;
  CodeVersion?: string;
  RegionId?: string;
}

export interface PublishRoutineCodeVersionRes {
  code: string;
  data: { RequestId: string; CodeVersion: string };
}

export interface CodeVersionProps {
  CodeDescription: string;
  CreateTime: string;
  CodeVersion: string;
}
export interface RelatedRecordProps {
  RecordName: string;
  SiteId: number;
  SiteName: string;
  RecordId: number;
}

export interface RelatedRouteProps {
  RouteName: string;
  SiteName: string;
  Route: string;
}

export interface EnvProps {
  Env: string;
  CodeVersion: string;
}
export interface GetRoutineReq {
  Name: string;
  RegionId?: string;
}
export interface GetRoutineRes {
  code: string;
  data: {
    RequestId: string;
    Envs: {
      Env: string;
      CodeDeploy: {
        DeployId: string;
        CreationTime: string;
        Strategy: string;
        CodeVersions: {
          CodeVersion: string;
          Percentage: number;
          Description: string;
          CreateTime: string;
        }[];
      };
    }[];
    CreateTime: string;
    Description: string;
    DefaultRelatedRecord: string;
  };
}

export interface EdgeFunctionItem {
  RoutineName: string;
  Description: string;
  CreateTime: string;
}

export interface DeleteRoutineRes {
  Status: string;
}

export interface DeleteRoutineCodeVersionReq {
  Name: string;
  CodeVersion: string;
  RegionId?: string;
}
export interface DeleteRoutineCodeVersionRes {
  Status: string;
}

export interface CreateRoutineRelatedRouteReq {
  Name: string;
  SiteId: number;
  SiteName: string;
  Route: string;
}
export interface CreateRoutineRelatedRouteRes {
  code: string;
  data: { RequestId: string; Status: string };
}

export interface DeleteRoutineRelatedRouteReq {
  Name: string;
  SiteId: string;
  SiteName: string;
  Route: string;
  RouteId: string;
}

export interface DeleteRoutineRelatedRouteRes {
  code: string;
  data: { RequestId: string; Status: string };
}

export interface ListSitesReq {
  SiteSearchType?: string;
  SiteName?: string;
  TagFilter?: { key: string; value: string }[];
  Status?: 'pending' | 'active' | 'moved' | 'offline' | 'disable';
  ResourceGroupId?: string;
  PageSize?: number;
  PageNumber?: number;
  OnlyEnterprise?: boolean;
}
export interface ListSitesRes {
  code: string;
  data: {
    TotalCount: number;
    RequestId: string;
    PageSize: number;
    PageNumber: number;
    Sites: {
      Status: string;
      SiteId: number;
      NameServerList: string;
      ResourceGroupId: string;
      SiteName: string;
      InstanceId: string;
      GmtModified: string;
      PlanName: PlanType;
      PlanSpecName: string;
      Coverage: string;
      VerifyCode: string;
      GmtCreate: string;
      CnameZone: string;
      AccessType: string;
      Tags: Record<string, string>;
    }[];
  };
}
export type PlanType = `${BasicType | UpgradeTargetTypes}`;

enum BasicType {
  Basic = 'basic'
}

enum UpgradeTargetTypes {
  Medium = 'medium',
  High = 'high',

  Enterprise = 'enterprise'
}

export interface GetRoutineStagingEnvIpRes {
  code: string;
  data: { RequestId: string; IPV4: string[] };
}

export interface GetMatchSiteReq {
  RecordName: string;
}
export interface GetMatchSiteRes {
  code: string;
  data: { SiteId: number; SiteName: string };
}

export interface DeleteRoutineReq {
  Name: string;
}

export interface IOssConfig {
  OSSAccessKeyId: string;
  Signature: string;
  Url: string;
  callback: string;
  key: string;
  policy: string;
  'x:codeDescription': string;
}

export interface ApiMethod<RequestType = any, ResponseType = any> {
  (runtime: $Util.RuntimeOptions): Promise<ResponseType>;
  (request: RequestType, runtime: $Util.RuntimeOptions): Promise<ResponseType>;
}

export interface IApiClient {
  [method: string]: ApiMethod; // 使用索引签名来表示所有的方法
}

export interface ApiError {
  code: string;
  message: string;
  data: string;
}

export interface ListUserRoutinesReq {
  RegionId?: string;
  PageNumber?: number;
  PageSize?: number;
  SearchKeyWord?: string;
}
export interface ListUserRoutinesRes {
  code: string;
  body: {
    RequestId: string;
    PageNumber: number;
    PageSize: number;
    TotalCount: number;
    UsedRoutineNumber: number;
    QuotaRoutineNumber: number;
    Routines: {
      CreateTime: string;
      Description: string;
      RoutineName: string;
    }[];
  };
}

export type Map = Record<string, any>;

export interface ListRoutineRelatedRecordsReq {
  Name: string;
  PageNumber?: number;
  PageSize?: number;
  SearchKeyWord?: string;
  RegionId?: string;
}
export interface ListRoutineRelatedRecordsRes {
  code: string;
  data: {
    PageNumber: number;
    PageSize: number;
    TotalCount: number;
    RelatedRecords: {
      RecordName: string;
      SiteId: number;
      SiteName: string;
      RecordId: number;
    }[];
  };
}

export interface CreateRoutineRouteReq {
  SiteId: number;
  RouteName?: string;
  RouteEnable?: string;
  Rule?: string;
  RoutineName: string;
  Bypass?: 'on' | 'off';
  Mode?: 'simple' | 'custom';
  Sequence?: number;
  RegionId?: string;
}
export interface CreateRoutineRouteRes {
  code: number;
  data: { RequestId: string; ConfigId: number };
}

export interface CreateRoutineWithAssetsCodeVersionReq {
  Name: string;
  CodeDescription?: string;
  BuildId?: string;
  ExtraInfo?: string;
  ConfOptions?: {
    NotFoundStrategy: string;
  };
}
export interface CreateRoutineWithAssetsCodeVersionRes {
  code: string;
  data: {
    RequestId?: string;
    CodeVersion?: string;
    Status?: string;
    OssPostConfig?: {
      Url?: string;
      OSSAccessKeyId?: string;
      XOssSecurityToken?: string;
      Key?: string;
      Policy?: string;
      Signature?: string;
    };
  };
}

export interface CreateRoutineCodeDeploymentReq {
  Name: string;
  Env: string;
  Strategy: string;
  CodeVersions: { Percentage: number; CodeVersion: string }[];
}
export interface CreateRoutineCodeDeploymentRes {
  code: string;
  data: {
    RequestId: string;
    Strategy: string;
    DeploymentId: string;
    CodeVersions: { Percentage: number; CodeVersion: string }[];
  };
}

export interface GetRoutineCodeVersionInfoReq {
  Name: string;
  CodeVersion: string;
}
export interface GetRoutineCodeVersionInfoRes {
  code: string;
  data: {
    RequestId: string;
    CodeVersion: string;
    Status: string;
    CodeDescription: string;
    CreateTime: string;
    HasAssets: boolean;
    ExtraInfo: string;
  };
}
