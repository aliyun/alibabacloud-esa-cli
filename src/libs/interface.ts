export interface CodeVersionProps {
  codeVersion: string;
  codeDescription: string;
  createTime: string;
}

/**
 * Represents the properties of an routine.
 * @param name - 函数名称
 * @param description - 函数描述
 * @param specName - 规格 单个请求可用CPU时间片
 * @param code - 边缘函数代码
 */

export interface EdgeRoutineProps {
  name: string;
  description?: string;
  specName?: string;
  code: string;
}

export interface CreateRoutineReq {
  name: string;
  description?: string;
  specName: string;
  code: string;
}

export interface CreateRoutineRes {
  code: string;
  data: { RequestId: string; Status: string };
}

export interface ListRoutineCanaryAreasRes {
  CanaryAreas: string[];
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

export interface ListRoutineOptionalSpecsRes {
  code: string;
  data: {
    RequestId: string;
    Specs: { SpecName: string; IsAvailable: boolean }[];
  };
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
  Production = 'production',
  Canary = 'canary'
}
export interface PublishRoutineCodeVersionReq {
  Name: string;
  Env: Environment;
  CodeVersion?: string;
  CanaryCodeVersion?: string;
  CanaryAreaList?: string[];
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
  SiteId: string;
  SiteName: string;
  Route: string;
  RouteId: string;
}

export interface EnvProps {
  CanaryCodeVersion?: string; // 灰度版本
  CanaryAreaList?: string[]; // 灰度区域
  SpecName: string;
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
    CodeVersions: CodeVersionProps[];
    RelatedRecords: RelatedRecordProps[];
    Envs: EnvProps[];
    CreateTime: string;
    Description: string;
    RelatedRoutes: RelatedRouteProps[];
    DefaultRelatedRecord: string;
  };
}
export interface GetRoutineUserInfoRes {
  Routines: EdgeFunctionItem[];
  Subdomains: string[];
}

export interface EdgeFunctionItem {
  RoutineName: string;
  Description: string;
  CreateTime: string;
  SpecName?: string;
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
