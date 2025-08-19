// 增强版调试脚本 - 在浏览器控制台运行
async function debugAdminChart() {
    console.log('=== 开始调试Admin图表 ===');
    
    // 1. 检查survey列表
    try {
        const surveysResponse = await fetch('/api/surveys');
        const surveys = await surveysResponse.json();
        console.log('可用的surveys:', surveys);
        
        if (surveys.length === 0) {
            console.log('没有找到任何survey，请先创建一个');
            return;
        }
        
        // 使用第一个survey
        const surveyId = surveys[0].survey_id;
        console.log('使用survey:', surveyId);
        
        // 2. 获取汇总数据
        const summaryResponse = await fetch(`/api/summary/${surveyId}`);
        const summary = await summaryResponse.json();
        console.log('汇总数据:', summary);
        
        // 3. 检查Canvas元素
        const canvas = document.getElementById('summaryChart');
        if (!canvas) {
            console.error('找不到Canvas元素!');
            return;
        }
        
        console.log('Canvas元素:', canvas);
        console.log('Canvas尺寸:', canvas.width, 'x', canvas.height);
        
        // 4. 检查Canvas上下文
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('无法获取Canvas 2D上下文!');
            return;
        }
        
        console.log('Canvas上下文获取成功');
        
        // 5. 手动触发viewResults
        console.log('手动触发viewResults...');
        
        // 模拟点击第一个查看结果按钮
        const viewButtons = document.querySelectorAll('button[onclick*="viewResults"]');
        if (viewButtons.length > 0) {
            console.log('找到查看结果按钮，点击第一个...');
            viewButtons[0].click();
        } else {
            console.log('没有找到查看结果按钮，手动调用viewResults');
            
            // 显示sections
            document.getElementById('summarySection').classList.remove('hidden');
            document.getElementById('detailsSection').classList.remove('hidden');
            
            // 生成统计卡片
            const surveyStats = document.getElementById('surveyStats');
            surveyStats.innerHTML = `
                <div class="stat-card">
                    <h3>${summary.total_responses}</h3>
                    <p>总响应数</p>
                </div>
                <div class="stat-card">
                    <h3>${summary.average_overall_score !== null ? summary.average_overall_score.toFixed(1) : '-'}</h3>
                    <p>平均总体评分</p>
                </div>
            `;
            
            // 手动调用drawChart
            if (typeof window.drawChart === 'function') {
                console.log('调用drawChart函数...');
                window.drawChart(summary);
            } else {
                console.error('drawChart函数不存在!');
            }
        }
        
        // 6. 检查Canvas是否有内容
        setTimeout(() => {
            console.log('检查Canvas渲染结果...');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            // 检查是否有非透明像素
            let hasContent = false;
            for (let i = 3; i < pixels.length; i += 4) {
                if (pixels[i] > 0) {
                    hasContent = true;
                    break;
                }
            }
            
            console.log('Canvas是否有内容:', hasContent);
            
            if (!hasContent) {
                console.log('Canvas是空的，可能存在渲染问题');
                
                // 尝试重新绘制
                console.log('尝试重新绘制...');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(10, 10, 50, 50);
                ctx.fillStyle = '#000000';
                ctx.font = '16px Arial';
                ctx.fillText('测试文本', 10, 100);
                
                console.log('测试绘制完成');
            }
        }, 100);
        
    } catch (error) {
        console.error('调试过程中出错:', error);
    }
}

// 在控制台运行: debugAdminChart()