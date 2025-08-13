# CI/CD 配置说明

## 概述

本项目配置了完整的 CI/CD 流水线，包括自动化测试、安全检查和部署。

## 配置文件

### 1. GitHub Actions 工作流

#### 主要工作流文件：

- `.github/workflows/ci-cd.yml` - 完整的 CI/CD 流水线
- `.github/workflows/test.yml` - 简化的测试和代码检查
- `.github/workflows/deploy-render.yml` - Render 平台自动部署

#### 工作流触发条件：

- **推送代码**：main, master, develop 分支
- **拉取请求**：main, master 分支
- **手动触发**：可通过 GitHub Actions 手动运行

### 2. 自动化依赖更新

- `.github/dependabot.yml` - 自动依赖更新配置
  - 每周检查 npm 包更新
  - 每月检查 GitHub Actions 更新
  - 自动创建 PR 更新依赖

### 3. 部署配置

#### Render 部署
- `render.yaml` - Render 平台配置
- 自动部署：推送到 main/master 分支时自动触发

#### Vercel 部署
- `vercel.json` - Vercel 平台配置
- 自动部署：推送到 main/master 分支时自动触发

## CI/CD 流程

### 1. 代码检查阶段
- **语法检查**：检查 JavaScript 文件语法
- **依赖验证**：验证 package.json 配置
- **安全扫描**：npm audit 安全检查

### 2. 测试阶段
- **单元测试**：运行自定义测试脚本
- **集成测试**：测试服务器启动和数据库配置
- **配置验证**：验证所有配置文件

### 3. 构建阶段
- **依赖安装**：npm ci 安装依赖
- **应用构建**：运行构建脚本
- **文件打包**：准备部署文件

### 4. 部署阶段
- **Render 部署**：自动部署到 Render 平台
- **Vercel 部署**：自动部署到 Vercel 平台
- **状态通知**：部署结果通知

## 使用方法

### 本地测试

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 运行安全检查
npm audit

# 运行部署脚本
./deploy.sh
```

### 手动触发部署

1. 推送代码到 main/master 分支
2. 或在 GitHub Actions 页面手动运行工作流

### 监控部署

- **Render**：查看 Render 控制台
- **Vercel**：查看 Vercel 控制台
- **GitHub**：查看 GitHub Actions 日志

## 环境变量

确保在部署平台配置以下环境变量：

```env
NODE_ENV=production
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_PORT=5432
```

## 故障排除

### 常见问题

1. **依赖安装失败**
   ```bash
   npm run clean
   npm install
   ```

2. **测试失败**
   ```bash
   npm test
   # 查看详细错误信息
   ```

3. **部署失败**
   - 检查 GitHub Actions 日志
   - 验证环境变量配置
   - 确认部署平台连接状态

### 日志查看

- GitHub Actions：仓库 → Actions → 选择工作流
- Render：Render 控制台 → Services → Logs
- Vercel：Vercel 控制台 → Projects → Logs

## 最佳实践

1. **代码提交**
   - 遵循语义化版本控制
   - 编写清晰的提交信息
   - 及时处理 CI/CD 失败

2. **依赖管理**
   - 定期更新依赖
   - 关注安全漏洞
   - 测试新版本兼容性

3. **部署策略**
   - 先在测试环境验证
   - 逐步部署到生产环境
   - 监控部署后状态

## 联系方式

如有问题，请检查：
1. GitHub Actions 日志
2. 部署平台控制台
3. 项目 README 文档