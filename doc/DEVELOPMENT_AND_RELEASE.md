# ESA CLI 开发与发布指南

本文面向有仓库写入权限的开发者和发布维护者，说明日常 PR、beta、正式版和热修流程。外部贡献者请参阅[贡献指南](../CONTRIBUTING.md)，管理员配置与上线验收见 [GitHub 配置手册](./GITHUB_SETUP_AND_RELEASE.md)。

仓库中的 workflow 和脚本实现发布约束；分支规则、两个人工审批环境、真实 ESA staging 环境和 npm OIDC 授权仍需在远端配置并验收。本地检查通过不代表这些远端条件已生效。当前阶段只实现和验证仓库内容，不需要为本地开发提供账号或密钥。

## 1. 版本线、分支与职责

项目保持一条版本线。普通版本先发布 beta，再从已验证的 beta 晋级为 stable；紧急热修从当前正式版 tag 单独开始。

| 分支                                       | 用途                                                           | 来源与合并要求                                                              |
| ------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `master`                                   | 当前一轮版本的已审查代码                                       | 通过 PR、`CI Gate` 和维护者审查后合并；是 beta 和普通 stable 的来源         |
| 开发分支，例如 `feat/login-validation`     | 功能、修复、测试及文档                                         | 从 `master` 创建，向 `master` 提交 PR                                       |
| 版本准备分支，例如 `prepare/1.0.14-beta.1` | 版本和发布说明变更                                             | 向 `master` 提交 PR                                                         |
| `release/<完整版本>`                       | 固定一个发布候选，如 `release/1.0.14-beta.1`、`release/1.0.14` | 分支名、包版本和 Actions 输入一致；beta/stable 候选提交已包含在 `master` 中 |
| 热修工作分支，例如 `hotfix/1.0.15`         | 从正式 tag 修复紧急问题                                        | 向从该 tag 创建的受保护 `release/1.0.15` 提交 PR，发布后将修复合回 `master` |

master 进入 beta 后只合入本轮问题的修复。下一版本的新功能继续留在 feature 分支，当前正式版发布完成后再合入，避免将下一版功能混入待发布版本。

维护者团队至少有两人。PR 作者之外至少一名维护者审查，作者不能批准自己的 PR；两个发布 Environment 均配置防止自审。拥有代码写入权限不等于有权批准发布，具体授权由管理员配置。

## 2. 搭建开发环境

建议使用 Node.js 24 和 npm。包声明支持 Node.js 18 及以上；CI 检查 Node.js 18、20、22、24 在 Linux、macOS 和 Windows 上的构建与测试。

```bash
git clone git@github.com:aliyun/alibabacloud-esa-cli.git
cd alibabacloud-esa-cli
npm ci
npm run build
node bin/enter.cjs --version
node bin/enter.cjs --help --skip-update-check
```

日常使用 `npm ci` 按锁文件安装；调整依赖时才使用 `npm install`，并同时提交依赖声明和锁文件。本地运行 `node bin/enter.cjs`，确保执行当前仓库的构建产物。`npm run dev` 只监听 TypeScript 编译；首次运行或修改词条、模板和运行时资源后，重新执行 `npm run build`。

源码职责见[项目地图](./PROJECT_MAP.md)。业务实现位于 `src/`，用户文档位于 `docs/`，开发与发布文档位于 `doc/`。

## 3. 日常开发与 PR

工作区没有未处理改动时，从最新 master 创建分支：

```bash
git switch master
git pull --ff-only origin master
git switch -c feat/login-validation
```

一个 PR 解决一个问题。修改命令、选项、默认值、退出码或交互行为时，同步检查契约测试和用户文档；文案沿用现有国际化方式。依赖变更提交 `package.json` 和 `package-lock.json`，不提交私有 registry、凭据、`dist/`、`build/`、测试报告或临时发布包。临时验证脚本和辅助代码验证后删除，未经明确允许不要保留。

提交前执行：

