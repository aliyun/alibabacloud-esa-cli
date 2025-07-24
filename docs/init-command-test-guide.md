# ESA CLI Init 命令自测文档

## 概述

本文档提供了 ESA CLI `init` 命令的完整自测指南，包括功能测试、边界条件测试和错误处理测试。

## 命令功能

`init` 命令用于初始化一个新的 EdgeRoutine 项目，主要功能包括：

- 选择项目模板
- 创建项目目录结构
- 安装依赖包
- 构建项目（如果存在构建脚本）
- 初始化 Git 仓库（可选）
- 自动部署到生产环境（可选）

## 测试环境准备

### 1. 环境要求

```bash
# 确保已安装 Node.js 和 npm
node --version
npm --version

# 安装项目依赖
npm install

# 构建项目
npm run build
```

### 2. 测试数据准备

```bash
# 创建测试目录
mkdir -p test-init-commands
cd test-init-commands
```

## 测试用例

### 1. 基础功能测试

#### 1.1 交互式初始化（完整流程）

**测试目标**: 验证完整的交互式初始化流程

**测试步骤**:

```bash
# 运行交互式初始化
esa init

# 预期交互流程：
# 1. 输入项目名称（如：test-project）
# 2. 选择模板
# 3. 选择是否初始化 Git（Yes/No）
# 4. 选择是否部署（Yes/No）
```

**验证点**:

- [ ] 项目目录创建成功
- [ ] 模板文件正确复制
- [ ] esa.toml 配置文件生成
- [ ] 依赖包安装成功
- [ ] 构建脚本执行（如果存在）
- [ ] Git 初始化（如果选择）
- [ ] 部署成功（如果选择）

#### 1.2 指定项目名称初始化

**测试目标**: 验证通过命令行参数指定项目名称

**测试步骤**:

```bash
esa init my-test-project
```

**验证点**:

- [ ] 项目名称验证通过（小写字母、数字、连字符）
- [ ] 项目目录以指定名称创建
- [ ] 跳过项目名称输入提示

#### 1.3 指定模板初始化

**测试目标**: 验证通过命令行参数指定模板

**测试步骤**:

```bash
# 查看可用模板
esa init --help

# 使用指定模板初始化
esa init my-project --template <template-name>
```

**验证点**:

- [ ] 模板存在性验证
- [ ] 跳过模板选择交互
- [ ] 使用指定模板创建项目

### 2. 命令行选项测试

#### 2.1 --yes 选项（自动确认）

**测试目标**: 验证 --yes 选项的自动确认功能

**测试步骤**:

```bash
esa init --yes
```

**验证点**:

- [ ] 自动生成项目名称（edge-routine-<timestamp>）
- [ ] 自动选择第一个可用模板
- [ ] 自动初始化 Git
- [ ] 自动部署（如果已登录）

#### 2.2 --skip 选项（跳过交互）

**测试目标**: 验证 --skip 选项跳过交互功能

**测试步骤**:

```bash
esa init --skip
```

**验证点**:

- [ ] 跳过 Git 初始化交互
- [ ] 跳过部署交互
- [ ] 仅创建项目文件结构

#### 2.3 --config 选项

**测试目标**: 验证 --config 选项生成配置文件

**测试步骤**:

```bash
esa init --config
```

**验证点**:

- [ ] CLI 配置文件生成
- [ ] 配置文件格式正确

### 3. 错误处理测试

#### 3.1 项目名称验证

**测试目标**: 验证项目名称格式验证

**测试步骤**:

```bash
# 测试无效项目名称
esa init A  # 大写字母
esa init 1  # 单个字符
esa init test_project  # 下划线
esa init test project  # 空格
```

**验证点**:

- [ ] 显示错误信息：项目名称必须至少2个字符，只能包含小写字母、数字和连字符
- [ ] 命令执行失败

#### 3.2 项目目录已存在

**测试目标**: 验证项目目录冲突处理

**测试步骤**:

```bash
# 创建同名目录
mkdir test-project
esa init test-project
```

**验证点**:

- [ ] 显示错误信息：项目已存在
- [ ] 提供解决建议（重命名、删除、换目录）
- [ ] 命令执行失败

#### 3.3 模板不存在

