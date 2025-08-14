#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 测试运行器
class TestRunner {
  constructor() {
    this.results = {
      unit: { passed: 0, failed: 0, total: 0 },
      api: { passed: 0, failed: 0, total: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      e2e: { passed: 0, failed: 0, total: 0 }
    };
    this.startTime = Date.now();
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe',
        shell: true,
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (options.verbose) {
          process.stdout.write(data.toString());
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (options.verbose) {
          process.stderr.write(data.toString());
        }
      });

      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runTest(type, testFile, description) {
    console.log(`\n🧪 ${description}...`);
    
    try {
      const result = await this.runCommand('npx', ['jest', testFile, '--verbose'], {
        verbose: true,
        env: { ...process.env, NODE_ENV: 'test' }
      });

      // 解析测试结果
      const passedMatch = result.stdout.match(/(\d+) passed/);
      const failedMatch = result.stdout.match(/(\d+) failed/);
      const totalMatch = result.stdout.match(/Test Suites: (\d+) passed/);

      const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
      const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
      const total = totalMatch ? parseInt(totalMatch[1]) : 0;

      this.results[type] = { passed, failed, total };

      if (result.code === 0) {
        console.log(`✅ ${description} - All tests passed`);
      } else {
        console.log(`❌ ${description} - Some tests failed`);
      }

      return result.code === 0;
    } catch (error) {
      console.log(`❌ ${description} - Error: ${error.message}`);
      this.results[type].failed++;
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 开始运行自动化测试套件...\n');

    const tests = [
      { type: 'unit', file: 'test/unit.test.js', description: '单元测试' },
      { type: 'api', file: 'test/api.test.js', description: 'API测试' },
      { type: 'integration', file: 'test/integration.test.js', description: '集成测试' },
      { type: 'e2e', file: 'test/e2e.test.js', description: '端到端测试' }
    ];

    let allPassed = true;

    for (const test of tests) {
      if (fs.existsSync(test.file)) {
        const passed = await this.runTest(test.type, test.file, test.description);
        if (!passed) allPassed = false;
      } else {
        console.log(`⚠️  ${test.description} - 测试文件不存在: ${test.file}`);
        this.results[test.type].failed++;
        allPassed = false;
      }
    }

    this.printSummary();
    return allPassed;
  }

  printSummary() {
    const duration = Date.now() - this.startTime;
    console.log('\n📊 测试结果汇总');
    console.log('═'.repeat(50));

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    Object.entries(this.results).forEach(([type, result]) => {
      const typeNames = {
        unit: '单元测试',
        api: 'API测试',
        integration: '集成测试',
        e2e: '端到端测试'
      };

      console.log(`${typeNames[type]}:`);
      console.log(`  通过: ${result.passed}`);
      console.log(`  失败: ${result.failed}`);
      console.log(`  总计: ${result.total}`);
      console.log();

      totalPassed += result.passed;
      totalFailed += result.failed;
      totalTests += result.total;
    });

    console.log('═'.repeat(50));
    console.log(`总计: ${totalPassed} 通过, ${totalFailed} 失败, 共 ${totalTests} 个测试`);
    console.log(`耗时: ${duration}ms`);

    if (totalFailed === 0) {
      console.log('\n🎉 所有测试通过！');
    } else {
      console.log('\n❌ 有测试失败，请检查错误信息');
    }

    // 生成详细报告
    this.generateReport();
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        totalPassed: Object.values(this.results).reduce((sum, r) => sum + r.passed, 0),
        totalFailed: Object.values(this.results).reduce((sum, r) => sum + r.failed, 0),
        totalTests: Object.values(this.results).reduce((sum, r) => sum + r.total, 0)
      }
    };

    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 详细报告已保存到: ${reportPath}`);
  }

  async runSpecificTest(type) {
    const testMap = {
      unit: 'test/unit.test.js',
      api: 'test/api.test.js',
      integration: 'test/integration.test.js',
      e2e: 'test/e2e.test.js'
    };

    const typeNames = {
      unit: '单元测试',
      api: 'API测试',
      integration: '集成测试',
      e2e: '端到端测试'
    };

    if (testMap[type]) {
      console.log(`🎯 运行${typeNames[type]}...`);
      const passed = await this.runTest(type, testMap[type], typeNames[type]);
      process.exit(passed ? 0 : 1);
    } else {
      console.log('❌ 无效的测试类型，请选择: unit, api, integration, e2e');
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const testRunner = new TestRunner();
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    const success = await testRunner.runAllTests();
    process.exit(success ? 0 : 1);
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log(`
使用方法:
  node test/run-tests.js [选项]

选项:
  无参数         运行所有测试
  unit          只运行单元测试
  api           只运行API测试
  integration   只运行集成测试
  e2e           只运行端到端测试
  --help, -h    显示此帮助信息

示例:
  node test/run-tests.js
  node test/run-tests.js unit
  node test/run-tests.js api
`);
    process.exit(0);
  } else {
    await testRunner.runSpecificTest(args[0]);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;