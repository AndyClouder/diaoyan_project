const { JSDOM } = require('jsdom');
const fs = require('fs');

describe('Tooltip功能测试', () => {
    let dom;
    let document;

    beforeEach(() => {
        // 加载HTML文件
        const html = fs.readFileSync('./team-assessment.html', 'utf8');
        dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable'
        });
        document = dom.window.document;
        
        // 模拟CSS样式
        const style = document.createElement('style');
        style.textContent = `
            .score-option {
                position: relative;
                cursor: pointer;
            }
            .score-tooltip {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 18px;
                border-radius: 16px;
                font-size: 14px;
                font-weight: 500;
                white-space: normal;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                margin-bottom: 12px;
                max-width: 280px;
                min-width: 200px;
                text-align: center;
                box-shadow: 0 12px 35px rgba(102, 126, 234, 0.5);
            }
            .score-option:hover .score-tooltip,
            .score-option.hover .score-tooltip {
                opacity: 1;
                visibility: visible;
            }
        `;
        document.head.appendChild(style);
    });

    test('tooltip应该在hover时显示', () => {
        // 模拟一个评分选项
        const scoreOption = document.createElement('div');
        scoreOption.className = 'score-option';
        scoreOption.setAttribute('data-score', '3');
        
        const tooltip = document.createElement('div');
        tooltip.className = 'score-tooltip';
        tooltip.textContent = '测试tooltip内容';
        
        scoreOption.appendChild(tooltip);
        document.body.appendChild(scoreOption);
        
        // 模拟hover状态 - 直接添加hover类
        scoreOption.classList.add('hover');
        
        // 检查tooltip是否可见 - 使用getComputedStyle获取实际样式
        const tooltipStyle = dom.window.getComputedStyle(tooltip);
        expect(tooltipStyle.opacity).toBe('1');
        expect(tooltipStyle.visibility).toBe('visible');
        
        // 清理
        document.body.removeChild(scoreOption);
    });

    test('tooltip应该在mouseleave时隐藏', () => {
        // 模拟一个评分选项
        const scoreOption = document.createElement('div');
        scoreOption.className = 'score-option';
        scoreOption.setAttribute('data-score', '3');
        
        const tooltip = document.createElement('div');
        tooltip.className = 'score-tooltip';
        tooltip.textContent = '测试tooltip内容';
        
        scoreOption.appendChild(tooltip);
        document.body.appendChild(scoreOption);
        
        // 先显示tooltip
        scoreOption.dispatchEvent(new dom.window.Event('mouseenter'));
        
        // 然后离开
        scoreOption.dispatchEvent(new dom.window.Event('mouseleave'));
        
        // 检查tooltip是否隐藏 - 使用getComputedStyle获取实际样式
        const tooltipStyle = dom.window.getComputedStyle(tooltip);
        expect(tooltipStyle.opacity).toBe('0');
        expect(tooltipStyle.visibility).toBe('hidden');
        
        // 清理
        document.body.removeChild(scoreOption);
    });

    test('tooltip应该正确显示评分说明', () => {
        const testTooltip = document.querySelector('.score-option[data-score="3"] .score-tooltip');
        expect(testTooltip).toBeTruthy();
        expect(testTooltip.textContent).toContain('定期报告');
    });

    test('tooltip应该有良好的视觉层次', () => {
        const tooltip = document.querySelector('.score-tooltip');
        const tooltipStyle = dom.window.getComputedStyle(tooltip);
        
        // 检查z-index
        expect(parseInt(tooltipStyle.zIndex)).toBeGreaterThan(100);
        
        // 检查背景色和文字颜色的对比度
        expect(tooltipStyle.backgroundColor).not.toBe('transparent');
        expect(tooltipStyle.color).toBe('rgb(255, 255, 255)');
    });

    test('tooltip文字应该有良好的可读性', () => {
        const tooltip = document.querySelector('.score-tooltip');
        const tooltipText = tooltip.textContent;
        
        // 检查文字长度
        expect(tooltipText.length).toBeGreaterThan(0);
        expect(tooltipText.length).toBeLessThanOrEqual(100);
    });

    test('tooltip应该支持长文本换行', () => {
        // 模拟一个评分选项
        const scoreOption = document.createElement('div');
        scoreOption.className = 'score-option';
        scoreOption.setAttribute('data-score', '3');
        
        const tooltip = document.createElement('div');
        tooltip.className = 'score-tooltip';
        const longText = '这是一个非常长的tooltip文本内容，用来测试在空间有限的情况下的换行效果和可读性。';
        tooltip.textContent = longText;
        
        scoreOption.appendChild(tooltip);
        document.body.appendChild(scoreOption);
        
        // 触发显示
        scoreOption.dispatchEvent(new dom.window.Event('mouseenter'));
        
        // 检查tooltip样式
        const tooltipStyle = dom.window.getComputedStyle(tooltip);
        expect(tooltipStyle.whiteSpace).toBe('normal');
        expect(tooltipStyle.maxWidth).not.toBe('none');
        
        // 清理
        document.body.removeChild(scoreOption);
    });

    test('tooltip应该有平滑的显示/隐藏动画', () => {
        const tooltip = document.querySelector('.score-tooltip');
        const tooltipStyle = dom.window.getComputedStyle(tooltip);
        
        // 检查过渡动画 - 实际使用的是 all 属性
        expect(tooltipStyle.transition).toContain('all');
        expect(tooltipStyle.transition).toContain('0.4s');
    });
});