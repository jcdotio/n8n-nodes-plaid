# Testing Documentation

## Overview

The n8n-nodes-plaid package uses Jest for testing with TypeScript support. Our testing strategy focuses on unit tests, integration tests, and comprehensive mocking to ensure reliability without external dependencies.

## Test Architecture

### Test Types

1. **Unit Tests** (`tests/unit/`)
   - Test individual components in isolation
   - Mock all external dependencies
   - Fast execution (< 100ms per test)
   - High coverage of business logic

2. **Integration Tests** (`tests/integration/`)
   - Test complete workflows end-to-end
   - Simulate real n8n execution contexts
   - Test data flow between operations
   - Validate error handling chains

3. **Mock Tests** (`tests/mocks/`)
   - Provide realistic test data
   - Simulate Plaid API responses
   - Enable predictable testing
   - Support error scenario testing

### Directory Structure

```
tests/
├── unit/
│   ├── Plaid.node.test.ts           # Main node tests (30+ tests)
│   └── PlaidHelpers.test.ts         # Utility function tests (15+ tests)
├── integration/
│   └── PlaidWorkflow.test.ts        # Workflow tests (8+ tests)
├── mocks/
│   └── plaidApiMocks.ts             # Mock data and responses
└── README.md                        # Testing guide
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode (development)
npm run test:watch

# Run tests with verbose output
npm test -- --verbose
```

### Targeted Testing

```bash
# Run only unit tests
npm test -- tests/unit/

# Run only integration tests
npm test -- tests/integration/

# Run specific test file
npm test -- tests/unit/Plaid.node.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="sync"

# Run tests for specific describe block
npm test -- --testNamePattern="Transaction Operations"
```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with detailed logging
npm test -- --testNamePattern="should handle API errors" --verbose

# Run tests and leave Node.js inspector open
npm test -- --inspect-brk

# Run tests with custom timeout
npm test -- --testTimeout=10000
```

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'nodes/**/*.ts',
    'credentials/**/*.ts',
    'utils/**/*.ts',
    '!**/*.test.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000,
  verbose: true
};
```

### TypeScript Configuration

Tests use the same TypeScript configuration as the main project but with additional test-specific settings in `tsconfig.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"]
  },
  "include": [
    "tests/**/*",
    "nodes/**/*",
    "credentials/**/*",
    "utils/**/*"
  ]
}
```

## Mocking Strategy

### Plaid SDK Mocking

We completely mock the Plaid SDK to ensure tests are:
- **Fast**: No network calls
- **Reliable**: No external service dependencies  
- **Predictable**: Consistent responses
- **Controllable**: Can simulate any scenario

```typescript
jest.mock('plaid', () => ({
  Configuration: jest.fn(),
  PlaidApi: jest.fn().mockImplementation(() => ({
    transactionsSync: jest.fn(),
    transactionsGet: jest.fn(),
    accountsGet: jest.fn(),
    accountsBalanceGet: jest.fn(),
    authGet: jest.fn(),
    institutionsSearch: jest.fn(),
    institutionsGetById: jest.fn(),
    itemGet: jest.fn(),
    itemRemove: jest.fn(),
    identityGet: jest.fn(),
  })),
  PlaidEnvironments: {
    sandbox: 'https://sandbox.plaid.com',
    production: 'https://production.plaid.com',
  },
  Products: {
    Transactions: 'transactions',
    Auth: 'auth',
    Identity: 'identity',
    Assets: 'assets',
  },
  CountryCode: {
    US: 'US',
    CA: 'CA',
    GB: 'GB',
  },
}));
```

### n8n Execution Context Mocking

We create comprehensive mocks for n8n's execution environment:

