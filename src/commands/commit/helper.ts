import { ApiService } from '../../libs/apiService.js';
import {
  CreateRoutineWithAssetsCodeVersionReq,
  CreateRoutineWithAssetsCodeVersionRes
} from '../../libs/interface.js';

export async function commitRoutineWithAssets(
  requestParams: CreateRoutineWithAssetsCodeVersionReq,
  zipBuffer: Buffer
): Promise<{
  isSuccess: boolean;
  res: CreateRoutineWithAssetsCodeVersionRes | null;
} | null> {
  try {
    // 第一步：调用 API 获取 OSS 配置
    const server = await ApiService.getInstance();
    const apiResult =
      await server.CreateRoutineWithAssetsCodeVersion(requestParams);

    if (!apiResult || !apiResult.data.OssPostConfig) {
      return {
        isSuccess: false,
        res: null
      };
    }
    console.log(apiResult);

    const ossConfig = apiResult.data.OssPostConfig;

    // 检查所有必需的 OSS 配置字段是否存在
    if (
      !ossConfig.OSSAccessKeyId ||
      !ossConfig.Signature ||
      !ossConfig.Url ||
      !ossConfig.Key ||
      !ossConfig.Policy
    ) {
      console.error('Missing required OSS configuration fields');
      return {
        isSuccess: false,
        res: null
      };
    }

    // 第二步：上传文件到 OSS
    const uploadSuccess = await server.uploadToOss(
      {
        OSSAccessKeyId: ossConfig.OSSAccessKeyId,
        Signature: ossConfig.Signature,
        Url: ossConfig.Url,
        Key: ossConfig.Key,
        Policy: ossConfig.Policy,
        XOssSecurityToken: ossConfig.XOssSecurityToken || ''
      },
      zipBuffer
    );

    return {
      isSuccess: uploadSuccess,
      res: apiResult
    };
  } catch (error) {
    console.error('Error in createRoutineWithAssetsCodeVersion:', error);
    return {
      isSuccess: false,
      res: null
    };
  }
}
