# ESA CLI 重构必要性：从设计层面分析

## 概述

本文不讨论具体哪一行代码有问题，而是从开发者视角分析 ESA CLI v1 在**系统设计、框架选型、架构模式**层面存在的不改不行的问题。每一个问题都是设计层面的决策失误，不是修几行代码能解决的。

---

## 一、终端 IO 架构：四套 UI 框架混用，没有统一的 stdio 策略

### 问题本质

一个终端 CLI 工具的 IO 层是整个用户体验的基础。v1 同时使用了四套终端交互框架：

- **@clack/prompts** — 主交互提示（文本输入、选择列表）
- **inquirer** — route add 等命令的列表选择
- **ora** — spinner 加载动画
- **Ink + ink-select-input + ink-text-input** — 部分组件渲染

这四个库各自有独立的 ANSI 控制序列管理、键盘事件处理、终端光标操作。它们之间没有任何协调机制。

### 为什么不改不行

**用户体验断裂**：用户在同一个 CLI 里会看到三种完全不同风格的交互界面。@clack 的选择列表、inquirer 的选择列表、Ink 的选择列表，各自的渲染样式、键盘操作、选中高亮都不同。这不是"不好看"的问题，是"用户不知道按什么键能确认"的问题。

**终端渲染冲突**：ora 用 ANSI 控制序列操作光标位置实现 spinner 动画，Ink 用 React reconciler 接管整个终端输出。两者同时工作时，Ink 的重绘会覆盖 ora 的 spinner 区域，或者 ora 的光标移动打乱 Ink 的渲染布局，导致花屏、光标错位、输出残影。这不是偶发 bug，是架构层面的冲突——两个库都在操作同一块终端画布，但没有谁知道对方的存在。

**维护成本**：四个库的依赖加起来超过 300KB。每个库的 API 风格、类型定义、版本兼容性都需要单独维护。新增一个交互功能需要先决定"用哪个库"，而不是直接写。

**v2 方案**：统一用 Ink（React for CLI）一套框架处理所有终端交互。Ink 提供 TextInput、Select、Spinner 等全套组件，统一了渲染和事件处理。砍掉 @clack、inquirer、ora 三个依赖。

---

## 二、CLI 框架：yargs 的架构限制无法绕过

### 问题本质

yargs 是 Node.js 生态最成熟的 CLI 框架，但它的架构设计带来了几个无法从框架内部解决的问题。

### 为什么不改不行

**全局选项渗透**：yargs 的全局选项（`--version`、`--debug`、`--skip-update-check`）会自动出现在所有子命令的 `--help` 输出中。运行 `esa deploy -h` 时，用户看到的不是 deploy 相关的选项，而是一堆跟 deploy 无关的全局选项混在里面。这是 yargs 的架构设计——全局选项通过原型链继承到所有子命令，在框架层面无法关闭。

**builder/handler 耦合**：yargs 的命令定义要求把选项声明（builder）和执行逻辑（handler）分开写。但 v1 的 dev 命令为了在 handler 里调用 `yargs.showHelp()`，不得不在 builder 里把 yargs 实例存到一个模块级变量里，handler 再取出来用。这意味着命令的执行逻辑依赖了 yargs 的内部 API，无法脱离 yargs 测试。整个测试套件都被迫传入 yargs 特有的 `ArgumentsCamelCase` 对象结构（`_`、`$0` 等字段），handler 函数签名暴露了框架实现细节。

**命令注册无隔离**：yargs 的所有命令注册在同一个实例上，命令之间共享模块级状态。新增命令必须修改入口文件手动 `.command()` 注册，没有自动发现机制。

**v2 方案**：换用 CAC（Command and Conquer）。CAC 没有全局选项渗透问题，命令是纯函数——接收解析后的参数，返回结果或 throw，不依赖框架内部状态。handler 签名是 `(args, options) => Promise<void>`，可以直接传普通对象测试。

---

