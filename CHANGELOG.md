# Changelog

## [1.0.12] - 2026-09-01

### Added

- Add environment-specific runtime variable management for staging and production with `esa env list`, `esa env set`, and `esa env delete`.
- Add encrypted secret management with hidden input, stdin support, and dotenv bulk import through `esa secret put` and `esa secret bulk`.
- Bind each newly committed code version to the selected environment's current variable and secret snapshot.
- Validate the bound environment before deploying existing or weighted code versions while remaining compatible with legacy versions that have no environment metadata.
- Show the selected credential source, authentication type, masked AccessKey ID, validated endpoint, and local persistence status after login.

### Changed

- Make `esa commit`, `esa deploy`, weighted-version deployments, and `init --deploy` target production only when `--environment` is omitted. Previous releases deployed to both staging and production by default; run the command once per environment when both targets are required.
- Apply environment variable and secret changes only to code versions created by a subsequent `commit` or `deploy`. Legacy versions without environment metadata remain deployable but do not gain a runtime configuration snapshot retroactively.
- Resolve credentials in this order: explicit `login` arguments, complete `ESA_*` environment credentials, complete `ALIBABA_CLOUD_*` environment credentials, credentials saved under `~/.esa/config`, then interactive login.
- Prefer `ESA_*` over `ALIBABA_CLOUD_*` when both complete groups are present, reversing their order from 1.0.11.
- Select credentials as complete, atomic groups. An incomplete higher-priority source now reports an error instead of being combined with values from another prefix or source.
- Keep environment-provided credentials in memory instead of requiring writable local configuration. Explicit login credentials are saved locally and warn when environment variables will override them in subsequent commands.
- Exclude the experimental deploy JSON output and process-contract changes published in the 1.0.12 beta prereleases; this release is scoped to runtime configuration and credential/login improvements.

### Fixed

- Hide interactive AccessKey Secret and STS input, mask AccessKey IDs in login summaries, and avoid printing secret values.
- Restrict the local credential directory and file to owner-only permissions on POSIX systems, including migration of existing configuration.
- Return a non-zero status for invalid or incomplete credentials across commands, use the endpoint that successfully validated the selected credentials, and honor the compatibility command name in login guidance.
- Warn when `logout` clears local credentials but environment or Alibaba Cloud CLI profile credentials remain active.

## [1.0.11] - 2026-07-22

### Added

- Support standard Alibaba Cloud credential environment variables: `ALIBABA_CLOUD_ACCESS_KEY_ID`, `ALIBABA_CLOUD_ACCESS_KEY_SECRET`, and `ALIBABA_CLOUD_SECURITY_TOKEN`, while retaining the existing `ESA_*` variables as fallbacks.
- Support `ALIBABA_CLOUD_ESA_CLI_COMPAT_MODE` for overriding the CLI name shown in help, usage, and error messages.

### Changed

- Replace React/Ink-based terminal interactions with lightweight Clack and native terminal handling, removing unused React and Ink runtime dependencies.
- Expand CI and installation coverage across macOS, Linux, Windows, Node.js 18/20/22, and npm, Yarn, pnpm, and Bun.
- Require Node.js 18 or newer and upgrade esbuild to the patched 0.25 release line.
- Upgrade the ESA SDK and ZIP implementation to patched releases with safer dependency trees.
- Upgrade test and lint tooling to patched releases that retain Node.js 18 support.

### Fixed

- Declare previously implicit runtime dependencies explicitly to prevent installation failures with strict package managers.
- Support pnpm global installations by resolving pnpm's shared runtime dependency path.
- Resolve file MD5 calculations only after the input stream closes, preventing cleanup races and file-handle issues.

## [1.0.10] - 2026-04-20

### Added

- Support STS Token login for temporary credentials
  - Command line: `esa login --sts-token "AccessKeyId,AccessKeySecret,SecurityToken"`
  - JSON format: `esa login --sts-token '{"AccessKeyId":"xxx","AccessKeySecret":"xxx","SecurityToken":"xxx"}'`
  - Environment variables: `ESA_ACCESS_KEY_ID` + `ESA_ACCESS_KEY_SECRET` + `ESA_SECURITY_TOKEN`
  - Interactive: run `esa login` and select "STS Token" login method
- Support multiple endpoint configurations (use project/config file endpoint instead of auto-detected one)

## [1.0.9] - 2026-04-16

### Fixed

- Fix KV mock root path detection on Windows (use parent comparison instead of `/`)

## [1.0.8] - 2026-04-14

### Added

- Support deploy access token: deploy success URL now includes a temporary access token (valid for 1 hour)
- Add `--skip-update-check` option to skip CLI version update check
- Support `ESA_NO_UPDATE_CHECK` environment variable to disable version check

### Changed

- Switch version check registry from npmjs.org to npmmirror.com with 5s timeout
- Improve JSONC config file parsing to handle trailing commas

## [1.0.7] - 2026-01-20

### Added

- Support skipping esa-cli installation when initializing a project
- Update template version to latest

### Fixed

- Fix init command error on Windows
- Fix mock KV storage issues in development environment

## [1.0.6] - 2026-01-20

### Added

- Update template version to latest
- Support to skip install esa-cli when init a project

### Fixed

- Fix init command error in Windows

## [1.0.5] - 2026-01-13

### Fixed

- Fix mock Cache replacement bug

## [1.0.4] - 2026-01-09

### Added

- Support skip bundle
- Detect user endpoint and remove endpoint param

## [1.0.3] - 2025-11-28

### Fixed

- Fix mock KV storage issues in development environment
- Fix mock cache error in the top of workers code
- Fix API update config bug

## [1.0.2] - 2025-11-19

### Added

- Support for `--no-bundle` option in `commit` and `deploy` commands to skip esbuild bundling
- Credential validation utility that automatically detects site type (domestic/international)
- Automatic endpoint detection based on credential validation during login

### Removed

- `--endpoint` parameter from `login` command (endpoint is now automatically detected)

## [1.0.1] - 2025-1-15

### Added

- Support for passing endpoint parameter in login command
- User notification when services are activated during login

## [1.0.0] - 2025-9-17

### Added

- Initial release of ESA CLI
- Support for Functions and Pages operations
- Commands: init, dev, commit, deploy, login, logout, config, lang
- Multi-language support (English/Chinese)
- Template and framework support
- Domain and route management
- Deployment management
