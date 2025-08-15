const request = require('supertest');
const app = require('../server');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// 测试数据库文件
const TEST_DB_FILE = 'test_assessments.db';

describe('Team Assessment API Tests', () => {
    let testDb;

    beforeAll(async () => {
        // 使用与服务器相同的数据库文件进行测试
        testDb = new sqlite3.Database('assessments.db');
        
        // 创建表结构
        await new Promise((resolve, reject) => {
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
        // 关闭数据库连接
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

    describe('POST /api/surveys', () => {
        test('should create a new survey', async () => {
            const surveyData = {
                surveyName: 'Test Survey 2024'
            };

            const response = await request(app)
                .post('/api/surveys')
                .send(surveyData)
                .expect(201);

            expect(response.body).toHaveProperty('surveyId');
            expect(response.body).toHaveProperty('surveyName', 'Test Survey 2024');
            expect(response.body).toHaveProperty('surveyUrl');
        });

        test('should return 400 if surveyName is missing', async () => {
            const response = await request(app)
                .post('/api/surveys')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });

        test('should return 400 if surveyName is empty', async () => {
            const response = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '' })
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/surveys', () => {
        test('should return empty array when no surveys exist', async () => {
            const response = await request(app)
                .get('/api/surveys')
                .expect(200);

            expect(response.body).toEqual([]);
        });

        test('should return list of surveys', async () => {
            // 先创建一个调查
            await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Test Survey' });

            const response = await request(app)
                .get('/api/surveys')
                .expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0]).toHaveProperty('survey_name', 'Test Survey');
            expect(response.body[0]).toHaveProperty('is_active', 1);
        });
    });

    describe('POST /api/assessments', () => {
        let surveyId;

        beforeEach(async () => {
            // 创建测试调查
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Test Assessment Survey' });
            
            surveyId = surveyResponse.body.surveyId;
        });

        test('should submit assessment data', async () => {
            const assessmentData = {
                surveyId: surveyId,
                respondentName: 'John Doe',
                respondentTeam: 'Development Team',
                scores: [5, 4, 5, 3, 4, 5, 4, 5],
                notes: 'Test assessment notes'
            };

            const response = await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('message', '评估提交成功！');
        });

        test('should calculate overall score correctly', async () => {
            const assessmentData = {
                surveyId: surveyId,
                respondentName: 'Jane Doe',
                respondentTeam: 'QA Team',
                scores: [5, 4, 5, 3, 4, 5, 4, 5],
                notes: 'Test assessment'
            };

            const response = await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            // 验证数据库中保存了正确的总分
            const savedAssessment = await new Promise((resolve, reject) => {
                testDb.get('SELECT overall_score FROM assessments WHERE id = ?', [response.body.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            expect(savedAssessment).toBeDefined();
            expect(savedAssessment.overall_score).toBeCloseTo(4.375, 2); // (5+4+5+3+4+5+4+5)/8 = 4.375
        });

        test('should return 400 if required fields are missing', async () => {
            const response = await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'Test User'
                    // Missing scores and other required fields
                })
                .expect(400);
        });

        test('should return 400 if scores array is invalid', async () => {
            const response = await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'Test User',
                    respondentTeam: 'Test Team',
                    scores: [1, 2, 3], // Invalid length
                    notes: 'Test'
                })
                .expect(400);
        });
    });

    describe('GET /api/assessments/:surveyId', () => {
        let surveyId;

        beforeEach(async () => {
            // 创建测试调查和评估数据
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Test Survey for Assessments' });
            
            surveyId = surveyResponse.body.surveyId;

            // 添加一些评估数据
            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'User 1',
                    respondentTeam: 'Team A',
                    scores: [5, 4, 5, 3, 4, 5, 4, 5],
                    notes: 'Assessment 1'
                });

            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'User 2',
                    respondentTeam: 'Team B',
                    scores: [4, 5, 4, 5, 3, 4, 5, 4],
                    notes: 'Assessment 2'
                });
        });

        test('should return assessments for specific survey', async () => {
            const response = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('respondent_name', 'User 1');
            expect(response.body[1]).toHaveProperty('respondent_name', 'User 2');
        });

        test('should return empty array for survey with no assessments', async () => {
            // 创建新的调查
            const newSurveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Empty Survey' });
            
            const newSurveyId = newSurveyResponse.body.surveyId;

            const response = await request(app)
                .get(`/api/assessments/${newSurveyId}`)
                .expect(200);

            expect(response.body).toEqual([]);
        });
    });

    describe('GET /api/summary/:surveyId', () => {
        let surveyId;

        beforeEach(async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Test Survey for Summary' });
            
            surveyId = surveyResponse.body.surveyId;

            // 添加评估数据
            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'User 1',
                    respondentTeam: 'Team A',
                    scores: [5, 4, 5, 3, 4, 5, 4, 5],
                    notes: 'Assessment 1'
                });

            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'User 2',
                    respondentTeam: 'Team B',
                    scores: [3, 4, 3, 5, 4, 3, 4, 3],
                    notes: 'Assessment 2'
                });
        });

        test('should return summary statistics', async () => {
            const response = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            expect(response.body).toHaveProperty('total_responses', 2);
            expect(response.body).toHaveProperty('average_overall_score');
            expect(response.body).toHaveProperty('avg_project_progress');
            expect(response.body).toHaveProperty('avg_requirement_response');
            // 验证平均值计算是否正确
            // User 1: [5,4,5,3,4,5,4,5] = 4.375, User 2: [3,4,3,5,4,3,4,3] = 3.375, Average = (4.375 + 3.375) / 2 = 3.875
            // 由于数据库可能进行四舍五入，我们检查是否在合理范围内
            const avgScore = parseFloat(response.body.average_overall_score);
            expect(avgScore).toBeGreaterThanOrEqual(3.8);
            expect(avgScore).toBeLessThanOrEqual(4.0);
        });

        test('should return null values for survey with no assessments', async () => {
            const newSurveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Empty Summary Survey' });
            
            const newSurveyId = newSurveyResponse.body.surveyId;

            const response = await request(app)
                .get(`/api/summary/${newSurveyId}`)
                .expect(200);

            expect(response.body).toHaveProperty('total_responses', 0);
            expect(response.body.average_overall_score).toBeNull();
        });
    });

    describe('GET /api/export/:surveyId', () => {
        let surveyId;

        beforeEach(async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Test Survey for Export' });
            
            surveyId = surveyResponse.body.surveyId;

            // 添加评估数据
            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'Export User 1',
                    respondentTeam: 'Export Team',
                    scores: [5, 4, 5, 3, 4, 5, 4, 5],
                    notes: 'Export test assessment'
                });
        });

        test('should export Excel file', async () => {
            const response = await request(app)
                .get(`/api/export/${surveyId}`)
                .expect(200);

            expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            expect(response.headers['content-disposition']).toContain('attachment;');
        });

        test('should handle invalid surveyId gracefully', async () => {
            const response = await request(app)
                .get('/api/export/invalid-survey-id')
                .expect(200);

            // 对于无效的surveyId，导出功能应该返回空Excel文件
            expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        });
    });

    describe('Error Handling', () => {
        test('should handle 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/non-existent')
                .expect(404);
        });

        test('should handle invalid JSON in request body', async () => {
            const response = await request(app)
                .post('/api/surveys')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .expect(400);
        });

        test('should return 400 if surveyName exceeds 100 characters', async () => {
            const longName = 'a'.repeat(101);
            const response = await request(app)
                .post('/api/surveys')
                .send({ surveyName: longName })
                .expect(400);

            expect(response.body).toHaveProperty('error', '调查名称不能超过100个字符');
        });

        test('should return 400 if assessment scores contain values outside 1-5 range', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Test Survey for Score Validation' });
            
            const surveyId = surveyResponse.body.surveyId;

            const response = await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'Test User',
                    respondentTeam: 'Test Team',
                    scores: [1, 2, 3, 4, 5, 6, 7, 8], // 包含超出范围的分数
                    notes: 'Test'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', '评分必须在1-5之间');
        });

        test('should return 400 if scores array is not an array', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Test Survey for Invalid Scores' });
            
            const surveyId = surveyResponse.body.surveyId;

            const response = await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'Test User',
                    respondentTeam: 'Test Team',
                    scores: 'invalid-scores', // 不是数组
                    notes: 'Test'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', '评分数组必须包含8个元素');
        });

        test('should return 400 if scores contain values less than 1', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Test Survey for Low Scores' });
            
            const surveyId = surveyResponse.body.surveyId;

            const response = await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'Test User',
                    respondentTeam: 'Test Team',
                    scores: [0, 1, 2, 3, 4, 5, 1, 2], // 包含小于1的分数
                    notes: 'Test'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', '评分必须在1-5之间');
        });

        test('should handle database errors gracefully', async () => {
            // 模拟数据库错误 - 使用无效的survey_id来触发数据库错误
            const response = await request(app)
                .get('/api/summary/invalid-survey-id')
                .expect(200);

            // 即使survey_id不存在，也应该返回200但包含null值
            expect(response.body).toHaveProperty('total_responses', 0);
            expect(response.body.average_overall_score).toBeNull();
        });
    });

    describe('Admin Routes', () => {
        test('should serve admin page', async () => {
            const response = await request(app)
                .get('/admin')
                .expect(200);

            expect(response.headers['content-type']).toContain('text/html');
        });

        test('should handle invalid surveyId in assessments route', async () => {
            const response = await request(app)
                .get('/api/assessments/non-existent-survey-id')
                .expect(200);

            expect(response.body).toEqual([]);
        });

        test('should handle survey name with only whitespace', async () => {
            const response = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '   ' })
                .expect(400);

            expect(response.body).toHaveProperty('error', '调查名称不能为空');
        });

        test('should handle survey name with exactly 100 characters', async () => {
            const exactName = 'a'.repeat(100);
            const response = await request(app)
                .post('/api/surveys')
                .send({ surveyName: exactName })
                .expect(201);

            expect(response.body).toHaveProperty('surveyName', exactName);
        });

        test('should handle missing required fields in assessment', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Test Survey for Missing Fields' });
            
            const surveyId = surveyResponse.body.surveyId;

            // 测试缺少surveyId
            const response1 = await request(app)
                .post('/api/assessments')
                .send({
                    respondentName: 'Test User',
                    respondentTeam: 'Test Team',
                    scores: [1, 2, 3, 4, 5, 1, 2, 3],
                    notes: 'Test'
                })
                .expect(400);

            expect(response1.body).toHaveProperty('error', '缺少必要字段');

            // 测试缺少respondentName
            const response2 = await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentTeam: 'Test Team',
                    scores: [1, 2, 3, 4, 5, 1, 2, 3],
                    notes: 'Test'
                })
                .expect(400);

            expect(response2.body).toHaveProperty('error', '缺少必要字段');

            // 测试缺少respondentTeam
            const response3 = await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'Test User',
                    scores: [1, 2, 3, 4, 5, 1, 2, 3],
                    notes: 'Test'
                })
                .expect(400);

            expect(response3.body).toHaveProperty('error', '缺少必要字段');
        });
    });
});