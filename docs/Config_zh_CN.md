# ESA 配置文件说明

本文档介绍 ESA（Edge Security Acceleration）项目的配置文件 `esa.jsonc` 的结构、参数说明及示例，旨在帮助开发者快速配置和管理 ESA 项目。

## 项目配置文件（esa.jsonc）

`esa.jsonc` 是 ESA 项目的核心配置文件，用于定义项目的名称、描述、入口文件、静态资源托管方式以及本地开发工具的配置。以下是配置文件中各字段的详细说明。

### 参数说明

| **参数**        | **说明**                                                                                             |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| **name**        | 目标项目名称。若项目已存在，则部署到该项目；若不存在，则以此名称创建新项目。                         |
| **description** | 项目描述，可选字段，用于简要说明项目功能或用途。                                                     |
| **entry**       | 动态函数入口文件路径，例如 `./src/index.ts`。可选字段，用于指定动态函数的入口。                      |
| **assets**      | 静态资源托管配置（每个 Pages 项目仅支持一组静态资源）。包含 `directory` 和 `notFoundStrategy` 字段。 |
| **dev**         | 本地开发工具配置，可选字段，用于设置开发服务器端口和代理地址。                                       |

#### 字段结构

- **name**: `string`
  - 项目名称，必填字段，用于标识项目。
- **description**: `string`
  - 项目描述，可选字段，用于记录项目的功能或用途。
- **entry**: `string`
  - 动态函数入口文件路径，例如 `./src/index.ts`。可选字段，仅在需要动态函数时配置。
- **assets?**: `object`
  - 静态资源托管配置，可选字段，包含以下子字段：
    - **directory**: `string`
      - 构建输出目录，例如 `./public`、 `./dist` 或 `./build`。指定静态资源托管的目录。
    - **notFoundStrategy**: `string`
      - 当请求路径未匹配到静态资源时的处理策略，可选值：
        - `singlePageApplication`: 返回静态目录中的 `index.html`，状态码为 `200 OK`（适用于单页应用）。
        - `404Page`: 返回静态目录中的 `404.html`，状态码为 `404 Not Found`。
- **dev**: `object`
  - 本地开发工具配置，可选字段，包含以下子字段：
    - **port?**: `number`
      - 开发服务器端口，默认值为 `18080`。
    - **localUpstream?**: `string`
      - 本地上游代理地址，用于本地开发时的代理设置。

### JSONC 示例

以下是一个典型的 `esa.jsonc` 配置文件示例，展示了如何配置一个基于 Vite 和 React 的单页应用项目：

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

#### 示例说明

- **name**: 指定项目名称为 `vite-react-template`。
- **assets.directory**: 静态资源托管目录为 `./dist`，通常是 Vite 构建后的输出目录。
- **assets.notFoundStrategy**: 配置为 `singlePageApplication`，表示未找到资源时返回 `index.html`，适用于单页应用。
- **dev.port**: 本地开发服务器运行在端口 `18080`。

### 相关文档

- [Pages 构建和路由指南](https://help.aliyun.com/zh/edge-security-acceleration/esa/build-pages)