**测试目标**: 验证指定模板不存在时的处理

**测试步骤**:

```bash
esa init my-project --template non-existent-template
```

**验证点**:

- [ ] 显示错误信息：模板未找到
- [ ] 提示检查模板名称
- [ ] 命令执行失败

#### 3.4 无可用模板

**测试目标**: 验证无可用模板时的处理

**测试步骤**:

```bash
# 模拟无模板环境（需要修改模板配置）
esa init --yes
```

**验证点**:

- [ ] 显示错误信息：没有可用的模板
- [ ] 命令执行失败

### 4. 模板更新测试

#### 4.1 模板版本检查

**测试目标**: 验证模板版本检查和更新功能

**测试步骤**:

```bash
# 模拟模板版本检查
esa init
```

**验证点**:

- [ ] 检查当前模板版本
- [ ] 检查最新模板版本
- [ ] 提示是否更新（如果版本不同）

#### 4.2 模板自动更新

**测试目标**: 验证模板自动更新功能

**测试步骤**:

```bash
# 在版本检查提示时选择更新
esa init
# 选择 "Yes" 更新模板
```

**验证点**:

- [ ] 删除旧版本模板
- [ ] 下载最新版本模板
- [ ] 更新成功提示

### 5. 依赖管理测试

#### 5.1 依赖安装

**测试目标**: 验证项目依赖自动安装

**测试步骤**:

```bash
esa init test-project
```

**验证点**:

- [ ] 检测 package.json 文件
- [ ] 执行 npm install
- [ ] 安装成功提示

#### 5.2 构建脚本执行

**测试目标**: 验证构建脚本自动执行

**测试步骤**:

```bash
# 使用包含构建脚本的模板
esa init test-project --template <template-with-build>
```

**验证点**:

- [ ] 检测构建脚本
- [ ] 执行 npm run build
- [ ] 构建成功提示

#### 5.3 无构建脚本处理

**测试目标**: 验证无构建脚本时的处理

**测试步骤**:

```bash
# 使用不包含构建脚本的模板
esa init test-project --template <template-without-build>
```

**验证点**:

- [ ] 检测无构建脚本
- [ ] 跳过构建步骤提示

### 6. Git 集成测试

#### 6.1 Git 初始化

**测试目标**: 验证 Git 仓库初始化

**测试步骤**:

```bash
esa init test-project
# 选择 "Yes" 初始化 Git
```

**验证点**:

- [ ] 创建 .git 目录
- [ ] 初始化 Git 仓库
- [ ] 成功提示

#### 6.2 跳过 Git 初始化

**测试目标**: 验证跳过 Git 初始化

**测试步骤**:

```bash
esa init test-project
# 选择 "No" 跳过 Git
```

**验证点**:

- [ ] 不创建 .git 目录
- [ ] 显示跳过提示

### 7. 部署功能测试

#### 7.1 自动部署（已登录）

**测试目标**: 验证已登录状态下的自动部署

**前置条件**: 已登录 ESA 服务

**测试步骤**:

```bash
esa init test-project
# 选择 "Yes" 部署
```

**验证点**:

- [ ] 检查登录状态
- [ ] 创建或更新函数
- [ ] 快速部署成功
- [ ] 显示访问 URL
- [ ] 显示域名生效提示

#### 7.2 自动部署（未登录）

**测试目标**: 验证未登录状态下的部署处理

**前置条件**: 未登录 ESA 服务

**测试步骤**:

```bash
esa init test-project
# 选择 "Yes" 部署
```

**验证点**:

- [ ] 检查登录状态
- [ ] 显示未登录警告
- [ ] 提示稍后手动部署

#### 7.3 跳过部署

**测试目标**: 验证跳过部署选项

**测试步骤**:

```bash
esa init test-project
# 选择 "No" 跳过部署
```

**验证点**:

- [ ] 不执行部署流程
- [ ] 显示后续部署指导

### 8. 多语言支持测试

#### 8.1 中文界面

**测试目标**: 验证中文界面显示

**测试步骤**:

```bash
# 设置中文语言
esa lang zh_CN
esa init test-project
```

**验证点**:

- [ ] 所有提示信息显示中文
- [ ] 模板名称显示中文
- [ ] 错误信息显示中文

