# Testing Quick Reference

## Essential Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run all tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:ci` | CI/CD optimized test run |

## Development Workflow

### 1. Daily Development
```bash
# Start watch mode during development
npm run test:watch

# Run specific test file
npm test -- tests/unit/Plaid.node.test.ts

# Run tests related to changed files
npm run test:changed
```

### 2. Feature Development
```bash
# Write test first, then implementation
npm test -- --testNamePattern="new feature"

# Run tests for specific functionality
npm test -- --testNamePattern="transaction sync"

# Debug failing test
npm run test:debug
```

### 3. Before Commit
```bash
# Run full test suite with coverage
npm run test:coverage

# Check performance
npm run test:performance

# Ensure all tests pass
npm run test:ci
```

## Test File Patterns

### Unit Test Example
```typescript
describe('Plaid Node', () => {
  it('should sync transactions correctly', async () => {
    // Arrange
    mockPlaidClient.transactionsSync.mockResolvedValue(mockResponse);

    // Act
    const result = await plaidNode.execute.call(mockExecute);

    // Assert
    expect(result[0]).toHaveLength(2);
    expect(result[0][0].json.transaction_id).toBe('test_transaction_1');
  });
});
```

### Integration Test Example
```typescript
describe('Transaction Workflow', () => {
  it('should process complete sync workflow', async () => {
    // Setup multi-step workflow
    const accountsResult = await getAccounts();
    const transactionsResult = await syncTransactions(accountsResult);
    
    // Verify end-to-end functionality
    expect(transactionsResult).toBeDefined();
  });
});
```

## Common Test Scenarios

### Testing API Errors
```typescript
it('should handle API errors gracefully', async () => {
  const apiError = {
    response: {
      data: {
        error_code: 'INVALID_ACCESS_TOKEN',
        error_message: 'Invalid access token'
      }
    }
  };
  
  mockPlaidClient.transactionsSync.mockRejectedValue(apiError);
  mockExecuteFunctions.continueOnFail.mockReturnValue(true);

  const result = await plaidNode.execute.call(mockExecuteFunctions);
  
  expect(result[0][0].json.error).toBe(true);
  expect(result[0][0].json.error_code).toBe('INVALID_ACCESS_TOKEN');
});
```

### Testing Parameter Validation
```typescript
it('should filter by account IDs', async () => {
  mockExecuteFunctions.getNodeParameter.mockImplementation((param) => {
    if (param === 'accountIds') return 'account1,account2';
    return defaultParameters[param];
  });

  await plaidNode.execute.call(mockExecuteFunctions);

  expect(mockPlaidClient.transactionsSync).toHaveBeenCalledWith({
    access_token: mockCredentials.accessToken,
    account_ids: ['account1', 'account2'],
  });
});
```

### Testing Environment Configuration
```typescript
it('should use correct environment', async () => {
  const prodCredentials = { ...mockCredentials, environment: 'production' };
  mockExecuteFunctions.getCredentials.mockResolvedValue(prodCredentials);

  await plaidNode.execute.call(mockExecuteFunctions);

  expect(Configuration).toHaveBeenCalledWith({
    basePath: 'https://production.plaid.com',
    // ... other config
  });
});
```

## Debugging Tests

### Debug Specific Test
```bash
# Run single test with debugging
npm test -- --testNamePattern="specific test" --inspect-brk

# Run test file with debugging
npm run test:debug tests/unit/Plaid.node.test.ts
```

### VS Code Debugging
1. Set breakpoint in test file
2. Press `F5` or use Debug menu
3. Select "Debug Jest Tests" configuration

### Console Output During Tests
```typescript
// In test file, temporarily enable console
beforeEach(() => {
  global.testUtils.restoreConsole();
});

it('should log debug info', () => {
  console.log('Debug information');
  // ... test code
});
```

## Coverage Analysis

### View Coverage Report
```bash
# Generate and open coverage report
npm run test:coverage
npm run coverage:open

# View text summary
npm run coverage:text

# Generate JSON report for tools
npm run coverage:json
```

### Coverage Goals
- **Overall**: > 90%
- **Functions**: > 95%
- **Lines**: > 90%
- **Branches**: > 85%

### Coverage Tips
- Focus on critical business logic first
- Test error handling paths
- Cover edge cases and boundary conditions
- Mock external dependencies completely

## Performance Testing

### Monitor Test Performance
```bash
# Check test execution time
npm run test:performance

# Profile memory usage
npm test -- --logHeapUsage

# Detect handles that prevent exit
npm test -- --detectOpenHandles
```

### Performance Benchmarks
- **Unit Tests**: < 100ms each
- **Integration Tests**: < 500ms each
- **Full Suite**: < 30 seconds
- **Coverage Generation**: < 10 seconds

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Module not found | `npm ci` to reinstall dependencies |
| Mock not working | Check `beforeEach` setup, ensure `jest.clearAllMocks()` |
| Test timeout | Increase timeout or check async handling |
| Memory leaks | Use `afterEach` cleanup, check for unclosed handles |

### Debug Commands
```bash
# Clean install
rm -rf node_modules package-lock.json && npm install

# Check Node.js version
node --version  # Should be >= 18.0.0

# Verify Jest configuration
npx jest --showConfig

# Run tests with detailed output
npm test -- --verbose --no-cache
```

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Push to main/develop
- Pull requests
- Manual workflow dispatch

### Local Pre-commit
```bash
# Setup pre-commit hook
echo "npm run test:ci" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Package Publishing
Tests are required before publishing:
```bash
npm run prepublishOnly  # Includes build, lint, and test:ci
```

## Best Practices

### ✅ Do
- Write tests before implementation (TDD)
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock all external dependencies
- Test error conditions
- Keep tests independent

### ❌ Don't
- Make network calls in tests
- Share state between tests
- Write overly complex tests
- Skip edge cases
- Ignore failing tests
- Hard-code test data

### Test Organization
```
tests/
├── unit/           # Fast, isolated tests
├── integration/    # End-to-end workflows
├── mocks/         # Shared test data
└── setup.ts       # Global test configuration
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TypeScript Testing](https://kulshekhar.github.io/ts-jest/)
- [n8n Node Development](https://docs.n8n.io/integrations/creating-nodes/)

---

**Quick Tip**: Use `npm run test:watch` during development for instant feedback on code changes! 