```bash
npm run lint
npm run test:ci
npm run test:release-tools
npm run build
npm run test:compat:v1
npm run test:e2e
```

| 命令                         | 检查内容                                  |
| ---------------------------- | ----------------------------------------- |
| `npm run lint`               | 源码 ESLint                               |
| `npm run test:ci`            | 单元测试与覆盖率，执行后退出              |
| `npm run test:release-tools` | 发布工具的候选、版本、产物与失败处理约束  |
| `npm run build`              | 生成词条、编译 TypeScript、复制运行时资源 |
| `npm run test:compat:v1`     | 已构建 CLI 的命令、参数、帮助及配置契约   |
| `npm run test:e2e`           | 本地 API 下的登录、env/secret、交互与编辑器流程 |

CI 的单元测试保持 Linux/macOS/Windows × Node.js 18/20/22/24，每组至少执行 353 项且不允许跳过；契约测试固定 Ubuntu + Node.js 24，至少 264 项。离线 E2E 在 `ubuntu-latest`、`macos-latest`、`windows-latest` 的 Node.js 24 上分别执行相同 16 项测试且不允许跳过；矩阵设置 `fail-fast: false`，一个系统失败仍让其他系统完成，全部结果进入 `Behaviour Gate`。

三种系统执行相同的离线 E2E，覆盖凭据保存、登录/登出、env/secret 请求和交互等功能。它验证真实 CLI 进程到本地 API 的调用及错误处理；真实 ESA 的权限、持久化和部署效果仍由发布阶段验收。当前没有主动加固 Windows ACL，功能测试通过不代表已验证凭据文件的 Windows 访问控制。远端矩阵是否通过，以对应提交的 Actions 结果为准。

上述检查不需要真实 ESA 凭据。仅修改 Markdown 时，本地检查格式、链接和示例即可，PR 仍须通过完整 CI。`npm test` 是交互式入口，不能表示整套检查已完成。缺少凭据而跳过真实集成测试，不算验证通过。

推送分支并创建目标为 `master` 的 PR，说明问题、修改后的行为、兼容性影响和实际验证结果。等待 `CI Gate` 和另一名维护者批准，处理全部审查讨论。目标分支更新时合入最新 master、处理冲突、验证并再次推送；新提交需要重新审查。合并后确认 master 提交 CI 成功。

## 4. 准备并发布 beta

以下 `1.0.14` 仅用于展示流程，操作时选择尚未使用的实际版本。beta 格式为 `X.Y.Z-beta.N`，例如 `1.0.14-beta.1`；后续修复使用 `beta.2`、`beta.3`，已发布版本不能覆盖。

### 版本准备 PR

从最新 master 创建分支：

```bash
git switch master
git pull --ff-only origin master
git switch -c prepare/1.0.14-beta.1
npm ci
npm run release:prepare -- 1.0.14-beta.1
```

脚本更新包和锁文件版本，并创建 `doc/releases/1.0.14-beta.1.md`，不会提交或创建 tag。填写用户可见变更、兼容性和迁移说明，删除 TODO，通过 PR 合并到 master。等待该 master 提交的 CI 成功，记录完整 40 位 SHA；不要使用 PR 合并前的 SHA。

从该提交创建候选分支：

```bash
git fetch origin
git switch -c release/1.0.14-beta.1 FULL_COMMIT_SHA
git push -u origin release/1.0.14-beta.1
```

beta 只能发布已合入 master 并通过 CI 的代码，不能直接发布 feature/fork 分支。进入 beta 后冻结本轮范围；发现代码问题时先通过 PR 修复 master，再准备更高 beta 序号并重新完整验证。

### 手动发布输入

打开 **Actions → Release → Run workflow**，选择 `release/1.0.14-beta.1`：

| 输入             | beta 示例                  |
| ---------------- | -------------------------- |
| `version`        | `1.0.14-beta.1`，不加 `v`  |
| `commit`         | 候选分支顶端完整 40 位 SHA |
| `release_type`   | `beta`                     |
| `source_version` | 留空                       |
| `reason`         | 留空                       |

