import { IExecuteFunctions } from 'n8n-workflow';
import { Plaid } from '../../nodes/Plaid/Plaid.node';
import { PlaidApi, Configuration } from 'plaid';
import { mockCredentials, mockTransactionsSyncResponse } from '../mocks/plaidApiMocks';

// Mock n8n workflow functions
const createMockExecuteFunctions = (
  nodeParameters: Record<string, any> = {},
  credentials: any = mockCredentials,
  inputData: any[] = [{ json: {} }]
): IExecuteFunctions => {
  return {
    getInputData: jest.fn().mockReturnValue(inputData),
    getCredentials: jest.fn().mockResolvedValue(credentials),
    getNodeParameter: jest.fn().mockImplementation((paramName: string, _itemIndex: number, defaultValue?: any) => {
      return nodeParameters[paramName] !== undefined ? nodeParameters[paramName] : defaultValue;
    }),
    continueOnFail: jest.fn().mockReturnValue(false),
    getNode: jest.fn().mockReturnValue({ 
      name: 'Plaid Integration Test',
      type: 'n8n-nodes-plaid.plaid',
      position: [250, 300],
      parameters: nodeParameters,
    }),
    helpers: {
      request: jest.fn(),
    },
  } as any;
};

// Mock the Plaid API
jest.mock('plaid', () => {
  const mockTransactionsSync = jest.fn();
  const mockAccountsGet = jest.fn();
  const mockAuthGet = jest.fn();

  return {
    Configuration: jest.fn(),
    PlaidApi: jest.fn().mockImplementation(() => ({
      transactionsSync: mockTransactionsSync,
      accountsGet: mockAccountsGet,
      authGet: mockAuthGet,
    })),
    PlaidEnvironments: {
      sandbox: 'https://sandbox.plaid.com',
      production: 'https://production.plaid.com',
    },
    Products: {
      Transactions: 'transactions',
    },
  };
});

