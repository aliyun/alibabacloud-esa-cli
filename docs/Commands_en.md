# Commands

### init

Initialize a routine with a template.
    
```bash
$ esa init [OPTIONS]
```

- -c, --config `boolean` `optional`
- Generate a config file for your project.

### routine [script]

Manage your routine.
    
#### delete <routineName>

Delete a routine.

```bash
$ esa routine delete <routineName>
```

- routineName `string` `required`
- The name of the routine to delete.

#### list

List all your routines.

```bash
$ esa routine list
```

### route [script]

Manage the routes bound to your routine.
    
#### add [route] [site]

Bind a Route to a routine.

```bash
$ esa route add [route] [site]
```

#### delete <route>

Delete a related route.

```bash
$ esa route delete <route>
```

- route `string` `required`
- The name of the routes to delete.

#### list

List all related routes.

```bash
$ esa route list
```

### login

Login to the server.
    
```bash
$ esa login
```

### dev [entry]

Start a local server for developing your routine.
    
```bash
$ esa dev [entry] [OPTIONS]
```

- entry `string` `optional`
- Entry file of the Routine.

- -port, --p `number` `optional`
- Port to listen on.

- --inspect-port `number` `optional`
- Chrome inspect devTool port.

- -minify, --m `boolean` `optional`
- Minify code during development.

- --local-upstream `string` `optional`
- Host to act as origin in development.

- --refresh-command `string` `optional`
- Provide a command to be executed before the auto-refresh on save.

### deployments [script]

Manage your deployments.
    
#### delete <deploymentId>

Delete one or more deployment versions.

```bash
$ esa deployments delete <deploymentId>
```

- deploymentId `string` `required`
- The ID of the deployments to delete.

#### list

List all deployments.

```bash
$ esa deployments list
```

### deploy [entry]

Deploy your project.
    
```bash
$ esa deploy [entry]
```

- entry `string` `optional`
- Entry file of the Routine.

### domain [script]

Manage the domain names bound to your routine.
    
#### add <domain>

Bind a domain to a routine.

```bash
$ esa domain add <domain>
```

- domain `string` `required`
- The name of domain to add.

#### delete <domain>

Delete a related domain.

```bash
$ esa domain delete <domain>
```

- domains `string` `required`
- The names of the related domains to delete.

#### list

List all related domains.

```bash
$ esa domain list
```

### commit [entry]

Commit your code, save as a new version.
    
```bash
$ esa commit [entry] [OPTIONS]
```

- entry `string` `optional`
- Entry file of the Routine.

- -m, --minify `boolean` `optional`
- Minify code before committing.

### logout

Logout.
    
```bash
$ esa logout
```

### config

Modify your local or global configuration using -l, -g.
    
```bash
$ esa config [OPTIONS]
```

- -g, --global `boolean` `optional`
- Edit global config file.

- -l, --local `boolean` `optional`
- Edit local config file.

### lang

Set the language of the CLI.
    
```bash
$ esa lang
```

### site [script]

Manage your sites.
    
#### list

List all your sites.

```bash
$ esa site list
```
