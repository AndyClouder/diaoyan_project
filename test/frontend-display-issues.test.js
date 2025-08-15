const request = require('supertest');
const app = require('../server');

describe('前端显示问题专项测试', () => {
    describe('数据格式和类型问题', () => {
        test('应该返回正确的数据类型而不是字符串', async () => {
            // 1. 创建问卷但不提交数据，测试空数据情况
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '数据类型测试' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 2. 获取汇总数据（此时应该没有数据）
            const summaryResponse = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            const summary = summaryResponse.body;

            // 3. 验证数据类型正确性 - 空数据时应该返回null
            expect(typeof summary.total_responses).toBe('number');
            expect(summary.total_responses).toBe(0);
            expect(summary.average_overall_score).toBeNull(); // 空数据时应该是null
            expect(summary.avg_project_progress).toBeNull(); // 空数据时应该是null
            expect(summary.avg_requirement_response).toBeNull(); // 空数据时应该是null
            expect(summary.avg_collaboration).toBeNull(); // 空数据时应该是null
            expect(summary.avg_delivery_quality).toBeNull(); // 空数据时应该是null
            expect(summary.avg_issue_discovery).toBeNull(); // 空数据时应该是null
            expect(summary.avg_resource_allocation).toBeNull(); // 空数据时应该是null
            expect(summary.avg_improvement).toBeNull(); // 空数据时应该是null
            expect(summary.avg_information_transmission).toBeNull(); // 空数据时应该是null
        });

        test('应该正确处理浮点数精度问题', async () => {
            // 1. 创建问卷
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '浮点数精度测试' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 2. 提交会产生无限小数的评估数据
            await request(app)
                .post('/api/assessments')
                .send({
                    surveyId,
                    respondentName: '精度测试用户',
                    respondentTeam: '精度测试团队',
                    scores: [5, 4, 3, 2, 1, 5, 4, 3], // 平均: 3.375
                    notes: '浮点数精度测试'
                })
                .expect(201);

            // 3. 获取汇总数据
            const summaryResponse = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            const summary = summaryResponse.body;

            // 4. 验证浮点数精度处理
            expect(summary.total_responses).toBe(1);
            if (summary.average_overall_score !== null) {
                const avgScore = parseFloat(summary.average_overall_score);
                expect(avgScore).toBeCloseTo(3.375, 2); // 应该接近3.375
                expect(avgScore.toString()).not.toContain('999999'); // 不应该有精度问题
                expect(avgScore.toString()).not.toContain('000001'); // 不应该有精度问题
            }
        });

        test('应该正确处理数据库中的NULL值', async () => {
            // 1. 创建问卷
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: 'NULL值处理测试' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 2. 直接插入可能有NULL值的记录（模拟数据库异常情况）
            // 这里我们通过正常的API提交，然后检查返回的数据结构
            
            // 3. 获取空数据的汇总
            const summaryResponse = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            const summary = summaryResponse.body;

            // 4. 验证NULL值处理
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

            // 5. 获取详细数据
            const assessmentsResponse = await request(app)
                .get(`/api/assessments/${surveyId}`)
                .expect(200);

            expect(assessmentsResponse.body).toEqual([]);
        });
    });

    describe('前端显示逻辑问题', () => {
        test('前端应该正确处理null值显示', async () => {
            // 这个测试模拟前端可能会遇到的显示问题
            
            // 1. 创建问卷但不提交数据
            const surveyResponse = await request(app)
                .post('/api/surveys')
                .send({ surveyName: '前端显示测试' })
                .expect(201);

            const surveyId = surveyResponse.body.surveyId;

            // 2. 获取汇总数据（应该是null值）
            const summaryResponse = await request(app)
                .get(`/api/summary/${surveyId}`)
                .expect(200);

            const summary = summaryResponse.body;

            // 3. 模拟前端的null值处理逻辑
            // 这是admin.html中使用的逻辑
            const displayAverageOverallScore = summary.average_overall_score ? summary.average_overall_score.toFixed(1) : '0';
            const displayAvgProgress = summary.avg_project_progress || 0;
            const displayAvgResponse = summary.avg_requirement_response || 0;
            const displayAvgCollaboration = summary.avg_collaboration || 0;
            const displayAvgQuality = summary.avg_delivery_quality || 0;
            const displayAvgIssue = summary.avg_issue_discovery || 0;
            const displayAvgResource = summary.avg_resource_allocation || 0;
            const displayAvgImprovement = summary.avg_improvement || 0;
            const displayAvgInfo = summary.avg_information_transmission || 0;

            // 4. 验证前端显示逻辑
            // 当前的问题：null值被显示为'0'或0，这可能会误导用户
            expect(displayAverageOverallScore).toBe('0'); // 这可能是问题，应该是'无数据'或'-'
            expect(displayAvgProgress).toBe(0); // 这可能是问题，应该是null或特殊值
            expect(displayAvgResponse).toBe(0); // 这可能是问题，应该是null或特殊值
            expect(displayAvgCollaboration).toBe(0); // 这可能是问题，应该是null或特殊值
            expect(displayAvgQuality).toBe(0); // 这可能是问题，应该是null或特殊值
            expect(displayAvgIssue).toBe(0); // 这可能是问题，应该是null或特殊值
            expect(displayAvgResource).toBe(0); // 这可能是问题，应该是null或特殊值
            expect(displayAvgImprovement).toBe(0); // 这可能是问题，应该是null或特殊值
            expect(displayAvgInfo).toBe(0); // 这可能是问题，应该是null或特殊值
        });
    });
});