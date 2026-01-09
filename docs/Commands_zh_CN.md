## ESA CLI 命令

**ESA CLI 提供多种命令来管理您的阿里云 ESA Functions & Pages。**

**init** - 从各种 Web 框架和模板创建新项目。

**dev** - 启动本地开发服务器。

**commit** - 提交代码并保存为新版本。

**deploy** - 将您的 Functions & Pages 部署到阿里云。

**deployments** - 管理您的部署和版本。

**project** - 管理您的 Functions & Pages 项目。

**site** - 列出您已激活的站点。

**domain** - 管理您的 Functions & Pages 的域名绑定。

**route** - 管理您的 Functions & Pages 的路由绑定。

**login** - 使用您的阿里云账户授权 ESA CLI。

**logout** - 移除 ESA CLI 访问您账户的授权。

**config** - 修改您的本地或全局配置。

**lang** - 设置 CLI 的语言。

### 如何运行 ESA CLI 命令

**如果你是通过全局安装的esa-cli，如果需要运行请参考以下命令**

**安装方式**

```
npm i esa-cli@latest -g
```

**执行命令**

```
esa-cli <COMMAND> <SUBCOMMAND> [PARAMETERS] [OPTIONS]
```

---

**如果你是在项目中本地安装 ESA CLI（而不是全局安装），运行 ESA CLI 的方式将取决于您的具体设置和包管理器。**

```
npx esa-cli <COMMAND> <SUBCOMMAND> [PARAMETERS] [OPTIONS]
```

**您可以将经常使用的 ESA CLI 命令添加为项目 package.json 文件中的脚本：**

```
{
  ...
  "scripts": {
    "deploy": "esa-cli deploy",
    "dev": "esa-cli dev"
  }
  ...
}
```

**然后您可以使用您选择的包管理器运行它们：**

```
npm run deploy
```

---

## init

**通过模板创建新项目。可选择各种 Web 框架和模板。默认安装依赖项，可选择立即部署您的项目。**

```
esa-cli init [<NAME>] [OPTIONS]
```

**NAME** _可选（默认：工作目录名称）_
**Functions & Pages 项目的名称。这既是目录名称，也是生成的 ESA CLI 配置中的 name 属性。**

**--framework, -f** _可选_
**选择前端框架（react/vue/nextjs...）**

**--language, -l** _可选_
**选择编程语言（typescript/javascript）。可选：typescript | javascript**

**--template, -t** _可选_
**指定模板名称**

**--yes, -y** _可选_
**对所有交互询问选择"是"（默认 false），模版采用helloworld**

**--git** _可选_
**在项目中初始化 git**

**--deploy** _可选_
**初始化完成后自动部署**

---

## dev

**启动本地开发服务器。**

```
esa-cli dev [<ENTRY>] [OPTIONS]
```

**ENTRY** _可选_
**函数和Pages入口文件**

**--port, -p** _可选_
**监听端口**

**--minify, -m** _可选_
**开发模式下压缩代码（默认 false）**

**--refresh-command** _可选_
**保存自动刷新前执行的命令**

**--local-upstream** _可选_
**在本地开发中作为源站的主机**

**--debug** _可选_
**输出调试日志（默认 false）**

---

## commit

**提交代码并保存为新版本。**

```
esa-cli commit [<ENTRY>] [OPTIONS]
```

**ENTRY** _可选_
**函数和Pages入口文件**

**--minify, -m** _可选_
**提交前压缩代码（默认 false）**

**--assets, -a** _可选_
**静态资源目录**

**--description, -d** _可选_
**版本/例程描述（跳过交互输入）**

**--name, -n** _可选_
**函数和Pages名称**

---

## deploy

**生成一个代码版本，并同时部署项目到仿真和线上环境。**

```
esa-cli deploy [<ENTRY>] [OPTIONS]
```

**ENTRY** _可选_
**函数和Pages入口文件，默认以 `esa.jsonc`中entry配置为准**