## 三、进程模型：enter.cjs spawn 模式已过时

### 问题本质

v1 的入口 `bin/enter.cjs` 用 `cross-spawn` 启动一个子进程来运行实际的 CLI 代码：

```javascript
return spawn(process.execPath, ['--no-warnings', entryPath, ...args], {
  stdio: [0, 1, 2, 'ipc']
});
```

### 为什么不改不行

**历史包袱**：这种 spawn 模式在 Node.js 12 以下的 ESM/CJS 互操作时代是必要的——当时直接执行 `.js` 文件会遇到模块系统冲突。但项目已经要求 Node 16+ 且 `"type": "module"`，原生 ESM 完全支持。spawn 模式纯粹是历史遗留。

**进程管理问题**：spawn 子进程带来了一系列附带问题：SIGINT 信号需要手动捕获并 kill 子进程；IPC 通道打开了但不使用；子进程的 stderr 和 stdout 通过管道传递，在异常退出时可能丢失最后的输出缓冲。这些问题在直接执行 ESM 入口时都不存在。

**调试困难**：spawn 模式下，Node.js 的 `--inspect` 调试器需要附加到子进程而不是父进程。开发者调试时需要知道"真正的代码运行在子进程里"这个实现细节。

**v2 方案**：直接 ESM 执行，入口文件就是一个普通的 `.mjs`，`import` 后直接调用 `cli.parse(process.argv)`。没有子进程，没有 IPC，信号处理在进程内完成。

---

## 四、配置系统设计：模块级副作用导致不可测试

### 问题本质

配置系统是一个 CLI 工具的基础设施。v1 的配置系统有三个设计层面的决策，每一个都导致了严重的可维护性问题。

### 为什么不改不行

**导入即执行 I/O**：`fileUtils/index.ts` 在模块顶层调用了 `getRoot()`——一个从 `process.cwd()` 开始递归向上搜索文件的函数。这意味着任何 `import` 了 `fileUtils` 的模块（几乎整个项目），在被 Node.js 加载的那一刻就会执行磁盘 I/O。这不是"可以在调用时再执行"的优化问题——模块顶层代码在 ESM 中是确定执行的，不执行就没法拿到配置路径。这导致写单元测试时光是 `import` 被测模块就会触发真实文件系统操作，不 mock 整个 fileUtils 根本跑不起来。

**登录状态检测设计**：v1 的登录状态检测是隐式的——API 客户端在构造时调用 `getApiConfig()`，内部调用 `getCliConfig()` 读取凭据文件。如果没登录，`accessKeyId` 是空的，API 调用时才会报错。没有一个显式的"检查是否登录"的环节。用户跑 `esa site list` 时如果没登录，得到的不是"请先登录"的提示，而是一个底层 API 报的 "InvalidAccessKeyId" 错误。这种设计让错误信息远离问题根源——用户不知道是没登录导致的。

**全局配置和本地配置没有分层覆盖策略**：v1 同时存在 `cliconfig.toml`（源码内部）、`~/.esa/config/default.toml`（全局凭据）、`esa.jsonc` / `esa.toml`（项目配置）三套配置。但没有一个统一的配置加载策略来定义优先级和覆盖关系。`api.ts` 直接读全局凭据，`apiService.ts` 自己有一套读取逻辑，命令里又可能直接读项目配置。配置的合并逻辑散落在各个调用方，没有单一数据源。

**v2 方案**：配置读取改为惰性——只在命令实际需要时才调用 `loadConfig()`，返回一个合并好的配置对象。登录状态在命令执行前显式检查——没登录就直接提示并退出，不进入 API 调用。全局配置和项目配置通过明确的优先级策略合并：项目配置 > 全局配置 > 默认值。

---

## 五、API 客户端架构：两套客户端各自为政

### 问题本质

同一个阿里云 ESA OpenAPI，v1 封装了两套完全独立的客户端。`api.ts`（396 行）和 `apiService.ts`（1234 行）行为完全不同：一个 throw 异常，一个返回 null。

