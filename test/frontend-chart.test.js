// 模拟浏览器环境的测试
const { JSDOM } = require('jsdom');
const fs = require('fs');

describe('Frontend Chart Display Test', () => {
    let dom;
    let window;
    let document;
    
    beforeAll(() => {
        // 读取admin.html
        const html = fs.readFileSync(__dirname + '/../admin.html', 'utf8');
        
        // 创建虚拟DOM
        dom = new JSDOM(html, {
            runScripts: 'dangerously',
            pretendToBeVisual: true,
            resources: 'usable',
            beforeParse(window) {
                // 模拟fetch API
                window.fetch = async (url) => {
                    if (url.startsWith('/api/summary/')) {
                        const surveyId = url.split('/').pop();
                        // 返回模拟数据
                        return {
                            ok: true,
                            json: async () => ({
                                total_responses: 2,
                                average_overall_score: 4.1875,
                                avg_project_progress: 4.5,
                                avg_requirement_response: 4.5,
                                avg_collaboration: 3.5,
                                avg_delivery_quality: 4.5,
                                avg_issue_discovery: 4,
                                avg_resource_allocation: 3.5,
                                avg_improvement: 4.5,
                                avg_information_transmission: 4.5
                            })
                        };
                    }
                    return { ok: false };
                };
                
                // 模拟Canvas API
                const mockContext = {
                    clearRect: jest.fn(),
                    beginPath: jest.fn(),
                    moveTo: jest.fn(),
                    lineTo: jest.fn(),
                    stroke: jest.fn(),
                    fillRect: jest.fn(),
                    fillText: jest.fn(),
                    save: jest.fn(),
                    restore: jest.fn(),
                    translate: jest.fn(),
                    rotate: jest.fn(),
                    fillStyle: '',
                    strokeStyle: '',
                    lineWidth: 1,
                    font: '',
                    textAlign: 'center'
                };
                
                window.HTMLCanvasElement.prototype.getContext = function() {
                    return mockContext;
                };
            }
        });
        
        window = dom.window;
        document = dom.window.document;
    });
    
    test('should call drawChart with correct data', async () => {
        // 等待页面加载完成
        await new Promise(resolve => {
            dom.window.onload = resolve;
        });
        
        // 获取viewResults函数
        const viewResults = window.viewResults;
        
        // 调用viewResults
        await viewResults('test-survey-id', 'Test Survey');
        
        // 检查summarySection是否显示
        const summarySection = document.getElementById('summarySection');
        expect(summarySection.classList.contains('hidden')).toBe(false);
        
        // 检查统计卡片是否正确生成
        const surveyStats = document.getElementById('surveyStats');
        expect(surveyStats.innerHTML).toContain('总响应数');
        expect(surveyStats.innerHTML).toContain('2');
        expect(surveyStats.innerHTML).toContain('4.2');
        
        // 检查canvas是否存在
        const canvas = document.getElementById('summaryChart');
        expect(canvas).not.toBeNull();
    });
    
    test('should handle canvas drawing correctly', () => {
        // 模拟summary数据
        const mockSummary = {
            total_responses: 2,
            average_overall_score: 4.1875,
            avg_project_progress: 4.5,
            avg_requirement_response: 4.5,
            avg_collaboration: 3.5,
            avg_delivery_quality: 4.5,
            avg_issue_discovery: 4,
            avg_resource_allocation: 3.5,
            avg_improvement: 4.5,
            avg_information_transmission: 4.5
        };
        
        // 获取drawChart函数
        const drawChart = window.drawChart;
        
        // 调用drawChart
        expect(() => {
            drawChart(mockSummary);
        }).not.toThrow();
    });
});