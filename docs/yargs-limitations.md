# ESA CLI v1 中 yargs 的使用限制与反模式

本文记录 v1 代码库中所有被 yargs 框架限制而不得不采取的变通写法，以及偏离 yargs 推荐用法的代码模式。每一条都附带了具体代码和根因分析。

---

## 1. 模块级变量保存 yargs 实例（5 处）

### 问题

yargs 的 `CommandModule` 中，builder 负责声明选项，handler 负责执行逻辑，两者不共享 yargs 实例。但 v1 有 5 个父命令（容器命令）需要把 yargs 实例存到模块级变量里，handler 再取出来调用 `showHelp()`：

```typescript
// src/commands/site/index.ts
let yargsIns: Argv;                    // 模块级变量

const siteCommand: CommandModule<{}> = {
  command: 'site [script]',
  builder: (yargs) => {
    yargsIns = yargs;                  // builder 里存
    return yargs
      .command(siteList)
      .option('help', { ... });
  },
  handler: (argv) => {
    if (yargsIns && (argv.help || argv._.length < 2)) {
      yargsIns.showHelp('log');        // handler 里用
    }
  }
};
```

完全相同的模式出现在：

- `src/commands/site/index.ts`
- `src/commands/route/index.ts`
- `src/commands/routine/index.ts`（project 命令）
- `src/commands/deployments/index.ts`
- `src/commands/domain/index.ts`

以及 dev 命令中更严重的一处：

```typescript
// src/commands/dev/index.ts
let yargsIns: Argv;

const dev: CommandModule = {
  builder: (yargs: Argv) => {
    yargsIns = yargs                   // 存 yargs 实例
      .positional('entry', { ... })
      .option('p', { ... });
    return yargsIns;
  },
  handler: async (argv: ArgumentsCamelCase) => {
    if (yargsIns && help) {
      yargsIns.showHelp('log');        // handler 里调 showHelp
      process.exit(0);
    }
    // ...
  }
};
```

### 根因

yargs 的 `CommandModule` handler 只接收 `argv`（解析后的参数对象），不接收 yargs 实例本身。如果 handler 需要调用 `yargs.showHelp()`——比如用户没给子命令时显示帮助——就只能把 yargs 实例从 builder 里"偷"出来存到外部变量。

### yargs 的推荐做法

用 `.demandCommand(1)` 让 yargs 在缺少子命令时自动报错。但 v1 需要显示国际化的自定义帮助文案（`t('common_usage')`），`demandCommand` 的报错信息无法国际化，所以不能直接用。

---

## 2. 手动实现 `--help` 而不是用 yargs 内置的

### 问题

yargs 有内置的 `--help` 处理：调用 `.help()` 后，yargs 自动在 `--help` 时显示帮助并退出。但 v1 在根入口和每个子命令里都手动加了 `--help` 选项：

根入口：

```typescript
// src/index.ts
const esa = yargs(argv)
  .help() // 全局已开启 --help
  .options('help', {
    // 又手动加一个全局 --help
    describe: t('main_help_describe').d('Show help'),
    alias: 'h'
  });
```

每个子命令重复一遍：

```typescript
// src/commands/site/index.ts
return yargs
  .command(siteList)
  .option('help', {
    // 手动加 --help
    alias: 'h',
    describe: t('common_help').d('Help'),
    type: 'boolean',
    default: false
  })
  .usage(`${t('common_usage').d('Usage')}: esa-cli site [list]`);
```

然后在 handler 里手动判断并调用 showHelp：

```typescript
handler: (argv) => {
  if (yargsIns && (argv.help || argv._.length < 2)) {
    yargsIns.showHelp('log');
  }
};
```

### 根因

全局 `.help()` 已经处理了 `--help`，但全局选项会渗透到子命令。运行 `esa site --help` 时，触发的是全局 help 而不是 site 命令的 help——全局 help 会列出所有命令，而不是只显示 site 相关的内容。v1 不得不在每个子命令里重新声明 `--help` 选项来覆盖全局行为，然后在 handler 里手动调用 `yargsIns.showHelp()` 显示当前命令的帮助。

这是 yargs 全局选项渗透问题的直接体现：全局选项通过原型链继承到所有子命令，无法在框架层面关闭。

---

## 3. 用 `argv._.length < 2` 判断是否有子命令

### 问题

5 个父命令的 handler 都用这个方式判断用户是否提供了子命令：

```typescript
// 所有 5 个父命令的 handler
handler: (argv) => {
  if (yargsIns && (argv.help || argv._.length < 2)) {
    yargsIns.showHelp('log');
  }
};
```

`argv._` 是 yargs 的位置参数数组。`esa site list` 时 `argv._` 是 `['site', 'list']`，长度 2；`esa site` 时是 `['site']`，长度 1。

### 根因

yargs 推荐用 `.demandCommand(1, 'You need at least one command')` 让 yargs 自动在缺少子命令时报错。但 v1 需要显示自定义帮助文案而不是报错，所以用了手动判断。

