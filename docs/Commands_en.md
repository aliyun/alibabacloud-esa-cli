## ESA CLI Commands

ESA CLI offers a number of commands to manage your Alibaba Cloud ESA Functions & Pages.

**init** - Create a new project from a variety of web frameworks and templates.
**dev** - Start a local server for developing your Functions & Pages.
**commit** - Commit your code and save as a new version.
**deploy** - Deploy your Functions & Pages to Alibaba Cloud.
**deployments** - Manage your deployments and versions.
**project** - Manage your Functions & Pages projects.
**site** - List your activated sites.
**domain** - Manage domain bindings for your Functions & Pages.
**route** - Manage route bindings for your Functions & Pages.
**login** - Authorize ESA CLI with your Alibaba Cloud account.
**logout** - Remove ESA CLI's authorization for accessing your account.
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

Commit your code and save as a new version.

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

**--name, -n** _optional_  
Functions & Pages name

---

## deploy

Generate a code version and deploy the project to both staging and production environments.

```
esa-cli deploy [<ENTRY>] [OPTIONS]
```

**ENTRY** _optional_  
Entry file of Functions & Pages, defaults to entry configuration in `esa.jsonc`

**--version, -v** _optional_  
Version to deploy (skip interactive selection)

**--environment, -e** _optional_  
Environment to deploy to. Choices: staging | production

**--name, -n** _optional_  
Name of Functions & Pages

**--assets, -a** _optional_  
Assets directory (e.g., ./dist)

**--description, -d** _optional_  
Description of the version

**--minify, -m** _optional_  
Whether to minify the code

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

**Environment Variables**  
Read from environment variables:

- **ESA_ACCESS_KEY_ID**
- **ESA_ACCESS_KEY_SECRET**

---

## logout

Remove ESA CLI's authorization for accessing your account.

```
esa-cli logout
```

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