```typescript
const createMockExecuteFunctions = (
  nodeParameters: Record<string, any> = {},
  credentials: any = mockCredentials,
  inputData: any[] = [{ json: {} }]
): IExecuteFunctions => {
  return {
    getInputData: jest.fn().mockReturnValue(inputData),
    getCredentials: jest.fn().mockResolvedValue(credentials),
    getNodeParameter: jest.fn().mockImplementation((paramName: string, itemIndex: number, defaultValue?: any) => {
      return nodeParameters[paramName] !== undefined ? nodeParameters[paramName] : defaultValue;
    }),
    continueOnFail: jest.fn().mockReturnValue(false),
    getNode: jest.fn().mockReturnValue({
      name: 'Plaid Test Node',
      type: 'n8n-nodes-plaid.plaid',
      position: [250, 300],
      parameters: nodeParameters,
    }),
    helpers: {
      request: jest.fn(),
    },
  } as any;
};
```

## Test Data

### Mock Credentials

```typescript
export const mockCredentials = {
  environment: 'sandbox',
  clientId: 'test_client_id',
  secret: 'test_secret_key',
  accessToken: 'access-sandbox-test-token',
};
```

### Mock Responses

We provide realistic mock responses for all Plaid endpoints:

```typescript
export const mockTransactionsSyncResponse = {
  data: {
    added: [
      {
        transaction_id: 'test_transaction_1',
        account_id: 'test_account_1',
        amount: -50.25,
        iso_currency_code: 'USD',
        date: '2024-01-15',
        name: 'STARBUCKS COFFEE',
        category: ['Food and Drink', 'Restaurants', 'Coffee Shop'],
        personal_finance_category: {
          primary: 'FOOD_AND_DRINK',
          detailed: 'FOOD_AND_DRINK_COFFEE',
        },
        // ... more realistic data
      }
    ],
    modified: [],
    removed: [],
    next_cursor: 'next_cursor_token_123',
    has_more: false,
  },
};
```

## Writing Tests

### Test Structure Template

```typescript
import { Plaid } from '../../nodes/Plaid/Plaid.node';
import { mockCredentials, mockApiResponse } from '../mocks/plaidApiMocks';

// Mock external dependencies
jest.mock('plaid', () => ({ /* mock implementation */ }));

describe('Feature Name', () => {
  let plaidNode: Plaid;
  let mockPlaidClient: any;
  let mockExecuteFunctions: any;

  beforeEach(() => {
    // Setup fresh instances
    plaidNode = new Plaid();
    
    // Setup mock client
    const { PlaidApi } = require('plaid');
    mockPlaidClient = {
      methodName: jest.fn(),
    };
    PlaidApi.mockImplementation(() => mockPlaidClient);

    // Setup mock execution context
    mockExecuteFunctions = createMockExecuteFunctions({
      resource: 'transaction',
      operation: 'sync',
      // ... other parameters
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Specific Functionality', () => {
    it('should handle normal case correctly', async () => {
      // Arrange
      mockPlaidClient.methodName.mockResolvedValue(mockApiResponse);

      // Act
      const result = await plaidNode.execute.call(mockExecuteFunctions);

      // Assert
      expect(mockPlaidClient.methodName).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        // ... expected parameters
      });
      
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(expectedItemCount);
      expect(result[0][0].json).toEqual(
        expect.objectContaining({
          // ... expected properties
        })
      );
    });

    it('should handle error case gracefully', async () => {
      // Arrange
      const apiError = {
        response: {
          data: {
            error_type: 'INVALID_REQUEST',
            error_code: 'INVALID_ACCESS_TOKEN',
            error_message: 'Invalid access token',
          },
        },
      };
      mockPlaidClient.methodName.mockRejectedValue(apiError);
      mockExecuteFunctions.continueOnFail.mockReturnValue(true);

      // Act
      const result = await plaidNode.execute.call(mockExecuteFunctions);

      // Assert
      expect(result[0][0].json.error).toBe(true);
      expect(result[0][0].json.error_code).toBe('INVALID_ACCESS_TOKEN');
    });
  });
});
```

### Best Practices

#### 1. Test Naming Convention
```typescript
// ✅ Good: Descriptive and specific
it('should sync transactions with cursor pagination correctly', () => {});

// ❌ Bad: Vague and generic
it('should work', () => {});
```