`argv._.length < 2` 是一个 magic number——为什么是 2 不是 1？因为父命令本身占 `argv._[0]`。这个逻辑隐含了 yargs 的内部实现：位置参数数组的第一个元素是命令路径。如果 yargs 未来改变这个行为，代码就会断。

---

## 4. `ArgumentsCamelCase` 无泛型，手动类型断言满天飞

### 问题

handler 签名是 `ArgumentsCamelCase`，但所有自定义参数都需要手动类型断言：

```typescript
// src/commands/deploy/index.ts
handler: async (argv: ArgumentsCamelCase) => {
  const entry = argv.entry as string;
  const assets = (argv.assets as string) ?? undefined;
  const versionsArg = (argv.versions as unknown as string[] | undefined) || [];
  const env = (argv.environment as 'staging' | 'production' | 'all') || 'all';
  // ...
};
```

```typescript
// src/commands/login/index.ts
const accessKeyId = argv?.['access-key-id'] as string;
const accessKeySecret = argv?.['access-key-secret'] as string;
```

所有命令的 `CommandModule` 都用了默认类型（无泛型参数）：

```typescript
const deploy: CommandModule = { ... }     // 没有泛型
const login: CommandModule = { ... }       // 没有泛型
const init: CommandModule = { ... }        // 没有泛型
```

### 根因

yargs 支持 `CommandModule<Args>` 泛型来给 argv 加类型：

```typescript
// yargs 推荐的写法
interface DeployArgs {
  entry?: string;
  environment?: 'staging' | 'production';
  minify?: boolean;
}

const deploy: CommandModule<{}, DeployArgs> = {
  // handler 里 argv 就是 DeployArgs 类型，不需要 as
};
```

v1 全部用了默认的 `CommandModule`（无泛型参数），等于放弃了类型安全。所有自定义字段在 handler 里都是 `unknown`，必须手动断言。kebab-case 的选项名（如 `access-key-id`）在 camelCase 的 `argv` 对象上需要用方括号语法 `argv['access-key-id']` 访问，进一步降低了可读性。

---

## 5. `fail()` 处理器里 `process.exit(1)`

### 问题

```typescript
// src/commands/route/delete.ts
builder: (yargs: Argv) => {
  return yargs
    .positional('routeName', { demandOption: true })
    .fail((msg, err, yargsIns) => {
      console.log(msg, err);
      if (err) throw err;
      if (msg) {
        yargsIns.showHelp('log');
      }
      process.exit(1);           // 在 builder 的 fail 回调里杀进程
    });
},
```

根入口也有 `.fail()` 但行为完全不同——吞掉错误不退出：

```typescript
// src/index.ts
const esa = yargs(argv).fail((msg, err) => {
  console.error(msg, err);
  // 没有 throw，没有 exit，错误被吞了
});
```

### 根因

两处 `.fail()` 行为不一致。yargs 的推荐用法是：`.fail()` 做自定义错误格式化后 throw，让 yargs 顶层 catch 处理退出。或者完全不定义 `.fail()`，yargs 默认会打印错误并 exit(1)。v1 的 `route/delete.ts` 在 fail 回调里直接 `process.exit(1)`，绕过了 yargs 的生命周期。根入口的 `.fail()` 吞了错误——如果 yargs 在解析阶段报错，用户看不到任何提示，程序静默退出。

---

## 6. `command: 'site [script]'` 用位置参数当子命令

### 问题

5 个父命令都用了 `[script]` 位置参数：

```typescript
// src/commands/site/index.ts
command: 'site [script]';

// src/commands/route/index.ts
command: 'route [script]';

// src/commands/domain/index.ts
command: 'domain [script]';

// src/commands/deployments/index.ts
command: 'deployments [script]';

// src/commands/routine/index.ts
command: 'project [script]';
```

同时在 builder 里用 `.command(siteList)` 注册真正的子命令。

### 根因

yargs 区分位置参数和子命令：`site list` 中 `list` 如果是 `.command('list')` 注册的，就是子命令；如果是 `[script]` 声明的位置参数，就是 `argv.script` 的值。v1 同时用了两种方式——`[script]` 声明位置参数 + `.command(siteList)` 注册子命令。yargs 会优先匹配子命令，匹配不到就把值放到 `argv.script`。

这是 yargs 不推荐的写法。"既是子命令名又是位置参数"会导致 `argv._` 和 `argv.script` 可能同时有值，行为不确定。handler 里用 `argv._.length < 2` 判断（见第 3 条），说明开发者知道 `[script]` 不可靠。

yargs 的推荐做法：纯容器命令用 `command: 'site'`（不带位置参数），靠 `.demandCommand(1)` 强制子命令。

---

## 7. handler 里手动 `exit()` / `process.exit()`

### 问题

