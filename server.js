const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// 初始化数据库
const db = new sqlite3.Database('assessments.db');

// 创建表
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            survey_id TEXT NOT NULL,
            respondent_name TEXT,
            respondent_team TEXT,
            submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            project_progress_transparency INTEGER,
            requirement_response_speed INTEGER,
            team_collaboration_efficiency INTEGER,
            delivery_quality_stability INTEGER,
            issue_discovery_timeliness INTEGER,
            resource_allocation_efficiency INTEGER,
            continuous_improvement_ability INTEGER,
            information_transmission_effectiveness INTEGER,
            overall_score REAL,
            notes TEXT
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS survey_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            survey_id TEXT UNIQUE NOT NULL,
            survey_name TEXT NOT NULL,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )
    `);
});

// API路由

// 创建新的问卷链接
app.post('/api/surveys', (req, res) => {
    const { surveyName } = req.body;
    const surveyId = uuidv4();
    
    db.run(
        'INSERT INTO survey_links (survey_id, survey_name) VALUES (?, ?)',
        [surveyId, surveyName],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ 
                surveyId, 
                surveyName,
                surveyUrl: `${req.protocol}://${req.get('host')}/index.html?survey=${surveyId}`
            });
        }
    );
});

// 获取所有问卷链接
app.get('/api/surveys', (req, res) => {
    db.all('SELECT * FROM survey_links ORDER BY created_date DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// 提交评估数据
app.post('/api/assessments', (req, res) => {
    const {
        surveyId,
        respondentName,
        respondentTeam,
        scores,
        notes
    } = req.body;
    
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    db.run(
        `INSERT INTO assessments (
            survey_id, respondent_name, respondent_team,
            project_progress_transparency, requirement_response_speed,
            team_collaboration_efficiency, delivery_quality_stability,
            issue_discovery_timeliness, resource_allocation_efficiency,
            continuous_improvement_ability, information_transmission_effectiveness,
            overall_score, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            surveyId, respondentName, respondentTeam,
            scores[0], scores[1], scores[2], scores[3],
            scores[4], scores[5], scores[6], scores[7],
            overallScore, notes
        ],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ 
                id: this.lastID,
                message: '评估提交成功！'
            });
        }
    );
});

// 获取评估结果
app.get('/api/assessments/:surveyId', (req, res) => {
    const surveyId = req.params.surveyId;
    
    db.all(
        'SELECT * FROM assessments WHERE survey_id = ? ORDER BY submission_date DESC',
        [surveyId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// 获取汇总统计
app.get('/api/summary/:surveyId', (req, res) => {
    const surveyId = req.params.surveyId;
    
    db.get(
        `SELECT 
            COUNT(*) as total_responses,
            AVG(overall_score) as average_overall_score,
            AVG(project_progress_transparency) as avg_project_progress,
            AVG(requirement_response_speed) as avg_requirement_response,
            AVG(team_collaboration_efficiency) as avg_collaboration,
            AVG(delivery_quality_stability) as avg_delivery_quality,
            AVG(issue_discovery_timeliness) as avg_issue_discovery,
            AVG(resource_allocation_efficiency) as avg_resource_allocation,
            AVG(continuous_improvement_ability) as avg_improvement,
            AVG(information_transmission_effectiveness) as avg_information_transmission
         FROM assessments WHERE survey_id = ?`,
        [surveyId],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(row);
        }
    );
});

// 导出Excel
app.get('/api/export/:surveyId', async (req, res) => {
    const surveyId = req.params.surveyId;
    
    try {
        // 获取所有数据
        const assessments = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM assessments WHERE survey_id = ? ORDER BY submission_date', [surveyId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        // 创建Excel工作簿
        const workbook = new ExcelJS.Workbook();
        
        // 详细数据工作表
        const detailSheet = workbook.addWorksheet('详细数据');
        detailSheet.columns = [
            { header: '提交时间', key: 'submission_date' },
            { header: '姓名', key: 'respondent_name' },
            { header: '团队', key: 'respondent_team' },
            { header: '项目进度透明度', key: 'project_progress_transparency' },
            { header: '需求响应速度', key: 'requirement_response_speed' },
            { header: '团队协作效率', key: 'team_collaboration_efficiency' },
            { header: '交付质量稳定性', key: 'delivery_quality_stability' },
            { header: '问题发现及时性', key: 'issue_discovery_timeliness' },
            { header: '资源配置效率', key: 'resource_allocation_efficiency' },
            { header: '持续改进能力', key: 'continuous_improvement_ability' },
            { header: '信息传递有效性', key: 'information_transmission_effectiveness' },
            { header: '总体评分', key: 'overall_score' },
            { header: '备注', key: 'notes' }
        ];
        
        detailSheet.addRows(assessments);
        
        // 汇总数据工作表
        const summarySheet = workbook.addWorksheet('汇总统计');
        const dimensions = [
            'project_progress_transparency',
            'requirement_response_speed',
            'team_collaboration_efficiency',
            'delivery_quality_stability',
            'issue_discovery_timeliness',
            'resource_allocation_efficiency',
            'continuous_improvement_ability',
            'information_transmission_effectiveness'
        ];
        
        const dimensionNames = [
            '项目进度透明度',
            '需求响应速度',
            '团队协作效率',
            '交付质量稳定性',
            '问题发现及时性',
            '资源配置效率',
            '持续改进能力',
            '信息传递有效性'
        ];
        
        summarySheet.columns = [
            { header: '维度', key: 'dimension' },
            { header: '平均分', key: 'average' },
            { header: '最低分', key: 'min' },
            { header: '最高分', key: 'max' },
            { header: '标准差', key: 'stddev' }
        ];
        
        dimensions.forEach((dim, index) => {
            const scores = assessments.map(a => a[dim]).filter(s => s !== null);
            if (scores.length > 0) {
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                const min = Math.min(...scores);
                const max = Math.max(...scores);
                const variance = scores.reduce((acc, score) => acc + Math.pow(score - avg, 2), 0) / scores.length;
                const stddev = Math.sqrt(variance);
                
                summarySheet.addRow({
                    dimension: dimensionNames[index],
                    average: avg.toFixed(2),
                    min: min,
                    max: max,
                    stddev: stddev.toFixed(2)
                });
            }
        });
        
        // 设置响应头
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=assessment_${surveyId}.xlsx`);
        
        // 发送文件
        await workbook.xlsx.write(res);
        res.end();
        
    } catch (error) {
        console.error('导出错误:', error);
        res.status(500).json({ error: '导出失败' });
    }
});

// 管理后台页面
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`管理后台: http://localhost:${PORT}/admin`);
});

module.exports = app;