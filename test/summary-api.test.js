const request = require('supertest');
const app = require('../server');
const sqlite3 = require('sqlite3').verbose();

describe('Backend Summary API Test', () => {
    let testDb;
    let surveyId;

    beforeAll(async () => {
        // 使用测试数据库
        testDb = new sqlite3.Database('assessments.db');
        
        // 创建测试调查
        const surveyResponse = await request(app)
            .post('/api/surveys')
            .send({ surveyName: 'Summary API Test' })
            .expect(201);
        
        surveyId = surveyResponse.body.surveyId;
        
        // 提交一些测试数据
        await request(app)
            .post('/api/assessments')
            .send({
                surveyId,
                respondentName: '测试用户1',
                respondentTeam: '测试团队',
                scores: [5, 4, 3, 5, 4, 3, 5, 4],
                notes: '测试数据1'
            });
            
        await request(app)
            .post('/api/assessments')
            .send({
                surveyId,
                respondentName: '测试用户2',
                respondentTeam: '测试团队',
                scores: [4, 5, 4, 4, 5, 4, 4, 5],
                notes: '测试数据2'
            });
    });

    afterAll(async () => {
        if (testDb) {
            await new Promise(resolve => testDb.close(resolve));
        }
    });

    test('should return correct field names in summary API', async () => {
        const response = await request(app)
            .get(`/api/summary/${surveyId}`)
            .expect(200);
        
        console.log('Summary API Response:', response.body);
        
        // 验证响应包含正确的字段
        expect(response.body).toHaveProperty('total_responses');
        expect(response.body).toHaveProperty('average_overall_score');
        expect(response.body).toHaveProperty('avg_project_progress');
        expect(response.body).toHaveProperty('avg_requirement_response');
        expect(response.body).toHaveProperty('avg_collaboration');
        expect(response.body).toHaveProperty('avg_delivery_quality');
        expect(response.body).toHaveProperty('avg_issue_discovery');
        expect(response.body).toHaveProperty('avg_resource_allocation');
        expect(response.body).toHaveProperty('avg_improvement');
        expect(response.body).toHaveProperty('avg_information_transmission');
        
        // 验证数据正确性
        expect(response.body.total_responses).toBe(2);
        expect(response.body.average_overall_score).toBeCloseTo(4.125, 2);
    });
});