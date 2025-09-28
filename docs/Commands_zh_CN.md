## 命令一览

### esa-cli init [name]

初始化一个函数和Pages项目（支持框架或模板）。

```bash
esa-cli init [name]
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

### esa-cli dev [entry]

启动本地开发服务器。

```bash
esa-cli dev [entry]
```

- 位置参数：
  - entry：函数和Pages入口文件

- 选项：
  - -p, --port number：监听端口
  - -m, --minify boolean：开发模式下压缩代码（默认 false）
  - --refresh-command string：保存自动刷新前执行的命令
  - --local-upstream string：在本地开发中作为源站的主机
  - --debug boolean：输出调试日志（默认 false）

---

### esa-cli commit [entry]

提交代码并保存为新版本。

```bash
esa-cli commit [entry]
```

- 选项：
  - -m, --minify boolean：提交前压缩代码（默认 false）
  - -a, --assets string：静态资源目录
  - -d, --description string：版本/例程描述（跳过交互输入）
  - -n, --name string：函数和Pages名称

---

### esa-cli deploy [entry]

生成一个代码版本，并同时部署项目到仿真和线上环境

```bash
esa-cli deploy [entry]
```

- 选项：
  - entry 可选参数，默认以 `esa.jsonc`中entry配置为准
  - -v, --version string：指定要部署的版本（跳过交互选择）
  - -e, --environment string：部署环境。可选：staging | production
  - -n, --name string：函数和Pages名称
  - -a, --assets string：静态资源目录（例如：./dist）
  - -d, --description string：版本描述
  - -m, --minify boolean：是否压缩代码

---

### esa-cli deployments list

列出当前函数和Pages下所有代码版本。

```bash
esa-cli deployments list
```

无额外选项。

---

### esa-cli deployments delete [deploymentId...]

删除当前函数和Pages的一个或多个代码版本。

```bash
esa-cli deployments delete [deploymentId...]
```

- 位置参数：
  - deploymentId...：要删除的部署版本ID（可一次传多个）

---

### esa-cli project list

列出账号下所有的函数和Pages。

```bash
esa-cli project list
```

无额外选项。

---

### esa-cli project delete `<projectName>`

删除指定函数和Pages。

```bash
esa-cli project delete <projectName>
```

- 位置参数：
  - projectName：要删除的函数或Pages名称

---

### esa-cli site list

列出账号下所有已激活站点。

```bash
esa-cli site list
```

无额外选项。

---

### esa-cli domain add `<domain>`

绑定域名到当前函数和Pages。

```bash
esa-cli domain add <domain>
```

- 位置参数：
  - domain：要绑定的域名

---

### esa-cli domain list

查看当前函数和Pages所有已绑定域名。

```bash
esa-cli domain list
```

无额外选项。

---

### esa-cli domain delete `<domain>`

删除当前函数和Pages下已绑定域名。

```bash
esa-cli domain delete <domain>
```

- 位置参数：
  - domain：要删除绑定的域名

---

#### esa-cli route add

为当前函数和Pages绑定一个路由。

```bash
esa-cli route add [route] [site] [--alias <routeName>] [--route <route>] [--site <site>]
```

- 位置参数（可选）：
  - route：路由值，例如：example.com/_ 或 _.example.com/\*
  - site：站点名称，例如：example.com

- 选项：
  - -r, --route string：路由值，例如：example.com/\*
    - 主机名支持以 `*` 开头表示后缀匹配（如：`*.example.com`）
    - 路径支持以 `*` 结尾表示前缀匹配（如：`/api/*`）
  - -s, --site string：站点名称（需为已激活站点）
  - -a, --alias string：路由名称（别名） 例如：apple、orange等

---

### esa-cli route list

查看函数和Pages所有已绑定路由。

```bash
esa-cli route list
```

无额外选项。

---

### esa-cli route delete `<routeName>`

删除函数和Pages下已绑定路由。

```bash
esa-cli route delete <routeName>
```

- 位置参数：
  - routeName：要删除的路由名称

---

### esa-cli login

登录。

```bash
esa-cli login
```

- 选项：
  - --access-key-id, --ak string：AccessKey ID (AK)
  - --access-key-secret, --sk string：AccessKey Secret (SK)
  - --endpoint, -e string：API 端点 URL 例子: esa.cn-hangzhou.aliyuncs.com
- 从环境变量中读取process.env
  - ESA_ACCESS_KEY_ID
  - ESA_ACCESS_KEY_SECRET
  - ESA_ENDPOINT

---

### esa-cli logout

退出登录。

```bash
esa-cli logout
```

---

### esa-cli config [-l | -g]

修改本地或全局配置。

```bash
esa-cli config [--local] [--global]
```

- 选项：
  - -l, --local boolean：编辑本地配置文件（默认 false）
  - -g, --global boolean：编辑全局配置文件（默认 false）

---

### esa-cli lang

设置 CLI 语言。

```bash
esa-cli lang
```
