# 贡献指南

欢迎为 ESA CLI 提交缺陷修复、功能改进、测试和文档。本文说明从 fork 仓库到提交 Pull Request（PR）的完整流程。项目代码采用 [MIT 许可证](./LICENSE)。

拥有上游仓库写入权限的开发者，请参阅[开发与发布指南](./doc/DEVELOPMENT_AND_RELEASE.md)。本文说明仓库采用的流程；强制审查和环境审批是否生效，须由管理员按[配置手册](./doc/GITHUB_SETUP_AND_RELEASE.md)完成远端验收。

## 开始之前

先查看已有的 [Issues](https://github.com/aliyun/alibabacloud-esa-cli/issues) 和 [Pull requests](https://github.com/aliyun/alibabacloud-esa-cli/pulls)，确认是否已经有人处理同一问题。小范围修复可以直接提交 PR；涉及新命令、接口兼容性或较大重构时，建议先开 Issue 讨论用途和方案。

报告缺陷时，请提供：

- ESA CLI、Node.js、操作系统及包管理器版本。
- 可复现问题的命令、配置片段或最小示例。
- 预期行为和实际结果。
- 必要的错误输出，并删除 AccessKey、SecurityToken 等凭据及私人信息。

提交 Issue 或 PR 不需要提供云账号凭据。普通 PR 的自动测试使用模拟 API，真实云端验证由维护者在发布阶段执行。

## 1. Fork 并获取代码

在 [GitHub 仓库](https://github.com/aliyun/alibabacloud-esa-cli) 页面点击 **Fork**，创建自己的副本。将以下地址中的 `YOUR_GITHUB_USERNAME` 替换为自己的 GitHub 用户名：

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/alibabacloud-esa-cli.git
cd alibabacloud-esa-cli
git remote add upstream https://github.com/aliyun/alibabacloud-esa-cli.git
git fetch upstream
git switch -c fix/login-validation upstream/master
```

这里 `origin` 指向你的 fork，`upstream` 指向项目仓库。后续将代码推送到 `origin`，普通 PR 的目标选择 `upstream` 仓库的 `master` 分支。

项目保持单一版本线。master 进入 beta 后只合入本轮问题修复，下一版本的新功能继续留在 feature 分支；维护者可能等当前正式版完成后再合并功能 PR。紧急热修由维护者从正式 tag 创建受保护 release 分支，第三方贡献者无需自行创建发布分支。

## 2. 安装依赖并运行 CLI

建议使用 Node.js 24 和 npm 开发。当前包声明支持 Node.js 18 及以上，CI 检查 Node.js 18、20、22、24；修改代码时需要保持这些版本上的兼容性。

在仓库根目录运行：

```bash
npm ci
npm run build
node bin/enter.cjs --version
node bin/enter.cjs --help --skip-update-check
```

本地验证修改时使用 `node bin/enter.cjs`，它运行当前仓库的构建产物。安装到系统中的 `esa` 或通过 `npx esa-cli` 获取的版本，可能不是正在修改的代码。

`npm run dev` 可监听 TypeScript 编译。修改词条、模板或运行时资源后，重新执行 `npm run build`，以更新完整产物。

## 3. 修改代码

| 位置                            | 内容                           |
| ------------------------------- | ------------------------------ |
| `src/index.ts`、`src/commands/` | CLI 入口和命令实现             |
| `src/libs/`、`src/utils/`       | API 调用、配置、构建及共享工具 |
| `src/i18n/`                     | 中英文文案                     |
| `tests/`                        | 单元、契约、端到端及集成测试   |
| `docs/`                         | 用户命令和配置文档             |
| `doc/`                          | 项目结构、开发和发布文档       |

需要了解调用关系时，参阅[项目地图](./doc/PROJECT_MAP.md)。

沿用附近代码的组织方式和命名。修复缺陷时，维护现有测试并说明验证方式；修改命令选项、默认值、输出或退出码时，同时检查对应测试和用户文档。临时验证脚本及辅助代码验证后删除，未经明确允许不要作为项目文件保留。新增文案应使用现有国际化方式，并补齐中英文词条。

一个 PR 尽量只处理一个问题。依赖变更需要同时更新 `package.json` 和 `package-lock.json`，不要提交私有 registry 地址、凭据、构建产物或测试报告。普通贡献无需修改包版本或创建发布标签，版本发布由维护者统一处理。

## 4. 运行检查

提交代码前，在仓库根目录依次运行：

```bash
npm run lint
npm run test:ci
npm run test:release-tools
npm run build
npm run test:compat:v1
npm run test:e2e
```

单元测试检查实现逻辑和覆盖率，发布工具测试检查发布脚本，契约测试检查 CLI 对外行为，离线 E2E 检查真实进程中的交互流程。后两项需要先构建 CLI。以上检查均不要求 ESA 凭据。

开发过程中，可以先运行相关用例，例如：

```bash
npx vitest run tests/commands/login.test.ts
```

`npm test` 用于交互式运行单元测试，不能代替完整检查。只修改 Markdown 文档时，本地检查格式、链接和示例即可；PR 上的完整 CI 仍需通过。

本地无法验证某项行为时，在 PR 中说明已验证的范围和未验证的原因，便于维护者补充检查。不要将跳过的测试写成已通过。

## 5. 提交 Pull Request

检查 `git diff`，只提交本次修改。提交标题保持简短，说明具体改动；可以沿用仓库现有格式，例如 `fix: validate empty login credentials`。

推送当前分支：

```bash
git push -u origin fix/login-validation
```

在 GitHub 创建 PR，确认：

- 目标仓库：`aliyun/alibabacloud-esa-cli`。
- 目标分支：`master`。
- 来源：你的 fork 和本次开发分支。

PR 说明应写清解决的问题、修改后的行为和验证结果。有相关 Issue 时附上链接；涉及兼容性变化时说明受影响的用法。终端交互或输出发生变化时，可附上修改前后的输出。

尚未准备好合并的工作可以先提交为 Draft PR，说明还未完成的部分。

## 6. 自动检查与审查

创建或更新 PR 后，上游仓库会运行 CI。首次贡献或其他符合仓库审批策略的 fork PR，可能需要维护者先批准工作流运行；页面显示等待批准时，不需要提供凭据或反复提交代码。

项目以 **`CI Gate`** 汇总必需检查，覆盖系统与 Node.js 矩阵、安装验证、契约测试和离线 E2E。维护者团队至少两人，合并要求 CI 成功，并获得作者之外至少一名维护者批准；新提交会使旧审批失效，审查讨论须处理完成。若检查失败，打开失败 job 的日志，修复后推送到同一个分支，PR 会自动更新。

如果审查期间 `master` 更新，在当前贡献分支中同步上游：

```bash
git fetch upstream
git switch fix/login-validation
git merge upstream/master
```

解决冲突，重新运行受影响的检查，再执行 `git push`。新提交可能需要再次审查。讨论中说明修复方式或保留原实现的理由，方便审查人继续确认。

PR 合并后，维护者安排后续版本发布。beta 只发布已合入 master 且通过 CI 的代码；常规正式版从已发布 beta 晋级，紧急热修从当前正式版 tag 起步。三类发布都由 Actions 手动发起，完整 CI、最终包安装、真实 ESA staging 测试和两个非自审 Environment 审批缺一不可。

合并到 `master` 不代表已发布到 npm。beta 使用 `beta` 通道，正式版和热修使用 `latest`；发布记录见 [GitHub Releases](https://github.com/aliyun/alibabacloud-esa-cli/releases)。贡献者不需要提供真实凭据或执行发布操作。发布失败和遗留草稿的核对、处理及重试由维护者按[开发与发布指南](./doc/DEVELOPMENT_AND_RELEASE.md)执行，不能覆盖已发布版本或移动发布 tag。
