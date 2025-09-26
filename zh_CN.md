# 安装/更新 ESA CLI

ESA CLI 是用于构建阿里云 ESA Functions 与 Pages 的命令行工具。

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

当尚未安装 `esa-cli` 时，`npx` 会从注册表拉取并运行最新版本。

## 查看 ESA CLI 版本

```
npx esa --version
# 或
npx esa -v
```

## 更新 ESA CLI

```
npm i -D esa-cli@latest
```

## 相关文档

- [ESA CLI 使用指南](./README.md)
- [阿里云 ESA 文档](https://help.aliyun.com/document_detail/2710021.html)
- [Functions 和 Pages API 参考](https://help.aliyun.com/document_detail/2710024.html)
