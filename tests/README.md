# Testing Guide for n8n-nodes-plaid

This document outlines the testing strategy and procedures for the n8n-nodes-plaid package.

## 🧪 Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── Plaid.node.test.ts  # Main node functionality
│   └── PlaidHelpers.test.ts # Utility functions
├── integration/             # Integration tests for workflows
│   └── PlaidWorkflow.test.ts # End-to-end workflow tests
├── mocks/                   # Mock data and responses
│   └── plaidApiMocks.ts     # Plaid API mock responses
└── README.md               # This file
```

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Specific Test Suites
```bash
# Unit tests only
npm test -- tests/unit/

# Integration tests only
npm test -- tests/integration/

# Specific test file
npm test -- tests/unit/Plaid.node.test.ts
```

## 📋 Test Coverage

### Unit Tests Coverage

#### Plaid Node (`Plaid.node.test.ts`)
- ✅ Node description and properties
- ✅ Credential requirements
- ✅ Transaction operations (sync and get range)
- ✅ Account operations (get all and balances)
- ✅ Auth operations (routing numbers)
- ✅ Institution operations (search and get by ID)
- ✅ Item operations (get and remove)
- ✅ Identity operations
- ✅ Error handling (API errors, network errors)
- ✅ Environment configuration (sandbox vs production)
- ✅ Parameter validation and filtering

#### PlaidHelpers (`PlaidHelpers.test.ts`)
- ✅ Environment URL resolution
- ✅ Transaction amount formatting
- ✅ Account ID parsing
- ✅ Date formatting
- ✅ Category enhancement
- ✅ Recurring transaction detection
- ✅ Spending score calculation

### Integration Tests Coverage

#### Workflow Tests (`PlaidWorkflow.test.ts`)
- ✅ Complete transaction sync workflow
- ✅ Pagination with cursor-based sync
- ✅ Multi-step financial workflows
- ✅ Error recovery workflows
- ✅ Environment switching
- ✅ Data processing and enrichment
- ✅ Batch processing with multiple inputs

## 🔧 Test Configuration

### Jest Configuration
The project uses Jest with TypeScript support:

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'nodes/**/*.ts',
    'credentials/**/*.ts',
    '!**/*.test.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
```

### Mocking Strategy

#### Plaid API Mocking
We mock the entire Plaid SDK to ensure tests are:
- Fast (no network calls)
- Reliable (no external dependencies)
- Predictable (consistent responses)

```typescript
jest.mock('plaid', () => ({
  Configuration: jest.fn(),
  PlaidApi: jest.fn().mockImplementation(() => ({
    transactionsSync: jest.fn(),
    accountsGet: jest.fn(),
    // ... other methods
  })),
  PlaidEnvironments: {
    sandbox: 'https://sandbox.plaid.com',
    production: 'https://production.plaid.com',
  },
}));
```

#### n8n Workflow Mocking
We create mock execution contexts that simulate n8n's runtime:

```typescript
const createMockExecuteFunctions = (
  nodeParameters: Record<string, any> = {},
  credentials: any = mockCredentials,
  inputData: any[] = [{ json: {} }]
): IExecuteFunctions => {
  return {
    getInputData: jest.fn().mockReturnValue(inputData),
    getCredentials: jest.fn().mockResolvedValue(credentials),
    getNodeParameter: jest.fn().mockImplementation((paramName: string) => {
      return nodeParameters[paramName];
    }),
    // ... other n8n functions
  } as any;
};
```

## 🎯 Testing Scenarios

### 1. Basic Functionality Tests
- Node initialization and description
- Parameter validation
- Credential handling
- Basic API calls with mocked responses

### 2. Operation-Specific Tests
Each Plaid operation (transactions, accounts, auth, etc.) is tested with:
- Successful responses
- Error scenarios
- Parameter variations
- Data transformation

### 3. Error Handling Tests
- API errors with different error codes
- Network connectivity issues
- Invalid credentials
- Missing parameters
- Rate limiting scenarios

### 4. Workflow Integration Tests
- Multi-step workflows
- Data passing between operations
- Cursor-based pagination
- Batch processing
- Environment switching