### 为什么不改不行

**调用方需要记住用哪套**：同一个 route 命令集内部都不统一——route/list 用 `api.ts`，route/add 用 `apiService.ts`，route/delete 又用 `api.ts`。开发者写新命令时需要先翻代码看其他命令用的是哪套客户端，选错了错误处理逻辑就完全不同。这不是"统一一下就好"的问题——两套客户端的实例化方式、参数格式、返回结构都不同，不是改个 import 就能切换的。

**错误处理策略不统一**：`api.ts` 在 API 调用失败时 throw 异常，调用方必须 try-catch。`apiService.ts` 在失败时返回 `null` 或 `false`，调用方必须检查返回值。同一个项目里两种错误处理模式并存，开发者每次调 API 都要先想"这接口是 throw 还是返回 null"。这种心智负担在团队协作中会被放大——新人不知道该用哪套，代码 review 也很难统一标准。

**模块级实例化触发副作用链**：`api.ts` 在模块顶层 `export default new Client()`，构造函数里调用 `getApiConfig()` 读取配置文件。import 这个模块的那一刻就执行了配置读取和 API 客户端实例化。如果配置文件有问题（格式错误、不存在），不是在调用 API 时报错，而是在 import 阶段就崩溃——整个程序都起不来。

**v2 方案**：一套 API 客户端，统一的错误处理（throw 异常，由顶层 catch 统一处理），惰性实例化（第一次调用时才创建），通过依赖注入传入配置。

---

## 六、状态管理：global 变量传递运行时状态

### 问题本质

v1 的 dev 命令通过 `global.xxx` 在多个文件之间传递运行时参数。

### 为什么不改不行

**无法并行运行**：全局变量在进程生命周期内一直存在。如果同时开两个 dev 服务器（不同项目不同端口），`global.port`、`global.entry` 等变量会互相覆盖，第二个实例的配置把第一个的冲掉。这在设计上就不支持多实例。

**热重载状态污染**：dev 服务器热重载后，全局变量里残留上一次的值。新的配置可能和旧的混在一起，产生难以调试的问题。

**没有类型安全**：`global.xxx` 在 TypeScript 里没有类型定义，每个使用处都要加 `@ts-ignore` 才能编译通过。这意味着配置参数的类型完全不受保护——`global.port` 可能是 number、string、undefined，编译器不检查，运行时才发现。

**为什么不用全局变量传递**：这是一个 90 年代的设计模式。现代 Node.js 有依赖注入、上下文对象、闭包等多种方式传递运行时状态。dev 命令的配置应该作为一个上下文对象传给需要它的函数，而不是挂在 `global` 上让所有人随意读写。

**v2 方案**：dev 命令的配置作为一个 `DevContext` 对象传递给各个子模块，不使用任何全局变量。

---

## 七、错误处理：没有统一的错误处理策略

### 问题本质

v1 有 25 处 `process.exit()` 散布在工具函数、配置读取、用户交互、dev 命令等各个角落。每次遇到错误，都是直接杀进程。

### 为什么不改不行

**不可测试**：`process.exit()` 会直接终止测试进程。任何测试用例走到 `process.exit()` 的路径都会让整个测试套件挂掉。这是 v1 测试体系崩溃的根本原因之一——不是不想测，是测不了。

**无法优雅关闭**：`process.exit()` 不会触发 `beforeExit` 事件，不会执行 `finally` 块，不会 flush 日志缓冲。如果错误发生在写文件的中途，文件可能处于半写状态。dev 服务器的子进程可能不会被正确 kill，变成僵尸进程。

**调用方无法恢复**：一个工具函数遇到错误直接 `process.exit(1)`，调用方连 try-catch 的机会都没有。比如 `readConfigFile` 解析失败就杀进程，调用方不能提供"配置文件损坏，是否使用默认配置？"的降级方案。

