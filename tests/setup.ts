/**
 * Jest Setup File
 * 
 * This file is run before each test file is executed.
 * It sets up global configurations, mocks, and utilities.
 */

// Global test timeout for async operations
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Suppress console output during tests unless explicitly enabled
if (process.env.TEST_VERBOSE !== 'true') {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
}

// Global test utilities
global.testUtils = {
  // Restore original console methods when needed
  restoreConsole: () => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  },

  // Utility to wait for async operations
  wait: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),

  // Utility to create deep copy of objects
  deepClone: <T>(obj: T): T => JSON.parse(JSON.stringify(obj)),

  // Utility to generate random test data
  randomString: (length: number = 10) => 
    Math.random().toString(36).substring(2, length + 2),

  // Utility to create test dates
  createTestDate: (daysAgo: number = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  },

  // Utility to validate test environment
  validateTestEnv: () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Tests must be run with NODE_ENV=test');
    }
  },
};

// Global type declarations for test utilities
declare global {
  namespace globalThis {
    var testUtils: {
      restoreConsole: () => void;
      wait: (ms?: number) => Promise<void>;
      deepClone: <T>(obj: T) => T;
      randomString: (length?: number) => string;
      createTestDate: (daysAgo?: number) => string;
      validateTestEnv: () => void;
    };
  }
}

// Setup global error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

// Setup for memory leak detection
const startMemoryUsage = process.memoryUsage();

// After all tests in a file complete
afterAll(() => {
  // Check for memory leaks (basic check)
  const endMemoryUsage = process.memoryUsage();
  const heapDiff = endMemoryUsage.heapUsed - startMemoryUsage.heapUsed;
  
  // Warn if heap usage increased significantly (> 100MB)
  if (heapDiff > 100 * 1024 * 1024) {
    console.warn(`⚠️  Potential memory leak detected: +${Math.round(heapDiff / 1024 / 1024)}MB heap usage`);
  }
});

// Environment validation
testUtils.validateTestEnv();

// Export for explicit imports if needed
export default global.testUtils; 