### 5. Edge Cases
- Empty responses
- Large datasets
- Malformed data
- Timeout scenarios
- Concurrent requests

## 🐛 Debugging Tests

### Running Tests with Debug Output
```bash
# Run with verbose output
npm test -- --verbose

# Run with debug logs
DEBUG=* npm test

# Run specific test with detailed output
npm test -- --testNamePattern="should sync transactions" --verbose
```

### Common Issues and Solutions

#### 1. Module Resolution Errors
```
Cannot find module 'n8n-workflow' or 'plaid'
```
**Solution**: Ensure all dependencies are installed:
```bash
npm install
```

#### 2. Mock Not Working
```
TypeError: Cannot read property 'transactionsSync' of undefined
```
**Solution**: Check that mocks are properly set up in `beforeEach`:
```typescript
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Setup fresh mock instances
  const PlaidApiMock = PlaidApi as jest.MockedClass<typeof PlaidApi>;
  mockPlaidClient = { /* ... */ };
  PlaidApiMock.mockImplementation(() => mockPlaidClient);
});
```

#### 3. Async Test Issues
```
Test timeout after 5000ms
```
**Solution**: Ensure async tests are properly awaited:
```typescript
it('should handle async operation', async () => {
  mockPlaidClient.transactionsSync.mockResolvedValue(mockResponse);
  const result = await plaidNode.execute.call(mockExecute);
  expect(result).toBeDefined();
});
```

## 📊 Coverage Reports

After running tests with coverage, you can view detailed reports:

### Text Report (in terminal)
```bash
npm test -- --coverage
```

### HTML Report (in browser)
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

### Target Coverage Goals
- **Overall**: > 90%
- **Functions**: > 95%
- **Lines**: > 90%
- **Branches**: > 85%

## 🔄 Continuous Integration

### GitHub Actions
Add to `.github/workflows/test.yml`:

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm ci
    - run: npm run lint
    - run: npm test -- --coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
```

## 🔍 Manual Testing

### Testing with Real Plaid API (Sandbox)

For integration testing with real Plaid sandbox:

1. Get sandbox credentials from [Plaid Dashboard](https://dashboard.plaid.com)
2. Create test environment file:

```bash
# tests/.env.test
PLAID_CLIENT_ID=your_sandbox_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ACCESS_TOKEN=your_sandbox_access_token
```

3. Run integration tests:

```bash
npm run test:integration
```

### Testing in n8n Development Environment

1. Link the package locally:
```bash
npm link
```

2. In n8n development setup:
```bash
npm link n8n-nodes-plaid
```

3. Test the node in n8n's visual editor

## 📚 Writing New Tests

### Test File Template

```typescript
import { Plaid } from '../../nodes/Plaid/Plaid.node';
import { mockCredentials } from '../mocks/plaidApiMocks';

// Mock dependencies
jest.mock('plaid', () => ({
  // ... mock implementation
}));

describe('New Feature Tests', () => {
  let plaidNode: Plaid;
  let mockPlaidClient: any;

  beforeEach(() => {
    plaidNode = new Plaid();
    // Setup mocks
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Feature Group', () => {
    it('should handle specific scenario', async () => {
      // Arrange
      mockPlaidClient.newMethod.mockResolvedValue(mockResponse);

      // Act
      const result = await plaidNode.execute.call(mockExecute);

      // Assert
      expect(result).toBeDefined();
      expect(mockPlaidClient.newMethod).toHaveBeenCalledWith(expectedParams);
    });
  });
});
```

### Best Practices

1. **AAA Pattern**: Arrange, Act, Assert
2. **Clear Test Names**: Describe what is being tested and expected outcome
3. **Mock Everything External**: Plaid API, n8n functions, etc.
4. **Test Edge Cases**: Empty data, errors, edge values
5. **Verify Interactions**: Check that APIs are called with correct parameters
6. **Independent Tests**: Each test should be able to run in isolation

## 🎉 Ready to Test!

Your test suite is now ready. Run `npm test` to execute all tests and ensure everything is working correctly! 