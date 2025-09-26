# Install/Update ESA CLI

ESA CLI is a command-line tool for building with Alibaba Cloud ESA Functions and Pages.

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

> [!TIP]
> When `esa-cli` is not previously installed, `npx` will fetch and run the latest version from the registry.

## Check your ESA CLI version

**To check your ESA CLI version, run:**

```bash
npx esa --version
# or
npx esa -v
```

## Update ESA CLI

**To update ESA CLI to the latest version, run:**

```bash
npm i -D esa-cli@latest
```

## Related Documentation

- [ESA CLI Usage Guide](./README.md)
- [Alibaba Cloud ESA Documentation](https://help.aliyun.com/document_detail/2710021.html)
- [Functions and Pages API Reference](https://help.aliyun.com/document_detail/2710024.html)
