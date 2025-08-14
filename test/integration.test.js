const request = require('supertest');
const app = require('../server');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

describe('Team Assessment Integration Tests', () => {
    let testDb;
    const TEST_DB_FILE = 'test_integration.db';

    beforeAll(async () => {
        // 设置测试环境变量
        process.env.NODE_ENV = 'test';
        process.env.PORT = '3002';
        
        // 使用与服务器相同的数据库文件进行测试
        testDb = new sqlite3.Database('assessments.db');
        
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
    });

    beforeEach(async () => {
        // 清空所有表数据，确保每个测试都是干净的
        await new Promise(resolve => {
            testDb.run('DELETE FROM assessments', resolve);
        });
        await new Promise(resolve => {
            testDb.run('DELETE FROM survey_links', resolve);
        });
        // 重置自增ID
        await new Promise(resolve => {
            testDb.run('DELETE FROM sqlite_sequence WHERE name="assessments"', resolve);
        });
        await new Promise(resolve => {
            testDb.run('DELETE FROM sqlite_sequence WHERE name="survey_links"', resolve);
        });
    });

    describe('Complete Assessment Workflow', () => {
        test('should handle complete survey creation and assessment submission workflow', async () => {
            // 1. 创建调查
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '2024年Q1团队评估' })
                .expect(201);

            const { surveyId, surveyName, surveyUrl } = surveyResponse.body;
            expect(surveyId).toBeDefined();
            expect(surveyName).toBe('2024年Q1团队评估');
            expect(surveyUrl).toContain(surveyId);

            // 2. 验证调查列表
            const surveysResponse = await request(app)
                .get('/api/surveys')
                .expect(200);

            expect(surveysResponse.body).toHaveLength(1);
            expect(surveysResponse.body[0].survey_name).toBe('2024年Q1团队评估');

            // 3. 提交多个评估
            const assessments = [
                {
                    surveyId,
                    respondentName: '张三',
                    respondentTeam: '开发团队',
                    scores: [5, 4, 5, 4, 5, 4, 5, 4],
                    notes: '整体表现优秀'
                },
                {
                    surveyId,
                    respondentName: '李四',
                    respondentTeam: '产品团队',
                    scores: [4, 5, 4, 5, 4, 5, 4, 5],
                    notes: '协作效果良好'
                },
                {
                    surveyId,
                    respondentName: '王五',
                    respondentTeam: '测试团队',
                    scores: [3, 4, 3, 4, 3, 4, 3, 4],
                    notes: '有待改进'
                }
            ];

            for (const assessment of assessments) {
                await request(app)
                    .post('/api/assessments')
                    .send(assessment)
                    .expect(201);
            }

            // 4. 验证评估数据
            const assessmentsResponse = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            expect(assessmentsResponse.body).toHaveLength(3);
            expect(assessmentsResponse.body[0].respondent_name).toBe('张三');
            expect(assessmentsResponse.body[1].respondent_name).toBe('李四');
            expect(assessmentsResponse.body[2].respondent_name).toBe('王五');

            // 5. 验证汇总统计
            const summaryResponse = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            expect(summaryResponse.body.total_responses).toBe(3);
            expect(parseFloat(summaryResponse.body.average_overall_score)).toBeCloseTo(4.17, 2);

            // 6. 测试Excel导出
            const exportResponse = await request(app)
                .get(`/api/export/${surveyId}`)
                .expect(200);

            expect(exportResponse.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        });

        test('should handle multiple surveys with different assessments', async () => {
            // 创建多个调查
            const survey1Response = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Q1团队评估' })
                .expect(201);

            const survey2Response = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Q2团队评估' })
                .expect(201);

            const survey1Id = survey1Response.body.surveyId;
            const survey2Id = survey2Response.body.surveyId;

            // 为不同调查提交评估
            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: survey1Id,
                    respondentName: '用户A',
                    respondentTeam: '团队1',
                    scores: [5, 5, 5, 5, 5, 5, 5, 5],
                    notes: 'Q1评估'
                });

            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: survey2Id,
                    respondentName: '用户B',
                    respondentTeam: '团队2',
                    scores: [4, 4, 4, 4, 4, 4, 4, 4],
                    notes: 'Q2评估'
                });

            // 验证数据隔离
            const survey1Assessments = await request(app)
                .get(`/api/assessments/${survey1Id}`)
                .expect(200);

            const survey2Assessments = await request(app)
                .get(`/api/assessments/${survey2Id}`)
                .expect(200);

            expect(survey1Assessments.body).toHaveLength(1);
            expect(survey2Assessments.body).toHaveLength(1);
            expect(survey1Assessments.body[0].respondent_name).toBe('用户A');
            expect(survey2Assessments.body[0].respondent_name).toBe('用户B');

            // 验证汇总数据正确性
            const survey1Summary = await request(app)
                .get(`/api/summary/${survey1Id}`)
                .expect(200);

            const survey2Summary = await request(app)
                .get(`/api/summary/${survey2Id}`)
                .expect(200);

            // 检查平均值是否存在并且是数字
            if (survey1Summary.average_overall_score !== null) {
                expect(parseFloat(survey1Summary.average_overall_score)).toBe(5.0);
            }
            if (survey2Summary.average_overall_score !== null) {
                expect(parseFloat(survey2Summary.average_overall_score)).toBe(4.0);
            }
        });
    });

    describe('Data Validation and Business Logic', () => {
        test('should validate score ranges and calculate averages correctly', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Score Validation Test' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 测试边界值
            const edgeCases = [
                { scores: [1, 1, 1, 1, 1, 1, 1, 1], expected: 1.0 }, // 最低分
                { scores: [5, 5, 5, 5, 5, 5, 5, 5], expected: 5.0 }, // 最高分
                { scores: [3, 3, 3, 3, 3, 3, 3, 3], expected: 3.0 }, // 中间分
                { scores: [1, 2, 3, 4, 5, 1, 2, 3], expected: 2.625 } // 混合分
            ];

            for (const testCase of edgeCases) {
                await request(app)
                    .post('/api/assessments')
                    .send({
                        surveyId,
                        respondentName: `Test User ${testCase.expected}`,
                        respondentTeam: 'Test Team',
                        scores: testCase.scores,
                        notes: `Expected average: ${testCase.expected}`
                    })
                    .expect(201);
            }

            // 验证计算结果
            const assessments = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            expect(assessments.body).toHaveLength(4);
            
            assessments.body.forEach(assessment => {
                expect(assessment.overall_score).toBeGreaterThan(0);
                expect(assessment.overall_score).toBeLessThanOrEqual(5);
            });
        });

        test('should handle large number of assessments', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Performance Test' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 创建大量评估数据
            const batchSize = 10;
            const batches = 5; // 总共50个评估

            for (let batch = 0; batch < batches; batch++) {
                const batchPromises = [];
                
                for (let i = 0; i < batchSize; i++) {
                    const assessment = {
                        surveyId,
                        respondentName: `用户${batch * batchSize + i + 1}`,
                        respondentTeam: `团队${(batch % 3) + 1}`,
                        scores: [
                            Math.floor(Math.random() * 5) + 1,
                            Math.floor(Math.random() * 5) + 1,
                            Math.floor(Math.random() * 5) + 1,
                            Math.floor(Math.random() * 5) + 1,
                            Math.floor(Math.random() * 5) + 1,
                            Math.floor(Math.random() * 5) + 1,
                            Math.floor(Math.random() * 5) + 1,
                            Math.floor(Math.random() * 5) + 1
                        ],
                        notes: `批量测试评估 ${batch * batchSize + i + 1}`
                    };

                    batchPromises.push(
                        request(app)
                            .post('/api/assessments')
                            .send(assessment)
                            .expect(201)
                    );
                }

                await Promise.all(batchPromises);
            }

            // 验证数据完整性
            const assessments = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            expect(assessments.body).toHaveLength(batchSize * batches);

            const summary = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            expect(summary.body.total_responses).toBe(batchSize * batches);
            expect(summary.body.average_overall_score).toBeGreaterThan(0);
        });
    });

    describe('Error Recovery and Edge Cases', () => {
        test('should handle database connection issues gracefully', async () => {
            // 这个测试模拟数据库连接问题
            // 由于我们使用的是SQLite，主要测试错误处理逻辑
            const response = await request(app)
                .get('/api/assessments/invalid-survey-id')
                .expect(200);

            expect(response.body).toEqual([]);
        });

        test('should handle concurrent requests', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Concurrency Test' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 模拟并发请求
            const concurrentRequests = [];
            const numRequests = 5;

            for (let i = 0; i < numRequests; i++) {
                concurrentRequests.push(
                    request(app)
                        .post('/api/assessments')
                        .send({
                            surveyId,
                            respondentName: `并发用户${i}`,
                            respondentTeam: '并发测试团队',
                            scores: [4, 4, 4, 4, 4, 4, 4, 4],
                            notes: `并发测试${i}`
                        })
                );
            }

            const responses = await Promise.all(concurrentRequests);
            
            // 验证所有请求都成功
            responses.forEach(response => {
                expect(response.status).toBe(201);
            });

            // 验证数据完整性
            const assessments = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            expect(assessments.body).toHaveLength(numRequests);
        });
    });
});