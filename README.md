# 团队管理效能评估问卷系统

一个完整的在线问卷系统，可以将团队管理效能评估通过链接发给他人填写，并在后台查看汇总结果。

## 功能特点

- 📝 **在线问卷填写**：美观的界面，支持8个维度的评估
- 🔗 **链接分享**：生成独特的问卷链接，方便分享
- 📊 **实时汇总**：自动计算平均分和统计信息
- 📈 **可视化图表**：直观展示各维度评分
- 📋 **管理后台**：查看所有提交的数据
- 📁 **数据导出**：支持导出Excel格式
- 💾 **数据存储**：使用SQLite数据库存储所有数据

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动服务器
```bash
npm start
```

或使用开发模式（支持热重载）：
```bash
npm run dev
```

### 3. 访问系统

- **管理后台**：http://localhost:3000/admin
- **问卷页面**：http://localhost:3000/团队管理效能评估轮.html

## 使用说明

### 管理员操作

1. **创建问卷**
   - 访问管理后台：http://localhost:3000/admin
   - 输入问卷名称（如：2024年第一季度团队评估）
   - 点击"创建问卷"

2. **分享问卷**
   - 在问卷列表中找到刚创建的问卷
   - 点击"复制链接"获取问卷链接
   - 将链接发送给需要填写的人员

3. **查看结果**
   - 在问卷列表中点击"查看结果"
   - 查看汇总统计和可视化图表
   - 导出Excel数据进行进一步分析

### 填写者操作

1. **填写问卷**
   - 点击收到的问卷链接
   - 为每个维度打分（1-5分）
   - 点击"生成分析报告"查看个人结果

2. **提交数据**
   - 填写姓名和团队信息
   - 可添加备注信息
   - 点击"提交评估"

## 技术架构

- **后端**：Node.js + Express
- **数据库**：SQLite
- **前端**：HTML + CSS + JavaScript
- **图表**：Canvas API
- **导出**：ExcelJS

## 文件结构

```
diaoyan_project/
├── package.json              # 项目配置文件
├── server.js                 # 后端服务器
├── admin.html               # 管理后台页面
├── 团队管理效能评估轮.html    # 问卷页面
├── assessments.db            # 数据库文件（自动创建）
└── node_modules/            # 依赖包
```

## API接口

### 问卷管理
- `POST /api/surveys` - 创建新问卷
- `GET /api/surveys` - 获取问卷列表

### 数据提交
- `POST /api/assessments` - 提交评估数据

### 数据查询
- `GET /api/assessments/:surveyId` - 获取评估结果
- `GET /api/summary/:surveyId` - 获取汇总统计
- `GET /api/export/:surveyId` - 导出Excel数据

## 数据库结构

### survey_links 表
- id: 主键
- survey_id: 问卷唯一标识
- survey_name: 问卷名称
- created_date: 创建时间
- is_active: 是否活跃

### assessments 表
- id: 主键
- survey_id: 问卷ID
- respondent_name: 填写人姓名
- respondent_team: 填写人团队
- submission_date: 提交时间
- 8个维度的评分字段
- overall_score: 总体评分
- notes: 备注

## 端口配置

默认端口：3000

可以通过环境变量修改：
```bash
PORT=8080 npm start
```

## 注意事项

1. 确保系统已安装Node.js（建议版本14+）
2. 首次运行会自动创建数据库文件
3. 数据库文件`assessments.db`会自动创建在项目根目录
4. 建议定期备份数据库文件

## 故障排除

### 端口被占用
```bash
lsof -ti:3000 | xargs kill -9
```

### 重新安装依赖
```bash
rm -rf node_modules package-lock.json
npm install
```

### 清理数据库
```bash
rm assessments.db
```

## 扩展功能

系统支持以下扩展：
- 添加用户认证
- 邮件通知功能
- 更多图表类型
- 数据导入功能
- 多语言支持

## 许可证

MIT License