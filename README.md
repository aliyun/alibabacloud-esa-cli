# ESA CLI

A CLI for operating Alibaba Cloud ESA EdgeRoutine (Edge Functions). It supports quick creation of edge functions, local debugging, version publishing and deployment, and trigger management.

English | [简体中文](./zh_CN.md)

#### Reference

- [Edge Security Acceleration (ESA)](https://www.aliyun.com/product/esa)
- [What is EdgeRoutine?](https://help.aliyun.com/document_detail/2710021.html)》

> **Note**: **In version 0.0.2 and above, the local development mode of the ESA CLI has been replaced with the same runtime as the ESA edge functions, ensuring that its actual behavior now matches the live environment. We invite you to experience it.**

ESA CLI is in public beta. If you encounter any issues or have any suggestions while using it, please feel free to submit an issue or a pull request.We are actively working to improve this tool and welcome any feedback. Thank you for your understanding and support!

## Installation

Install and run the CLI using npm:

```bash
$ npm install esa-cli -g    # Install globally
$ esa -v                    # Check the version
```

## Usage

### 1. Initialize Routine Project

```bash
& esa init
```

The initialization command has a complete process guide. Follow the prompts to enter the project name and choose a template.

### 2. Start a local server for developing your routine

Local dev is the core feature of the CLI, offering a more convenient debugging experience compared to the Alibaba Cloud ESA console.

```bash
& cd <Project Name>
& esa dev [options]
```

#### Write Code

In an EdgeRoutine project, the entry file is `src/index.js`, and the basic structure is as follows:

```javascript
const html = `<!DOCTYPE html>
<body>
  <h1>Hello World!</h1>
</body>`;

async function handleRequest(request) {
  return new Response(html, {
    headers: {
      'content-type': 'text/html;charset=UTF-8'
    }
  });
}

export default {
  async fetch(event) {
    return event.respondWith(handleRequest(event));
  }
};
```

For more EdgeRoutine APIs and syntax, please refer to the [API Reference](https://help.aliyun.com/document_detail/2710024.html)

#### Local Debugging

After executing `esa dev`, the entry file will be automatically packaged and a local debugging service will be started. The interface looks like this:

![dev png](https://github.com/aliyun/alibabacloud-esa-cli/blob/master/docs/dev.png)

- Press `b` to open the debugging page in the browser.
- Press `c` to clear the panel.
- Press `x` to exit debugging.
- You can use `esa dev --port <port>` to temporarily specify the port or use `esa config -l` to set the port by project configuration.

### 3. Log in to Alibaba Cloud Account

You need to log in to your Alibaba Cloud account to perform remote management operations.

First, visit the [Alibaba Cloud RAM Console](https://ram.console.aliyun.com/manage/ak) to get your AccessKey ID and AccessKey Secret, then execute `esa login` and follow the prompts to enter them.

```bash
& esa login
& esa logout
```

### 4. Create a Version

After local debugging is complete, you need to create a code version for deployment.

```bash
& esa commit      # Create a Version
```

### 5. Deploy to Environment & Manage Versions and Deployments

After the code version is created, it needs to be deployed to edge nodes.

Use the `esa deployments [script]` command to manage versions and deployments.

```bash
& esa deploy              # Deploy versions to the target environment
& esa deployments list    # View deployments
& esa deployments delete <versionId>  # Delete a version
```

_Note: Deployed versions cannot be deleted._

### 6. Manage Triggers

Once deployed to the nodes, you can configure triggers to access your edge functions. There are two types of triggers:

- Domain: After you associate the routine with a domain name, you can use the domain name to access the routine.
- Route: After you add a route for requested URLs, the routine is called from the edge to respond to the request.

```bash
& esa domain list
& esa domain add <domainName>
& esa domain delete <domainName>

& esa route list
& esa route add [route] [site]
& esa route delete <route>
```

### 7. Manage Functions

You can view and delete Routine functions through the CLI.

```bash
& esa routine list
& esa routine delete <routineName>
```

## Commands

see [Commands](./docs/Commands_en.md)

## Config files

### Global config file

```toml
endpoint = "" # ESA API Endpoint
lang = "zh_CN" # language

[auth]
accessKeyId = "" # AccessKey ID
accessKeySecret = "" # AccessKey Secret
```

### Project config file

```toml
name = "Hello World" # Project name
description = "Hello World" # Project description
entry = "src/index.js" # Entry file
codeVersions = [ ] # Code version

[dev]
port = 18080 # Debug port
localUpstream = '' # When debugging locally, the upstream source site will replace the current origin when returning to the source
```

## LICENSE

[The MIT License](./LICENSE)