#### 8.2 英文界面

**测试目标**: 验证英文界面显示

**测试步骤**:

```bash
# 设置英文语言
esa lang en
esa init test-project
```

**验证点**:

- [ ] 所有提示信息显示英文
- [ ] 模板名称显示英文
- [ ] 错误信息显示英文

## 性能测试

### 1. 大模板处理

**测试目标**: 验证大模板的处理性能

**测试步骤**:

```bash
# 使用包含大量文件的大模板
esa init test-project --template <large-template>
```

**验证点**:

- [ ] 文件复制速度合理
- [ ] 内存使用正常
- [ ] 不出现超时错误

### 2. 网络依赖安装

**测试目标**: 验证网络依赖安装性能

**测试步骤**:

```bash
# 使用包含大量依赖的模板
esa init test-project --template <template-with-many-deps>
```

**验证点**:

- [ ] 依赖安装速度合理
- [ ] 网络超时处理
- [ ] 安装失败重试机制

## 清理测试

### 1. 测试数据清理

**测试步骤**:

```bash
# 清理测试项目
rm -rf test-*
rm -rf my-test-project
rm -rf my-project
```

### 2. 环境恢复

**测试步骤**:

```bash
# 恢复语言设置（如果需要）
esa lang en

# 清理临时文件
rm -rf .esa-temp-*
```

## 测试报告模板

### 测试执行记录

| 测试用例       | 执行时间         | 结果      | 备注 |
| -------------- | ---------------- | --------- | ---- |
| 基础功能测试   | YYYY-MM-DD HH:MM | PASS/FAIL |      |
| 命令行选项测试 | YYYY-MM-DD HH:MM | PASS/FAIL |      |
| 错误处理测试   | YYYY-MM-DD HH:MM | PASS/FAIL |      |
| 模板更新测试   | YYYY-MM-DD HH:MM | PASS/FAIL |      |
| 依赖管理测试   | YYYY-MM-DD HH:MM | PASS/FAIL |      |
| Git 集成测试   | YYYY-MM-DD HH:MM | PASS/FAIL |      |
| 部署功能测试   | YYYY-MM-DD HH:MM | PASS/FAIL |      |
| 多语言支持测试 | YYYY-MM-DD HH:MM | PASS/FAIL |      |
| 性能测试       | YYYY-MM-DD HH:MM | PASS/FAIL |      |

### 问题记录

| 问题描述 | 严重程度 | 复现步骤 | 状态 |
| -------- | -------- | -------- | ---- |
|          |          |          |      |

## 自动化测试脚本

### 基础测试脚本

```bash
#!/bin/bash
# init-command-test.sh

set -e

echo "开始 ESA CLI Init 命令测试..."

# 清理环境
cleanup() {
    echo "清理测试环境..."
    rm -rf test-*
    rm -rf my-test-project
    rm -rf my-project
}

trap cleanup EXIT

# 测试用例
echo "1. 测试项目名称验证..."
esa init A 2>&1 | grep -q "项目名称必须至少2个字符" || exit 1

echo "2. 测试指定项目名称..."
esa init test-project --skip
[ -d "test-project" ] || exit 1

echo "3. 测试 --yes 选项..."
esa init --yes --skip
[ -d "edge-routine-"* ] || exit 1

echo "4. 测试 --template 选项..."
esa init template-test --template <valid-template> --skip
[ -d "template-test" ] || exit 1

echo "所有测试通过！"
```

### 运行自动化测试

```bash
# 给脚本执行权限
chmod +x init-command-test.sh

# 运行测试
./init-command-test.sh
```

## 注意事项

1. **环境隔离**: 测试时确保在独立的测试目录中进行，避免影响现有项目
2. **网络依赖**: 部分测试需要网络连接，确保网络环境正常
3. **权限要求**: 某些操作可能需要管理员权限，确保有足够权限
4. **数据备份**: 测试前备份重要数据，避免意外丢失
5. **版本兼容**: 确保测试的 CLI 版本与文档版本一致

## 联系支持

如果在测试过程中遇到问题，请：

1. 记录详细的错误信息和复现步骤
2. 检查环境配置和依赖版本
3. 查看项目 Issues 或提交新的 Issue
4. 联系开发团队获取支持
