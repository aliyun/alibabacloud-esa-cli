## ESA CLI Commands

ESA CLI offers a number of commands to manage your Alibaba Cloud ESA Functions & Pages.

**init** - Create a new project from a variety of web frameworks and templates.
**dev** - Start a local server for developing your Functions & Pages.
**commit** - Save an environment-bound code version without deploying it.
**deploy** - Deploy your Functions & Pages to Alibaba Cloud.
**env** - Manage plain-text variables for a specific environment.
**secret** - Manage encrypted secrets for a specific environment.
**deployments** - Manage your deployments and versions.
**project** - Manage your Functions & Pages projects.
**site** - List your activated sites.
**domain** - Manage domain bindings for your Functions & Pages.
**route** - Manage route bindings for your Functions & Pages.
**login** - Authorize ESA CLI with your Alibaba Cloud account.
**logout** - Clear credentials saved in ESA CLI's local config.
**config** - Modify your local or global configuration.
**lang** - Set the language of the CLI.

### How to run ESA CLI commands

If you have installed esa-cli globally, please refer to the following commands for execution.

**Installation**

```
npm i esa-cli@latest -g
```

**Execute commands**

```
esa-cli <COMMAND> <SUBCOMMAND> [PARAMETERS] [OPTIONS]
```

---

If you have installed ESA CLI locally in your project (rather than globally), the way to run ESA CLI will depend on your specific setup and package manager.

```
npx esa-cli <COMMAND> <SUBCOMMAND> [PARAMETERS] [OPTIONS]
```

**You can add ESA CLI commands that you use often as scripts in your project's package.json file:**

```json
{
  ...
  "scripts": {
    "deploy": "esa-cli deploy",
    "dev": "esa-cli dev"
  }
  ...
}
```

**Then you can run them using your package manager of choice:**

```
npm run deploy
```

---

## init

Create a new project via templates. A variety of web frameworks are available to choose from as well as templates. Dependencies are installed by default, with the option to deploy your project immediately.

```
esa-cli init [<NAME>] [OPTIONS]
```

**NAME** _optional (default: name of working directory)_  
The name of the Functions & Pages project. This is both the directory name and name property in the generated ESA CLI configuration.

**--framework, -f** _optional_  
Choose a frontend framework (react/vue/nextjs...)

**--language, -l** _optional_  
Choose programming language (typescript/javascript). Choices: typescript | javascript

**--template, -t** _optional_  
Template name to use

**--yes, -y** _optional_  
Answer "Yes" to all prompts (default: false), template uses helloworld

**--git** _optional_  
Initialize git repository

**--deploy** _optional_  
Deploy after initialization

---

## dev

Start a local server for developing your Functions & Pages.

```
esa-cli dev [<ENTRY>] [OPTIONS]
```

**ENTRY** _optional_  
Entry file of Functions & Pages

**--port, -p** _optional_  
Port to listen on

**--minify, -m** _optional_  
Minify code during development (default: false)

**--refresh-command** _optional_  
Command to run before auto-refresh on save

**--local-upstream** _optional_  
Host to act as origin in development

**--debug** _optional_  
Output debug logs (default: false)

---

## commit

Commit your code as a new version with an environment-variable snapshot, without deploying it. Production is the default environment.

```
esa-cli commit [<ENTRY>] [OPTIONS]
```

**ENTRY** _optional_  
Entry file of Functions & Pages

**--minify, -m** _optional_  
Minify code before committing (default: false)

**--assets, -a** _optional_  
Assets directory

**--description, -d** _optional_  
Description for Functions & Pages/version (skip interactive input)

**--environment, -e** _optional_
Environment whose variables and secrets are bound to the version. Choices: staging | production. Default: production

**--name, -n** _optional_  
Functions & Pages name

Omitting `--environment` binds a snapshot of the current production variables and secrets. Select staging explicitly to bind its snapshot instead. Neither command deploys the new version.

```
esa-cli commit
esa-cli commit --environment staging
```

---

## deploy

Generate a code version and deploy it to production by default, or to staging when selected explicitly.

```
esa-cli deploy [<ENTRY>] [OPTIONS]
```

**ENTRY** _optional_  
Entry file of Functions & Pages, defaults to entry configuration in `esa.jsonc`

**--version, -v** _optional_  
Version to deploy (skip interactive selection)

**--environment, -e** _optional_  
Environment to deploy to. Choices: staging | production. Default: production

**--name, -n** _optional_  
Name of Functions & Pages

**--assets, -a** _optional_  
Assets directory (e.g., ./dist)

