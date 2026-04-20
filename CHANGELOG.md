# Changelog

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
