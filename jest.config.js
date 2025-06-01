module.exports = {
  // Test environment configuration
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file discovery
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // TypeScript transformation
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        target: 'es2020',
        module: 'commonjs',
        moduleResolution: 'node',
        declaration: false,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        allowSyntheticDefaultImports: true
      }
    }],
  },
  
  // Module resolution
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'nodes/**/*.ts',
    'credentials/**/*.ts',
    'utils/**/*.ts',
    '!**/*.test.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/*.d.ts',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 95,
      lines: 90,
      statements: 90
    },
    './nodes/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './credentials/': {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85
    },
    './utils/': {
      branches: 95,
      functions: 100,
      lines: 95,
      statements: 95
    }
  },
  
  // Test setup and teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Test execution configuration
  testTimeout: 10000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  bail: 0, // Continue running tests after failures
  
  // Performance optimizations
  maxWorkers: '50%',
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Reporter configuration
  reporters: ['default'],
  
  // Global test configuration
  globals: {},
  
  // Test environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Watch mode configuration (optional plugins)
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname'
  // ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(n8n-workflow)/)'
  ]
}; 