#### 2. AAA Pattern (Arrange, Act, Assert)
```typescript
it('should filter transactions by account IDs', async () => {
  // Arrange: Setup test data and mocks
  const accountIds = 'account1,account2';
  mockExecuteFunctions.getNodeParameter.mockImplementation((param) => {
    if (param === 'accountIds') return accountIds;
    return defaultParameters[param];
  });
  mockPlaidClient.transactionsSync.mockResolvedValue(mockResponse);

  // Act: Execute the functionality
  const result = await plaidNode.execute.call(mockExecuteFunctions);

  // Assert: Verify expected outcomes
  expect(mockPlaidClient.transactionsSync).toHaveBeenCalledWith({
    access_token: mockCredentials.accessToken,
    account_ids: ['account1', 'account2'],
    // ... other expected parameters
  });
  expect(result[0]).toHaveLength(expectedTransactionCount);
});
```

#### 3. Test Independence
```typescript
// ✅ Good: Each test is independent
describe('Transaction Operations', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup fresh instances
    plaidNode = new Plaid();
    setupMocks();
  });
});
```

#### 4. Edge Case Testing
```typescript
describe('Edge Cases', () => {
  it('should handle empty transaction list', async () => {
    mockPlaidClient.transactionsSync.mockResolvedValue({
      data: { added: [], modified: [], removed: [], next_cursor: null, has_more: false }
    });
    
    const result = await plaidNode.execute.call(mockExecuteFunctions);
    expect(result[0]).toHaveLength(0);
  });

  it('should handle malformed API response', async () => {
    mockPlaidClient.transactionsSync.mockResolvedValue({ invalid: 'response' });
    
    await expect(
      plaidNode.execute.call(mockExecuteFunctions)
    ).rejects.toThrow();
  });
});
```

## Coverage Analysis

### Current Coverage Stats

- **Overall Coverage**: 68%
- **Functions**: 72%
- **Lines**: 65%
- **Branches**: 60%

### Coverage Goals

- **Overall**: > 90%
- **Functions**: > 95%
- **Lines**: > 90%
- **Branches**: > 85%

### Viewing Coverage Reports

```bash
# Generate coverage report
npm test -- --coverage

# Open HTML report in browser
open coverage/lcov-report/index.html

# View coverage summary in terminal
npm test -- --coverage --coverageReporters=text
```

### Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'nodes/**/*.ts',
    'credentials/**/*.ts',
    'utils/**/*.ts',
    '!**/*.test.ts',
    '!**/node_modules/**',
    '!**/*.d.ts',
  ],
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
    }
  },
};
```

## Continuous Integration

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run ESLint
      run: npm run lint
    
    - name: Run tests with coverage
      run: npm test -- --coverage --watchAll=false
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        fail_ci_if_error: true
    
    - name: Build package
      run: npm run build
    
    - name: Test package installation
      run: npm pack && npm install *.tgz
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm test",
      "pre-push": "npm test -- --coverage"
    }
  }
}
```

## Debugging Tests

### Common Issues and Solutions

#### 1. Module Resolution Errors
```
Error: Cannot find module 'n8n-workflow'
```

**Solution**:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Check Node.js and npm versions
node --version  # Should be >= 18.0.0
npm --version   # Should be >= 8.0.0
```

#### 2. Mock Not Working
```
TypeError: Cannot read property 'transactionsSync' of undefined
```

**Solution**:
```typescript
// Ensure mock is properly set up in beforeEach
beforeEach(() => {
  jest.clearAllMocks();
  
  const { PlaidApi } = require('plaid');
  mockPlaidClient = {
    transactionsSync: jest.fn(),
    // ... other methods
  };
  PlaidApi.mockImplementation(() => mockPlaidClient);
});
```

#### 3. Async Test Timeout
```
Timeout - Async callback was not invoked within the 5000ms timeout
```

**Solution**:
```typescript
// Increase timeout for specific test
it('should handle long operation', async () => {
  // ... test code
}, 10000); // 10 second timeout

