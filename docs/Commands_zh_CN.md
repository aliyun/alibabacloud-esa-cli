## ESA CLI 命令

**ESA CLI 提供多种命令来管理您的阿里云 ESA Functions & Pages。**

**init** - 从各种 Web 框架和模板创建新项目。

**dev** - 启动本地开发服务器。

**commit** - 保存绑定指定环境快照的新版本，但不部署。

**deploy** - 将您的 Functions & Pages 部署到阿里云。

**env** - 管理指定环境的普通变量。

**secret** - 管理指定环境的加密 Secret。

**deployments** - 管理您的部署和版本。

**project** - 管理您的 Functions & Pages 项目。

**site** - 列出您已激活的站点。

**domain** - 管理您的 Functions & Pages 的域名绑定。

**route** - 管理您的 Functions & Pages 的路由绑定。

**login** - 使用您的阿里云账户授权 ESA CLI。

**logout** - 清除 ESA CLI 本地配置中保存的凭据。

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

**提交代码并保存为带环境变量快照的新版本，但不部署。默认环境为 production。**

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

**--environment, -e** _可选_
**绑定到版本的变量和 Secret 所属环境。可选：staging | production。默认：production**

**--name, -n** _可选_
**函数和Pages名称**

省略 `--environment` 时，新版本绑定当前 production 环境的变量和 Secret 快照；显式选择 staging 时绑定 staging 快照。两种用法都只创建版本，不执行部署。

```
esa-cli commit
esa-cli commit --environment staging
```

---

## deploy

**生成一个代码版本并部署；默认部署到 production，也可以显式选择 staging。**

```
esa-cli deploy [<ENTRY>] [OPTIONS]
```

**ENTRY** _可选_
**函数和Pages入口文件，默认以 `esa.jsonc`中entry配置为准**

**--version, -v** _可选_
**指定要部署的版本（跳过交互选择）**

**--environment, -e** _可选_
**部署环境。可选：staging | production。默认：production**

**--name, -n** _可选_
**函数和Pages名称**

**--assets, -a** _可选_
**静态资源目录（例如：./dist）**

**--description, -d** _可选_
**版本描述**

**--minify, -m** _可选_
**是否压缩代码**

当命令生成新版本时，新版本会绑定目标环境当前的变量和 Secret 快照。省略 `--environment` 时以 production 为目标并绑定 production 快照；使用 `--environment staging` 时则以 staging 为目标并绑定 staging 快照。

```
esa-cli deploy
esa-cli deploy --environment staging
```

之后修改变量或 Secret 不会改变已有版本；需要通过 `commit` 或 `deploy` 创建新的环境快照，并将该版本部署到匹配的环境后才会生效。

使用 `--version` 部署已有版本时，不会重新创建或绑定变量快照。如果版本绑定的环境与目标环境不同，CLI 会拒绝部署；没有环境绑定信息的旧版本仍保持兼容。

---

## env

**管理指定部署环境的普通文本变量。所有 env 子命令都必须指定 `--environment, -e`。变量修改不会改变已有版本；需要通过 `commit` 或 `deploy` 创建新的环境快照，并将该版本部署到匹配的环境。**

### env list

**列出指定环境的变量和 Secret。Secret 的值始终以遮蔽形式显示。**

```
esa-cli env list --environment production [OPTIONS]
```

**--environment, -e** _必需_
**目标环境。可选：staging | production**

**--name, -n** _可选_
**函数和Pages名称**

### env set

**设置或更新指定环境的普通文本变量。**

```
esa-cli env set <KEY=VALUE> --environment production [OPTIONS]
```

例如：

```
esa-cli env set LOG_LEVEL=info -e production
```

**KEY=VALUE** _必需_
**要设置的变量名称和值**

**--environment, -e** _必需_
**目标环境。可选：staging | production**

**--name, -n** _可选_
**函数和Pages名称**

### env delete

**删除指定环境的变量或 Secret。**

```
esa-cli env delete <KEY> --environment production [OPTIONS]
```

例如：

```
esa-cli env delete LOG_LEVEL -e production
```

**KEY** _必需_
**要删除的变量或 Secret 名称**

**--environment, -e** _必需_
**目标环境。可选：staging | production**

**--name, -n** _可选_
**函数和Pages名称**

---

## secret

**管理指定部署环境的加密 Secret。Secret 更新不会改变已有版本；需要通过 `commit` 或 `deploy` 创建新的环境快照，并将该版本部署到匹配的环境。使用 `env list` 查看时，Secret 值始终被遮蔽。**