**--version, -v** _可选_
**指定要部署的版本（跳过交互选择）**

**--environment, -e** _可选_
**部署环境。可选：staging | production**

**--name, -n** _可选_
**函数和Pages名称**

**--assets, -a** _可选_
**静态资源目录（例如：./dist）**

**--description, -d** _可选_
**版本描述**

**--minify, -m** _可选_
**是否压缩代码**

---

## deployments

**管理您的部署和版本。**

### deployments list

**列出当前函数和Pages下所有代码版本。**

```
esa-cli deployments list
```

### deployments delete

**删除当前函数和Pages的一个或多个代码版本。**

```
esa-cli deployments delete [<DEPLOYMENT_ID>...] [OPTIONS]
```

**DEPLOYMENT_ID** _必需_
**要删除的部署版本ID（可一次传多个）**

---

## project

**管理您的 Functions & Pages 项目。**

### project list

**列出账号下所有的函数和Pages。**

```
esa-cli project list
```

### project delete

**删除指定函数和Pages。**

```
esa-cli project delete <PROJECT_NAME> [OPTIONS]
```

**PROJECT_NAME** _必需_
**要删除的函数或Pages名称**

---

## site

**列出您已激活的站点。**

### site list

**列出账号下所有已激活站点。**

```
esa-cli site list
```

---

## domain

**管理您的 Functions & Pages 的域名绑定。**

### domain add

**绑定域名到当前函数和Pages。**

```
esa-cli domain add <DOMAIN> [OPTIONS]
```

**只有在该账号下激活的站点才能绑定**

**DOMAIN** _必需_
**要绑定的域名（在该账号站点下已激活）**

### domain list

**查看当前函数和Pages所有已绑定域名。**

```
esa-cli domain list
```

### domain delete

**删除当前函数和Pages下已绑定域名。**

```
esa-cli domain delete <DOMAIN> [OPTIONS]
```

**DOMAIN** _必需_
**要删除绑定的域名**

---

## route

**管理您的 Functions & Pages 的路由绑定。**

### route add

**为当前函数和Pages绑定一个路由。**

```
esa-cli route add [<ROUTE>] [<SITE>] [OPTIONS]
```

**ROUTE** _可选_
**路由值，例如：example.com/_ 或 _.example.com/\***

**SITE** _可选_
**站点名称，例如：example.com**

**只有在该账号下激活的站点才能绑定**

**--route, -r** _可选_
**路由值，例如：example.com/\***

- **主机名支持以 `*` 开头表示后缀匹配（如：`*.example.com`）**
- **路径支持以 `*` 结尾表示前缀匹配（如：`/api/*`）**

**--site, -s** _可选_
**站点名称（需为账户下已激活站点）**

**--alias, -a** _可选_
**路由名称（别名）例如：apple、orange等**

### route list

**查看当前函数和Pages下所有已绑定路由。**

```
esa-cli route list
```

### route delete

**删除函数和Pages下已绑定路由。**

```
esa-cli route delete <ROUTE_NAME> [OPTIONS]
```

**ROUTE_NAME** _必需_
**要删除的路由名称**

---

## login

**使用您的阿里云账户授权 ESA CLI。**

```
esa-cli login [OPTIONS]
```

**--access-key-id, --ak** _可选_
**AccessKey ID (AK)**

**--access-key-secret, --sk** _可选_
**AccessKey Secret (SK)**

**环境变量** _从环境变量中读取：_

- **ESA_ACCESS_KEY_ID**
- **ESA_ACCESS_KEY_SECRET**

---

## logout

**移除 ESA CLI 访问您账户的授权。**

```
esa-cli logout
```

---

## config

**修改您的本地或全局配置。**

```
esa-cli config [OPTIONS]
```

**--local, -l** _可选_
**编辑本地配置文件（默认 false）**

**--global, -g** _可选_
**编辑全局配置文件（默认 false）**

---

## lang

**设置 CLI 的语言。**

```
esa-cli lang
```
