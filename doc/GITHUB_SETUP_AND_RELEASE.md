# GitHub 合并门禁与开源发布操作手册

> 适用仓库：`aliyun/alibabacloud-esa-cli`。第 11 节保留 2026-09-21 的历史本地验证记录。
> 本文区分仓库中的流程实现和远端待验收配置。本轮仅实现及本地验证，不要求提供账号或密钥；GitHub/npm 设置不会因修改本文或 YAML 自动生效。
> 当前必需检查已经汇总为 **`CI Gate`**，替代之前逐项选择 12 个检查的建议。
> 管理员操作按本文顺序执行；开发者日常流程见第 8、9 节。

日常开发与发布请参阅[开发与发布指南](./DEVELOPMENT_AND_RELEASE.md)；外部贡献者请参阅[贡献指南](../CONTRIBUTING.md)。本文保留管理员配置、首次验收和故障排查步骤。

## 0. 最终效果与任务清单

```text
内部 feature 分支 / 第三方 fork
  → PR 到 master → 无凭据完整 CI → CI Gate + 另一维护者审查
  → 合并 master、CI 成功 → beta 版本准备 PR
  → release/X.Y.Z-beta.N → Actions 手动发布 beta
  → beta 来源证明 + 仅版本/CHANGELOG.md/新版本说明的晋级 PR
  → master、CI 成功 → release/X.Y.Z → Actions 手动发布 stable

当前正式版 vX.Y.Z（npm latest + GitHub Release/manifest/tag 证明）
  → 从 tag 创建受保护 release/X.Y.(Z+1)
  → 热修 PR + CI Gate + 另一维护者审查
  → Actions 手动发布 hotfix → 修复及历史通过 PR 合回 master

每次 beta / stable / hotfix 均经过：
  完整 CI → 构建并安装最终 tarball
  → esa-integration 审批 → 同一 tarball 的真实 ESA staging/API/HTTP 验证与清理
  → npm-release 审批 → OIDC 发布同一 tarball
  → 准确 SHA 的 tag、GitHub Release、tarball 与来源 manifest
```

| 顺序 | 需要完成的事                                    | 操作位置                                               | 完成后的效果                                    |
| ---- | ----------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| 1    | 将本次代码通过 PR 放入 master，并让 CI 成功运行 | GitHub Pull requests / Actions                         | GitHub 能看到新 workflow 和 `CI Gate`           |
| 2    | 配置 Actions 与 fork 审批策略                   | Settings → Actions → General                           | 内外部 PR 能执行无凭据测试                      |
| 3    | 创建 master/release 分支保护规则                | Settings → Rules → Rulesets                            | 检查失败、未审查或基线过旧时不能合并            |
| 4    | 设置 CI/发布文件的负责审查人                    | Rulesets 的 PR 审查选项，或 CODEOWNERS                 | 修改测试门禁和发布脚本需维护者审查              |
| 5    | 创建测试环境并填写 ESA 配置                     | Settings → Environments → esa-integration              | 只有允许的 release 分支在批准后能使用测试凭据   |
| 6    | 创建发布环境                                    | Settings → Environments → npm-release                  | 发布前需要批准，来源受限                        |
| 7    | 配置 npm Trusted Publisher                      | npm 包 Settings，一次性外部配置                        | GitHub 可以通过 OIDC 发布，不需要长期 npm token |
| 8    | 启用发布入口并执行首次验收                      | Settings → Secrets and variables → Actions → Variables | Release workflow 的前置配置开关通过             |

本地已提供 workflow、发布脚本、离线 E2E、真实 API 测试和失败检查。下文中的账号授权、凭据填写、环境审批和最终发布需要仓库/包维护者执行。

## 1. 准备权限与首次上线

### 需要做什么

使用具有仓库 Admin 或 `edit repository rules` 权限的账号配置规则；创建 Environment 需要仓库 Admin。维护者团队至少两人，确保 PR 作者之外有另一名维护者审查，并能在两个 Environment 中执行非自审审批。

### 具体步骤

