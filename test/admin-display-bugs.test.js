const request = require('supertest');
const app = require('../server');
const sqlite3 = require('sqlite3').verbose();

describe('后台显示问题修复测试', () => {
    let testDb;
    const TEST_DB_FILE = 'test_admin_display.db';

    beforeAll(async () => {
        // 设置测试环境变量
        process.env.NODE_ENV = 'test';
        process.env.PORT = '3003';
        
        // 使用测试数据库
        testDb = new sqlite3.Database(TEST_DB_FILE);
        
        await new Promise((resolve) => {
            testDb.serialize(() => {
                testDb.run(`
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
                
                testDb.run(`
                    CREATE TABLE IF NOT EXISTS survey_links (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        survey_id TEXT UNIQUE NOT NULL,
                        survey_name TEXT NOT NULL,
                        created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1
                    )
                `, resolve);
            });
        });
    });

    afterAll(async () => {
        if (testDb) {
            await new Promise(resolve => testDb.close(resolve));
        }
        // 清理测试数据库文件
        const fs = require('fs');
        if (fs.existsSync(TEST_DB_FILE)) {
            fs.unlinkSync(TEST_DB_FILE);
        }
    });

    beforeEach(async () => {
        // 清空所有表数据，确保每个测试都是干净的
        await new Promise(resolve => {
            testDb.run('DELETE FROM assessments', resolve);
        });
        await new Promise(resolve => {
            testDb.run('DELETE FROM survey_links', resolve);
        });
        await new Promise(resolve => {
            testDb.run('DELETE FROM sqlite_sequence WHERE name="assessments"', resolve);
        });
        await new Promise(resolve => {
            testDb.run('DELETE FROM sqlite_sequence WHERE name="survey_links"', resolve);
        });
    });

    describe('缺陷1: 汇总数据显示异常', () => {
        test('应该正确计算并返回汇总统计数据', async () => {
            // 1. 创建问卷
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '测试汇总数据显示' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 2. 提交多个评估数据
            const assessments = [
                {
                    surveyId,
                    respondentName: '用户A',
                    respondentTeam: '团队A',
                    scores: [5, 4, 5, 4, 5, 4, 5, 4],
                    notes: '测试数据1'
                },
                {
                    surveyId,
                    respondentName: '用户B',
                    respondentTeam: '团队B',
                    scores: [3, 3, 3, 3, 3, 3, 3, 3],
                    notes: '测试数据2'
                },
                {
                    surveyId,
                    respondentName: '用户C',
                    respondentTeam: '团队C',
                    scores: [4, 5, 4, 5, 4, 5, 4, 5],
                    notes: '测试数据3'
                }
            ];

            for (const assessment of assessments) {
                await request(app)
                    .post('/api/assessments')
                    .send(assessment)
                    .expect(201);
            }

            // 3. 获取汇总数据
            const summaryResponse = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            const summary = summaryResponse.body;

            // 4. 验证汇总数据正确性
            expect(summary.total_responses).toBe(3);
            expect(summary.average_overall_score).not.toBeNull();
            expect(parseFloat(summary.average_overall_score)).toBeCloseTo(4.0, 1); // (4.5 + 3.0 + 4.5) / 3 = 4.0
            
            // 验证各维度平均值
            expect(parseFloat(summary.avg_project_progress)).toBeCloseTo(4.0, 1); // (5 + 3 + 4) / 3 = 4.0
            expect(parseFloat(summary.avg_requirement_response)).toBeCloseTo(4.0, 1); // (4 + 3 + 5) / 3 = 4.0
            expect(parseFloat(summary.avg_collaboration)).toBeCloseTo(4.0, 1); // (5 + 3 + 4) / 3 = 4.0
            expect(parseFloat(summary.avg_delivery_quality)).toBeCloseTo(4.0, 1); // (4 + 3 + 5) / 3 = 4.0
            expect(parseFloat(summary.avg_issue_discovery)).toBeCloseTo(4.0, 1); // (5 + 3 + 4) / 3 = 4.0
            expect(parseFloat(summary.avg_resource_allocation)).toBeCloseTo(4.0, 1); // (4 + 3 + 5) / 3 = 4.0
            expect(parseFloat(summary.avg_improvement)).toBeCloseTo(4.0, 1); // (5 + 3 + 4) / 3 = 4.0
            expect(parseFloat(summary.avg_information_transmission)).toBeCloseTo(4.0, 1); // (4 + 3 + 5) / 3 = 4.0
        });

        test('应该正确处理单个评估的汇总数据', async () => {
            // 1. 创建问卷
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '单个评估测试' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 2. 提交单个评估
            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId,
                    respondentName: '单个用户',
                    respondentTeam: '单个团队',
                    scores: [5, 5, 5, 5, 5, 5, 5, 5],
                    notes: '单个评估测试'
                })
                .expect(201);

            // 3. 获取汇总数据
            const summaryResponse = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            const summary = summaryResponse.body;

            // 4. 验证汇总数据
            expect(summary.total_responses).toBe(1);
            expect(parseFloat(summary.average_overall_score)).toBe(5.0);
            expect(parseFloat(summary.avg_project_progress)).toBe(5.0);
            expect(parseFloat(summary.avg_requirement_response)).toBe(5.0);
            expect(parseFloat(summary.avg_collaboration)).toBe(5.0);
            expect(parseFloat(summary.avg_delivery_quality)).toBe(5.0);
            expect(parseFloat(summary.avg_issue_discovery)).toBe(5.0);
            expect(parseFloat(summary.avg_resource_allocation)).toBe(5.0);
            expect(parseFloat(summary.avg_improvement)).toBe(5.0);
            expect(parseFloat(summary.avg_information_transmission)).toBe(5.0);
        });
    });

    describe('缺陷2: 空数据处理逻辑问题', () => {
        test('应该正确处理没有评估数据的问卷', async () => {
            // 1. 创建问卷但不提交任何评估
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '空数据测试问卷' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 2. 获取汇总数据
            const summaryResponse = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            const summary = summaryResponse.body;

            // 3. 验证空数据处理
            expect(summary.total_responses).toBe(0);
            expect(summary.average_overall_score).toBeNull();
            expect(summary.avg_project_progress).toBeNull();
            expect(summary.avg_requirement_response).toBeNull();
            expect(summary.avg_collaboration).toBeNull();
            expect(summary.avg_delivery_quality).toBeNull();
            expect(summary.avg_issue_discovery).toBeNull();
            expect(summary.avg_resource_allocation).toBeNull();
            expect(summary.avg_improvement).toBeNull();
            expect(summary.avg_information_transmission).toBeNull();

            // 4. 验证数据结构完整性
            expect(summary).toHaveProperty('total_responses');
            expect(summary).toHaveProperty('average_overall_score');
            expect(summary).toHaveProperty('avg_project_progress');
            expect(summary).toHaveProperty('avg_requirement_response');
            expect(summary).toHaveProperty('avg_collaboration');
            expect(summary).toHaveProperty('avg_delivery_quality');
            expect(summary).toHaveProperty('avg_issue_discovery');
            expect(summary).toHaveProperty('avg_resource_allocation');
            expect(summary).toHaveProperty('avg_improvement');
            expect(summary).toHaveProperty('avg_information_transmission');
        });

        test('应该正确处理不存在的问卷ID', async () => {
            // 测试不存在的问卷ID
            const response = await request(app)
                .get('/api/summary/non-existent-survey-id')
                .expect(200);

            const summary = response.body;

            // 应该返回空数据结构
            expect(summary.total_responses).toBe(0);
            expect(summary.average_overall_score).toBeNull();
            expect(summary.avg_project_progress).toBeNull();
            expect(summary.avg_requirement_response).toBeNull();
            expect(summary.avg_collaboration).toBeNull();
            expect(summary.avg_delivery_quality).toBeNull();
            expect(summary.avg_issue_discovery).toBeNull();
            expect(summary.avg_resource_allocation).toBeNull();
            expect(summary.avg_improvement).toBeNull();
            expect(summary.avg_information_transmission).toBeNull();
        });

        test('应该正确获取空问卷的详细数据', async () => {
            // 1. 创建问卷但不提交任何评估
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '空详细数据测试' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 2. 获取详细数据
            const assessmentsResponse = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            // 3. 验证返回空数组
            expect(assessmentsResponse.body).toEqual([]);
            expect(Array.isArray(assessmentsResponse.body)).toBe(true);
        });
    });

    describe('数据一致性问题', () => {
        test('汇总数据与详细数据应该保持一致', async () => {
            // 1. 创建问卷
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '数据一致性测试' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 2. 提交评估数据
            const assessmentData = {
                surveyId,
                respondentName: '一致性测试用户',
                respondentTeam: '一致性测试团队',
                scores: [4, 4, 4, 4, 4, 4, 4, 4],
                notes: '数据一致性测试'
            };

            await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            // 3. 获取汇总数据
            const summaryResponse = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            // 4. 获取详细数据
            const assessmentsResponse = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            const summary = summaryResponse.body;
            const assessments = assessmentsResponse.body;

            // 5. 验证数据一致性
            expect(summary.total_responses).toBe(assessments.length);
            expect(summary.total_responses).toBe(1);

            if (assessments.length > 0) {
                const assessment = assessments[0];
                expect(parseFloat(summary.average_overall_score)).toBe(assessment.overall_score);
                expect(parseFloat(summary.avg_project_progress)).toBe(assessment.project_progress_transparency);
                expect(parseFloat(summary.avg_requirement_response)).toBe(assessment.requirement_response_speed);
                expect(parseFloat(summary.avg_collaboration)).toBe(assessment.team_collaboration_efficiency);
                expect(parseFloat(summary.avg_delivery_quality)).toBe(assessment.delivery_quality_stability);
                expect(parseFloat(summary.avg_issue_discovery)).toBe(assessment.issue_discovery_timeliness);
                expect(parseFloat(summary.avg_resource_allocation)).toBe(assessment.resource_allocation_efficiency);
                expect(parseFloat(summary.avg_improvement)).toBe(assessment.continuous_improvement_ability);
                expect(parseFloat(summary.avg_information_transmission)).toBe(assessment.information_transmission_effectiveness);
            }
        });
    });
});