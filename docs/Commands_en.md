## Commands

### esa-cli init [name]

Initialize a project with a template or a framework.

```bash
esa-cli init [name]
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

### esa-cli dev [entry]

Start a local server for developing your project.

```bash
esa-cli dev [entry]
```

- Positionals:
  - entry: Entry file of Functions& Pages

- Options:
  - -p, --port number: Port to listen on
  - -m, --minify boolean: Minify code during development (default: false)
  - --refresh-command string: Command to run before auto-refresh on save
  - --local-upstream string: Host to act as origin in development
  - --debug boolean: Output debug logs (default: false)

---

### esa-cli commit [entry]

Commit your code and save as a new version.

```bash
esa-cli commit [entry]
```

- Options:
  - -m, --minify boolean: Minify code before committing (default: false)
  - -a, --assets string: Assets directory
  - -d, --description string: Description for Functions& Pages/version (skip interactive input)
  - -n, --name string: Functions& Pages name

---

### esa-cli deploy [entry]

Deploy your project.

```bash
esa-cli deploy [entry]
```

- Positionals:
  - entry: Entry file of Functions& Pages

- Options:
  - -v, --version string: Version to deploy (skip interactive selection)
  - -e, --environment string: Environment to deploy to. Choices: staging | production
  - -n, --name string: Name of Functions& Pages
  - -a, --assets string: Assets directory (e.g., ./dist)
  - -d, --description string: Description of the version
  - -m, --minify boolean: Minify the code

---

### esa-cli deployments list

List all deployments.

```bash
esa-cli deployments list
```

No additional options.

---

### esa-cli deployments delete [deploymentId...]

Delete one or more deployment versions.

```bash
esa-cli deployments delete [deploymentId...]
```

- Positionals:
  - deploymentId...: Deployment version IDs to delete (one or more)

---

### esa-cli project list

List all your projects.

```bash
esa-cli project list
```

No additional options.

---

### esa-cli project delete <projectName>

Delete a project.

```bash
esa-cli project delete <projectName>
```

- Positionals:
  - projectName: The name of the project to delete

---

### esa-cli site list

List all your sites.

```bash
esa-cli site list
```

No additional options.

---

### esa-cli domain add <domain>

Bind a domain to your project.

```bash
esa-cli domain add <domain>
```

- Positionals:
  - domain: The domain name to bind

---

### esa-cli domain list

List all related domains.

```bash
esa-cli domain list
```

No additional options.

---

### esa-cli domain delete <domain>

Delete a related domain.

```bash
esa-cli domain delete <domain>
```

- Positionals:
  - domain: The domain name to delete

---

### esa-cli route add

Bind a route to the current project.

```bash
esa-cli route add [route] [site] [--alias <routeName>] [--route <route>] [--site <site>]
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

---

### esa-cli route list

List all related routes.

```bash
esa-cli route list
```

No additional options.

---

### esa-cli route delete <routeName>

Delete a related route.

```bash
esa-cli route delete <routeName>
```

- Positionals:
  - routeName: The name of the route to delete

---

### esa-cli login

Login to the server.

```bash
esa-cli login
```

- Options:
  - --access-key-id, --ak string: AccessKey ID (AK)
  - --access-key-secret, --sk string: AccessKey Secret (SK)

---

### esa-cli logout

Logout.

```bash
esa-cli logout
```

---

### esa-cli config [-l | -g]

Modify your local or global configuration.

```bash
esa-cli config [--local] [--global]
```

- Options:
  - -l, --local boolean: Edit local config file (default: false)
  - -g, --global boolean: Edit global config file (default: false)

---

### esa-cli lang

Set the language of the CLI.

```bash
esa-cli lang
```
