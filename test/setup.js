// 测试环境设置
global.console = {
  ...console,
  // 在测试中减少日志输出
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// 设置测试超时
jest.setTimeout(10000);

// 全局测试钩子
beforeAll(() => {
  // 测试开始前的全局设置
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // 测试结束后的清理工作
});

beforeEach(() => {
  // 每个测试开始前的设置
  jest.clearAllMocks();
});

// 模拟浏览器环境（如果需要）
if (typeof window === 'undefined') {
  global.window = {};
  global.document = {};
  global.navigator = {};
}