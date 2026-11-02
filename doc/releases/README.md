# 版本发布说明

运行以下命令准备版本，脚本更新包和锁文件版本，并创建对应的 `doc/releases/完整版本.md`，不会提交或创建 tag：

```bash
npm run release:prepare -- 1.0.14-beta.1
# 同目标 beta 验证完成后，另一个版本准备 PR 中执行：
npm run release:prepare -- 1.0.14
```

版本号仅为示例。发布说明写清用户可见变更、缺陷修复、兼容性和迁移要求，删除 TODO。不要覆盖已有说明或已发布版本。

| 类型   | 准备与发布约定                                                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| beta   | `X.Y.Z-beta.N`；版本 PR 合入 master 并通过 CI，从该 SHA 创建 `release/X.Y.Z-beta.N`；发布到 `beta`                                                                               |
| stable | `X.Y.Z`；来源必须是 npm 当前 `beta` 指向的、本流程已发布的同目标 beta，晋级只改版本、`CHANGELOG.md` 和新版本说明；PR 合入 master、CI 成功后创建 `release/X.Y.Z`，发布到 `latest` |
| hotfix | 当前 `latest` 正式版的下一 patch；从正式 tag 创建受保护 `release/X.Y.Z`，修复 PR 合入该分支后发布到 `latest`，再通过 PR 合回 master                                              |

beta 期间 master 只修本轮问题，下一版功能留在 feature 分支。热修占用 beta 原目标版本时，beta 递增到下一 patch 并重新完整验证。

三种发布都手动运行唯一的 **Release** workflow，填写 `version`、完整 `commit`、`release_type`；stable 的 `source_version` 填 npm 当前 `beta` 指向的已发布完整版本，hotfix 填当前 latest 正式版并必填 `reason`。来源由 npm 包、GitHub Release 的 manifest 和 tag 证明，manifest 绑定 `sourceVersion`、`sourceSha`、`sourceIntegrity`。缺少这些证明的历史手工正式版，须先完成一次标准 beta → stable 才能作为自动热修基线。

每次发布均重新执行完整 CI、最终 tarball 安装、真实 ESA staging/API/HTTP 验证和两个 Environment 审批。本地实现与检查不能代替远端上线验收。

若 npm 已成功而 GitHub Release 失败，只有在无遗留草稿时才可核对同一 artifact 并重跑。附件上传失败可能留下 draft，工具检测到后会停止；维护者先核对版本、commit 和附件并处理草稿，再用原运行 artifact 重试，不覆盖 npm 版本或移动 tag。

完整操作见[开发与发布指南](../DEVELOPMENT_AND_RELEASE.md)，管理员配置与待验收清单见 [GitHub 配置手册](../GITHUB_SETUP_AND_RELEASE.md)。
