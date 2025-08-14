// 单元测试 - 测试各个功能模块

const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');

describe('Utility Functions Unit Tests', () => {
    describe('UUID Generation', () => {
        test('should generate valid UUID', () => {
            const uuid = uuidv4();
            expect(uuid).toBeDefined();
            expect(typeof uuid).toBe('string');
            expect(uuid.length).toBe(36); // UUID v4的标准长度
            
            // 验证UUID格式
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            expect(uuid).toMatch(uuidRegex);
        });

        test('should generate unique UUIDs', () => {
            const uuids = new Set();
            const iterations = 1000;

            for (let i = 0; i < iterations; i++) {
                const uuid = uuidv4();
                expect(uuids.has(uuid)).toBe(false);
                uuids.add(uuid);
            }

            expect(uuids.size).toBe(iterations);
        });
    });

    describe('Score Calculation', () => {
        test('should calculate average score correctly', () => {
            const calculateAverage = (scores) => {
                return scores.reduce((sum, score) => sum + score, 0) / scores.length;
            };

            // 测试各种情况
            expect(calculateAverage([5, 5, 5, 5, 5, 5, 5, 5])).toBe(5.0);
            expect(calculateAverage([1, 1, 1, 1, 1, 1, 1, 1])).toBe(1.0);
            expect(calculateAverage([3, 3, 3, 3, 3, 3, 3, 3])).toBe(3.0);
            expect(calculateAverage([5, 4, 3, 2, 1, 5, 4, 3])).toBe(3.375);
            expect(calculateAverage([4, 4, 4, 4, 4, 4, 4, 4])).toBe(4.0);
        });

        test('should handle score validation', () => {
            const validateScore = (score) => {
                return typeof score === 'number' && score >= 1 && score <= 5 && score % 1 === 0;
            };

            // 有效分数
            expect(validateScore(1)).toBe(true);
            expect(validateScore(3)).toBe(true);
            expect(validateScore(5)).toBe(true);

            // 无效分数
            expect(validateScore(0)).toBe(false);
            expect(validateScore(6)).toBe(false);
            expect(validateScore(3.5)).toBe(false);
            expect(validateScore('3')).toBe(false);
            expect(validateScore(null)).toBe(false);
            expect(validateScore(undefined)).toBe(false);
        });

        test('should validate scores array', () => {
            const validateScoresArray = (scores) => {
                if (!Array.isArray(scores) || scores.length !== 8) {
                    return false;
                }
                return scores.every(score => validateScore(score));
            };

            const validateScore = (score) => {
                return typeof score === 'number' && score >= 1 && score <= 5 && score % 1 === 0;
            };

            // 有效数组
            expect(validateScoresArray([1, 2, 3, 4, 5, 1, 2, 3])).toBe(true);
            expect(validateScoresArray([5, 5, 5, 5, 5, 5, 5, 5])).toBe(true);

            // 无效数组
            expect(validateScoresArray([1, 2, 3, 4, 5])).toBe(false); // 长度不足
            expect(validateScoresArray([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(false); // 长度过长
            expect(validateScoresArray([1, 2, 3, 4, 0, 6, 7, 8])).toBe(false); // 包含无效分数
            expect(validateScoresArray('not an array')).toBe(false);
            expect(validateScoresArray(null)).toBe(false);
        });
    });

    describe('Date Handling', () => {
        test('should format dates correctly', () => {
            const formatDate = (date) => {
                return new Date(date).toLocaleString('zh-CN');
            };

            const testDate = new Date('2024-01-01T10:30:00');
            const formatted = formatDate(testDate);
            
            expect(formatted).toBeDefined();
            expect(typeof formatted).toBe('string');
            expect(formatted).toContain('2024');
        });

        test('should handle date validation', () => {
            const isValidDate = (date) => {
                if (date === null || date === undefined) return false;
                const d = new Date(date);
                return d instanceof Date && !isNaN(d);
            };

            expect(isValidDate('2024-01-01')).toBe(true);
            expect(isValidDate(new Date())).toBe(true);
            expect(isValidDate('invalid date')).toBe(false);
            expect(isValidDate(null)).toBe(false);
            expect(isValidDate(undefined)).toBe(false);
        });
    });

    describe('String Processing', () => {
        test('should sanitize input strings', () => {
            const sanitizeString = (str) => {
                if (typeof str !== 'string') return '';
                return str.trim().replace(/<script.*?>.*?<\/script>/gi, '').replace(/[<>\"']/g, '');
            };

            expect(sanitizeString('  normal string  ')).toBe('normal string');
            expect(sanitizeString('string<script>alert(1)</script>')).toBe('string');
            expect(sanitizeString('string with "quotes"')).toBe('string with quotes');
            expect(sanitizeString(123)).toBe('');
            expect(sanitizeString(null)).toBe('');
            expect(sanitizeString(undefined)).toBe('');
        });

        test('should validate email format', () => {
            const isValidEmail = (email) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return typeof email === 'string' && emailRegex.test(email);
            };

            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('invalid-email')).toBe(false);
            expect(isValidEmail('@domain.com')).toBe(false);
            expect(isValidEmail('test@')).toBe(false);
            expect(isValidEmail(null)).toBe(false);
        });
    });

    describe('Excel Processing', () => {
        test('should create Excel workbook with correct structure', async () => {
            const workbook = new ExcelJS.Workbook();
            
            // 测试工作簿创建
            expect(workbook).toBeDefined();
            expect(workbook.worksheets).toHaveLength(0);

            // 添加工作表
            const worksheet = workbook.addWorksheet('Test Sheet');
            expect(workbook.worksheets).toHaveLength(1);
            expect(worksheet.name).toBe('Test Sheet');

            // 添加列
            worksheet.columns = [
                { header: 'Name', key: 'name' },
                { header: 'Score', key: 'score' }
            ];

            expect(worksheet.columns).toHaveLength(2);
            expect(worksheet.columns[0].header).toBe('Name');

            // 添加数据行
            worksheet.addRow({ name: 'Test User', score: 5 });
            worksheet.addRow({ name: 'Another User', score: 4 });

            // ExcelJS中rowCount包含标题行
            expect(worksheet.rowCount).toBe(3);
        });

        test('should calculate statistics correctly', () => {
            const calculateStatistics = (scores) => {
                if (!scores || scores.length === 0) {
                    return { average: 0, min: 0, max: 0, stddev: 0 };
                }

                const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                const min = Math.min(...scores);
                const max = Math.max(...scores);
                const variance = scores.reduce((acc, score) => acc + Math.pow(score - average, 2), 0) / scores.length;
                const stddev = Math.sqrt(variance);

                return { average, min, max, stddev };
            };

            // 测试统计数据计算
            const stats1 = calculateStatistics([5, 4, 3, 2, 1]);
            expect(stats1.average).toBe(3);
            expect(stats1.min).toBe(1);
            expect(stats1.max).toBe(5);
            expect(stats1.stddev).toBeCloseTo(1.414, 2);

            const stats2 = calculateStatistics([4, 4, 4, 4]);
            expect(stats2.average).toBe(4);
            expect(stats2.min).toBe(4);
            expect(stats2.max).toBe(4);
            expect(stats2.stddev).toBe(0);

            const stats3 = calculateStatistics([]);
            expect(stats3.average).toBe(0);
            expect(stats3.min).toBe(0);
            expect(stats3.max).toBe(0);
            expect(stats3.stddev).toBe(0);
        });
    });

    describe('Array Operations', () => {
        test('should shuffle array correctly', () => {
            const shuffleArray = (array) => {
                const shuffled = [...array];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                return shuffled;
            };

            const original = [1, 2, 3, 4, 5];
            const shuffled = shuffleArray(original);

            expect(shuffled).toHaveLength(original.length);
            expect(shuffled).toEqual(expect.arrayContaining(original));
            expect(original).toEqual(expect.arrayContaining(shuffled));
        });

        test('should remove duplicates from array', () => {
            const removeDuplicates = (array) => {
                return [...new Set(array)];
            };

            expect(removeDuplicates([1, 2, 2, 3, 3, 3, 4])).toEqual([1, 2, 3, 4]);
            expect(removeDuplicates(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
            expect(removeDuplicates([])).toEqual([]);
        });
    });

    describe('Number Utilities', () => {
        test('should format numbers correctly', () => {
            const formatNumber = (num, decimals = 2) => {
                return Number(num).toFixed(decimals);
            };

            expect(formatNumber(3.14159, 2)).toBe('3.14');
            expect(formatNumber(3.14159, 4)).toBe('3.1416');
            expect(formatNumber(5, 1)).toBe('5.0');
            expect(formatNumber(0.123456, 3)).toBe('0.123');
        });

        test('should generate random numbers in range', () => {
            const randomInRange = (min, max) => {
                return Math.floor(Math.random() * (max - min + 1)) + min;
            };

            // 测试随机数生成
            for (let i = 0; i < 100; i++) {
                const num = randomInRange(1, 5);
                expect(num).toBeGreaterThanOrEqual(1);
                expect(num).toBeLessThanOrEqual(5);
                expect(Number.isInteger(num)).toBe(true);
            }
        });
    });

    describe('Validation Utilities', () => {
        test('should validate survey names', () => {
            const validateSurveyName = (name) => {
                if (typeof name !== 'string') return false;
                const trimmed = name.trim();
                return trimmed.length > 0 && trimmed.length <= 100;
            };

            expect(validateSurveyName('2024年团队评估')).toBe(true);
            expect(validateSurveyName('Test Survey')).toBe(true);
            expect(validateSurveyName('  spaced name  ')).toBe(true);
            expect(validateSurveyName('')).toBe(false);
            expect(validateSurveyName('   ')).toBe(false);
            expect(validateSurveyName('a'.repeat(101))).toBe(false);
            expect(validateSurveyName(null)).toBe(false);
            expect(validateSurveyName(123)).toBe(false);
        });

        test('should validate respondent names', () => {
            const validateRespondentName = (name) => {
                if (typeof name !== 'string') return false;
                const trimmed = name.trim();
                return trimmed.length >= 2 && trimmed.length <= 50 && /^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(trimmed);
            };

            expect(validateRespondentName('张三')).toBe(true);
            expect(validateRespondentName('John Doe')).toBe(true);
            expect(validateRespondentName('张')).toBe(false); // 太短
            expect(validateRespondentName('a'.repeat(51))).toBe(false); // 太长
            expect(validateRespondentName('John123')).toBe(false); // 包含数字
            expect(validateRespondentName('')).toBe(false);
        });
    });
});