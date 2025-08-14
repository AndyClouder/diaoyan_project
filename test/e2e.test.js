const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('Team Assessment End-to-End Tests', () => {
    let browser;
    let page;
    let server;

    beforeAll(async () => {
        // 启动测试服务器
        server = spawn('node', ['server.js'], {
            stdio: 'pipe',
            env: { ...process.env, PORT: '3001' }
        });

        // 等待服务器启动
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 启动浏览器
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        page = await browser.newPage();

        // 设置页面超时
        page.setDefaultTimeout(10000);
        page.setDefaultNavigationTimeout(10000);
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
        if (server) {
            server.kill();
        }
    });

    beforeEach(async () => {
        // 清理浏览器cookies和localStorage
        await page.evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
        });
    });

    describe('Admin Interface', () => {
        test('should load admin page successfully', async () => {
            await page.goto('http://localhost:3001/admin');
            
            // 等待页面加载
            await page.waitForSelector('.header h1');
            
            const title = await page.$eval('.header h1', el => el.textContent);
            expect(title).toContain('团队管理效能评估');
        });

        test('should create new survey from admin interface', async () => {
            await page.goto('http://localhost:3001/admin');
            
            // 等待页面加载
            await page.waitForSelector('#surveyName');
            
            // 填写调查名称
            await page.type('#surveyName', 'E2E测试调查');
            
            // 点击创建按钮
            await page.click('button[onclick="createSurvey()"]');
            
            // 等待结果
            await page.waitForTimeout(1000);
            
            // 验证调查是否创建成功（通过检查页面内容）
            const surveyList = await page.$eval('#surveyList', el => el.innerHTML);
            expect(surveyList).toContain('E2E测试调查');
        });

        test('should display survey list', async () => {
            await page.goto('http://localhost:3001/admin');
            
            await page.waitForSelector('#surveyList');
            
            // 检查调查列表是否存在
            const surveyList = await page.$('#surveyList');
            expect(surveyList).toBeTruthy();
        });
    });

    describe('Team Assessment Interface', () => {
        test('should load assessment page successfully', async () => {
            await page.goto('http://localhost:3001/team-assessment.html');
            
            await page.waitForSelector('.header h1');
            
            const title = await page.$eval('.header h1', el => el.textContent);
            expect(title).toContain('团队管理效能评估');
        });

        test('should display assessment wheel', async () => {
            await page.goto('http://localhost:3001/team-assessment.html');
            
            await page.waitForSelector('#wheelCanvas');
            
            // 检查画布是否存在
            const canvas = await page.$('#wheelCanvas');
            expect(canvas).toBeTruthy();
            
            // 检查画布尺寸
            const width = await page.$eval('#wheelCanvas', el => el.width);
            const height = await page.$eval('#wheelCanvas', el => el.height);
            expect(width).toBeGreaterThan(0);
            expect(height).toBeGreaterThan(0);
        });

        test('should allow score selection', async () => {
            await page.goto('http://localhost:3001/team-assessment.html');
            
            await page.waitForSelector('.score-option');
            
            // 点击第一个评分选项
            const firstOption = await page.$('.score-option');
            await firstOption.click();
            
            // 等待JavaScript执行
            await page.waitForTimeout(500);
            
            // 验证选项是否被选中（通过检查类名）
            const isSelected = await page.$eval('.score-option.selected', el => el !== null);
            expect(isSelected).toBe(true);
        });

        test('should show validation when generating report without scores', async () => {
            await page.goto('http://localhost:3001/team-assessment.html');
            
            await page.waitForSelector('button[onclick="generateReport()"]');
            
            // 点击生成报告按钮
            await page.click('button[onclick="generateReport()"]');
            
            // 等待弹窗
            await page.waitForTimeout(500);
            
            // 检查是否有弹窗（由于puppeteer无法直接检测alert，我们检查页面状态）
            const resultsSection = await page.$('#resultsSection');
            const isHidden = await resultsSection.$eval(el => el.style.display === 'none');
            expect(isHidden).toBe(true);
        });
    });

    describe('Assessment Workflow', () => {
        test('should complete full assessment workflow', async () => {
            // 1. 创建调查
            await page.goto('http://localhost:3001/admin');
            await page.waitForSelector('#surveyName');
            await page.type('#surveyName', '完整工作流测试');
            await page.click('button[onclick="createSurvey()"]');
            await page.waitForTimeout(1000);
            
            // 获取调查ID
            const surveyId = await page.evaluate(() => {
                const surveyCards = document.querySelectorAll('.survey-card');
                if (surveyCards.length > 0) {
                    const viewButton = surveyCards[0].querySelector('button[onclick*="viewResults"]');
                    if (viewButton) {
                        const match = viewButton.getAttribute('onclick').match(/viewResults\('([^']+)'/);
                        return match ? match[1] : null;
                    }
                }
                return null;
            });
            
            expect(surveyId).toBeTruthy();
            
            // 2. 进行评估
            await page.goto(`http://localhost:3001/team-assessment.html?survey=${surveyId}`);
            await page.waitForSelector('.score-option');
            
            // 为所有维度选择分数
            const scoreOptions = await page.$$('.score-option');
            for (let i = 0; i < 8; i++) {
                await scoreOptions[i * 5 + 2].click(); // 选择3分
                await page.waitForTimeout(200);
            }
            
            // 3. 生成报告
            await page.click('button[onclick="generateReport()"]');
            await page.waitForTimeout(1000);
            
            // 4. 填写提交信息
            await page.waitForSelector('#submitSection');
            await page.type('#respondentName', 'E2E测试用户');
            await page.type('#respondentTeam', '测试团队');
            await page.type('#notes', 'E2E测试评估');
            
            // 5. 提交评估
            await page.click('button[onclick="submitAssessment()"]');
            await page.waitForTimeout(1000);
            
            // 6. 验证提交成功
            const successMessage = await page.evaluate(() => {
                const alerts = document.querySelectorAll('.alert-success');
                return alerts.length > 0 ? alerts[0].textContent : '';
            });
            
            expect(successMessage).toContain('成功');
        });

        test('should handle survey with specific ID', async () => {
            const testSurveyId = 'test-survey-123';
            await page.goto(`http://localhost:3001/team-assessment.html?survey=${testSurveyId}`);
            
            await page.waitForSelector('.header h1');
            
            // 验证页面是否正常加载
            const title = await page.$eval('.header h1', el => el.textContent);
            expect(title).toContain('团队管理效能评估');
        });
    });

    describe('Mobile Responsiveness', () => {
        test('should work on mobile devices', async () => {
            // 设置移动设备视口
            await page.setViewport({ width: 375, height: 667 });
            
            await page.goto('http://localhost:3001/team-assessment.html');
            await page.waitForSelector('.header h1');
            
            // 检查页面元素是否适应移动屏幕
            const container = await page.$('.container');
            const containerWidth = await page.$eval('.container', el => el.offsetWidth);
            expect(containerWidth).toBeLessThanOrEqual(375);
            
            // 检查评分按钮是否可点击
            await page.waitForSelector('.score-option');
            const firstOption = await page.$('.score-option');
            await firstOption.click();
            await page.waitForTimeout(500);
            
            const isSelected = await page.$eval('.score-option.selected', el => el !== null);
            expect(isSelected).toBe(true);
            
            // 恢复桌面视口
            await page.setViewport({ width: 1280, height: 800 });
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid survey ID gracefully', async () => {
            await page.goto('http://localhost:3001/team-assessment.html?survey=invalid-id');
            
            await page.waitForSelector('.header h1');
            
            // 页面应该仍然正常加载
            const title = await page.$eval('.header h1', el => el.textContent);
            expect(title).toContain('团队管理效能评估');
        });

        test('should handle network errors gracefully', async () => {
            await page.goto('http://localhost:3001/team-assessment.html');
            
            // 模拟网络错误
            await page.setRequestInterception(true);
            page.on('request', request => {
                if (request.url().includes('/api/')) {
                    request.abort('failed');
                } else {
                    request.continue();
                }
            });
            
            // 尝试提交评估
            await page.waitForSelector('.score-option');
            const firstOption = await page.$('.score-option');
            await firstOption.click();
            await page.waitForTimeout(500);
            
            // 恢复网络请求
            await page.setRequestInterception(false);
        });
    });

    describe('Performance', () => {
        test('should load page within acceptable time', async () => {
            const startTime = Date.now();
            
            await page.goto('http://localhost:3001/team-assessment.html');
            await page.waitForSelector('.header h1');
            
            const loadTime = Date.now() - startTime;
            expect(loadTime).toBeLessThan(5000); // 5秒内加载完成
        });

        test('should handle rapid user interactions', async () => {
            await page.goto('http://localhost:3001/team-assessment.html');
            await page.waitForSelector('.score-option');
            
            // 快速点击多个评分选项
            const scoreOptions = await page.$$('.score-option');
            for (let i = 0; i < 5; i++) {
                await scoreOptions[i].click();
            }
            
            await page.waitForTimeout(1000);
            
            // 验证页面状态是否正常
            const selectedOptions = await page.$$('.score-option.selected');
            expect(selectedOptions.length).toBeGreaterThan(0);
        });
    });
});

// 辅助函数：等待条件满足
async function waitForCondition(page, condition, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        const result = await condition();
        if (result) return true;
        await page.waitForTimeout(100);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
}