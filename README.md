# Alibaba Cloud ESA CLI

[![npm version](https://img.shields.io/npm/v/esa-cli?style=flat-square)](https://www.npmjs.com/package/esa-cli)
[![CI](https://img.shields.io/github/actions/workflow/status/aliyun/alibabacloud-esa-cli/main.yml?style=flat-square&label=CI)](https://github.com/aliyun/alibabacloud-esa-cli/actions/workflows/main.yml)
![Node.js](https://img.shields.io/badge/Node.js-18%20%7C%2020%20%7C%2022-3c873a?style=flat-square)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

ESA CLI is a command-line tool for building, developing, and deploying [Alibaba Cloud ESA](https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/what-is-er/) Functions & Pages projects.

It helps you create projects from templates, run Functions & Pages locally, package static assets and edge functions, publish code versions, deploy to staging or production, and manage domains, routes, and deployments from your terminal.

<p>
  <a href="https://discord.gg/BxcRVEeh">
    <img alt="Discord CN" src="https://img.shields.io/badge/Discord-中文-5865F2?logo=discord&logoColor=white" />
  </a>
  <a href="https://discord.gg/SHYe5926" style="margin-left:8px;">
    <img alt="Discord EN" src="https://img.shields.io/badge/Discord-English-5865F2?logo=discord&logoColor=white" />
  </a>
</p>

[Get started](#getting-started) • [Configuration](#configuration) • [Commands](#commands) • [Development](#development) • [Resources](#resources)

## Features

- **Project scaffolding**: initialize React, Vue, Next.js static export, Astro, and React Router projects with ESA-ready configuration.
- **Local development**: run a local ESA-compatible server with automatic rebuilds, local upstream proxying, mock KV, and cache support.
- **Static + dynamic deployments**: deploy static Pages, edge functions, or hybrid Functions & Pages projects.
- **Versioned releases**: create code versions with `commit`, deploy existing versions, or split traffic between two versions by percentage.
- **Runtime configuration**: manage environment-specific variables and encrypted secrets from the CLI.
- **Account operations**: login with AK/SK or STS credentials, list projects and sites, and manage custom domains and routes.
- **Bilingual CLI**: switch the CLI language between English and Simplified Chinese.

## Prerequisites

- Node.js 20 or newer is recommended. CI currently covers Node.js 18.x, 20.x, and 22.x.
- npm, pnpm, yarn, or Bun for installing the package.
- An Alibaba Cloud account with ESA Functions & Pages access.

> [!TIP]
> For team projects, install `esa-cli` as a dev dependency so everyone runs the same CLI version.

## Installation

Install locally in your project:

```bash
npm i -D esa-cli@latest
```

Or install globally:

```bash
npm i -g esa-cli@latest
```

The package exposes both `esa-cli` and the shorter `esa` command after installation.

Check the installed version:

```bash
npx esa-cli --version
npx esa-cli -v
```

## Getting Started

### 1. Authenticate

Run the interactive login flow:

```bash
npx esa-cli login
```

You can also pass credentials directly:

```bash
npx esa-cli login --access-key-id <ACCESS_KEY_ID> --access-key-secret <ACCESS_KEY_SECRET>
```

For temporary credentials, pass an STS token:

```bash
npx esa-cli login --sts-token "AccessKeyId,AccessKeySecret,SecurityToken"
```

If `--sts-token` and AK/SK arguments are supplied together, ESA CLI preserves backward-compatible behavior: it uses the STS credentials, ignores the AK/SK arguments for that login, and prints a warning.

> [!WARNING]
> Values passed with `--sk` or `--sts-token` can be recorded in shell history and exposed through process arguments. Prefer credentials injected through environment variables (for example, by a CI secret manager), or use interactive login, which hides secret input.

ESA-specific environment variables are supported:

```bash
export ESA_ACCESS_KEY_ID=<ACCESS_KEY_ID>
export ESA_ACCESS_KEY_SECRET=<ACCESS_KEY_SECRET>
export ESA_SECURITY_TOKEN=<SECURITY_TOKEN>
npx esa-cli login
```

The standard Alibaba Cloud variables `ALIBABA_CLOUD_ACCESS_KEY_ID`, `ALIBABA_CLOUD_ACCESS_KEY_SECRET`, and `ALIBABA_CLOUD_SECURITY_TOKEN` are also supported.

ESA CLI resolves credentials in the following order, from highest to lowest priority:

1. Explicit `login` arguments (`--sts-token` or a complete `--access-key-id` / `--ak` and `--access-key-secret` / `--sk` pair)
2. A complete `ESA_ACCESS_KEY_ID` / `ESA_ACCESS_KEY_SECRET` environment credential group, with optional `ESA_SECURITY_TOKEN`
3. A complete `ALIBABA_CLOUD_ACCESS_KEY_ID` / `ALIBABA_CLOUD_ACCESS_KEY_SECRET` environment credential group, with optional `ALIBABA_CLOUD_SECURITY_TOKEN`
4. Credentials saved by `esa-cli login` under `~/.esa/config`
5. Interactive input, for `esa-cli login` only

Explicit arguments have highest priority only for the current `login` invocation. After a successful login, those credentials are saved under `~/.esa/config` and are treated as saved configuration by subsequent commands. A configured `ESA_*` or `ALIBABA_CLOUD_*` credential group therefore overrides the saved credentials; `login` prints a warning when it detects that the newly saved credentials will be overridden or blocked by environment variables.

Each source is evaluated as one credential group. ESA CLI never combines an AccessKey ID from one source with an AccessKey Secret or Security Token from another source. If a higher-priority source is present but incomplete, the command reports an error instead of silently falling back or mixing credentials.

When ESA CLI runs as an Alibaba Cloud CLI plugin, Alibaba Cloud CLI passes the selected profile through the `ALIBABA_CLOUD_*` variables. The ESA-specific `ESA_*` group intentionally has higher priority. Unset `ESA_ACCESS_KEY_ID`, `ESA_ACCESS_KEY_SECRET`, and `ESA_SECURITY_TOKEN` when you want the plugin to use the profile selected by Alibaba Cloud CLI.

`esa-cli logout` clears only credentials saved in `~/.esa/config`. Environment credentials remain active; unset `ESA_*` / `ALIBABA_CLOUD_*` in the parent shell, or change the selected Alibaba Cloud CLI profile, to fully stop using them.

### 2. Create a Project

Create a new ESA-ready application from a template:

```bash
npx esa-cli init my-esa-app
cd my-esa-app
```

You can also make the template choice explicit:

```bash
npx esa-cli init my-esa-app --framework react --language typescript
```

### 3. Develop Locally

Start the local development server:

```bash
npx esa-cli dev
```

Use a custom port or local upstream when needed:

```bash
npx esa-cli dev --port 18080 --local-upstream https://example.com
```

### 4. Commit and Deploy

Create a code version without deploying it:

```bash
npx esa-cli commit --description "Prepare release"
npx esa-cli commit --environment staging --description "Prepare staging release"
```

`commit` defaults to production and binds a snapshot of the current production variables and secrets to the new version without deploying it. Use `--environment staging` to bind the staging snapshot instead.

Deploy the current project:

```bash
npx esa-cli deploy --description "Initial release"
```

Production is the default deployment environment. When this command creates a new version, it binds a snapshot of the current production variables and secrets to that version. Use `--environment staging` to create and deploy a version with the staging snapshot instead.

Deploy an existing version:

```bash
npx esa-cli deploy --version <VERSION_ID> --environment production
```

An existing version bound to staging or production cannot be deployed to the other environment; the CLI rejects an environment mismatch. Older versions without an environment binding remain compatible.

Split traffic between two versions:

```bash
npx esa-cli deploy --versions v1:80,v2:20 --environment production
```

Manage runtime variables and secrets for an environment:

```bash
npx esa-cli env list --environment production
npx esa-cli env set LOG_LEVEL=info --environment production
npx esa-cli env delete LEGACY_FLAG --environment production
npx esa-cli secret put API_TOKEN --environment production
npx esa-cli secret bulk .env.production --environment production
```

Values are stored independently for staging and production. Changes do not modify existing versions: create a new snapshot with `commit` or `deploy`, then deploy that version to the matching environment. `deploy` defaults to production, while `deploy --environment staging` selects staging explicitly:

```bash
npx esa-cli deploy
npx esa-cli deploy --environment staging
```

Use `env list` to inspect the environment. Secret values are always masked in its output.

Keep files used by `secret bulk` out of version control. If you use a name such as `.env.production`, add it to your project's `.gitignore` explicitly.

## Configuration

ESA CLI looks for `esa.jsonc` or `esa.toml` from the current directory upward. `esa.jsonc` is recommended for new projects.

```jsonc
{
  "name": "my-esa-app",
  "description": "My ESA Functions & Pages project",
  "entry": "./src/index.ts",
  "assets": {
    "directory": "./dist",
    "notFoundStrategy": "singlePageApplication"
  },
  "dev": {
    "port": 18080,
    "localUpstream": "https://example.com"
  }
}
```

You can configure only `entry` for an edge function, only `assets.directory` for static Pages, or both for a hybrid project.

> [!NOTE]
> If both a function entry and `assets.notFoundStrategy` are configured, navigation requests are handled by the static fallback strategy instead of the function entry.

See the [ESA Configuration Guide](https://github.com/aliyun/alibabacloud-esa-cli/blob/master/docs/Config_en.md) for all fields and examples.

## Commands

| Command | Description |
| --- | --- |
| `esa-cli init [name]` | Create a new project from framework templates. |
| `esa-cli login` | Authenticate with AK/SK, STS token, or supported environment variables. |
| `esa-cli dev [entry]` | Start a local server for Functions & Pages development. |
| `esa-cli commit [entry]` | Save a new environment-bound version without deploying it; production is the default. |
| `esa-cli deploy [entry]` | Generate or select a version and deploy it to production by default, or to staging when selected. |
| `esa-cli env list/set/delete` | Manage plain-text variables for a staging or production environment. |
| `esa-cli secret put/bulk` | Store encrypted secrets for a staging or production environment. |
| `esa-cli deployments list` | List code versions for the current Functions & Pages project. |
| `esa-cli deployments delete` | Delete one or more code versions. |
| `esa-cli project list` | List Functions & Pages projects in the current account. |
| `esa-cli project delete` | Delete a Functions & Pages project. |
| `esa-cli site list` | List activated ESA sites. |
| `esa-cli domain add/list/delete` | Manage custom domain bindings. |
| `esa-cli route add/list/delete` | Manage route bindings for activated sites. |
| `esa-cli config --local/--global` | Edit local project or global CLI configuration. |
| `esa-cli lang` | Switch CLI language. |

For the full option reference, see [ESA CLI Commands](https://github.com/aliyun/alibabacloud-esa-cli/blob/master/docs/Commands_en.md).

## Development

Clone the repository and install dependencies:

```bash
git clone git@github.com:aliyun/alibabacloud-esa-cli.git
cd alibabacloud-esa-cli
npm install
```

Build the CLI:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Useful scripts:

| Script | Description |
| --- | --- |
| `npm run dev` | Run TypeScript in watch mode. |
| `npm run build` | Generate locale files, compile TypeScript, and copy runtime assets into `dist`. |
| `npm test` | Run Vitest with coverage. |
| `npm run lint` | Run ESLint on `src`. |
| `npm run lint:fix` | Run ESLint with automatic fixes. |

## Troubleshooting

- Run commands with `--debug` to print more detailed logs where supported.
- Use `--skip-update-check` or `ESA_NO_UPDATE_CHECK=1` to skip the CLI update check.
- Set `ALIBABA_CLOUD_ESA_CLI_COMPAT_MODE` to override the CLI name shown in help, usage, and error messages when invoking ESA CLI through a compatibility wrapper.
- If packaging fails, confirm that `entry` points to an existing file and `assets.directory` points to an existing directory.
- If route or domain binding fails, confirm the target site is already activated under the current account.

## Resources

- [ESA CLI Commands](https://github.com/aliyun/alibabacloud-esa-cli/blob/master/docs/Commands_en.md)
- [ESA Configuration Guide](https://github.com/aliyun/alibabacloud-esa-cli/blob/master/docs/Config_en.md)
- [Alibaba Cloud ESA Documentation](https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/what-is-er/)
- [Functions and Pages API Reference](https://www.alibabacloud.com/help/en/edge-security-acceleration/esa/user-guide/api-documentation/)
- [中文文档](./zh_CN.md)