工作流经过第 7 节的全部关卡后，发布到 npm `beta`，创建 `v1.0.14-beta.1` 和 GitHub 预发布记录。beta 不改变 `latest`。

## 5. 将 beta 晋级为正式版

常规 stable 必须来自本流程已经发布并验证的同目标版本 beta。例如 `1.0.14-beta.2` 晋级为 `1.0.14`；不能跳过 beta 直接从 master 发 stable。

1. 确定 `source_version`，填写 npm 当前 `beta` 指向的已发布完整版本，如 `1.0.14-beta.2`。工作流核对 npm 已发布包、GitHub Release、manifest 与 tag，不能以本地文件或未发布候选代替。
2. 从 master 创建 `prepare/1.0.14`，运行 `npm run release:prepare -- 1.0.14`，填写 `doc/releases/1.0.14.md`。
3. stable 相对选定 beta 只允许包与锁文件中的版本号、`CHANGELOG.md` 和本次新版本发布说明变更。源码、依赖、构建配置或其他内容改动都应先发新 beta、重新验证，不能在晋级 PR 中夹带。
4. 将版本 PR 审查后合入 master，等待 master CI 成功，再从选定完整 SHA 创建 `release/1.0.14`。
5. 手动运行同一个 **Release** workflow：选择 `release/1.0.14`；`version=1.0.14`、`commit=完整SHA`、`release_type=stable`、`source_version=1.0.14-beta.2`，`reason` 留空。

正式版会重新构建、运行完整 CI、安装最终 tarball 并完成真实 ESA staging 测试和两个环境审批；beta 已通过不免除本次验证。成功后发布到 `latest`，创建正式 tag 和 GitHub Release。

## 6. 紧急热修

热修用于当前正式版的紧急修复，不混入 master 上尚未发布的功能。`source_version` 必须是 npm 当前 `latest` 指向的正式版，且该版本有本流程生成的 GitHub Release、manifest 和准确 tag。历史手工发布的正式版缺少这些证明时，先完成一次标准 beta → stable，才能作为自动热修基线。

假设当前正式版是 `1.0.14`，热修必须是下一 patch `1.0.15`：

```bash
git fetch origin --tags
git switch -c release/1.0.15 v1.0.14
git push -u origin release/1.0.15
git switch -c hotfix/1.0.15
# 完成修复，并运行相关检查
npm run release:prepare -- 1.0.15
```

填写 `doc/releases/1.0.15.md`，将热修工作分支推送并提交 PR，**目标是受保护的 `release/1.0.15`**。由另一位维护者审查并通过 `CI Gate` 后合并，记录候选分支顶端完整 SHA。热修候选在发布前可以尚未进入 master，但必须保留从正式 tag 起步的提交历史。

手动运行 **Release**，选择 `release/1.0.15`：`version=1.0.15`、`commit=完整SHA`、`release_type=hotfix`、`source_version=1.0.14`，并在 `reason` 填写紧急原因。热修同样经过完整 CI、最终包安装、真实 ESA staging 测试和两个 Environment 审批，不能跳过检查。

发布成功后，通过 PR 将热修代码和历史合回 master，处理版本文件与发布说明的冲突。如果 master 已在准备 `1.0.15-beta.N`，该目标版本已被热修占用：将这轮 beta 改为 `1.0.16-beta.1` 并重新完整测试，不把旧 beta 晋级到已发布的 `1.0.15`。项目不维护并行旧版本线。

## 7. 三种发布共用的关卡

管理员完成远端设置并启用 `RELEASE_ENABLED=true` 后，beta、stable 和 hotfix 都只能通过单一 `release.yml` 手动启动。普通 push、PR 或创建 tag 不发布 npm 包。同一时间只安排一个发布，workflow 的仓库级并发组也会串行执行。