```typescript
// src/commands/deploy/index.ts
handler: async (argv: ArgumentsCamelCase) => {
  await handleDeploy(argv);
  exit(); // 直接 exit()
};

// src/commands/init/index.ts
handler: async (argv: ArgumentsCamelCase) => {
  await handleInit(argv);
  exit(0); // exit(0)
};

// src/commands/dev/index.ts
handler: async (argv: ArgumentsCamelCase) => {
  if (yargsIns && help) {
    yargsIns.showHelp('log');
    process.exit(0); // process.exit(0)
  }
  // ...
  process.exit(1); // process.exit(1)
};
```

### 根因

yargs 的推荐做法：handler 返回 Promise，成功就 return，失败就 throw Error。yargs 会在顶层统一处理退出码。v1 的手动 `exit()` 绕过了 yargs 的生命周期，导致 yargs 的 `.fail()` 回调不会被触发，`.finally()` 钩子也不会执行。

dev 命令里的 `process.exit(0)` 更特殊——它是在 handler 内部检查到 `--help` 时手动退出。正常情况下 yargs 应该在解析阶段就处理 `--help`，不会进入 handler。但因为 v1 手动声明了 `--help` 选项（见第 2 条），yargs 把它当作普通布尔选项传给了 handler，handler 不得不自己处理。

---

## 8. `aliases: ['Functions & Pages']` 给命令加别名

### 问题

```typescript
// src/commands/routine/index.ts
const routineCommand: CommandModule<{}> = {
  command: 'project [script]',
  aliases: ['Functions & Pages'],
```

### 根因

`Functions & Pages` 是一个带空格和 `&` 的字符串。yargs 的 alias 是用于命令行输入的别名，`esa "Functions & Pages" list` 这种输入方式在实际中没人会用。这更像是给 help 输出加描述，但 yargs 的 `describe` 字段才是做这个的。alias 出现在 help 里会让用户困惑——这到底是个命令还是描述？

---

## 9. middleware 里用 `argv._[0]` 做版本检查

### 问题

```typescript
// src/index.ts
.middleware(async (argv) => {
  // ...
  await checkCLIVersion(
    (argv._ && argv._[0] ? String(argv._[0]) : '') as string
  );
})
```

### 根因

yargs 的 middleware 在命令解析之前执行，此时 yargs 还不知道最终匹配到哪个命令。`argv._` 只有位置参数，不包含完整的子命令路径。如果用户输入 `esa deploy`，middleware 里 `argv._[0]` 可能是 `'deploy'` 也可能是空的——取决于 yargs 的解析阶段。v1 用这个值判断"当前在跑哪个命令"来决定是否提示版本更新，但这个判断在 middleware 里是不可靠的。

---

## 10. `.strict()` 与子命令选项的隐含冲突

### 问题

```typescript
// src/index.ts
const esa = yargs(argv).strict(); // 未知选项报错
```

### 根因

`.strict()` 意味着用户传了未声明的选项会报错。但 v1 的父命令用 `[script]` 接收子命令名，子命令自己的选项不会在父命令 builder 里声明。如果用户传 `esa site list --keyword foo`，yargs 需要逐级解析——先匹配 `site`，再匹配 `list`，`--keyword` 是 `list` 的选项。`strict()` 在某些边界情况下会误报"未知选项"，因为父命令的 builder 里没有 `--keyword`。

v1 的做法是父命令 builder 里 `.command(siteList)` 注册子命令，让 yargs 知道 `list` 是子命令。但如果子命令注册的顺序和用户输入不匹配，`strict()` 可能误触发。

---

## 汇总

| 问题                           | 出现次数 | 性质                                            |
| ------------------------------ | -------- | ----------------------------------------------- |
| 模块级变量存 yargs 实例        | 5 处     | yargs API 缺口，handler 无法获取 yargs 实例     |
| 手动 `--help` 选项             | 6 处     | 全局选项渗透导致，必须重写子命令的 help         |
| `argv._.length < 2` 判断子命令 | 5 处     | yargs 推荐用 `demandCommand`，但文案需自定义    |
| `ArgumentsCamelCase` 无泛型    | 全部命令 | yargs 支持 `CommandModule<{}, Args>` 泛型但没用 |
| `as` 类型断言满天飞            | 全部命令 | 上一条的后果                                    |
| `fail()` 里 `process.exit`     | 1 处     | yargs 推荐 throw                                |
| handler 里手动 `exit()`        | 3 处     | yargs 推荐 return/throw                         |
| `[script]` 位置参数当子命令    | 5 处     | yargs 不推荐混用位置参数和子命令                |
| middleware 里用 `argv._[0]`    | 1 处     | yargs middleware 在解析前执行，不可靠           |
| `.strict()` 与子命令冲突       | 1 处     | 父命令声明 strict 但子命令选项不在父 builder    |

这些问题的根源是两个：**全局选项渗透**（yargs 架构限制）和 **handler 无法获取 yargs 实例**（yargs API 缺口）。其余都是这两个问题衍生出来的 workaround。