1. 确认目标仓库是 [aliyun/alibabacloud-esa-cli](https://github.com/aliyun/alibabacloud-esa-cli)，默认分支为 `master`。
2. 检查本次 PR 的 `.github/workflows/main.yml`、`compat.yml`、`release.yml`、`scripts/release/` 和测试改动。
3. 推送当前开发分支、建立指向 master 的 PR；在 Checks 中等待 `CI Gate` 成功。
4. 若原来没有保护规则，可以先基于此次成功记录配置第 3 节，再在满足规则后合并此 PR。
5. 确认 workflow 已进入 master。GitHub 的手动运行入口要求该 workflow 在默认分支存在；以后运行时可以选择 release 分支。
6. 暂时不要设置 `RELEASE_ENABLED=true`，先完成 Environment 和 npm 配置。

### 完成后的效果

Actions 页能找到 `CI` 和 `Release`；PR 页面能看到 `CI Gate`。本地 `npm test` 成功不等于这一步完成。

依据：[规则权限与创建入口](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)、[workflow_dispatch](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)。

## 2. 配置 Actions 与 fork PR

### 具体步骤

1. 打开 [Actions 设置](https://github.com/aliyun/alibabacloud-esa-cli/settings/actions)：`Settings → Actions → General`。
2. 在 Actions permissions 中允许本仓库使用的 actions 和 reusable workflows。若组织采用白名单，至少允许 `actions/checkout@v4`、`actions/setup-node@v4`、`actions/upload-artifact@v4`、`actions/download-artifact@v4`、`oven-sh/setup-bun@v2`，并允许本仓库的 reusable workflows；不能违反组织已配置的限制。
3. Workflow permissions 保持默认只读即可；发布 job 已单独声明 `contents: write` 和 `id-token: write`。本实现不需要打开“允许 Actions 创建/批准 PR”。
4. 在 fork PR workflow 的审批选项中，按组织策略设置；建议至少要求首次贡献者的工作流先经维护者批准。
5. 遇到待批准的 fork PR，在 PR/Actions 中查看准确提交及 workflow 改动，再点击 `Approve and run`。
6. 不向 fork PR 提供 ESA 或 npm secrets；本实现的 PR CI 不读取这些凭据。

### 完成后的效果

内部 push 和 PR 都触发测试；第三方 fork PR 可以在上游运行相同检查。批准运行只允许启动检查，不等于代码审查通过，也不授予云凭据。

依据：[fork 工作流审批](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/approve-runs-from-forks)。

## 3. 配置强制合并规则

### 具体步骤

1. 打开 [Rulesets 设置](https://github.com/aliyun/alibabacloud-esa-cli/settings/rules)：`Settings → Rules / Rulesets → Rulesets`。
2. 点击 `New ruleset → New branch ruleset`。
3. 名称填写 `protected-development-and-release`，Enforcement status 选择 **Active**。
4. Bypass list 留空。不要因为管理员或自动化账号需要方便操作就加入绕过名单。
5. Target branches → Add target → Include by pattern，分别添加 **`master`** 和 **`release/*`**。beta、stable 和 hotfix 都使用一层完整版本分支名，例如 `release/1.0.14-beta.1`、`release/1.0.14`。
6. 按下表配置 Branch rules。
7. 点击 Create/Save，并重新打开页面确认状态和目标分支正确。

| 规则                                             | 具体设置                               | 完成后的效果                                   |
| ------------------------------------------------ | -------------------------------------- | ---------------------------------------------- |
| Require a pull request before merging            | 开启                                   | 修改受保护分支必须走 PR                        |
| Required approvals                               | 至少 1；团队至少两名维护者             | 作者之外至少一名维护者批准，不能自审           |
| Dismiss stale approvals                          | 开启                                   | PR 内容更新后重新审查                          |
| Require conversation resolution                  | 开启                                   | 解决审查讨论后才能合并                         |
| Require status checks to pass                    | 开启，在 Add checks 中添加 **CI Gate** | 任一必需 job 失败、取消或意外跳过会阻断合并    |
| Require branches to be up to date before merging | 开启                                   | 合并前同步最新目标分支并重跑验证               |
| Expected check source                            | 若可选，选择 GitHub Actions            | 接受预期来源的状态检查                         |
| Block force pushes                               | 开启                                   | 不允许强推改写受保护分支                       |
| Restrict deletions                               | 开启                                   | 不允许随意删除主干和发布分支                   |
| Restrict creations / Restrict updates            | 保持关闭                               | 普通 PR 合并和从已验证提交创建发布分支仍可进行 |

只添加实际成功运行后显示的 `CI Gate` 检查，不要把 workflow 显示名称 `CI` 当作检查名称。无需继续逐项维护矩阵、Contract 或 E2E 的检查列表。
`CI Gate` 在本地实现中汇总所有矩阵、安装测试及行为测试。行为测试另有内部 `Behaviour Gate` 汇总，解决 `needs` 不能跨独立 workflow 汇总的问题。两个汇总门禁只使用 Node.js 内建模块，无须安装发布工具依赖。
当前覆盖分为三层：单元测试是 Linux/macOS/Windows × Node 18/20/22/24，每组至少 353 项、0 跳过；contract 保持 Ubuntu + Node 24，至少 264 项、0 跳过；离线 E2E 为 Ubuntu/macOS/Windows × Node 24，每个系统执行相同 16 项、0 跳过。E2E 使用 `fail-fast: false` 和带系统名的报告 artifact；`Behaviour Gate` 依赖整个 `e2e` 矩阵与 contract，任一系统失败、取消或跳过都阻断最终 `CI Gate`。

三种系统执行相同的离线 E2E，覆盖配置、登录、env/secret 和交互。它验证真实 CLI 到本地 API 的请求及错误处理，真实 ESA 权限、持久化和部署效果仍需发布验收。当前暂无主动 Windows ACL 加固，也未据此证明凭据文件访问控制策略。上线验收应核对三个 E2E job 和各自报告，远端结果以对应提交的 Actions 记录为准。

如果先前已设置旧检查，确认新门禁在 PR 上成功后再将旧列表替换为 `CI Gate`。

### 同时保护已发布的版本标签

1. 回到 Rulesets，新建 `New tag ruleset`，名称 `protect-release-tags`，状态 Active。
2. Target tags 添加 `v*`，覆盖 `v1.0.14-beta.1`、`v1.0.14` 等全部发布标签。
3. 开启 Restrict updates 和 Restrict deletions，Bypass list 留空。
4. 不开启 Restrict creations：发布 job 需要创建新标签；已有标签指向不匹配提交时，发布脚本会拒绝继续。
5. 保存。

**效果**：beta、stable 和 hotfix 的版本标签均不能被普通写入权限强推到其他提交或随意删除；首次创建仍可由 Release workflow 完成。

### 检查搜不到时

先通过 push 或 PR 让当前版本 CI 在 GitHub 成功运行；GitHub 要求检查有近期成功记录（官方排障文档为最近 7 天）。不要用关闭保护或添加 bypass 来解决。
手动 `workflow_dispatch` 的检查不能替代 PR required check；Release 中嵌套执行的检查也不用于配置普通 PR 门禁。

### 完成后的效果与验收

- 测试未结束或失败时，PR 合并按钮被阻止。
- 修复并 push 后必须等待新的 `CI Gate`。
- master 更新后，旧 PR 需要同步并重新验证。
- 对 release 分支的修复也必须走 PR 并通过检查。
- 内部与 fork PR 的合并条件一致。

当前已加入 `merge_group` 触发支持，但本手册先使用 up-to-date 模式；暂时无需启用 merge queue。

依据：[规则功能](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)、[required checks 排障](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)。

## 4. 确定 CI 与发布变更的审查责任

### 具体步骤

1. 选择实际负责该项目的维护者团队，不要填写示例账号或不存在的团队。
2. 在 ruleset 的 PR 规则中，如有文件级 Required reviewers，针对 `.github/**`、`scripts/release/**`、`tests/**`、`vitest*`、`package.json`、`package-lock.json` 指定该团队。
3. 若使用 CODEOWNERS，提交 `.github/CODEOWNERS`，把上述路径映射到实际有写权限的维护者/团队，再启用 `Require review from Code Owners`。
4. 让另一位维护者验证修改这些文件的 PR 是否出现相应审查要求。

### 完成后的效果

修改 workflow 或删掉测试同样需要审查，避免仅通过改检查逻辑得到绿色结果。此处需要真实人员信息，所以本次没有编造 CODEOWNERS 身份。

## 5. 创建真实 ESA 测试环境

### 先准备哪些外部资源

1. 使用专用 ESA 测试账号/RAM 身份，开通 Functions & Pages；不要填写生产凭据。
2. 准备一个可用的 active 测试站点，例如你实际控制的域名。测试账号需要读取站点、创建/读取/删除临时项目、代码版本与部署、域名绑定及路由、读取 staging IP 和临时访问 token 的权限。
3. 在这个站点下预留专用测试子域名后缀。测试会创建形如 `esa-ci-<唯一编号>.<测试后缀>` 的域名记录，不能使用 `.example.com` 占位值。
4. 核实账号配额、测试站点绑定能力和 GitHub-hosted Ubuntu runner 到 ESA/OSS/staging POP 的网络可达性。具体 RAM 授权需按测试账号权限边界设置；本地没有替你创建云账号或扩大权限。

### GitHub 具体步骤

1. 打开 [Environments](https://github.com/aliyun/alibabacloud-esa-cli/settings/environments)：`Settings → Environments → New environment`。
2. 名称准确填写 **`esa-integration`**。
3. Required reviewers 添加维护者团队，启用 **Prevent self-review**，要求由发起人之外的维护者批准。
4. 关闭 `Allow administrators to bypass configured protection rules`，保存。
5. Deployment branches and tags 选择 `Selected branches and tags`；新增 **Branch** 类型规则 `release/*`。不要添加全部分支或 fork。
6. 在 Environment secrets 中添加下表的秘密值，在 Environment variables 中添加普通配置。

| 名称                       | 类型           | 要填的值与作用                                                                       |
| -------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| ESA_TEST_ACCESS_KEY_ID     | Secret，必填   | 专用测试身份的 AccessKey ID                                                          |
| ESA_TEST_ACCESS_KEY_SECRET | Secret，必填   | 对应 Secret，不能写入仓库文件                                                        |
| ESA_TEST_SECURITY_TOKEN    | Secret，可选   | 使用临时 STS 身份时填写；必须在运行期间有效                                          |
| ESA_TEST_SITE_ID           | Variable，必填 | 测试站点的纯数字 SiteId                                                              |
| ESA_TEST_SITE_NAME         | Variable，必填 | 上述 SiteId 对应的真实站点名，如你控制的 `my-test.org`                               |
| ESA_TEST_DOMAIN_SUFFIX     | Variable，必填 | 严格位于站点之下的专用后缀，例如 `cli-tests.my-test.org`；示例需替换                 |
| ESA_TEST_ALLOW_WRITE       | Variable，必填 | 填 `1`，明确允许创建和清理测试资源                                                   |
| ESA_TEST_ENDPOINT          | Variable，可选 | 默认 `esa.cn-hangzhou.aliyuncs.com`；国际站按实际账号使用对应 endpoint，不含协议前缀 |

不要将这些值配置成通用 repository secrets 再注入所有 PR。当前 workflow 从 `esa-integration` 环境读取，原来仓库级同名 secrets 不能代替这里的权限配置。

### 完成后的效果

发布流程完成 CI 和 tarball 验证后，在 `Verify real ESA API` 等待批准；批准后才读取测试凭据。它对安装后的发布包执行 6 个真实 API 测试，包含新增/删除域名和路由，以及 `commit → deploy --environment staging → HTTP 验证唯一响应`。
HTTP 验证直接连接 staging IP，同时保留 Host、TLS SNI 和证书校验，不修改 runner hosts 文件，不部署到 production。

每次使用唯一 `esa-ci-*` 项目名，正常和测试失败时执行清理；另有 `always()` 清理步骤。runner 被强行终止或网络故障时无法保证清理成功，应查看 `integration-report` 中 `cloud-resources.json`，只删除日志列出的本次临时资源。
缺少必填配置、凭据无效、资源操作失败、断言失败、测试跳过或清理失败，都会阻止进入发布 job。

依据：[Environment 设置、审批与分支限制](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)、[ESA staging 验证方式](https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/create-an-app-from-template)。

## 6. 创建 npm 发布环境与一次性 npm 绑定

### GitHub 具体步骤

1. 在 Environments 新建 **`npm-release`**。
2. 配置 Required reviewers，启用 **Prevent self-review**，要求由发起人之外的维护者批准。
3. 关闭管理员绕过保护。
4. Deployment branches and tags 选择 Selected；添加 **Branch** 规则 `release/*`。
5. 保存。不需要在此填写 `NPM_TOKEN`。

### npm 具体步骤（GitHub 外的一次性配置）

npm 的包所有权配置不能通过修改本地 YAML 自动完成，必须由 `esa-cli` 包维护者操作。

1. 登录 [esa-cli 包页面](https://www.npmjs.com/package/esa-cli)，确认你有该包的维护权限。
2. 进入包的 Settings，找到 Trusted Publisher，选择 GitHub Actions。
3. Owner 填 **`aliyun`**。
4. Repository 填 **`alibabacloud-esa-cli`**。
5. Workflow filename 填 **`release.yml`**，不要填整个路径。
6. Environment name 填 **`npm-release`**，与 workflow 保持一致。
7. 本实现使用直接 `npm publish`。若界面区分 staged publishing 与直接 publishing，明确核对并允许直接发布。
8. 保存，并按组织策略收紧/撤销不再使用的长期发布 token；不要在测试前删除仍由其他授权发布流程使用的 token。

### 完成后的效果

`Publish verified package` 在人工批准后获得短期 OIDC 身份；使用 Node 24 和 npm 11.6.2，发布之前安装与真实测试过的 tarball，并生成 provenance。beta 使用 `beta` dist-tag 和 GitHub 预发布记录；stable/hotfix 使用 `latest` 和正式 Release。
候选校验和发布 job 会先运行 `npm ci --omit=dev --ignore-scripts`，安装工具需要的运行时依赖（包括 SemVer 校验）。发布脚本不会在 publish 阶段重新构建源代码，实际上传仍是此前验证过的同一 tarball。
如果 npm 包尚不存在，需要包维护者先完成首次包创建与所有权初始化；当前 trusted publisher 的设置入口位于已有包下。

依据：[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。

## 7. 最后启用发布，并验证配置生效

### 具体步骤

1. 确认第 2–6 节已经完成。
2. 打开 `Settings → Secrets and variables → Actions → Variables`。
3. 点击 `New repository variable`，名称 **`RELEASE_ENABLED`**，值 **`true`**，保存。
4. 使用一个故意失败的普通 PR 验证合并被阻止；随后修复并确认检查重新运行。
5. 使用 fork PR 验证无需上游凭据也能通过必需测试。
6. 首次上线先完成标准 beta → stable，验证版本来源证明和两个 Environment 的非自审审批；分别核对分支、SHA、版本、发布类型及来源，不批准来自意外分支的运行。
7. 验证每种发布都重新跑完整 CI、最终包安装和真实 staging 测试；后续热修再验收从正式 tag、向 release 分支提交 PR、发布后合回 master 的完整链路。历史手工正式版若没有所需 manifest/Release 证明，不能直接当自动热修基线。

### 完成后的效果

Release 的候选检查能够继续。未开启开关时，候选 job 会明确失败；这是准备未完成的状态，不是发布成功。
Environment 必须提前建立并配置：只在 YAML 中写 `environment:` 不会自动建立审批规则。

## 8. 日常开发与合并

1. 内部开发者从 master 创建 feature 分支；外部开发者 fork 后创建自己的分支。
2. 完成代码与测试，在本地运行 `npm run lint`、`npm run test:ci`、`npm run test:release-tools`。
3. 涉及 CLI 命令行为时先 `npm run build`，再运行 `npm run test:compat:v1`、`npm run test:e2e`。
4. push 并创建指向 master 的 PR。内部 push 和 PR 都会跑 CI，这是当前保留的早期反馈行为，可能出现两次运行。
5. 等待 `CI Gate`，处理审查意见；目标分支更新时点击 Update branch 或在本地合并最新 master。
6. 团队至少两名维护者，作者之外至少一名批准；全部条件满足后合并。测试失败时修复原因，不跳过规则。
7. master 进入 beta 后只修本轮问题；下一版功能留在 feature 分支，直到当前正式版完成。

## 9. 每次发布的操作步骤

三种发布共用唯一的 **Release** workflow（`release.yml`），均手动启动；具体 Git 命令见[开发与发布指南](./DEVELOPMENT_AND_RELEASE.md)。

### A. 准备候选并审查

| 类型   | 准备与审查                                                                                                                   | 候选分支                                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| beta   | 从 master 准备 `X.Y.Z-beta.N`；`release:prepare` 更新版本和 notes；PR 合入 master 并等待该提交 CI 成功                       | 从已验证完整 SHA 创建 `release/X.Y.Z-beta.N` |
| stable | 选择 npm 当前 `beta` 指向的已发布同目标版本 beta；仅版本、`CHANGELOG.md`、新版本 notes 的晋级 PR 合入 master，并等待 CI 成功 | 从晋级提交创建 `release/X.Y.Z`               |
| hotfix | 从 npm 当前 latest 正式版的准确 tag 创建受保护候选分支；修复和版本准备向该分支提交 PR，CI 与另一维护者审查通过               | `release/X.Y.(Z+1)`，只能下一 patch          |

运行 `npm run release:prepare -- 完整版本` 会更新 package/lock 并创建 `doc/releases/完整版本.md`，不提交或创建 tag。填写实际变更、兼容性、迁移说明并删除 TODO。

beta 和 stable 候选提交必须已在 master 历史中；hotfix 允许独立候选，但必须从可证明的当前正式 tag 开始，并在发布后通过 PR 合回 master。master 处于 beta 时冻结本轮范围。若 hotfix 占用原 beta 的目标版本，原 beta 递增到下个 patch 并重新完整测试。

### B. 核对发布来源

stable 的 `source_version` 是 npm 当前 `beta` 指向的已发布完整版本，hotfix 是 npm 当前 latest 正式版。工作流核对 npm 包、GitHub Release 的 manifest 和版本 tag，绑定 `sourceVersion`、`sourceSha`、`sourceIntegrity`；不能用同名本地文件代替发布证明。

stable 相对来源 beta 仅允许 package/lock 版本号、`CHANGELOG.md` 和本次新版本 notes 变更；源码、依赖或构建变更必须先发新 beta。hotfix 还须填写紧急原因，不能从带有未发布功能的 master 起步。缺少本流程证明的历史正式版须先完成一次标准 beta → stable，才能作为自动热修来源。

### C. 在 GitHub 手动启动

进入 **Actions → Release → Run workflow**，填写：

| 输入              | beta 示例               | stable 示例                  | hotfix 示例             |
| ----------------- | ----------------------- | ---------------------------- | ----------------------- |
| Use workflow from | `release/1.0.14-beta.2` | `release/1.0.14`             | `release/1.0.15`        |
| `version`         | `1.0.14-beta.2`         | `1.0.14`                     | `1.0.15`                |
| `commit`          | 候选顶端完整 40 位 SHA  | 候选顶端完整 40 位 SHA       | 候选顶端完整 40 位 SHA  |
| `release_type`    | `beta`                  | `stable`                     | `hotfix`                |
| `source_version`  | 留空                    | `1.0.14-beta.2`（当前 beta） | `1.0.14`（当前 latest） |
| `reason`          | 留空                    | 留空                         | 必填，说明紧急原因      |

表中 hotfix 接在示例 stable 之后，版本只用于说明，不能原样复用。分支名、包与锁文件版本、workflow 输入必须一致，不加 `v`；Git tag 才使用 `v` 前缀。

### D. 审批和发布后核对

1. 等待候选/来源校验、完整 CI 和最终 tarball 安装验证；beta、stable、hotfix 无豁免。
2. 在 `esa-integration` 核对版本、类型、SHA、来源，由另一维护者批准真实 ESA staging/API/HTTP 测试。
3. 确认所有真实测试执行、断言与清理成功，再由另一维护者在 `npm-release` 批准发布同一 tarball。
4. 核对 npm 版本与 dist-tag：beta 只更新 `beta`，stable/hotfix 更新 `latest`；核对准确 tag、GitHub Release、tarball 和 manifest。
5. hotfix 发布后通过 PR 将修复合回 master；beta 目标被占用时改版并重新测试。

普通 push、tag 和第三方 PR 都不直接发布。CLI 更新检查按安装版本保留 beta/latest 通道，仅提示更高 SemVer。

## 10. 失败、重试和清理

| 情况                                    | 处理步骤                                                          | 预期效果                                          |
| --------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| CI Gate 失败                            | 展开失败 job → 修复 → push                                        | 新检查成功后才能合并                              |
| CI Gate 一直等待                        | 确认当前 workflow 已运行、检查名称正确、组织允许 action           | 修复触发/配置问题，不通过 bypass 处理             |
| Release 输入不匹配                      | 查看分支、版本、锁文件、SHA 和发布说明                            | 在任何发布操作前失败                              |
| integration 缺少配置                    | 补充 esa-integration 中对应 Secret/Variable                       | 配置不完整不能被误判成绿色                        |
| 真实操作或清理失败                      | 查看失败步骤和资源 journal；核对账号权限/站点；清理残留唯一资源   | 发布保持阻断                                      |
| npm 拒绝 OIDC                           | 核对 Owner、Repo、release.yml、Environment、直接发布权限          | 不回退到临时粘贴长期 token                        |
| npm 已成功、GitHub Release 失败且无草稿 | 确认原 artifact 尚未过期，在同一次运行选择 Re-run failed jobs     | 核对同一 npm integrity 后继续，不覆盖包或移动 tag |
| 附件上传失败并留下 draft Release        | 维护者核对该版本、commit 和附件并处理草稿，再使用原 artifact 重跑 | 检测到草稿时先停止，不自动当作不存在或覆盖        |
| 相同版本已存在不同包                    | 停止重试，核实已发布内容；准备新版本                              | 拒绝覆盖或把不同产物标成同一版本                  |
| 已存在标签指向其他提交                  | 查明来源；不要移动正式版本标签                                    | 发布在写入前失败                                  |
| 版本或来源不满足通道规则                | 选择正确的新版本/已发布来源；代码变更先重新 beta                  | 不降级 dist-tag，不跳过 beta 或混入其他版本线     |
| artifact 已过期                         | 不盲目重建后覆盖已发布版本；核实既有包、标签和 Release            | 保留准确产物的来源记录                            |

`gh release create` 的附件上传失败可能留下 draft。按 tag 查询返回 404 不足以证明没有 Release；工具会继续分页查询列表，遇到同版本草稿即停止。维护者必须先核对版本、commit 和附件并处理草稿，再用原运行的同一 artifact 重试。此流程不会自动恢复所有失败，也不允许覆盖 npm 版本或移动 tag。

发布并发组为整个仓库共用的 `npm-release`，后续运行不会主动取消正在进行的发布；仍应等当前版本完成再启动下一个版本。
紧急停止后续发布可以把 repository variable `RELEASE_ENABLED` 改为 `false`；这只阻止新的候选运行，不会自动取消已经通过前置检查的任务。需要停止正在执行的运行时，在 Actions 中显式取消，并检查 npm 是否已完成上传。

## 11. 本地实现与验证记录

本地实现包括：

- 单一必需检查 CI Gate，覆盖 3 个系统 × Node 18/20/22/24 的单元测试、安装测试、Ubuntu Node 24 contract，以及 3 个系统 × Node 24 的离线 E2E。
- contract/E2E 缺少构建直接报错；HTTP(S) 请求通过测试专用 preload 阻止外联或转到本地 fixture。
- 无真实账号也完整执行成功/失败登录、交互输入、登出和实际编辑器配置测试。
- API 集成成功断言、准确命令参数、唯一测试资源与失败清理、最终 tarball 的 staging 部署验证。
- 发布前身份、版本、报告、产物校验，OIDC 发布，已有包/标签冲突检查；无遗留草稿时可用原 artifact 恢复，发现草稿则停止等待维护者核对处理。
- release:prepare 支持 beta 与 beta → stable 版本准备；发布类型、来源证明、允许差异、hotfix 下一 patch 和通道约束由脚本及 workflow 校验。
- 本轮只实现仓库流程，不替代远端审批、账号权限或实际发布验收；未替你选择或增加待发布版本。

以下为历史记录，验证环境：本机 macOS arm64、Node 24.13.0、npm 11.6.2；验证日期 **2026-09-21**。测试数量和结果仅对应当时版本，不表示本轮 beta/stable/hotfix 改动已完成相同验证。

| 本地检查                      | 结果                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| npm run lint                  | 通过，0 errors / 44 个既有 warnings                                                                                     |
| npm run build                 | 通过，业务源码和生成 locales 无额外修改                                                                                 |
| npm run test:ci               | 29 个文件、216 个测试通过；行覆盖率 35.5%                                                                               |
| contract                      | 155 个通过；校验编译后的配置读取值、优先级及 CLI API 请求，JSON 报告确认没有跳过                                        |
| 离线 E2E                      | 7 个通过，0 跳过；覆盖登录、登出、空凭据、取消及编辑器调用，交互流程正常退出，超时判失败                                |
| npm run test:release-tools    | 15 个通过；包含真实临时目录中的版本准备/打包、Git 提交来源验证、产物损坏拒绝、发布失败和重试模拟                        |
| 必需报告检查                  | 默认、contract、E2E 的实际 JSON 报告通过；“进程成功但测试跳过”的模拟报告返回失败                                        |
| 测试脚本回归验证              | 输入结束后正常退出；成功输出后挂起仍失败；在临时构建副本中替换配置值、反转 JSONC/TOML 优先级，分别被 9 项、2 项断言发现 |
| 真实 API 严格模式，无凭据     | 预期失败，退出码 1；防止 release 静默跳过                                                                               |
| 真实 API 普通本地模式，无凭据 | 6 个跳过，明确不计作 API 验证通过                                                                                       |
| 工作流语法                    | actionlint 1.7.12 通过；未启用本机不存在的 shellcheck/pyflakes 集成                                                     |
| 新增/修改的测试代码           | TypeScript 单独无输出类型检查通过                                                                                       |
| npm tarball                   | 在干净临时目录安装，核对版本、两个 CLI 映射入口和 deploy help；测试/发布脚本未进入包                                    |
| 文档/差异                     | Prettier、相对文件链接和 git diff --check 通过                                                                          |

仍需远端逐项验收：GitHub Ruleset 实际阻止合并、fork 审批、完整 Linux/macOS/Windows × Node 矩阵、全部包管理器组合、两 Environment 防自审与分支限制、真实 ESA 资源生命周期/staging HTTP 响应、npm OIDC、beta → stable 来源链及正式 tag → hotfix → master 回合。本地流程与离线测试成功不等于这些项目已通过；本轮没有因此要求账号密钥或执行云资源创建、远端设置与实际发布。

## 12. beta/stable/hotfix 本轮本地验证（2026-10-29）

环境为 macOS arm64、Node.js 24.13.0、npm 11.6.2。仓库版本保持 `1.0.13`；安装冒烟中的 `1.0.14-beta.1` 仅在临时打包副本中设置，未发布到 npm。

| 检查                             | 本轮结果                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 公共 registry 干净依赖安装、构建 | 通过；新增依赖均来自公共 npm registry                                                                         |
| 单元测试与覆盖率门禁             | 350 个通过，0 跳过；行覆盖率 44.06%                                                                           |
| 契约测试及报告门禁               | 155 个通过，0 跳过                                                                                            |
| 离线 E2E 及报告门禁              | 7 个通过，0 跳过                                                                                              |
| 发布工具测试                     | 37 个通过，0 跳过；覆盖 beta/stable/hotfix 来源、允许差异、产物损坏、草稿冲突、旧运行重试及无依赖 CI 汇总门禁 |
| 两通道安装冒烟                   | 正式版本及临时 beta 包均在干净临时目录安装成功，两个 CLI 入口及 deploy help 验证通过；测试和发布脚本未进入包  |
| 工作流语法                       | 三份工作流通过 actionlint 1.7.12；未启用 shellcheck/pyflakes 集成                                             |

本轮测试使用本地 fixture 或模拟发布服务，没有执行真实 ESA 写操作或 npm/GitHub 发布。验证日志、报告、临时包和下载工具已清理。真实发布关卡仍须按前文在 GitHub 验收。

## 13. 建议提交范围与 PR 说明

当前 CI、离线测试和发布脚本相互引用，应一并审查，避免只提交 workflow 而遗漏脚本或 fixture。提交范围包括 `.github/` 中本次流程变更、`scripts/release/`、包与锁文件、CLI 更新检查及相应既有测试、离线测试基础设施、贡献/开发/发布文档。生成的 `dist/`、测试报告与 tarball 不在提交范围内。

建议 PR 标题：`ci: standardize CI and beta release workflows`。

建议 PR 说明：

> 将普通 PR 的系统/Node 矩阵、安装验证、契约测试和离线 E2E 汇总为 CI Gate，外部贡献者无需云凭据即可验证改动。增加手动 beta、stable 和 hotfix 发布：绑定准确提交及已发布来源，复用完整 CI 和同一最终 tarball 的安装、真实 staging 测试与发布，并隔离 beta/latest 通道。
>
> 正常 stable 只允许相对 beta 修改版本与发布说明，热修从当前正式标签派生。补齐产物冲突检查、遗留草稿检测及旧运行安全重试；CLI 更新检查按安装通道比较 SemVer，防止降级或跨通道更新。
>
> 本机验证结果见第 12 节。远端 Rulesets、审批、真实 ESA 环境和 npm OIDC 仍待上线验收，不能将本地通过视为实际发布成功。
