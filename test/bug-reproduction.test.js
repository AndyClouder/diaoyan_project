const request = require('supertest');
const app = require('../server');

describe('Bug Reproduction Test', () => {
    let surveyId;
    
    beforeAll(async () => {
        // 创建一个测试调查
        const surveyResponse = await request(app)
            .post('/api/surveys')
            .send({ surveyName: 'Bug Reproduction Test' })
            .expect(201);
        
        surveyId = surveyResponse.body.surveyId;
        
        // 提交一些评估数据
        const assessments = [
            {
                surveyId,
                respondentName: '用户1',
                respondentTeam: '团队A',
                scores: [5, 4, 4, 5, 3, 4, 5, 4],
                notes: '评估1'
            },
            {
                surveyId,
                respondentName: '用户2',
                respondentTeam: '团队B',
                scores: [4, 5, 3, 4, 5, 3, 4, 5],
                notes: '评估2'
            }
        ];
        
        for (const assessment of assessments) {
            await request(app)
                .post('/api/assessments')
                .send(assessment)
                .expect(201);
        }
    });
    
    test('should reproduce the bug: dimensions not showing correctly', async () => {
        // 1. 获取汇总数据
        const summaryResponse = await request(app)
            .get(`/api/summary/${surveyId}`)
            .expect(200);
        
        const summary = summaryResponse.body;
        
        console.log('=== 后端返回的汇总数据 ===');
        console.log(JSON.stringify(summary, null, 2));
        
        // 2. 验证数据完整性
        expect(summary.total_responses).toBe(2);
        expect(summary.average_overall_score).toBeGreaterThan(0);
        
        // 3. 检查各维度数据是否存在
        const dimensions = [
            'avg_project_progress',
            'avg_requirement_response',
            'avg_collaboration',
            'avg_delivery_quality',
            'avg_issue_discovery',
            'avg_resource_allocation',
            'avg_improvement',
            'avg_information_transmission'
        ];
        
        dimensions.forEach(dim => {
            expect(summary).toHaveProperty(dim);
            expect(summary[dim]).not.toBeNull();
            expect(summary[dim]).toBeGreaterThan(0);
        });
        
        // 4. 打印前端应该显示的数据
        console.log('\n=== 前端应该显示的数据 ===');
        const frontendData = {
            total_responses: summary.total_responses,
            average_overall_score: summary.average_overall_score,
            dimensions: dimensions.map((dim, index) => ({
                name: [
                    '项目进度透明度',
                    '需求响应速度',
                    '团队协作效率',
                    '交付质量稳定性',
                    '问题发现及时性',
                    '资源配置效率',
                    '持续改进能力',
                    '信息传递有效性'
                ][index],
                value: summary[dim]
            }))
        };
        console.log(JSON.stringify(frontendData, null, 2));
        
        // 5. 获取详细数据验证
        const detailsResponse = await request(app)
            .get(`/api/assessments/${surveyId}`)
            .expect(200);
        
        const assessments = detailsResponse.body;
        console.log('\n=== 详细评估数据 ===');
        assessments.forEach((assessment, index) => {
            console.log(`评估${index + 1}:`);
            console.log(`- 总体评分: ${assessment.overall_score}`);
            console.log(`- 各维度分数: [${assessment.project_progress_transparency}, ${assessment.requirement_response_speed}, ${assessment.team_collaboration_efficiency}, ${assessment.delivery_quality_stability}, ${assessment.issue_discovery_timeliness}, ${assessment.resource_allocation_efficiency}, ${assessment.continuous_improvement_ability}, ${assessment.information_transmission_effectiveness}]`);
        });
    });
    
    test('should verify data calculation manually', async () => {
        // 获取原始数据
        const response = await request(app)
            .get(`/api/assessments/${surveyId}`)
            .expect(200);
        
        const assessments = response.body;
        
        // 手动计算各维度平均分
        const manualCalculations = {};
        
        assessments.forEach(assessment => {
            const fields = [
                'project_progress_transparency',
                'requirement_response_speed',
                'team_collaboration_efficiency',
                'delivery_quality_stability',
                'issue_discovery_timeliness',
                'resource_allocation_efficiency',
                'continuous_improvement_ability',
                'information_transmission_effectiveness'
            ];
            
            fields.forEach(field => {
                if (!manualCalculations[field]) {
                    manualCalculations[field] = { sum: 0, count: 0 };
                }
                manualCalculations[field].sum += assessment[field];
                manualCalculations[field].count += 1;
            });
        });
        
        console.log('\n=== 手动计算结果 ===');
        Object.entries(manualCalculations).forEach(([field, data]) => {
            const avg = data.sum / data.count;
            console.log(`${field}: ${avg} (sum: ${data.sum}, count: ${data.count})`);
        });
    });
});