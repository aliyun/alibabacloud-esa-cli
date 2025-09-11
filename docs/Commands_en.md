## Commands

### esa init [name]

Initialize a routine with a template or a framework.

```bash
esa init [name]
```

- Positionals:
  - name: Project name

- Options:
  - -f, --framework string: Choose a frontend framework (react/vue/nextjs...)
  - -l, --language string: Choose programming language (typescript/javascript). Choices: typescript | javascript
  - -t, --template string: Template name to use
  - -y, --yes boolean: Answer "Yes" to all prompts (default: false)
  - --git boolean: Initialize git repository
  - --deploy boolean: Deploy after initialization

---

### esa dev [entry]

Start a local server for developing your routine.

```bash
esa dev [entry]
```

- Positionals:
  - entry: Entry file of the Routine

- Options:
  - -p, --port number: Port to listen on
  - -m, --minify boolean: Minify code during development (default: false)
  - --refresh-command string: Command to run before auto-refresh on save
  - --local-upstream string: Host to act as origin in development
  - --debug boolean: Output debug logs (default: false)

---

### esa commit [entry]

Commit your code and save as a new version.

```bash
esa commit [entry]
```

- Options:
  - -m, --minify boolean: Minify code before committing (default: false)
  - -a, --assets string: Assets directory
  - -d, --description string: Description for the routine/version (skip interactive input)
  - -n, --name string: Edge Routine name

---

### esa deploy [entry]

Deploy your project.

```bash
esa deploy [entry]
```

- Positionals:
  - entry: Entry file of the Routine

- Options:
  - -v, --version string: Version to deploy (skip interactive selection)
  - -e, --environment string: Environment to deploy to. Choices: staging | production
  - -n, --name string: Name of the routine
  - -a, --assets string: Assets directory (e.g., ./dist)
  - -d, --description string: Description of the version
  - -m, --minify boolean: Minify the code

---

### esa deployments [list | delete]

Manage your deployments.

```bash
esa deployments list
esa deployments delete [deploymentId...]
```

- Subcommands:
  - list: List all deployments
  - delete [deploymentId...]: Delete one or more deployment versions

---

### esa routine [list | delete]

Manage your routines.

```bash
esa routine list
esa routine delete <routineName>
```

- Subcommands:
  - list: List all your routines
  - delete <routineName>: Delete a routine

---

### esa site [list]

Manage your sites.

```bash
esa site list
```

- Subcommands:
  - list: List all your sites

---

### esa domain <add | list | delete>

Manage the domain names bound to your routine.

```bash
esa domain add <domain>
esa domain list
esa domain delete <domain>
```

- Subcommands:
  - add <domain>: Bind a domain to a routine
  - list: List all related domains
  - delete <domain>: Delete a related domain

---

### esa route <add | list | delete>

Manage the routes bound to your routine.

```bash
esa route add
esa route list
esa route delete <routeName>
```

- Subcommands:
  - add: Bind a Route to a routine
  - list: List all related routes
  - delete <routeName>: Delete a related route

#### esa route add

Bind a route to the current routine.

```bash
esa route add [route] [site] [--alias <routeName>] [--route <route>] [--site <site>]
```

- Positionals (optional):
  - route: The route value, e.g. example.com/_ or _.example.com/\*
  - site: The site name, e.g. example.com

- Options:
  - -r, --route string: Route value, e.g. example.com/\*
    - Host supports leading `*` for suffix match (e.g., `*.example.com`)
    - Path supports trailing `*` for prefix match (e.g., `/api/*`)
  - -s, --site string: Site name (must be an active site)
  - -a, --alias string: Route name (alias)

- Interactive behavior:
  - If `--alias` is missing, you will be prompted to input a route name
  - If `--site` is missing, you will be prompted to choose from active sites
  - If `--route` is missing, you will be prompted to input the route value

- Route matching notes:
  - Host supports `*` prefix: `*.example.com` matches any host ending with `.example.com`
  - Path supports `*` suffix: `/api/*` matches any path starting with `/api/`
  - Examples: `example.com/*`, `*.example.com/`, `*.example.com/api/*`

- Examples:
  - `esa route add -a home -s example.com -r example.com/*`
  - `esa route add example.com/* example.com -a home`

---

### esa login

Login to the server.

```bash
esa login
```

- Options:
  - --access-key-id, --ak string: AccessKey ID (AK)
  - --access-key-secret, --sk string: AccessKey Secret (SK)

---

### esa logout

Logout.

```bash
esa logout
```

---

### esa config [-l | -g]

Modify your local or global configuration.

```bash
esa config [--local] [--global]
```

- Options:
  - -l, --local boolean: Edit local config file (default: false)
  - -g, --global boolean: Edit global config file (default: false)

---

### esa lang

Set the language of the CLI.

```bash
esa lang
```
