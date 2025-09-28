# Install/Update ESA CLI

ESA CLI is a command-line tool for building with Alibaba Cloud ESA Functions and Pages.

<p>
  <a href="https://discord.gg/BxcRVEeh">
    <img alt="Discord CN" src="https://img.shields.io/badge/Discord-中文-5865F2?logo=discord&logoColor=white" />
  </a>
  <a href="https://discord.gg/SHYe5926" style="margin-left:8px;">
    <img alt="Discord EN" src="https://img.shields.io/badge/Discord-English-5865F2?logo=discord&logoColor=white" />
  </a>
 </p>

## Install ESA CLI

### Prerequisites

- Node.js: 18.x or higher (supports 18.x, 20.x, 22.x)
- OS: macOS (x86, Apple Silicon), Linux
- Recommended to use a Node version manager like Volta or nvm to avoid permission issues and easily switch Node.js versions.

## Installation

To ensure consistent collaboration across your team, we recommend installing `esa-cli` as a dev dependency in your project. This helps everyone use the same version.

```bash
npm i -D esa-cli@latest
```

Alternatively, install globally to use the `esa-cli` command system-wide:

```bash
npm i -g esa-cli@latest
```

> [!TIP]
> When `esa-cli` is not previously installed, `npx` will fetch and run the latest version from the registry.

## Check your ESA CLI version

**To check your ESA CLI version, run:**

```bash
npx esa-cli --version
# or
npx esa-cli -v
```

## Update ESA CLI

**To update ESA CLI to the latest version, run:**

```bash
npm i -D esa-cli@latest
```

## Related Documentation

- [esa-cli command](./docs/Commands_en.md)
- [ESA Configuration Guide](./docs/Config_en.md)
- [Alibaba Cloud ESA Documentation](https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/what-is-er/)
- [Functions and Pages API Reference](https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/api-documentation/)