### secret put

**设置或更新一个 Secret。默认通过隐藏输入的交互提示读取值，不会将值显示在终端中。**

```
esa-cli secret put <KEY> --environment production [OPTIONS]
```

例如，通过隐藏交互输入 Secret：

```
esa-cli secret put API_TOKEN -e production
```

也可以通过标准输入传值：

```
printf '%s' "$API_TOKEN" | esa-cli secret put API_TOKEN -e production --stdin
```

**KEY** _必需_
**要设置的 Secret 名称**

**--stdin** _可选_
**从标准输入读取 Secret 值，不显示交互提示**

**--environment, -e** _必需_
**目标环境。可选：staging | production**

**--name, -n** _可选_
**函数和Pages名称**

### secret bulk

**从 dotenv 文件批量导入 Secret。**

**请勿将该 dotenv 文件提交到版本控制。如果使用 `.env.production` 等文件名，请显式将其加入项目的 `.gitignore`。**

```
esa-cli secret bulk <FILE> --environment production [OPTIONS]
```

例如：

```
esa-cli secret bulk .env.production -e production
```

**FILE** _必需_
**要导入的 dotenv 文件路径**

**--environment, -e** _必需_
**目标环境。可选：staging | production**

**--name, -n** _可选_
**函数和Pages名称**

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

**--sts-token** _可选_
**临时 STS 凭证，支持 `AccessKeyId,AccessKeySecret,SecurityToken` 或 JSON 格式**

同时提供 `--sts-token` 和 AK/SK 参数时，ESA CLI 会保留兼容行为：优先使用 STS 凭据，本次登录忽略 AK/SK 参数，并输出警告。

> **安全提示：** 通过 `--sk` 或 `--sts-token` 传入的值可能被记录在 shell 历史中，也可能通过进程参数暴露。推荐通过环境变量注入凭据（例如使用 CI 密钥管理服务），或使用会隐藏 Secret 输入的交互登录。

**凭据优先级**

ESA CLI 按以下顺序解析凭据（从高到低）：

1. 显式参数：`--sts-token`，或完整的 `--access-key-id`（`--ak`）和 `--access-key-secret`（`--sk`）参数组
2. 完整的 ESA 专用环境变量凭据组：
   - **ESA_ACCESS_KEY_ID**
   - **ESA_ACCESS_KEY_SECRET**
   - **ESA_SECURITY_TOKEN** _可选_
3. 完整的阿里云标准环境变量凭据组：
   - **ALIBABA_CLOUD_ACCESS_KEY_ID**
   - **ALIBABA_CLOUD_ACCESS_KEY_SECRET**
   - **ALIBABA_CLOUD_SECURITY_TOKEN** _可选_
4. `esa-cli login` 保存在 `~/.esa/config` 下的凭据
5. 交互输入

显式参数的最高优先级只对本次 `login` 调用生效。登录成功后，凭据会保存到 `~/.esa/config` 下；后续命令会将其视为本地已保存配置，因此完整的 `ESA_*` 或 `ALIBABA_CLOUD_*` 凭据组仍会覆盖它。检测到环境变量将覆盖或阻止本次新保存的凭据时，登录命令会输出警告。

凭据按完整组选择。ESA CLI 不会在不同前缀或来源之间混用 AccessKey ID、AccessKey Secret 或 Security Token。如果高优先级凭据来源已设置但不完整，登录会直接报错，不会与低优先级来源拼接。

通过阿里云 CLI 插件方式调用 ESA CLI 时，阿里云 CLI 会通过 `ALIBABA_CLOUD_*` 环境变量传入所选 Profile 的凭据。`ESA_*` 凭据组会有意覆盖该 Profile；如需使用阿里云 CLI 的 `--profile`，请先取消设置 `ESA_ACCESS_KEY_ID`、`ESA_ACCESS_KEY_SECRET` 和 `ESA_SECURITY_TOKEN`。

---

## logout

**清除 `~/.esa/config` 中保存的凭据。**

```
esa-cli logout
```

`logout` 不会移除 `ESA_*` 或 `ALIBABA_CLOUD_*` 环境变量凭据。若要阻止后续命令继续使用这些凭据，请在父 Shell 中取消设置对应变量，或切换阿里云 CLI 选中的 Profile。检测到环境变量凭据仍存在时，ESA CLI 会输出警告。

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
