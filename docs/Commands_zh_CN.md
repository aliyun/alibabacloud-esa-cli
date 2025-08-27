# Commands

### init

选择框架或模版初始化项目。

```bash
$ esa init [OPTIONS]
```

- -f, --framework `string` `optional`
- 选择前端框架初始化项目，支持：`react` | `vue` | `next`。

- -t, --template `string` `optional`
- 指定 ESA 模版名称初始化项目。

- -c, --config `boolean` `optional`
- 在您的项目中生成一个 `esa.toml` 配置文件。

说明：
- 未指定 `--framework` 与 `--template` 且未使用 `--yes` 时，会先询问选择“框架初始化”或“模版初始化”。
- 选择框架后将调用对应官方脚手架创建项目，并在新项目根目录自动生成 `esa.toml`。入口文件会自动探测，候选包括：`src/index.js`、`src/index.jsx`、`src/index.tsx`、`src/main.js`、`src/main.ts`、`src/main.tsx`、`pages/index.js`、`pages/index.tsx`、`app/page.js`、`app/page.tsx`。静态资源目录会根据框架常规构建输出自动设置，例如 CRA 为 `build/`、Vite 通常为 `dist/`（若存在），Next 静态导出使用 `out/`（若存在）。

### routine [script]

管理边缘函数。

#### delete <routineName>

删除一个边缘函数。

```bash
$ esa routine delete <routineName>
```

- routineName `string` `required`
- 要删除的边缘函数名称。

#### list

查看所有边缘函数。

```bash
$ esa routine list
```

### route [script]

管理绑定到边缘函数的路由。

#### add [route] [site]

将路由绑定到边缘函数。

```bash
$ esa route add [route] [site]
```

#### delete <route>

删除一个绑定路由。

```bash
$ esa route delete <route>
```

- route `string` `required`
- 要删除的路由名称。

#### list

查看所有绑定路由。

```bash
$ esa route list
```

### login

登录。

```bash
$ esa login
```

### dev [entry]

启动本地调试。

```bash
$ esa dev [entry] [OPTIONS]
```

- entry `string` `optional`
- 入口文件路径。

- -port, --p `number` `optional`
- 监听端口。

- --inspect-port `number` `optional`
- 用于 Chrome inspect 调试工具的端口。

- -minify, --m `boolean` `optional`
- 开发打包时压缩代码。

- --local-upstream `string` `optional`
- 在开发时作为源站的域名。

- --refresh-command `string` `optional`
- 提供一个在保存自动刷新前执行的命令。

### deploy [entry]

部署您的项目。

```bash
$ esa deploy [entry]
```

- entry `string` `optional`
- 入口文件路径。

### domain [script]

管理绑定到边缘函数的域名。

#### add <domain>

绑定域名到边缘函数。

```bash
$ esa domain add <domain>
```

- domain `string` `required`
- 需要添加的域名。

#### delete <domain>

删除一个绑定域名。

```bash
$ esa domain delete <domain>
```

- domains `string` `required`
- 要删除的绑定域名。

#### list

查看所有绑定域名。

```bash
$ esa domain list
```

### deployments [script]

管理您的部署。

#### delete <deploymentId>

删除一个部署版本。

```bash
$ esa deployments delete <deploymentId>
```

- deploymentId `string` `required`
- 要删除的部署版本ID。

#### list

查看所有部署。

```bash
$ esa deployments list
```

### commit [entry]

提交代码，保存为一个版本。

```bash
$ esa commit [entry] [OPTIONS]
```

- entry `string` `optional`
- 入口文件路径。

- -m, --minify `boolean` `optional`
- 上传前压缩代码。

### logout

注销登录。

```bash
$ esa logout
```

### config

使用 -l 或 -g 修改本地或全局配置。

```bash
$ esa config [OPTIONS]
```

- -g, --global `boolean` `optional`
- 编辑全局配置文件。

- -l, --local `boolean` `optional`
- 编辑本地配置文件。

### lang

选择语言。

```bash
$ esa lang
```

### site [script]

管理站点。

#### list

列出站点。

```bash
$ esa site list
```
