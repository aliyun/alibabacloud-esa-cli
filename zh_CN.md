# 安装/更新 ESA CLI

ESA CLI 是用于构建阿里云 ESA Functions 与 Pages 的命令行工具。

<p>
  <a href="https://discord.gg/BxcRVEeh">
    <img alt="Discord 中文" src="https://img.shields.io/badge/Discord-中文-5865F2?logo=discord&logoColor=white" />
  </a>
  <a href="https://discord.gg/SHYe5926" style="margin-left:8px;">
    <img alt="Discord English" src="https://img.shields.io/badge/Discord-English-5865F2?logo=discord&logoColor=white" />
  </a>
 </p>

## 安装 ESA CLI

### 前置条件

- Node.js：18.x 或更高（支持 18.x、20.x、22.x）
- 操作系统：macOS (Apple Silicon)、Linux
- 推荐使用 Volta 或 nvm 等 Node 版本管理工具，避免权限问题并便于切换版本

## 安装

为确保团队协作的一致性，建议在项目中将 `esa-cli` 安装为开发依赖，以便团队成员使用相同版本。

```
npm i -D esa-cli@latest
```

或者全局安装，以便在系统范围内使用 `esa-cli` 命令：

```
npm i -g esa-cli@latest
```

当尚未安装 `esa-cli` 时，`npx` 会从注册表拉取并运行最新版本。

## 查看 ESA CLI 版本

```
npx esa-cli --version
# 或
npx esa-cli -v
```

## 更新 ESA CLI

```
npm i -D esa-cli@latest
```

## 企业 HTTP/HTTPS 代理

ESA CLI 的 API 请求（包括登录）、代码及静态资源上传、运行时下载和版本检查支持代理环境变量：

```bash
export HTTPS_PROXY=http://proxy.example.com:9400
export HTTP_PROXY=http://proxy.example.com:9400
export NO_PROXY=localhost,127.0.0.1,[::1],.example.internal
npx esa-cli login
```

HTTPS 请求读取 `https_proxy` / `HTTPS_PROXY`，HTTP 请求读取 `http_proxy` / `HTTP_PROXY`；同名变量以小写优先。`all_proxy` / `ALL_PROXY` 可作为两种协议的后备配置。如果两种请求都需要代理，请同时设置 `HTTP_PROXY` 和 `HTTPS_PROXY`。

`no_proxy` / `NO_PROXY` 用于指定绕过代理的目标，支持逗号分隔的主机名、带端口的主机名、`.example.internal` 形式的域名后缀，以及表示全部直连的 `*`。代理服务器地址支持 `http://` 和 `https://`。本地开发已显式指定的代理连接保持原有路由。

## 隐藏部署预览信息

在 CI 等场景下，可以隐藏部署输出中的预览链接和访问 Token：

```bash
npx esa-cli deploy --no-preview
```

该参数同时跳过预览 Token 的获取，仍显示部署结果、应用名和版本流量比例。支持部署新版本、`--version` 和 `--versions`；默认仍显示预览信息。

## 相关文档

- [esa-cli 命令](https://github.com/aliyun/alibabacloud-esa-cli/blob/master/docs/Commands_zh_CN.md)
- [ESA 配置文件说明](https://github.com/aliyun/alibabacloud-esa-cli/blob/master/docs/Config_zh_CN.md)
- [阿里云 ESA 文档](https://help.aliyun.com/document_detail/2710021.html)
- [Functions 和 Pages API 参考](https://help.aliyun.com/document_detail/2710024.html)
