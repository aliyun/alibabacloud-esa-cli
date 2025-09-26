# 安装/更新 ESA CLI

ESA CLI 是用于构建阿里云 ESA Functions 与 Pages 的命令行工具。

<p>
  <a href="https://discord.gg/xygV6MYx">
    <img alt="Discord 中文" src="https://img.shields.io/badge/Discord-中文-5865F2?logo=discord&logoColor=white" />
  </a>
  <a href="https://discord.gg/YeFg4yUA" style="margin-left:8px;">
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

## 相关文档

- [esa-cli 命令](./docs/Commands_zh_CN.md)
- [ESA 配置文件说明](./docs/Config_zh_CN.md)
- [阿里云 ESA 文档](https://help.aliyun.com/document_detail/2710021.html)
- [Functions 和 Pages API 参考](https://help.aliyun.com/document_detail/2710024.html)
