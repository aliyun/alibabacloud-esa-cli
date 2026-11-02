# GitHub 开源开发、测试门禁与发布流程历史评估

> 原始调研日期：2026-09-20；2026-11-03 仅整理历史定位与导航，未重新核验平台规则或重跑当时测试。
> 本文完整保留当时的资料、备选方案和实施前状态，不是当前操作手册或待办清单。当前单版本线、beta → stable、独立热修及审批规则，以[开发与发布指南](DEVELOPMENT_AND_RELEASE.md)和 [GitHub 配置与发布手册](GITHUB_SETUP_AND_RELEASE.md)为准；实现导航见[项目地图](PROJECT_MAP.md)。
> 范围：GitHub/npm 官方规则、成熟 TypeScript 项目的一手实现，以及当前仓库的 workflow 和测试。
> 用途：保留本项目 CI、合并门禁和发布方案的历史依据。第 1–12 节的“当前”“已有”“缺口”均指调研时点，不代表现有工作区或远端配置状态；旧方案不得覆盖现行指南。
> 结论类型：标注“建议”的内容是针对本项目目标的设计判断，不是平台强制要求。

## 1. 建议采用的基本流程

内部开发者创建短期分支，外部开发者使用 fork；两者都通过 PR 进入 `master`。
建议合并前运行相同的不依赖私有凭据的测试，并由仓库规则强制检查结果。
发布单独设关卡，固定待发布提交，验证后才获得发布权限。

```text
内部 feature 分支 ─┐
                   ├→ PR → 必须通过的 CI + 审查 → master
外部 fork 分支 ────┘                              │
                                                 └→ 发布准备 PR
                                                    → 同一套 CI
                                                    → 合并到 master
                                                    → 固定版本/提交
                                                    → 发布验证与批准
                                                    → npm + GitHub Release
```

