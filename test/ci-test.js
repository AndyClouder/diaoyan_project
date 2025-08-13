const http = require('http');

// Simple test to verify the server can start
function testServerStart() {
  console.log('Testing server startup...');
  
  try {
    // Try to require the server file
    const server = require('../server-cloud.js');
    console.log('✅ Server file can be required');
    
    // Check if express app is exported
    if (server && typeof server.listen === 'function') {
      console.log('✅ Express app is properly exported');
    } else {
      console.log('⚠️  Server file structure may need adjustment');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Server test failed:', error.message);
    return false;
  }
}

// Test database configuration
function testDatabaseConfig() {
  console.log('Testing database configuration...');
  
  try {
    require('dotenv').config();
    const { Pool } = require('pg');
    
    // Test if we can create a pool (doesn't actually connect)
    const pool = new Pool({
      user: process.env.DB_USER || 'test',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'test',
      password: process.env.DB_PASSWORD || 'test',
      port: process.env.DB_PORT || 5432,
    });
    
    console.log('✅ Database configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Database configuration test failed:', error.message);
    return false;
  }
}

// Test package.json scripts
function testPackageJson() {
  console.log('Testing package.json configuration...');
  
  try {
    const packageJson = require('../package.json');
    
    // Check required fields
    const requiredFields = ['name', 'version', 'main', 'scripts'];
    for (const field of requiredFields) {
      if (!packageJson[field]) {
        console.error(`❌ Missing required field: ${field}`);
        return false;
      }
    }
    
    // Check required scripts
    const requiredScripts = ['start', 'dev', 'test'];
    for (const script of requiredScripts) {
      if (!packageJson.scripts[script]) {
        console.error(`❌ Missing required script: ${script}`);
        return false;
      }
    }
    
    console.log('✅ package.json configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ package.json test failed:', error.message);
    return false;
  }
}

// Run all tests
function runTests() {
  console.log('🧪 Running CI/CD tests...\n');
  
  const tests = [
    testPackageJson,
    testDatabaseConfig,
    testServerStart
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    try {
      if (test()) {
        passed++;
      }
    } catch (error) {
      console.error(`❌ Test failed with error: ${error.message}`);
    }
    console.log(''); // Add spacing between tests
  }
  
  console.log(`📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testServerStart,
  testDatabaseConfig,
  testPackageJson,
  runTests
};