describe('Plaid Workflow Integration Tests', () => {
  let plaidNode: Plaid;
  let mockPlaidClient: any;

  beforeEach(() => {
    plaidNode = new Plaid();
    
    // Get the mocked PlaidApi instance
    const PlaidApiMock = PlaidApi as jest.MockedClass<typeof PlaidApi>;
    mockPlaidClient = {
      transactionsSync: jest.fn(),
      accountsGet: jest.fn(),
      authGet: jest.fn(),
    };
    PlaidApiMock.mockImplementation(() => mockPlaidClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Transaction Workflow', () => {
    it('should process a complete transaction sync workflow', async () => {
      // Setup: Mock successful API response
      mockPlaidClient.transactionsSync.mockResolvedValue(mockTransactionsSyncResponse);

      // Create execution context for transaction sync
      const mockExecute = createMockExecuteFunctions({
        resource: 'transaction',
        operation: 'sync',
        accessToken: mockCredentials.accessToken,
        cursor: '',
        returnAll: false,
        limit: 100,
        accountIds: '',
        additionalFields: {
          includeOriginalDescription: true,
          includePersonalFinanceCategory: true,
        },
      });

      // Execute the workflow
      const result = await plaidNode.execute.call(mockExecute);

      // Verify API was called correctly
      expect(mockPlaidClient.transactionsSync).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        cursor: undefined,
        count: 100,
        options: {
          include_original_description: true,
        },
      });

      // Verify result structure
      expect(result).toHaveLength(1); // One output array
      expect(result[0]).toHaveLength(2); // Two transactions

      // Verify transaction data enrichment
      const transaction1 = result[0][0].json;
      expect(transaction1.transaction_id).toBe('test_transaction_1');
      expect(transaction1.amount).toBe(50.25); // Math.abs applied
      expect(transaction1.transaction_type).toBe('expense');
      expect(transaction1.source).toBe('plaid_sync');
      expect(transaction1.sync_cursor).toBe('next_cursor_token_123');
      expect(transaction1.processed_at).toBeDefined();

      const transaction2 = result[0][1].json;
      expect(transaction2.transaction_type).toBe('income');
      expect(transaction2.amount).toBe(2500.00);
    });

    it('should handle pagination with cursor-based sync', async () => {
      // Mock first response with has_more = true
      const firstResponse = {
        ...mockTransactionsSyncResponse,
        data: {
          ...mockTransactionsSyncResponse.data,
          has_more: true,
          next_cursor: 'cursor_page_2',
        },
      };

      mockPlaidClient.transactionsSync.mockResolvedValue(firstResponse);

      const mockExecute = createMockExecuteFunctions({
        resource: 'transaction',
        operation: 'sync',
        accessToken: mockCredentials.accessToken,
        cursor: 'initial_cursor',
        returnAll: false,
        limit: 100,
        accountIds: '',
        additionalFields: {},
      });

      const result = await plaidNode.execute.call(mockExecute);

      // Verify cursor was passed correctly
      expect(mockPlaidClient.transactionsSync).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        cursor: 'initial_cursor',
        count: 100,
      });

      // Verify cursor is included in response for next iteration
      expect(result[0][0].json.sync_cursor).toBe('cursor_page_2');
      expect(result[0][0].json.has_more).toBe(true);
    });
  });

  describe('Multi-Step Financial Workflow', () => {
    it('should process accounts then transactions in sequence', async () => {
      // Step 1: Get accounts
      const mockAccountsResponse = {
        data: {
          accounts: [
            {
              account_id: 'account_123',
              name: 'Primary Checking',
              type: 'depository',
              subtype: 'checking',
              balances: { current: 1500.00, available: 1450.00 },
            },
          ],
        },
      };

      mockPlaidClient.accountsGet.mockResolvedValue(mockAccountsResponse);

      const accountsExecute = createMockExecuteFunctions({
        resource: 'account',
        operation: 'getAll',
        accessToken: mockCredentials.accessToken,
      });

      const accountsResult = await plaidNode.execute.call(accountsExecute);

      // Verify accounts were retrieved
      expect(accountsResult[0]).toHaveLength(1);
      expect(accountsResult[0][0].json.account_id).toBe('account_123');

      // Step 2: Use account ID for transaction filtering
      mockPlaidClient.transactionsSync.mockResolvedValue(mockTransactionsSyncResponse);

      const transactionsExecute = createMockExecuteFunctions({
        resource: 'transaction',
        operation: 'sync',
        accessToken: mockCredentials.accessToken,
        cursor: '',
        returnAll: false,
        limit: 100,
        accountIds: 'account_123',
        additionalFields: {},
      });

      const transactionsResult = await plaidNode.execute.call(transactionsExecute);

      // Verify transactions were filtered by account
      expect(mockPlaidClient.transactionsSync).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        cursor: undefined,
        count: 100,
        account_ids: ['account_123'],
      });

      expect(transactionsResult[0]).toHaveLength(2);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle temporary API failures gracefully', async () => {
      // First call fails
      const apiError = {
        response: {
          data: {
            error_type: 'API_ERROR',
            error_code: 'INTERNAL_SERVER_ERROR',
            error_message: 'Internal server error',
          },
          status: 500,
        },
      };

      mockPlaidClient.transactionsSync
        .mockRejectedValueOnce(apiError)
        .mockResolvedValueOnce(mockTransactionsSyncResponse);

      // Test with continueOnFail = true
      const mockExecute = createMockExecuteFunctions({
        resource: 'transaction',
        operation: 'sync',
        cursor: '',
        returnAll: false,
        limit: 100,
        accountIds: '',
        additionalFields: {},
      });

      mockExecute.continueOnFail = jest.fn().mockReturnValue(true);

      const result = await plaidNode.execute.call(mockExecute);

      // Should return error information instead of throwing
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.error).toBe(true);
      expect(result[0][0].json.error_code).toBe('INTERNAL_SERVER_ERROR');
      expect(result[0][0].json.resource).toBe('transaction');
      expect(result[0][0].json.operation).toBe('sync');
    });
  });

  describe('Environment Switching Workflow', () => {
    it('should work with both sandbox and production environments', async () => {
      // Test sandbox environment
      const sandboxExecute = createMockExecuteFunctions(
        {
          resource: 'transaction',
          operation: 'sync',
          cursor: '',
          returnAll: false,
          limit: 100,
          accountIds: '',
          additionalFields: {},
        },
        { ...mockCredentials, environment: 'sandbox' }
      );

      mockPlaidClient.transactionsSync.mockResolvedValue(mockTransactionsSyncResponse);
      
      await plaidNode.execute.call(sandboxExecute);

      expect(Configuration).toHaveBeenCalledWith({
        basePath: 'https://sandbox.plaid.com',
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': mockCredentials.clientId,
            'PLAID-SECRET': mockCredentials.secret,
            'Plaid-Version': '2020-09-14',
          },
        },
      });

      // Test production environment
      const productionExecute = createMockExecuteFunctions(
        {
          resource: 'transaction',
          operation: 'sync',
          cursor: '',
          returnAll: false,
          limit: 100,
          accountIds: '',
          additionalFields: {},
        },
        { ...mockCredentials, environment: 'production' }
      );

      await plaidNode.execute.call(productionExecute);

      expect(Configuration).toHaveBeenCalledWith({
        basePath: 'https://production.plaid.com',
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': mockCredentials.clientId,
            'PLAID-SECRET': mockCredentials.secret,
            'Plaid-Version': '2020-09-14',
          },
        },
      });
    });
  });

  describe('Data Processing Workflow', () => {
    it('should process and enrich transaction data correctly', async () => {
      mockPlaidClient.transactionsSync.mockResolvedValue(mockTransactionsSyncResponse);

      const mockExecute = createMockExecuteFunctions({
        resource: 'transaction',
        operation: 'sync',
        cursor: '',
        returnAll: false,
        limit: 100,
        accountIds: '',
        additionalFields: {
          includeOriginalDescription: true,
          includePersonalFinanceCategory: true,
        },
      });

      const result = await plaidNode.execute.call(mockExecute);

      // Check data enrichment
      const coffeeTransaction = result[0][0].json;
      const payrollTransaction = result[0][1].json;

      // Coffee transaction should be categorized as expense
      expect(coffeeTransaction.transaction_type).toBe('expense');
      expect(coffeeTransaction.amount).toBe(50.25);
      expect(coffeeTransaction.personal_finance_category).toBeDefined();
      expect(coffeeTransaction.category).toEqual(['Food and Drink', 'Restaurants', 'Coffee Shop']);

      // Payroll should be categorized as income
      expect(payrollTransaction.transaction_type).toBe('income');
      expect(payrollTransaction.amount).toBe(2500.00);
      expect(payrollTransaction.category).toEqual(['Deposit', 'Payroll']);

      // Both should have processing metadata
      expect(coffeeTransaction.source).toBe('plaid_sync');
      expect(coffeeTransaction.processed_at).toBeDefined();
      expect(payrollTransaction.source).toBe('plaid_sync');
      expect(payrollTransaction.processed_at).toBeDefined();
    });
  });

  describe('Batch Processing Workflow', () => {
    it('should handle multiple input items correctly', async () => {
      mockPlaidClient.transactionsSync.mockResolvedValue(mockTransactionsSyncResponse);

      // Simulate multiple inputs (e.g., from previous node)
      const multipleInputs = [
        { json: { user_id: 'user1' } },
        { json: { user_id: 'user2' } },
      ];

      const mockExecute = createMockExecuteFunctions(
        {
          resource: 'transaction',
          operation: 'sync',
          cursor: '',
          returnAll: false,
          limit: 100,
          accountIds: '',
          additionalFields: {},
        },
        mockCredentials,
        multipleInputs
      );

      const result = await plaidNode.execute.call(mockExecute);

      // Should have called API twice (once per input)
      expect(mockPlaidClient.transactionsSync).toHaveBeenCalledTimes(2);

      // Should have results for both users
      expect(result[0]).toHaveLength(4); // 2 transactions per user = 4 total

      // Verify pairedItem mapping
      expect(result[0][0].pairedItem).toEqual({ item: 0 });
      expect(result[0][1].pairedItem).toEqual({ item: 0 });
      expect(result[0][2].pairedItem).toEqual({ item: 1 });
      expect(result[0][3].pairedItem).toEqual({ item: 1 });
    });
  });
}); 