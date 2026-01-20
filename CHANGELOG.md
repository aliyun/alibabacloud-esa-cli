# Changelog

## [1.0.5] - 2026-01-13

### Fixed

- Fix mock KV storage issues in development environment

## [1.0.3] - 2025-11-28

### Fixed

- Fix mock KV storage issues in development environment

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