**错误信息远离问题根源**：API 客户端在构造时读取凭据，没登录时不是在"检查登录"环节报错，而是在底层 API 调用时报 "InvalidAccessKeyId"。用户看到的是一个底层 OpenAPI 错误，而不是"请先运行 esa login"。

**v2 方案**：统一错误处理——所有错误 throw 异常，在 CLI 入口层统一 catch，输出用户友好的错误信息后 `process.exit(1)`。工具函数不调用 `process.exit`。登录状态在命令执行前显式检查。

---

## 八、测试体系：架构设计导致不可测试

### 问题本质

v1 的测试体系不是一个"测试写得不好"的问题，而是"代码架构导致无法写出有效的测试"。前面七个设计问题最终都汇聚到了这里。

### 为什么不改不行

**模块副作用导致必须全 mock**：因为 fileUtils 在 import 时就执行文件系统遍历，api.ts 在 import 时就实例化 API 客户端，logger 在 import 时就创建文件写入流——任何被测模块的 import 链都会触发副作用。唯一的办法是在 `setupTest.ts` 里把所有有副作用的模块全部 mock 掉。结果是 440 行的 setup 文件，437 行都是 mock。测试验证的是 mock 的行为，不是真实代码的行为。

**yargs 耦合导致 handler 无法独立测试**：每个命令的 handler 函数签名是 `async (argv: ArgumentsCamelCase) => {}`，测试时必须构造 yargs 特有的参数对象（`_`、`$0` 等内部字段）。handler 内部还可能访问 yargs 实例（dev 命令的 `yargsIns.showHelp()`）。脱离 yargs 框架就无法调用 handler，命令逻辑和框架实现深度耦合。

**测试套件无法运行**：由于 node_modules 使用了 cnpm/tnpm 的符号链接格式，rollup 的 platform-specific binary（optional dependencies）无法正确解析。`npx vitest run` 直接报 `Cannot find module @rollup/rollup-darwin-arm64`。整个测试套件在当前环境下根本无法启动。CI 配置里写了 `npm test` 但从来没真正跑通过。

**mock 数据与真实 API 不一致**：两套 API 客户端有两套 mock，返回的字段大小写完全不同。`api.ts` 的 mock 用 camelCase，`apiService.ts` 的 mock 用 PascalCase。阿里云 ESA OpenAPI 实际返回的是 PascalCase。依赖 `api.ts` 的测试一直在测试错误的数据结构——测试通过了，实际运行时字段名不匹配。

**v2 方案**：模块零副作用（import 不触发 I/O），命令是纯函数（接收参数对象，返回或 throw），统一一套 API 客户端（一套 mock），测试不需要 mock 基础设施层。

---

# 九、模板管理：运行时 npm install 导致 init 命令不可靠

### 问题本质

v1 的 `esa init` 每次执行时，都会在 CLI 安装目录下运行 `npm list esa-template` + `npm view esa-template version` 检查模板版本，如果不一致就删掉 `node_modules/esa-template` 和 `package-lock.json`，然后重新 `npm install esa-template@latest`。模板文件从 `node_modules/esa-template/src/` 目录读取。

### 为什么不改不行

**全局安装直接崩溃**：如果用户通过 `npm install -g esa-cli` 安装，`__dirname` 指向全局 `node_modules` 目录。此时执行 `npm install esa-template@latest` 需要 sudo/root 写权限，直接失败。这是 v1 一直存在的 bug，从未修复。

**删 `package-lock.json` 是破坏性操作**：为了更新一个依赖，却删掉了整个 lock 文件，npm 会重新解析所有依赖的版本。可能引入其他包的 breaking change，还耗时很长。

**每次 `esa init` 都做网络请求**：`npm list` + `npm view` 两次网络调用，就算用户只想用 framework 模式（不需要 esa-template），也必须等这个检查跑完。国内网络环境下可能要好几秒甚至超时。

