## 命令一览

### esa init [name]

初始化一个边缘函数项目（支持框架或模板）。

```bash
esa init [name]
```

- 位置参数：
  - name：项目名

- 选项：
  - -f, --framework string：选择前端框架（react/vue/nextjs...）
  - -l, --language string：选择语言（typescript/javascript）。可选：typescript | javascript
  - -t, --template string：指定模板名称
  - -y, --yes boolean：对所有交互询问选择“是”（默认 false），模版采用helloworld
  - --git boolean：在项目中初始化 git
  - --deploy boolean：初始化完成后自动部署

---

### esa dev [entry]

启动本地开发服务器。

```bash
esa dev [entry]
```

- 位置参数：
  - entry：边缘函数入口文件

- 选项：
  - -p, --port number：监听端口
  - -m, --minify boolean：开发模式下压缩代码（默认 false）
  - --refresh-command string：保存自动刷新前执行的命令
  - --local-upstream string：在本地开发中作为源站的主机
  - --debug boolean：输出调试日志（默认 false）

---

### esa commit [entry]

提交代码并保存为新版本。

```bash
esa commit [entry]
```

- 选项：
  - -m, --minify boolean：提交前压缩代码（默认 false）
  - -a, --assets string：静态资源目录
  - -d, --description string：版本/例程描述（跳过交互输入）
  - -n, --name string：边缘函数名称

---

### esa deploy [entry]

部署项目。

```bash
esa deploy [entry]
```

- 选项：
  - entry 可选参数，默认以`esa.jsonc`中entry配置为准
  - -v, --version string：指定要部署的版本（跳过交互选择）
  - -e, --environment string：部署环境。可选：staging | production
  - -n, --name string：边缘函数名称
  - -a, --assets string：静态资源目录（例如：./dist）
  - -d, --description string：版本描述
  - -m, --minify boolean：是否压缩代码

---

### esa deployments [list | delete]

管理部署版本。

```bash
esa deployments list
esa deployments delete [deploymentId...]
```

- 子命令：
  - list：列出所有部署
  - delete [deploymentId...]：删除一个或多个部署版本

---

### esa routine [list | delete]

管理边缘函数。

```bash
esa routine list
esa routine delete <routineName>
```

- 子命令：
  - list：列出所有边缘函数
  - delete `<routineName>`：删除指定边缘函数

---

### esa site [list]

管理站点。

```bash
esa site list
```

- 子命令：
  - list：列出所有已激活站点

---

### esa domain <add | list | delete>

管理与边缘函数绑定的域名。

```bash
esa domain add <domain>
esa domain list
esa domain delete <domain>
```

- 子命令：
  - add `<domain>`：绑定域名
  - list：查看所有已绑定域名
  - delete `<domain>`：删除已绑定域名

---

### esa route <add | list | delete>

管理与边缘函数绑定的路由。

```bash
esa route add
esa route list
esa route delete <routeName>
```

- 子命令：
  - add：绑定路由
  - list：查看所有已绑定路由
  - delete `<routeName>`：删除已绑定路由

#### esa route add

为当前边缘函数绑定一个路由。

```bash
esa route add [route] [site] [--alias <routeName>] [--route <route>] [--site <site>]
```

- 位置参数（可选）：
  - route：路由值，例如：example.com/_ 或 _.example.com/\*
  - site：站点名称，例如：example.com

- 选项：
  - -r, --route string：路由值，例如：example.com/\*
    - 主机名支持以 `*` 开头表示后缀匹配（如：`*.example.com`）
    - 路径支持以 `*` 结尾表示前缀匹配（如：`/api/*`）
  - -s, --site string：站点名称（需为已激活站点）
  - -a, --alias string：路由名称（别名）

- 交互提示：
  - 未提供 `--alias` 时，会提示输入路由名称
  - 未提供 `--site` 时，会列出账号下已激活站点供选择
  - 未提供 `--route` 时，会提示输入路由值

- 路由匹配说明：
  - host 支持前缀 `*`：`*.example.com` 表示匹配所有以 `.example.com` 结尾的域名
  - path 支持后缀 `*`：`/api/*` 表示匹配以 `/api/` 开头的路径
  - 示例：`example.com/*`、`*.example.com/`、`*.example.com/api/*`

- 示例：
  - `esa route add -a home -s example.com -r example.com/*`
  - `esa route add example.com/* example.com -a home`

---

### esa login

登录。

```bash
esa login
```

- 选项：
  - --access-key-id, --ak string：AccessKey ID (AK)
  - --access-key-secret, --sk string：AccessKey Secret (SK)
- 从环境变量中读取process.env
  - ESA_ACCESS_KEY_ID
  - ESA_ACCESS_KEY_SECRET

---

### esa logout

退出登录。

```bash
esa logout
```

---

### esa config [-l | -g]

修改本地或全局配置。

```bash
esa config [--local] [--global]
```

- 选项：
  - -l, --local boolean：编辑本地配置文件（默认 false）
  - -g, --global boolean：编辑全局配置文件（默认 false）

---

### esa lang

设置 CLI 语言。

```bash
esa lang
```