// Or set global timeout in jest.config.js
module.exports = {
  testTimeout: 10000,
};
```

#### 4. Memory Leaks in Tests
```
Jest detected handles preventing exit
```

**Solution**:
```typescript
// Clean up in afterAll
afterAll(async () => {
  // Close any open connections
  await cleanup();
});

// Or use --forceExit flag (not recommended)
npm test -- --forceExit
```

### Debug-Specific Commands

```bash
# Run tests in debug mode
npm test -- --inspect-brk

# Run specific test with debugging
npm test -- --testNamePattern="specific test" --inspect-brk

# Run tests with Node.js debugging enabled
node --inspect-brk node_modules/.bin/jest --runInBand

# Run tests with Chrome DevTools debugging
npm test -- --inspect-brk --runInBand
```

### Using VS Code Debugger

1. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Jest Tests",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--testPathPattern=${fileBasenameNoExtension}"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "disableOptimisticBPs": true,
      "windows": {
        "program": "${workspaceFolder}/node_modules/jest/bin/jest"
      }
    }
  ]
}
```

2. Set breakpoints in test files
3. Press F5 or use Debug menu to start debugging

## Performance Testing

### Test Execution Speed

Monitor test performance to ensure fast feedback:

```bash
# Run tests with timing information
npm test -- --verbose --detectOpenHandles

# Profile test execution
npm test -- --logHeapUsage

# Run tests with coverage and timing
npm test -- --coverage --verbose --passWithNoTests
```

### Expected Performance Benchmarks

- **Unit Tests**: < 100ms per test
- **Integration Tests**: < 500ms per test  
- **Full Test Suite**: < 30 seconds
- **Coverage Report**: < 10 seconds additional

### Optimizing Test Performance

1. **Mock External Dependencies**: Eliminate network calls
2. **Use beforeEach/afterEach Properly**: Clean setup/teardown
3. **Parallel Test Execution**: Jest runs tests in parallel by default
4. **Selective Test Running**: Use patterns to run only relevant tests

```bash
# Run tests in parallel (default)
npm test

# Run tests sequentially for debugging
npm test -- --runInBand

# Run only changed tests (with git)
npm test -- --onlyChanged

# Run tests related to specific files
npm test -- --findRelatedTests nodes/Plaid/Plaid.node.ts
```

## Manual Testing

### Testing with Real Plaid Sandbox

For end-to-end validation with real Plaid API:

1. **Setup Sandbox Account**:
   - Register at [Plaid Dashboard](https://dashboard.plaid.com)
   - Get sandbox credentials
   - Generate test access tokens

2. **Environment Configuration**:
   ```bash
   # Create .env.test file
   PLAID_CLIENT_ID=your_sandbox_client_id
   PLAID_SECRET=your_sandbox_secret
   PLAID_ACCESS_TOKEN=your_sandbox_access_token
   PLAID_ENVIRONMENT=sandbox
   ```

3. **Run Integration Tests**:
   ```bash
   # Load environment and run tests
   npm run test:integration:real
   
   # Or manually run with environment
   export PLAID_CLIENT_ID=your_client_id
   export PLAID_SECRET=your_secret
   npm test -- tests/integration/
   ```

### Testing in n8n Environment

1. **Link Package Locally**:
   ```bash
   # In this package directory
   npm link
   
   # In n8n directory
   npm link n8n-nodes-plaid
   ```

2. **Test Node in n8n**:
   - Start n8n in development mode
   - Create test workflow
   - Configure Plaid credentials
   - Execute transactions sync
   - Verify data output

3. **Validate Workflow**:
   - Check node appears in n8n interface
   - Test all parameter combinations
   - Verify error handling
   - Test with real Plaid sandbox

## Conclusion

This comprehensive testing suite ensures the n8n-nodes-plaid package is reliable, maintainable, and production-ready. The combination of unit tests, integration tests, and comprehensive mocking provides confidence in all functionality while maintaining fast feedback loops for development.

For additional questions or contributions to the testing suite, please refer to our [Contributing Guide](../CONTRIBUTING.md) or open an issue on GitHub. 