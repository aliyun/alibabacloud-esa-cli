# ESA CLI

用于操作阿里云 ESA EdgeRoutine（边缘函数） 的 CLI，支持快速创建边缘函数、本地调试、版本发布与部署、触发器管理。

简体中文 | [English](./README.md)

#### 参考

- [边缘安全加速(ESA)](https://www.aliyun.com/product/esa)
- [边缘函数概述](https://help.aliyun.com/document_detail/2710021.html)

> **注意**: ESA CLI 处于公测阶段，如果您在使用中遇到任何问题，或者有任何建议，请随时提交 issue 或 pull request。
>
> 我们正在积极改进，并欢迎任何反馈。感谢您的理解与支持！

## 安装

使用npm安装并运行CLI命令：

```bash
$ npm install esa-cli -g    # 全局安装
$ esa -v                    # 查看版本
```

## 使用指南

### 1. 初始化Routine项目

```bash
& esa init
```

初始化命令有完整的流程引导，根据提示输入项目名称、选择模板即可。

### 2. 开始本地调试

本地调试功能是 CLI 的核心，提供了比阿里云 ESA 控制台更便捷的调试体验。

```bash
& cd <Project Name>
& esa dev [options]
```

#### 编写代码

在EdgeRoutine 项目中，入口文件为 `src/index.js`，基本结构如下：

```javascript
const html = `<!DOCTYPE html>
<body>
  <h1>Hello World!</h1>
</body>`;

async function handleRequest(request) {
  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8'
    }
  });
}

export default {
  async fetch(event) {
    return event.respondWith(handleRequest(event));
  }
};
```

更多 EdgeRoutine 的 API 与语法，请参考[API文档](https://help.aliyun.com/document_detail/2710024.html)

#### 本地调试

执行 `esa dev` 后，会自动打包入口文件，并启动本地调试服务，界面样式如下：

![调试界面](https://github.com/aliyun/alibabacloud-esa-cli/blob/master/docs/dev.png)

- 在界面上按 `b` 即可在浏览器中打开调试页面。
- 在界面上按 `d` 可以查看调试引导。**Chrome 不允许命令行打开调试页面。**
- 在 Chrome 浏览器中打开 `Chrome://inspect#devices` 页面，可以看到一个运行的`Remote Target`，点击下面的`inspect`即可查看 console 信息。**注意，EdgeRoutine 的代码为服务端代码，所以预览页面的控制台并不会输出入口文件中的 `console`，只能通过`inspect`调试。**
- 在界面上按 `c` 可以清空面板。
- 在界面上按 `x` 可以退出调试。
- 可以用 `esa dev --port <port>` 临时指定端口，也可以使用 `esa config -l` 按照项目配置端口。

### 3. 登录阿里云账号

需要先登录阿里云账号，才能进行远程管理操作。

首先请访问[阿里云RAM控制台](https://ram.console.aliyun.com/manage/ak)获取您的AccessKey ID和AccessKey Secret，再执行`esa login`根据提示输入。

```bash
& esa login        # 登录
& esa logout       # 登出
```

### 4. 生成版本

当本地调试完成后，需要生成一个代码版本用于部署。

```bash
& esa commit      # 生成版本
```

### 5. 部署到环境 & 管理版本与部署

当代码版本生成后，需要部署到边缘节点。

通过`esa deployments [script]`命令可以管理版本与部署情况。

```bash
& esa deploy              # 根据提示选择版本、目标环境即可部署
& esa deployments list    # 查看部署情况
& esa deployments delete <versionId>  # 删除版本
```

_注意：已经被部署的版本无法删除。_

### 6. 管理触发器

当被部署到节点后，您可以配置触发器，通过触发器可以访问您的边缘函数。触发器有两种：

- 域名：为您的函数绑定域名，该域名必须是您ESA站点的子域名，您可以通过域名直接访问到该函数，此时边缘函数将作为该域名的源站。
- 路由：为您的ESA站点绑定函数路由，访问该路由可触发边缘函数执行，此时边缘函数可以和站点的源站进行通信。

```bash
# 域名
& esa domain list
& esa domain add <domainName>     # 需要是您的已备案域名
& esa domain delete <domainName>

# 路由
& esa route list
& esa route add [route] [site]
& esa route delete <route>
```

### 7. 管理函数

可以通过CLI查看、删除Routine函数。

```bash
& esa routine list    # 查看函数
& esa routine delete <routineName>  # 删除函数
```

## 命令

查看[命令](./docs/Commands.md)

## 配置文件

### 全局配置

```toml
endpoint = "" # ESA API Endpoint
lang = "zh_CN" # 语言

[auth]
accessKeyId = "" # AccessKey ID
accessKeySecret = "" # AccessKey Secret
```

### 项目配置

```toml
name = "Hello World" # 项目名称
description = "Hello World" # 项目描述
entry = "src/index.js" # 入口文件
codeVersions = [ ] # 代码版本

[dev]
port = 18080 # 调试端口
localUpstream = '' # 本地调试上游源站，会替换掉回源时当前的origin
```

## LICENSE

[The MIT License](./LICENSE)
