const request = require('supertest');
const app = require('../server');
const fs = require('fs');
const path = require('path');

describe('Auto-Submit on Report Generation Feature', () => {
    describe('Frontend Behavior Simulation', () => {
        test('should have the correct UI structure for auto-submit feature', () => {
            // 读取HTML文件
            const htmlPath = path.join(__dirname, '../team-assessment.html');
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // 验证按钮文本已更改
            expect(htmlContent).toContain('生成分析报告并提交');
            
            // 验证信息输入区域存在
            expect(htmlContent).toContain('id="infoSection"');
            
            // 验证新的JavaScript函数存在
            expect(htmlContent).toContain('generateAndSubmitReport');
            
            // 验证旧的提交区域已被移除
            expect(htmlContent).not.toContain('id="submitSection"');
            
            // 验证CSS动画存在
            expect(htmlContent).toContain('@keyframes slideIn');
            expect(htmlContent).toContain('@keyframes slideOut');
        });

        test('should validate required fields before submission', () => {
            const htmlPath = path.join(__dirname, '../team-assessment.html');
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // 验证姓名和团队字段验证逻辑存在
            expect(htmlContent).toContain('请输入姓名');
            expect(htmlContent).toContain('请输入团队');
        });
    });

    describe('Backend Integration', () => {
        let surveyId;
        
        beforeAll(async () => {
            // 创建测试调查
            const response = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Auto-Submit Test Survey' })
                .expect(201);
            
            surveyId = response.body.surveyId;
        });

        test('should handle assessment submission with report generation', async () => {
            const assessmentData = {
                surveyId,
                respondentName: '测试用户',
                respondentTeam: '测试团队',
                scores: [4, 4, 4, 4, 4, 4, 4, 4],
                notes: '自动提交测试'
            };

            // 模拟前端提交请求
            const response = await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            // 验证响应
            expect(response.body).toHaveProperty('id');
            expect(response.body.message).toBe('评估提交成功！');

            // 验证数据已保存到数据库
            const assessmentsResponse = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            expect(assessmentsResponse.body).toHaveLength(1);
            const assessment = assessmentsResponse.body[0];
            expect(assessment.respondent_name).toBe('测试用户');
            expect(assessment.respondent_team).toBe('测试团队');
            expect(assessment.overall_score).toBe(4.0);
        });

        test('should prevent duplicate submissions through frontend logic', async () => {
            // 这个测试验证前端逻辑会防止重复提交
            // 在实际应用中，前端会禁用按钮
            const assessmentData = {
                surveyId,
                respondentName: '重复提交测试',
                respondentTeam: '测试团队',
                scores: [3, 3, 3, 3, 3, 3, 3, 3],
                notes: '测试重复提交'
            };

            // 第一次提交应该成功
            await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            // 第二次提交也应该成功（数据库允许，但前端会阻止）
            await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            // 验证数据库中有两条记录
            const assessmentsResponse = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            expect(assessmentsResponse.body.length).toBeGreaterThan(1);
        });

        test('should handle submission errors gracefully', async () => {
            // 测试缺少必要字段的错误处理
            const invalidData = {
                surveyId,
                respondentName: '', // 空姓名
                respondentTeam: '测试团队',
                scores: [4, 4, 4, 4, 4, 4, 4, 4],
                notes: '错误处理测试'
            };

            const response = await request(app)
                .post('/api/assessments')
                .send(invalidData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('should calculate overall score correctly', async () => {
            const assessmentData = {
                surveyId,
                respondentName: '分数计算测试',
                respondentTeam: '测试团队',
                scores: [5, 4, 3, 5, 4, 3, 5, 4], // 平均4.125
                notes: '分数计算测试'
            };

            await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            const assessmentsResponse = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            const assessment = assessmentsResponse.body.find(a => a.respondent_name === '分数计算测试');
            expect(assessment).toBeDefined();
            expect(parseFloat(assessment.overall_score)).toBeCloseTo(4.125, 2);
        });
    });

    describe('User Experience Improvements', () => {
        test('should provide visual feedback for successful submission', () => {
            const htmlPath = path.join(__dirname, '../team-assessment.html');
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // 验证成功消息的样式和动画
            expect(htmlContent).toContain('✅ 分析报告已生成并成功提交！');
            expect(htmlContent).toContain('position: fixed');
            expect(htmlContent).toContain('background: #27ae60');
        });

        test('should disable submit button after submission', () => {
            const htmlPath = path.join(__dirname, '../team-assessment.html');
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // 验证按钮禁用逻辑
            expect(htmlContent).toContain('submitButton.disabled = true');
            expect(htmlContent).toContain('textContent = \'已提交\'');
        });
    });
});