**--description, -d** _optional_  
Description of the version

**--minify, -m** _optional_  
Whether to minify the code

When the command generates a new version, that version is bound to a snapshot of the target environment's current variables and secrets. Omitting `--environment` targets production and binds the production snapshot. Use `--environment staging` to target staging and bind the staging snapshot.

```
esa-cli deploy
esa-cli deploy --environment staging
```

Later variable or secret changes do not modify an existing version; run deploy for the same environment again to create a new version before those changes take effect.

Deploying an existing version with `--version` does not recreate or rebind its variable snapshot. The CLI rejects deployment when the version's bound environment differs from the target environment; older versions without an environment binding remain compatible.

---

## env

Manage plain-text variables for a deployment environment. Every env subcommand requires `--environment, -e`. Changes do not modify existing versions; create a new snapshot with `commit` or `deploy`, then deploy that version to the matching environment.

### env list

List variables and secrets for an environment. Secret values are always masked.

```
esa-cli env list --environment production [OPTIONS]
```

**--environment, -e** _required_: Target environment. Choices: staging | production

**--name, -n** _optional_: Name of Functions & Pages

### env set

Set or update a plain-text variable for an environment.

```
esa-cli env set <KEY=VALUE> --environment production [OPTIONS]
```

Example:

```
esa-cli env set LOG_LEVEL=info -e production
```

**KEY=VALUE** _required_: Variable name and value to set

**--environment, -e** _required_: Target environment. Choices: staging | production

**--name, -n** _optional_: Name of Functions & Pages

### env delete

Delete a variable or secret from an environment.

```
esa-cli env delete <KEY> --environment production [OPTIONS]
```

Example:

```
esa-cli env delete LOG_LEVEL -e production
```

**KEY** _required_: Name of the variable or secret to delete

**--environment, -e** _required_: Target environment. Choices: staging | production

**--name, -n** _optional_: Name of Functions & Pages

---

## secret

Manage encrypted secrets for a deployment environment. Secret changes do not modify existing versions; create a new snapshot with `commit` or `deploy`, then deploy that version to the matching environment. Secret values are always masked by `env list`.

### secret put

Set or update one secret. By default, its value is read from a hidden interactive prompt and is not displayed in the terminal.

```
esa-cli secret put <KEY> --environment production [OPTIONS]
```

Enter a secret through the hidden interactive prompt:

```
esa-cli secret put API_TOKEN -e production
```

Alternatively, read the value from standard input:

```
printf '%s' "$API_TOKEN" | esa-cli secret put API_TOKEN -e production --stdin
```

**KEY** _required_: Name of the secret to set

**--stdin** _optional_: Read the secret value from standard input without an interactive prompt

**--environment, -e** _required_: Target environment. Choices: staging | production

**--name, -n** _optional_: Name of Functions & Pages

### secret bulk

Import multiple secrets from a dotenv file.

Keep the dotenv file out of version control. If you use a name such as `.env.production`, add it to the project's `.gitignore` explicitly.

```
esa-cli secret bulk <FILE> --environment production [OPTIONS]
```

Example:

```
esa-cli secret bulk .env.production -e production
```

**FILE** _required_: Path to the dotenv file to import

**--environment, -e** _required_: Target environment. Choices: staging | production

**--name, -n** _optional_: Name of Functions & Pages

---

## deployments

Manage your deployments and versions.

### deployments list

List all code versions under the current Functions & Pages.

```
esa-cli deployments list
```

### deployments delete

Delete one or more code versions of the current Functions & Pages.

```
esa-cli deployments delete [<DEPLOYMENT_ID>...] [OPTIONS]
```

**DEPLOYMENT_ID** _required_  
Deployment version IDs to delete (can pass multiple at once)

---

## project

Manage your Functions & Pages projects.

### project list

List all Functions & Pages under the account.

```
esa-cli project list
```

### project delete

Delete specified Functions & Pages.

```
esa-cli project delete <PROJECT_NAME> [OPTIONS]
```

**PROJECT_NAME** _required_  
Name of the Functions or Pages to delete

---

## site

List your activated sites.

### site list

List all activated sites under the account.

```
esa-cli site list
```

---

## domain

Manage domain bindings for your Functions & Pages.

### domain add

Bind a domain to the current Functions & Pages.

```
esa-cli domain add <DOMAIN> [OPTIONS]
```

**Only sites activated under this account can be bound**

