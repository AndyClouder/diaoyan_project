const request = require('supertest');
const app = require('../server.js');

describe('前台提交后后台查看功能测试', () => {
    let surveyId;

    beforeEach(async () => {
        // 每个测试都创建一个新的测试问卷，确保测试隔离
        const surveyResponse = await request(app)
            .post('/api/surveys')
            .send({ surveyName: '测试前台提交后台查看' });
        
        surveyId = surveyResponse.body.surveyId;
    });

    test('前台提交成功后，后台应该能正确查看结果', async () => {
        // 1. 前台提交评估数据
        const assessmentData = {
            surveyId: surveyId,
            respondentName: '测试用户',
            respondentTeam: '测试团队',
            scores: [5, 4, 5, 4, 5, 4, 5, 4],
            notes: '这是一个测试评估'
        };

        const submitResponse = await request(app)
            .post('/api/assessments')
            .send(assessmentData);

        expect(submitResponse.status).toBe(201);
        expect(submitResponse.body.message).toBe('评估提交成功！');

        // 2. 后台查看汇总结果
        const summaryResponse = await request(app)
            .get(`/api/summary/${surveyId}`);

        expect(summaryResponse.status).toBe(200);
        
        const summary = summaryResponse.body;
        expect(summary.total_responses).toBe(1);
        expect(summary.average_overall_score).not.toBeNull();
        expect(parseFloat(summary.average_overall_score)).toBeGreaterThan(0);

        // 3. 后台查看详细数据
        const assessmentsResponse = await request(app)
            .get(`/api/assessments/${surveyId}`);

        expect(assessmentsResponse.status).toBe(200);
        
        const assessments = assessmentsResponse.body;
        expect(assessments.length).toBe(1);
        
        const assessment = assessments[0];
        expect(assessment.respondent_name).toBe('测试用户');
        expect(assessment.respondent_team).toBe('测试团队');
        expect(assessment.overall_score).toBeGreaterThan(0);
        
        // 验证各个维度的分数都正确保存
        expect(assessment.project_progress_transparency).toBe(5);
        expect(assessment.requirement_response_speed).toBe(4);
        expect(assessment.team_collaboration_efficiency).toBe(5);
        expect(assessment.delivery_quality_stability).toBe(4);
        expect(assessment.issue_discovery_timeliness).toBe(5);
        expect(assessment.resource_allocation_efficiency).toBe(4);
        expect(assessment.continuous_improvement_ability).toBe(5);
        expect(assessment.information_transmission_effectiveness).toBe(4);
    });

    test('多次提交后汇总数据应该正确计算', async () => {
        // 在同一个问卷中提交两个评估
        const firstAssessment = {
            surveyId: surveyId,
            respondentName: '第一个用户',
            respondentTeam: '第一个团队',
            scores: [5, 4, 5, 4, 5, 4, 5, 4],
            notes: '第一个测试评估'
        };

        await request(app)
            .post('/api/assessments')
            .send(firstAssessment);

        // 提交第二个评估
        const secondAssessment = {
            surveyId: surveyId,
            respondentName: '第二个用户',
            respondentTeam: '第二个团队',
            scores: [3, 3, 3, 3, 3, 3, 3, 3],
            notes: '第二个测试评估'
        };

        await request(app)
            .post('/api/assessments')
            .send(secondAssessment);

        // 检查汇总数据
        const summaryResponse = await request(app)
            .get(`/api/summary/${surveyId}`);

        expect(summaryResponse.status).toBe(200);
        
        const summary = summaryResponse.body;
        expect(summary.total_responses).toBe(2);
        
        // 验证平均值计算正确
        // 第一个用户平均分4.5，第二个用户平均分3.0，总体平均应该是3.75
        expect(parseFloat(summary.average_overall_score)).toBeCloseTo(3.75, 1);
        
        // 验证各维度平均值
        expect(parseFloat(summary.avg_project_progress)).toBeCloseTo(4.0, 1);
        expect(parseFloat(summary.avg_requirement_response)).toBeCloseTo(3.5, 1);
    });

    test('当没有评估数据时应该返回正确的空状态', async () => {
        // 创建新问卷
        const newSurveyResponse = await request(app)
            .post('/api/surveys')
            .send({ surveyName: '空数据测试问卷' });
        
        const newSurveyId = newSurveyResponse.body.surveyId;

        // 查看空问卷的汇总
        const summaryResponse = await request(app)
            .get(`/api/summary/${newSurveyId}`);

        expect(summaryResponse.status).toBe(200);
        expect(summaryResponse.body.total_responses).toBe(0);
        expect(summaryResponse.body.average_overall_score).toBeNull();
        
        // 查看空问卷的详细数据
        const assessmentsResponse = await request(app)
            .get(`/api/assessments/${newSurveyId}`);

        expect(assessmentsResponse.status).toBe(200);
        expect(assessmentsResponse.body).toEqual([]);
    });
});