| 阶段              | 自动执行内容                                                                              | 人工核对                     |
| ----------------- | ----------------------------------------------------------------------------------------- | ---------------------------- |
| 候选与来源校验    | 仓库、分支、完整 SHA、版本、说明、发布类型；stable/hotfix 验证已发布来源及允许差异        | 版本、来源、热修原因正确     |
| 完整 CI           | 系统/Node 矩阵、安装、单元、契约和离线 E2E                                                | 失败时修复原因               |
| 最终包验证        | 构建 tarball，在干净临时目录安装并检查 CLI                                                | 检查产物身份                 |
| `esa-integration` | 批准后，用已安装的同一 tarball 执行真实 ESA API、staging 部署与 HTTP 响应测试，并清理资源 | 由其他维护者核对候选后批准   |
| `npm-release`     | 批准后 OIDC 发布同一 tarball，创建准确 tag 和 GitHub Release                              | 确认真实测试和清理成功后批准 |

候选校验和发布任务先执行 `npm ci --omit=dev --ignore-scripts`，安装发布工具所需的运行时依赖（包括 SemVer 校验）；CI 汇总门禁只使用 Node.js 内建模块，不依赖这一步安装。

manifest 将本次版本、SHA、tarball 完整性与发布类型绑定；stable/hotfix 还绑定 `sourceVersion`、`sourceSha`、`sourceIntegrity`。发布阶段不重新构建源码。缺少配置、测试跳过、断言失败或资源清理失败都会阻断发布。

发布后核对 npm 版本及对应 dist-tag、Git tag 的 SHA、GitHub Release 的说明/tarball/manifest，并安装确切版本检查两个 CLI 入口。CLI 更新检查保留安装通道：beta 用户查询 `beta`，正式版用户查询 `latest`，只在发现更高 SemVer 时提示。

## 8. 失败、重试与停止

| 情况                                        | 处理方式                                                                                      |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| CI、版本、来源或允许差异校验失败            | 修复 PR；代码或依赖变动先重新 beta，不能删断言或绕过门禁                                      |
| 真实 API 配置或权限缺失                     | 由管理员核对 `esa-integration`，缺少凭据不算通过                                              |
| 资源清理失败                                | 查看 `integration-report` 的 `cloud-resources.json`，仅核对并清理本次唯一资源                 |
| npm 拒绝授权                                | 核对 Trusted Publisher、`release.yml`、`npm-release` 和直接发布权限                           |
| npm 已成功、GitHub Release 失败且无遗留草稿 | 核对仍有效的原 artifact，在原运行重跑失败 job；npm integrity 一致时继续，不能替换包或移动 tag |
| GitHub 附件上传失败并遗留 draft Release     | 维护者先核对该版本、commit 与附件并处理草稿，再用原运行的同一 artifact 重跑                   |
| 同版本包内容或 tag SHA 冲突                 | 停止重试、核实来源，选择新版本；不覆盖包、不移动发布 tag                                      |
| 产物过期                                    | 先核对 npm、tag 和 Release；新构建不能冒充原产物                                              |

`gh release create` 的附件上传失败可能留下 draft。工具先按 tag 查询；返回 404 时继续分页检查 Release 列表，发现同版本草稿会停止并要求维护者处理，不会把它当作不存在，也不会自动覆盖。所有失败并非都可自动恢复。

未发布候选需要修复时，通过相应 PR 更新来源并重新完整验证，不直接在受保护候选分支修改，也不强推。已发布 beta 的代码修复使用更高 beta 序号；stable/hotfix 一旦占用版本则使用后续版本。

停止正在运行的发布需要在 Actions 显式取消，再核对 npm 是否已完成上传。将 `RELEASE_ENABLED` 改为 `false` 只阻止新的候选运行，不会自动撤销已通过前置校验的运行。

## 9. 相关文档

- [GitHub 配置手册](./GITHUB_SETUP_AND_RELEASE.md)：管理员配置、远端验收与历史本地记录。
- [贡献指南](../CONTRIBUTING.md)：第三方 fork 与 PR。
- [发布说明目录](./releases/README.md)：版本说明约定。