**esbuild 打包后路径断裂**：v2 用 esbuild 打包成单文件 `dist/index.js`，`__dirname` 指向 dist 目录。而 `getTemplateHubPath` 找的是 `../../../node_modules/esa-template/src`，从 dist 目录出发这个路径对不上。

**模板和 CLI 强耦合但版本独立**：模板版本被绑定在 CLI 安装目录的 `node_modules` 里，用户无法使用项目本地模板、指定模板版本、或离线使用。

### v2 方案：内嵌模板

将 esa-template 包中的 `manifest.json` 及全部模板静态文件（hello_world、cache_api 等，总共 63.7 kB / 53 个文件）内嵌至 CLI 源码的 `src/commands/init/templates/` 目录下。esbuild 打包时自动 inline 进 bundle。

**彻底消除网络依赖**：`esa init` 不再需要任何网络请求就能列出模板、复制模板。用户体验从"等待 npm install + 可能失败"变成"瞬间完成"。

**模板版本与 CLI 版本强绑定**：更新模板需要升 CLI 的 devDependencies 并发新版 CLI。代价是模板更新滞后于 CLI 发版节奏。但 esa-template 半年才 10 个版本（平均每月不到 2 次），更新频率极低，且模板内容是纯静态文件，不涉及 API 变更。CLI 本身也在持续发版，顺带升 devDependencies 版本号几乎零成本。

---

## 问题汇总

| 设计问题                   | 核心原因                           | 为什么修补解决不了                                                       |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| 终端 IO 四套库混用         | 没有统一的 stdio 策略              | 四个库各自管理终端画布，无法协调。必须统一到一套框架                     |
| yargs 框架限制             | 全局选项渗透、builder/handler 耦合 | 这是 yargs 的架构设计，不是配置问题，框架层面无法绕过                    |
| enter.cjs spawn 模式       | 历史遗留的进程管理                 | Node 16+ 原生支持 ESM，spawn 纯粹多余                                    |
| 配置系统模块级副作用       | 导入即执行 I/O                     | ESM 模块顶层代码确定执行，不改设计就必须 mock 全部依赖                   |
| API 客户端双轨制           | 两套独立封装                       | 行为完全不同（throw vs null），不是统一接口能合并的                      |
| global 变量传状态          | 90 年代设计模式                    | 全局变量无法隔离、无法类型检查、无法并行，必须改成上下文传递             |
| process.exit 散布          | 没有统一错误处理策略               | 每处都是"遇到错误就杀进程"的设计决策，必须改为 throw 异常                |
| 测试体系崩溃               | 前七个问题的汇聚                   | 架构设计导致不可测试，不是测试代码本身的问题                             |
| 模板管理运行时 npm install | 模板包与 CLI 安装目录强耦合        | 全局安装无写权限、删 lock 文件破坏性、每次 init 做网络请求，必须改为内嵌 |

---

## 结论

以上九个问题都不是"某行代码写错了"，而是**设计层面的决策失误**。每一个都指向一个错误的架构选择：四套 UI 库、yargs 全局选项渗透、spawn 子进程、模块级 I/O、双轨 API 客户端、全局变量传状态、散布的 process.exit、不可测试的架构、运行时 npm install 模板管理。

这些问题互相交织：模块级 I/O 导致必须全 mock，全 mock 导致测试无效；yargs 耦合导致 handler 不可测试；双轨 API 客户端导致两套 mock 数据不一致；process.exit 导致测试进程被杀。修任何一个单独的问题都无法解决整体——比如不解决模块级副作用，就算换了 CLI 框架，测试还是得 mock 一切。

这就是为什么需要整体重构而不是局部修补。v2 的每个设计决策都是针对 v1 的对应问题：Ink 统一 IO、CAC 替代 yargs、直接 ESM 执行、惰性配置加载、单一 API 客户端、上下文对象替代全局变量、统一异常处理、零副作用模块、内嵌模板替代运行时 npm install。
