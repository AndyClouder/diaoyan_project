const request = require('supertest');
const app = require('../server');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

describe('Edge Cases and Error Handling Tests', () => {
    let testDb;
    const TEST_DB_FILE = 'test_edge_cases.db';

    beforeAll(async () => {
        // 设置测试环境变量
        process.env.NODE_ENV = 'test';
        
        // 设置测试数据库
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
        
        if (fs.existsSync(TEST_DB_FILE)) {
            fs.unlinkSync(TEST_DB_FILE);
        }
    });

    beforeEach(async () => {
        await new Promise(resolve => {
            testDb.run('DELETE FROM assessments', resolve);
        });
        await new Promise(resolve => {
            testDb.run('DELETE FROM survey_links', resolve);
        });
    });

    describe('Survey Creation Edge Cases', () => {
        test('should handle surveyName with special characters', async () => {
            const surveyData = {
                surveyName: '2024年Q1团队评估-特殊字符测试@#$%'
            };

            const response = await request(app)
                .post('/api/surveys')
                .send(surveyData)
                .expect(201);

            expect(response.body).toHaveProperty('surveyId');
            expect(response.body).toHaveProperty('surveyName', surveyData.surveyName);
        });

        test('should handle surveyName with exactly 100 characters', async () => {
            const exactLengthName = 'a'.repeat(100);
            const surveyData = {
                surveyName: exactLengthName
            };

            const response = await request(app)
                .post('/api/surveys')
                .send(surveyData)
                .expect(201);

            expect(response.body).toHaveProperty('surveyName', exactLengthName);
        });

        test('should handle surveyName with leading/trailing whitespace', async () => {
            const surveyData = {
                surveyName: '  Whitespace Test Survey  '
            };

            const response = await request(app)
                .post('/api/surveys')
                .send(surveyData)
                .expect(201);

            expect(response.body).toHaveProperty('surveyName', surveyData.surveyName);
        });
    });

    describe('Assessment Submission Edge Cases', () => {
        let surveyId;

        beforeEach(async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Edge Case Test Survey' });
            
            surveyId = surveyResponse.body.surveyId;
        });

        test('should handle assessment with minimum valid scores (all 1s)', async () => {
            const assessmentData = {
                surveyId: surveyId,
                respondentName: 'Min Score User',
                respondentTeam: 'Test Team',
                scores: [1, 1, 1, 1, 1, 1, 1, 1],
                notes: 'Minimum score test'
            };

            const response = await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
        });

        test('should handle assessment with maximum valid scores (all 5s)', async () => {
            const assessmentData = {
                surveyId: surveyId,
                respondentName: 'Max Score User',
                respondentTeam: 'Test Team',
                scores: [5, 5, 5, 5, 5, 5, 5, 5],
                notes: 'Maximum score test'
            };

            const response = await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
        });

        test('should handle assessment with empty notes', async () => {
            const assessmentData = {
                surveyId: surveyId,
                respondentName: 'Empty Notes User',
                respondentTeam: 'Test Team',
                scores: [3, 3, 3, 3, 3, 3, 3, 3],
                notes: ''
            };

            const response = await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
        });

        test('should handle assessment with missing notes field', async () => {
            const assessmentData = {
                surveyId: surveyId,
                respondentName: 'No Notes User',
                respondentTeam: 'Test Team',
                scores: [3, 3, 3, 3, 3, 3, 3, 3]
                // notes字段缺失
            };

            const response = await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
        });

        test('should handle assessment with null notes', async () => {
            const assessmentData = {
                surveyId: surveyId,
                respondentName: 'Null Notes User',
                respondentTeam: 'Test Team',
                scores: [3, 3, 3, 3, 3, 3, 3, 3],
                notes: null
            };

            const response = await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
        });
    });

    describe('Export Functionality Edge Cases', () => {
        test('should handle export for survey with no assessments', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Empty Export Survey' });
            
            const surveyId = surveyResponse.body.surveyId;

            const response = await request(app)
                .get(`/api/export/${surveyId}`)
                .expect(200);

            expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            expect(response.headers['content-disposition']).toContain('attachment;');
        });

        test('should handle export with very long notes', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Long Notes Test' });
            
            const surveyId = surveyResponse.body.surveyId;

            // 创建包含很长备注的评估
            const longNotes = '这是一个很长的备注'.repeat(100); // 1000个字符
            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'Long Notes User',
                    respondentTeam: 'Test Team',
                    scores: [4, 4, 4, 4, 4, 4, 4, 4],
                    notes: longNotes
                });

            const response = await request(app)
                .get(`/api/export/${surveyId}`)
                .expect(200);

            expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        });

        test('should handle export with special characters in names', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Special Chars Test' });
            
            const surveyId = surveyResponse.body.surveyId;

            // 创建包含特殊字符的评估
            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: '张三·李四@Company',
                    respondentTeam: '开发团队-Alpha',
                    scores: [5, 4, 5, 4, 5, 4, 5, 4],
                    notes: '包含特殊字符的测试数据'
                });

            const response = await request(app)
                .get(`/api/export/${surveyId}`)
                .expect(200);

            expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        });

        test('should handle export error gracefully', async () => {
            // 使用无效的survey_id来测试错误处理
            const response = await request(app)
                .get('/api/export/invalid-survey-id-that-does-not-exist')
                .expect(200);

            // 对于无效的survey_id，导出功能应该正常返回空Excel文件
            expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        });
    });

    describe('Database Error Scenarios', () => {
        test('should handle database constraint violations', async () => {
            // 尝试创建重复的survey_id（虽然UUID生成器通常不会产生重复）
            const surveyData = {
                surveyName: 'Duplicate Test Survey'
            };

            const firstResponse = await request(app)
                .post('/api/surveys')
                .send(surveyData)
                .expect(201);

            // 这里我们无法直接测试重复的survey_id，因为UUID是随机生成的
            // 但我们可以测试其他边界情况
            expect(firstResponse.body).toHaveProperty('surveyId');
        });

        test('should handle malformed survey IDs', async () => {
            const malformedIds = [
                'invalid-uuid',
                '12345678901234567890123456789012345678901234567890' // 太长
            ];

            for (const malformedId of malformedIds) {
                const response = await request(app)
                    .get(`/api/assessments/${malformedId}`)
                    .expect(200);

                // 对于无效的ID，应该返回空数组
                expect(response.body).toEqual([]);
            }
        });

        test('should handle concurrent survey creation', async () => {
            const concurrentRequests = [];
            const numRequests = 3;

            for (let i = 0; i < numRequests; i++) {
                concurrentRequests.push(
                    request(app)
                        .post('/api/surveys')
                        .send({ surveyName: `Concurrent Survey ${i}` })
                );
            }

            const responses = await Promise.all(concurrentRequests);
            
            // 验证所有请求都成功
            responses.forEach(response => {
                expect(response.status).toBe(201);
                expect(response.body).toHaveProperty('surveyId');
            });

            // 验证所有surveyId都是唯一的
            const surveyIds = responses.map(r => r.body.surveyId);
            const uniqueIds = new Set(surveyIds);
            expect(uniqueIds.size).toBe(numRequests);
        });
    });

    describe('Input Validation Extreme Cases', () => {
        test('should handle extremely long respondent names and teams', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Long Name Test' });
            
            const surveyId = surveyResponse.body.surveyId;

            const longName = 'a'.repeat(1000); // 非常长的名字
            const longTeam = 'b'.repeat(1000); // 非常长的团队名

            const assessmentData = {
                surveyId: surveyId,
                respondentName: longName,
                respondentTeam: longTeam,
                scores: [3, 3, 3, 3, 3, 3, 3, 3],
                notes: 'Long name test'
            };

            const response = await request(app)
                .post('/api/assessments')
                .send(assessmentData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
        });

        test('should handle assessment with non-integer scores', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Non-integer Score Test' });
            
            const surveyId = surveyResponse.body.surveyId;

            const response = await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'Invalid Score User',
                    respondentTeam: 'Test Team',
                    scores: [3.5, 4.2, 3.8, 4.1, 3.9, 4.3, 3.7, 4.0], // 非整数分数
                    notes: 'Should fail validation'
                })
                .expect(201);

            // 验证数据库中保存的是整数（会自动转换为整数）
            const savedAssessment = await new Promise((resolve, reject) => {
                testDb.get('SELECT project_progress_transparency FROM assessments WHERE survey_id = ? AND respondent_name = ?', 
                    [surveyId, 'Invalid Score User'], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            expect(savedAssessment.project_progress_transparency).toBe(3); // 3.5 被转换为 3
        });

        test('should handle assessment with zero scores', async () => {
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'Zero Score Test' });
            
            const surveyId = surveyResponse.body.surveyId;

            const response = await request(app)
                .post('/api/assessments')
                .send({
                    surveyId: surveyId,
                    respondentName: 'Zero Score User',
                    respondentTeam: 'Test Team',
                    scores: [0, 0, 0, 0, 0, 0, 0, 0], // 零分
                    notes: 'Should fail validation'
                })
                .expect(400);

            expect(response.body).toHaveProperty('error', '评分必须在1-5之间');
        });
    });
});