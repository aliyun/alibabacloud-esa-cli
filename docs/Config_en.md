## ESA Configuration Guide

This document describes the structure, parameters, and example of the ESA (Edge Security Acceleration) project configuration file `esa.jsonc`, helping developers configure and manage ESA projects efficiently.

## Project configuration file (esa.jsonc)

`esa.jsonc` is the core configuration file of an ESA project. It defines the project name, description, dynamic function entry, static asset hosting strategy, and local development settings. Below are the details of each field.

### Parameter description

| **Parameter**   | **Description**                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **name**        | Target project name. If it exists, deployment goes into it; otherwise, a new project is created.                                             |
| **description** | Project description. Optional, used to briefly document the purpose or functionality.                                                        |
| **entry**       | Dynamic function entry file path, e.g.,`./src/index.ts`. Optional, set only when using a function.                                           |
| **assets**      | Static asset hosting configuration (each Pages project supports only one set of static assets). Includes `directory` and `notFoundStrategy`. |
| **dev**         | Local development configuration. Optional; used to set dev server port and proxy.                                                            |

#### Field structure

- **name**: `string`
  - Project name. Required.
- **description**: `string`
  - Project description. Optional.
- **entry**: `string`
  - Dynamic function entry file path, e.g., `./src/index.ts`. Optional.
- **assets**: `object`
  - Static asset hosting settings. Optional. Includes:
    - **directory**: `string`
      - Build output directory, e.g., `./public`, `./dist`, or `./build`. The directory to be hosted statically.
    - **notFoundStrategy?**: `string`
      - Strategy when a request does not match any static asset. Accepted values:
        - `singlePageApplication`: Return `index.html` from the static directory with `200 OK` (suitable for SPAs).
        - `404Page`: Return `404.html` from the static directory with `404 Not Found`.
- **dev**: `object`
  - Local development settings. Optional. Includes:
    - **port**: `number`
      - Dev server port. Default: `18080`.
    - **localUpstream**: `string`
      - Local upstream proxy URL for development.

> Note: If both a function script and `assets.notFoundStrategy` are configured, navigation requests will not trigger the function script. A navigation request is sent when a user directly visits a page (e.g., entering a URL or clicking a link) and includes the header `Sec-Fetch-Mode: navigate`.

### JSONC example

Below is a typical `esa.jsonc` example for a Vite + React single-page application:

```jsonc
{
  "name": "vite-react-template",
  "assets": {
    "directory": "./dist",
    "notFoundStrategy": "singlePageApplication"
  },
  "dev": {
    "port": 18080
  }
}
```

#### Example notes

- **name**: Sets the project name to `vite-react-template`.
- **assets.directory**: Static asset directory is `./dist` (typical Vite build output).
- **assets.notFoundStrategy**: `singlePageApplication` returns `index.html` when not matched (SPA-friendly).
- **dev.port**: Dev server runs on port `18080`.

### Reference

- [Pages build and routing guide](https://help.aliyun.com/zh/edge-security-acceleration/esa/build-pages)
