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
  - -y, --yes boolean：对所有交互询问选择“是”（默认 false）
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

- 位置参数：
  - entry：（可选的）边缘函数入口文件

- 选项：
  - -v, --version string：指定要部署的版本（跳过交互选择）
  - -e, --environment string：部署环境。可选：staging | production
  - -n, --name string：边缘函数名称
  - -a, --assets boolean：是否部署静态资源
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
  - list：列出账户下所有已激活站点

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

---

### esa login

登录。

```bash
esa login
```

- 选项：
  - --access-key-id, --ak string：AccessKey ID (AK)
  - --access-key-secret, --sk string：AccessKey Secret (SK)

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