**DOMAIN** _required_  
The domain name to bind (must be activated under the account's sites)

### domain list

View all bound domains for the current Functions & Pages.

```
esa-cli domain list
```

### domain delete

Delete bound domains under the current Functions & Pages.

```
esa-cli domain delete <DOMAIN> [OPTIONS]
```

**DOMAIN** _required_  
The domain name to delete binding

---

## route

Manage route bindings for your Functions & Pages.

### route add

Bind a route to the current Functions & Pages.

```
esa-cli route add [<ROUTE>] [<SITE>] [OPTIONS]
```

**ROUTE** _optional_  
Route value, e.g. example.com/_ or _.example.com/\*

**SITE** _optional_  
Site name, e.g. example.com

**Only sites activated under this account can be bound**

**--route, -r** _optional_  
Route value, e.g. example.com/\*

- Host supports leading `*` for suffix match (e.g., `*.example.com`)
- Path supports trailing `*` for prefix match (e.g., `/api/*`)

**--site, -s** _optional_  
Site name (must be an activated site under the account)

**--alias, -a** _optional_  
Route name (alias) e.g. apple, orange, etc.

### route list

View all bound routes under the current Functions & Pages.

```
esa-cli route list
```

### route delete

Delete bound routes under Functions & Pages.

```
esa-cli route delete <ROUTE_NAME> [OPTIONS]
```

**ROUTE_NAME** _required_  
The name of the route to delete

---

## login

Authorize ESA CLI with your Alibaba Cloud account.

```
esa-cli login [OPTIONS]
```

**--access-key-id, --ak** _optional_  
AccessKey ID (AK)

**--access-key-secret, --sk** _optional_  
AccessKey Secret (SK)

**--sts-token** _optional_

Temporary STS credentials in `AccessKeyId,AccessKeySecret,SecurityToken` or JSON format

When `--sts-token` and AK/SK arguments are supplied together, ESA CLI keeps backward-compatible behavior: STS takes priority, the AK/SK arguments are ignored for that login, and the CLI prints a warning.

> **Security:** Values passed with `--sk` or `--sts-token` can be recorded in shell history and exposed through process arguments. Prefer credentials injected through environment variables, such as by a CI secret manager, or use interactive login, which hides secret input.

**Credential priority**

ESA CLI evaluates credentials in the following order, from highest to lowest priority:

1. Explicit arguments: `--sts-token`, or a complete `--access-key-id` (`--ak`) and `--access-key-secret` (`--sk`) pair
2. A complete ESA-specific environment credential group:
   - **ESA_ACCESS_KEY_ID**
   - **ESA_ACCESS_KEY_SECRET**
   - **ESA_SECURITY_TOKEN** _(optional)_
3. A complete standard Alibaba Cloud environment credential group:
   - **ALIBABA_CLOUD_ACCESS_KEY_ID**
   - **ALIBABA_CLOUD_ACCESS_KEY_SECRET**
   - **ALIBABA_CLOUD_SECURITY_TOKEN** _(optional)_
4. Credentials saved by `esa-cli login` under `~/.esa/config`
5. Interactive input

Explicit arguments have highest priority only during the current `login` invocation. After a successful login, the credentials are saved under `~/.esa/config`; subsequent commands treat them as saved configuration, so a configured `ESA_*` or `ALIBABA_CLOUD_*` credential group overrides them. Login prints a warning when it detects that environment variables will override or block the newly saved credentials.

Credentials are selected atomically. ESA CLI does not combine an AccessKey ID, AccessKey Secret, or Security Token from different prefixes or sources. If a higher-priority credential source is present but incomplete, login reports an error instead of mixing it with a lower-priority source.

When ESA CLI is invoked as an Alibaba Cloud CLI plugin, Alibaba Cloud CLI exposes the selected profile through the `ALIBABA_CLOUD_*` variables. A configured `ESA_*` credential group intentionally overrides that profile. Unset the `ESA_*` variables when you want the plugin to use the profile selected by Alibaba Cloud CLI.

---

## logout

Clear credentials saved in `~/.esa/config`.

```
esa-cli logout
```

`logout` does not remove `ESA_*` or `ALIBABA_CLOUD_*` environment credentials. Unset them in the parent shell, or change the selected Alibaba Cloud CLI profile, to stop those credentials from authenticating subsequent commands. ESA CLI prints a warning when environment credentials are still configured.

---

## config

Modify your local or global configuration.

```
esa-cli config [OPTIONS]
```

**--local, -l** _optional_  
Edit local config file (default: false)

**--global, -g** _optional_  
Edit global config file (default: false)

---

## lang

Set the language of the CLI.

```
esa-cli lang
```