这个流程与 GitHub 的分支、PR、审查、合并模型一致；是否允许合并由保护规则控制。
参见 [GitHub PR quickstart](https://docs.github.com/en/pull-requests/get-started/pull-request-quickstart) 和 [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)。

## 2. release 分支是否必要

建议根据用途区分三种机制，避免让同一个 `release` 分支承担全部职责。

| 机制                      | 推荐用途                       | 对本项目的判断       |
| ------------------------- | ------------------------------ | -------------------- |
| 发布准备 PR               | 审查版本号、变更记录、发布范围 | 适合作为默认方案     |
| 短期 `release/1.2.3` 分支 | 冻结候选版本，主干继续开发     | 有稳定期需求时采用   |
| 长期 `release/v1` 分支    | 主干开发 v2，同时维护 v1       | 出现多版本维护时采用 |
| `v1.2.3` 标签             | 标识一个具体版本的源代码       | 每次正式发布保留     |

建议当前优先采用发布准备 PR；仅为了点击“发布”而增加长期分支，会多出同步、回合并和版本漂移问题。
如果保留 release 分支，创建后新增的版本号、修复或构建变更都必须重新验证。
“从通过测试的 master 切出”只证明切出时的提交；不能替代对最终发布提交和安装包的验证。
这些是设计建议；成熟项目确实同时存在主干发布与维护分支，下面的样例展示了不同用途。

## 3. 两个成熟 TypeScript 项目的真实实现

### Effect：主干触发发布准备 PR / 发布

- `main` 的 push 触发发布流程，由 Changesets 创建版本 PR 或执行发布。
- 发布 job 声明 `id-token: write`，并更新 npm 以支持 OIDC。
- 并发发布不取消已经运行中的发布任务。
- 使用自定义 GitHub token，使自动版本 PR 能运行后续工作流。

以上直接来自 [Effect release.yml](https://github.com/Effect-TS/effect/blob/main/.github/workflows/release.yml)。
值得借鉴的是版本变更可审查、发布串行，以及 npm 身份与 GitHub 自动化身份分开管理。
不应据此推断其全部仓库保护设置，也不必照搬它使用的工具预发布版本。

### Tiptap：主干开发，旧主版本通过维护分支发布

- 新开发通常进入 `main`，旧版本位于 `release/v*`，只接收重要修复。
- 维护版本之间通过独立 backport PR/cherry-pick 传递修复。
- npm dist-tag 区分稳定版与预发布版，不能只用主干名称判断稳定性。

分支规则来自 [Tiptap CONTRIBUTING.md](https://github.com/ueberdosis/tiptap/blob/main/CONTRIBUTING.md)。
其 [publish.yml](https://github.com/ueberdosis/tiptap/blob/main/.github/workflows/publish.yml) 将构建和发布分成 job，校验包导出，传递构建产物，再执行 Changesets 发布；发布 job 开启 OIDC。

推断：不存在一个统一的“最先进分支模型”。更有参考价值的是可审查的版本变更、受保护的主干、可追溯产物和明确的发布权限。
项目样例只证明所读文件中的行为，不构成对其全部安全措施或质量保障的审计。

## 4. 测试失败不能合并：需要仓库设置配合

仅在 `.github/workflows/` 添加测试不会自动阻止合并。
建议对 `master` 设置 ruleset 或 branch protection，并完成以下约束：

1. 必须通过 PR 修改主干。
2. 把固定、唯一名称的 CI 检查列为 required status checks。
3. 开启合并前与主干保持最新，或在适用时采用 merge queue。
4. 设置所需审查数量；限制 bypass，并让管理员遵守规则。
5. 禁止随意强推或删除主干。

平台依据见 [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)。

GitHub 的 strict 模式要求分支与目标分支同步；loose 模式可能在其他 PR 合并后出现组合故障。
建议低并发项目先用 strict；合并频繁后再考虑队列。
Merge queue 会在最新主干和队列中前置 PR 的组合上检查；需要额外订阅 `merge_group`。
该功能适用于组织名下公开仓库，或使用 Enterprise Cloud 的组织私有仓库；不能默认个人仓库可用。
依据：[merge queue 官方说明](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)。

建议使用一个稳定的汇总检查，例如 `ci-gate`，汇总 build、unit、contract、离线 E2E 的结果。
汇总 job 使用 `needs` 与 `always()`，并显式拒绝任何必需 job 的 failure、cancelled 或 skipped。
原因是条件跳过的 job 可能被视为成功，而路径过滤跳过整个 workflow 可能让 required check 永远 Pending。
此外，手动 `workflow_dispatch` 的 job 检查不能替代 PR ruleset 所需的检查。
依据：[required status checks 排障](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)。

## 5. fork PR 与真实云 API 测试

公开仓库的 fork PR 通过 `pull_request` 在上游触发工作流；通常拿不到上游 secrets，`GITHUB_TOKEN` 只有读取权限。
外部贡献者可能需要维护者批准工作流运行；这次批准不是代码审查通过，也不会自动赋予 secrets。
依据：[workflow 事件](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) 和 [fork 工作流批准](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/approve-runs-from-forks)。

因此建议将测试分成两层：

| 层次              | 触发与作用                                                           | 凭据                         |
| ----------------- | -------------------------------------------------------------------- | ---------------------------- |
| 必须通过的 PR CI  | 内外部 PR 一致执行；构建、单测、命令契约、离线交互测试、打包安装验证 | 无云凭据                     |
| 受控真实 API 验证 | 已审查的可信提交、定时回归、发布前验证                               | 专用测试账号，限制权限与资源 |

如果要求每个外部 PR 合并前都跑真实云 API，需要额外设计可信执行流程与人工审查，无法直接复用普通 fork 的 secrets。
维护者批准运行之后，仍须审查将要执行的准确提交；不要把“批准过该 PR”理解为允许后续所有提交读取凭据。
建议先让无凭据测试成为可靠的合并门禁，把真实 API 验证作为独立发布关卡。

不要通过 `pull_request_target` 检出 fork 的代码后执行安装、构建或测试来绕过凭据限制。
该事件拥有更高信任级别；运行来自 PR 的脚本、配置或依赖会把权限交给外部代码。
`workflow_run` 下载并执行不可信产物也存在同类风险。
依据：[GitHub pull_request_target 安全说明](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target)。

## 6. 自动发布：OIDC、批准与产物

建议发布 job 采用 npm trusted publishing，以 GitHub OIDC 身份替代长期 npm 写入 token。
当前最低要求是 npm `11.5.1`、Node `22.14.0`，GitHub-hosted runner，以及 `id-token: write`。
npm 侧必须绑定正确的仓库、workflow 文件名，可选绑定 environment；`package.json` 的 `repository.url` 也要匹配。
公共仓库发布公共包时，GitHub OIDC 发布会自动生成 provenance；这说明来源，不证明测试正确。
上述条件见 [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)。

建议发布到受保护的 `npm-release` environment，限制可发布的分支/标签，设置维护者审批。
Environment 的保护条件在 job 启动或读取该 environment secrets 前生效；可禁止发起人自批。
公开仓库可使用这些保护功能；私有仓库受 GitHub 方案限制。
依据：[GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)。

建议发布 job 依赖验证 job，并固定同一提交和被检查过的 npm tarball：

1. 校验版本号与标签一致、来源属于预期主干或维护分支。
2. 使用锁文件安装，构建并运行要求的验证。
3. `npm pack` 后在干净目录安装 tarball，验证 CLI 入口及必要运行文件。
4. 对这个 tarball 执行发布，记录提交、版本、产物摘要与工作流运行。
5. 创建对应 GitHub Release，安装已发布版本做一次轻量验证。

这些步骤是本项目的推荐验收设计；不能用构建源码成功替代已打包 CLI 的安装成功。
建议发布过程串行执行，避免新提交取消正在发布的任务；重试先检查 registry 中的实际状态。

## 7. 2026 年需要注意的变化

### npm staged publishing

官方已支持 `npm stage publish`：先上传暂存包，由维护者用 2FA 审批后公开。
要求 npm `11.15.0`、Node `22.14.0`，且包已经存在；全新包不能使用 staged publishing。
依据：[npm staged publishing](https://docs.npmjs.com/staged-publishing/)。
2026-09-03 后新建的 trusted publisher 默认允许 staged publish，直接 `npm publish` 要另外允许。
依据：[trusted publisher 配置](https://docs.npmjs.com/trusted-publishers/#configuring-trusted-publishing)。
建议需要在 GitHub 完成常规发布时选 environment 审批 + 直接 OIDC 发布；希望 npm 侧再审批时再采用 stage-only。

### 首次发布

npm 当前 trusted publisher 指南从“现有包的设置”开始，未完整说明首次创建包的 OIDC 引导过程。
Tiptap 明确采用先人工发布新包、再配置 trusted publisher 的方式。
依据：[Tiptap 新包发布说明](https://github.com/ueberdosis/tiptap/blob/main/CONTRIBUTING.md#publishing-new-packages)。
建议上线前核实包是否已经存在；全新包预留一次初始化发布，不承诺第一版能完全通过 OIDC 自动建立。

### 自动版本 PR 的 CI

GitHub.com 当前允许 `GITHUB_TOKEN` 创建/更新 PR 的 opened、synchronize、reopened 事件生成待批准的运行。
维护者批准后才能执行；GitHub App/PAT 可以让这类运行自动开始。
普通 `GITHUB_TOKEN` 产生的 push/tag 不会自动级联触发普通工作流，显式 dispatch 是例外。
依据：[GitHub 工作流触发规则](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)。
因此建议自动版本 PR 也遵循正常门禁，不用管理员绕过检查来解决触发问题。

## 8. 实施前的验收问题

- 一个故意失败的内部 PR，是否确实无法合并到 `master`？
- 一个没有任何上游 secrets 的 fork PR，能否完整执行所有必需检查？
- 测试 job 失败、取消或意外跳过时，最终合并检查是否失败？
- 主干更新后，旧 PR 的绿色结果是否需要更新验证？
- 发布是否锁定准确提交，且 tarball 安装和 CLI 入口可用？
- 不符合分支/标签规则的提交是否无法进入发布 environment？
- 自动版本 PR 是否触发预期检查，而不需要绕过规则？
- 发布失败后的重试是否识别已经发布的版本，并保留可追溯记录？

以上是建议的验收标准；当前项目是否满足，应另结合本地 workflow、测试内容和 GitHub 实际仓库设置判断。

## 9. 本仓库核对范围与结论

核对基线：`feat/contract-tests`，提交 `279eafa`，2026-09-20。
本次只新增文档并运行本地检查，没有修改 workflow、业务代码或远端设置，也没有发布包。
文件路径相对仓库根目录；行号是核对时的位置，后续修改可能使其偏移。

**判断：开发流程方向合理；当前仓库具备自动执行测试的基础，尚不能确认或完成“测试必过才合并、受控正式发布”的完整流程。**

| 用户目标                             | 当前证据                                                                | 结论                                               |
| ------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------- |
| 内部分支提交后自动测试               | `main.yml:3`、`compat.yml:5` 均监听所有分支的 `push` 和 `pull_request`  | 已配置；需要 push 到 GitHub，本地 commit 不触发    |
| 外部 fork PR 自动测试                | 两个 workflow 都有 `pull_request`，权限为 `contents: read`              | 已具备触发配置；是否先批准运行取决于仓库 fork 策略 |
| 未通过测试不能合并 master            | 公开 Rulesets 页面显示没有 ruleset；无法读取传统 branch protection      | 未验证，不能只凭 YAML 宣称已强制                   |
| PR 合并前执行真实 API 测试           | `compat.yml:86` 仅 master、特殊 push 提交消息或手动输入触发 integration | 普通 PR 不执行，master 上执行已是合并之后          |
| release 分支执行全部发布前验证       | release 分支 push 触发常规 CI，但不自动满足 integration 的条件          | 不完整                                             |
| 在 GitHub 发 npm 包和 GitHub Release | `.github/workflows/` 仅有 `main.yml`、`compat.yml`                      | 没有发布 workflow                                  |
| 所发布的包就是已验证的包             | 安装冒烟测试构建了 tarball，但没有发布 job 消费它                       | 尚未连通                                           |

公开证据：[本仓库 Rulesets](https://github.com/aliyun/alibabacloud-esa-cli/rules)。
本机 GitHub CLI/API 返回 `401 Bad credentials`，匿名 API 受到限流；没有读取到传统分支保护、环境审批、secrets 配置和最新 Actions 运行结果。
“未看到 ruleset”不等于“没有任何分支保护”。本地通过也不等于远端多平台 CI 已通过。

## 10. 现有测试的有效能力与缺口

### 已有基础

- `main.yml:15`：macOS、Ubuntu、Windows × Node 18/20/22，执行 lint、默认测试、构建、打包。
- `main.yml:46`：npm、Yarn、pnpm、Bun 安装冒烟验证，覆盖两个 CLI 名称及部分全局安装/exec 方式。
- `compat.yml:33`：构建后运行 CLI 契约测试并上传 JUnit 报告。
- `compat.yml:61`：构建后运行交互 E2E，CI 显式设置 `ESA_TEST_SKIP_LOGIN=1`。
- `.github/actions/setup-and-install/action.yml`：兼容性工作流共用锁文件 registry 检查、安装重试和依赖完整性检查。

这些能够发现命令解析、帮助、配置读取、构建和安装入口的一部分回归；不能据此认定上传和部署链路已经验证。

### 必须在发布门禁前修正的测试问题

| 位置                                                                       | 现有行为                                                               | 对门禁的影响与建议                                                                                 |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `tests/integration/credentials.ts:31`；两个集成测试文件的 `describeOrSkip` | 缺少凭据时整个套件跳过，进程退出 0                                     | 本地允许跳过；发布模式必须检查所需配置，缺失即失败，并核对实际执行数量                             |
| `tests/integration/write-ops.test.ts:65`、`:106`                           | domain/route 创建返回非零，只检查退出码不是 null                       | 明确的创建失败也可能通过；成功场景必须断言成功并回读资源，预期拒绝另写失败场景                     |
| `tests/integration/write-ops.test.ts:102`、`:124`                          | route add/delete 使用 `--name`                                         | 实现分别使用 `--alias` 与位置参数 `<routeName>`，且 add 缺少 site 会进入交互；修正为真实非交互契约 |
| `tests/integration/write-ops.test.ts:137`、`:144`                          | 测试 `config set/get`                                                  | `src/commands/config.ts:30` 实际只支持 `config --local/--global` 打开编辑器；测试与产品接口不一致  |
| `tests/integration/read-only.test.ts:28`                                   | 主要断言退出 0、有输出，所谓一致性用例没有比较实际业务数据             | 某些 CLI 业务失败只打印日志并返回，仍可能退出 0；需要检查预期站点/项目/资源内容                    |
| `tests/e2e/v1/login.test.ts`                                               | 成功登录、登出和有效凭据路由流程在 CI 跳过；无效凭据用例仍调用真实服务 | 无凭据不等于离线；PR 测试用可控 API fixture，真实登录在可信环境验证                                |
| `tests/integration/` 整体                                                  | 只有只读、domain/route 写操作及配置测试                                | 缺少核心 `commit → 上传 → deploy 到测试环境 → HTTP 验证 → 清理` 闭环                               |

测试资源应使用独立测试站点、唯一名称和保证执行的清理逻辑；当前 `.example.com` 占位域名不能替代可实际绑定的测试域名。
子进程测试 helper 还应设置进程级超时并结束子进程，避免仅由测试框架超时留下挂起 CLI。
发布关卡要求的用例不能因为缺少配置、构建或前序资源而静默跳过。

## 11. 本次实际执行结果

运行环境：本机 macOS、Node `24.13.0`、npm `11.6.2`，使用现有依赖。
这不是 CI 的 3 × 3 全矩阵，也没有重跑全部包管理器安装场景。
行为测试的运行环境清除了真实云凭据相关变量，E2E 设置 `ESA_TEST_SKIP_LOGIN=1`；没有执行真实云资源写操作。

| 检查                                                              | 结果                                               |
| ----------------------------------------------------------------- | -------------------------------------------------- |
| `npm run lint`                                                    | 通过；0 errors，44 warnings                        |
| `npm test -- --run`                                               | 28 个文件、212 个测试通过；行覆盖率 35.5%          |
| `npm run build`                                                   | 通过                                               |
| `npm run test:compat:v1`                                          | 2 个文件、153 个测试通过                           |
| `./node_modules/.bin/vitest run --config vitest.e2e.v1.config.ts` | 4 个通过、3 个跳过                                 |
| `npm run test:integration:v1`，不提供凭据                         | 12 个全部跳过，退出码仍为 0；不是实际 API 验证通过 |

覆盖率只说明本次被执行代码的比例，不能替代关键行为断言；当前首先应补齐业务闭环和失败检测能力。

## 12. 建议实施顺序

### P0：先完成合并门禁

1. 内外部贡献统一 PR，保护 `master`，配置必须通过的检查、所需审查、最新主干检查及受控 bypass。
2. 为必需的无凭据 CI 设置固定汇总检查，明确拒绝失败、取消和意外跳过。
3. 当前 job 分散在两个 workflow；`needs` 不能跨两个独立 workflow 直接汇总。可合并为一个 PR CI workflow（或由同一入口调用 reusable workflows）；保留两份时分别汇总并把两个检查都设为 required。
4. 用故意失败的内部 PR 和无 secrets 的 fork PR 验收实际合并按钮行为。

### P0：完成可靠的发布验证

1. 修正第 10 节的失效断言与命令不匹配，增加发布模式的凭据和实际执行检查。
2. 在可信候选提交上，用专用账号完成最小上传、测试环境部署、HTTP 内容核对、清理闭环。
3. 普通 PR 使用稳定、可控的无凭据测试；真实云测试可在 master 回归，并在发布时作为必须成功的独立关卡。master 回归失败时阻断发布。

### P0：增加发布 workflow

1. 默认采用发布准备 PR 管理版本、锁文件、变更记录；需要冻结期时改用受保护的短期 `release/x.y.z` 分支。
2. 固定最终提交；版本号变更和 release 分支上的任何修复都重新测试；维护分支修复回传 master。
3. 发布 job 必须依赖这一提交的成功验证，构建并检验最终 tarball，再通过受保护 Environment 和 npm OIDC 发布。
4. 将版本标签、GitHub Release、npm 版本、提交和产物对应起来。只创建 release 分支或 tag 不代表具备这个依赖关系。
5. 若由 `GITHUB_TOKEN` 创建 tag，不要期待普通 tag push 自动串联第二个 workflow；在同一受控流程调用发布逻辑，或明确设计可触发的入口。

### P1：降低耗时并维护兼容范围

- 当前内部 PR 的同一次更新会同时触发 push 和 PR 两套工作流。可收敛为 PR 必需检查、master/release push 回归；是否保留未开 PR 分支的 push 测试看团队习惯。
- `compat.yml` 已有取消旧运行的 concurrency，主 CI 可以补齐；发布流程应串行且不被后续发布取消。
- 契约和 E2E 当前只跑 Ubuntu；根据支持承诺选取关键命令增加 Windows/macOS 行为测试，并维护 Node 支持版本矩阵。
- 若启用 merge queue，两个必需工作流都要支持 `merge_group`，不能只启用仓库侧开关。

## 13. 当前阅读入口与历史定位

当前开发与发布先读[开发与发布指南](DEVELOPMENT_AND_RELEASE.md)，管理员配置和远端验收读 [GitHub 配置与发布手册](GITHUB_SETUP_AND_RELEASE.md)，源码定位读[项目地图](PROJECT_MAP.md)。随后按任务核对现有 workflow、发布脚本和测试，不将本文第 9–12 节的旧缺口直接当作当前待实施任务。

本文中的“冻结候选时主干继续开发”、长期维护分支等是当时讨论的备选方案。现行方案采用单一版本线，master 进入 beta 后只修本轮问题，下一版功能留在 feature 分支；热修从当前正式 tag 派生，经受保护 release 分支的 PR 发布后合回 master。

仓库文件与 GitHub/npm 管理设置仍须分别验收，不能用提交 YAML 代替远端规则已生效的证据。历史表格只记录当时的本地结果，不代表现有版本或真实发布已经通过。
