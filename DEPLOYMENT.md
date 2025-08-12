# 团队管理效能评估系统 - 部署指南

## 🚀 快速部署

### 方案1：Vercel + Supabase（推荐）

1. **准备数据库**
   - 注册 [Supabase](https://supabase.com)
   - 创建新项目
   - 获取数据库连接字符串

2. **部署到Vercel**
   - 注册 [Vercel](https://vercel.com)
   - 导入GitHub项目
   - 设置环境变量：
     ```
     DATABASE_URL=postgresql://username:password@host:port/database
     NODE_ENV=production
     ```

3. **验证部署**
   - 访问部署后的URL
   - 测试所有功能

### 方案2：Railway

1. **注册Railway**
   - 访问 [Railway](https://railway.app)
   - 使用GitHub账号登录

2. **部署项目**
   - 从GitHub导入项目
   - Railway会自动部署

3. **添加数据库**
   - 在控制台添加PostgreSQL服务
   - Railway会自动配置环境变量

### 方案3：云服务器

1. **购买服务器**
   - 阿里云ECS或腾讯云CVM
   - 推荐配置：2核2G

2. **环境配置**
   ```bash
   # 安装Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # 安装PM2
   npm install -g pm2
   
   # 安装PostgreSQL
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```

3. **部署应用**
   ```bash
   # 克隆项目
   git clone <your-repo-url>
   cd diaoyan_project
   
   # 安装依赖
   npm install
   
   # 配置环境变量
   cp .env.example .env
   # 编辑.env文件
   
   # 启动应用
   pm2 start server-cloud.js --name "team-assessment"
   ```

## 🔧 环境变量配置

创建 `.env` 文件：
```
# 应用配置
PORT=3000
NODE_ENV=production

# 数据库配置
DATABASE_URL=postgresql://username:password@host:port/database
```

## 📋 部署后验证

1. **访问应用**
   - 主页：https://your-domain.com/
   - 管理后台：https://your-domain.com/admin

2. **功能测试**
   - 创建问卷
   - 提交评估
   - 查看结果
   - 导出Excel

3. **数据库检查**
   - 确认数据正常保存
   - 检查连接稳定性

## 🚨 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查DATABASE_URL是否正确
   - 确认数据库服务器可访问

2. **静态文件404**
   - 检查文件路径是否正确
   - 确认express.static配置

3. **端口被占用**
   - 修改PORT环境变量
   - 检查防火墙设置

### 日志查看

```bash
# PM2日志
pm2 logs team-assessment

# 重启应用
pm2 restart team-assessment

# 查看状态
pm2 status
```

## 💡 最佳实践

1. **定期备份**
   - 定期备份数据库
   - 保存部署配置

2. **监控设置**
   - 设置应用监控
   - 配置错误告警

3. **安全配置**
   - 使用HTTPS
   - 配置CORS策略
   - 定期更新依赖

## 📞 技术支持

如有问题，请检查：
1. 控制台日志
2. 网络连接
3. 环境变量配置
4. 数据库连接状态