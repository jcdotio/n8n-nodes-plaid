import { Plaid } from '../../nodes/Plaid/Plaid.node';
import { mockCredentials } from '../mocks/plaidApiMocks';

// Mock n8n workflow functions
const createMockExecuteFunctions = (
  nodeParameters: Record<string, any> = {},
  credentials: any = mockCredentials,
  inputData: any[] = [{ json: {} }]
): any => {
  const mockHttpRequest = jest.fn();
  
  const mockExecute = {
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
      httpRequest: mockHttpRequest,
    },
  };
  
  // Add the mock function to the returned object
  mockExecute.helpers.httpRequest = mockHttpRequest;
  return mockExecute;
};

// Mock API responses
const mockTransactionsSyncResponse = {
  added: [
    {
      transaction_id: 'test_transaction_1',
      account_id: 'account_123',
      amount: -50.25,
      date: '2024-01-15',
      name: 'Coffee Shop Purchase',
      category: ['Food and Drink', 'Restaurants', 'Coffee Shop'],
      personal_finance_category: {
        primary: 'FOOD_AND_DRINK',
        detailed: 'FOOD_AND_DRINK_COFFEE',
      },
    },
    {
      transaction_id: 'test_transaction_2',
      account_id: 'account_123',
      amount: 2500.00,
      date: '2024-01-14',
      name: 'Payroll Deposit',
      category: ['Deposit', 'Payroll'],
      personal_finance_category: {
        primary: 'INCOME',
        detailed: 'INCOME_WAGES',
      },
    },
  ],
  modified: [],
  removed: [],
  next_cursor: 'next_cursor_token_123',
  has_more: false,
};

describe('Plaid Workflow Integration Tests', () => {
  let plaidNode: Plaid;

  beforeEach(() => {
    plaidNode = new Plaid();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Transaction Workflow', () => {
    it('should process a complete transaction sync workflow', async () => {
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

      // Setup mock HTTP response
      mockExecute.helpers.httpRequest.mockResolvedValue(mockTransactionsSyncResponse);

      // Execute the workflow
      const result = await plaidNode.execute.call(mockExecute);

      // Verify HTTP was called correctly
      expect(mockExecute.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://sandbox.plaid.com/transactions/sync',
        headers: {
          'Content-Type': 'application/json',
          'PLAID-CLIENT-ID': mockCredentials.clientId,
          'PLAID-SECRET': mockCredentials.secret,
          'Plaid-Version': '2020-09-14',
        },
        body: {
          access_token: mockCredentials.accessToken,
          client_id: mockCredentials.clientId,
          secret: mockCredentials.secret,
        },
        json: true,
      });

      // Verify result structure
      expect(result).toHaveLength(1); // One output array
      expect(result[0]).toHaveLength(2); // Two transactions

      // Verify transaction data
      const transaction1 = result[0][0].json;
      expect(transaction1.transaction_id).toBe('test_transaction_1');
      expect(transaction1.sync_status).toBe('added');
      expect(transaction1.next_cursor).toBe('next_cursor_token_123');

      const transaction2 = result[0][1].json;
      expect(transaction2.transaction_id).toBe('test_transaction_2');
      expect(transaction2.sync_status).toBe('added');
    });

    it('should handle pagination with cursor-based sync', async () => {
      // Mock first response with has_next = true
      const firstResponse = {
        ...mockTransactionsSyncResponse,
        has_next: true,
        next_cursor: 'cursor_page_2',
      };

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

      mockExecute.helpers.httpRequest.mockResolvedValue(firstResponse);

      const result = await plaidNode.execute.call(mockExecute);

      // Verify cursor was passed correctly
      expect(mockExecute.helpers.httpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://sandbox.plaid.com/transactions/sync',
        headers: {
          'Content-Type': 'application/json',
          'PLAID-CLIENT-ID': mockCredentials.clientId,
          'PLAID-SECRET': mockCredentials.secret,
          'Plaid-Version': '2020-09-14',
        },
        body: {
          access_token: mockCredentials.accessToken,
          cursor: 'initial_cursor',
          client_id: mockCredentials.clientId,
          secret: mockCredentials.secret,
        },
        json: true,
      });

      // Verify cursor is included in response for next iteration
      expect(result[0][0].json.next_cursor).toBe('cursor_page_2');
      expect(result[0][0].json.has_next).toBe(true);
    });
  });

  describe('Multi-Step Financial Workflow', () => {
    it('should process accounts then transactions in sequence', async () => {
      // Step 1: Get accounts
      const mockAccountsResponse = {
        accounts: [
          {
            account_id: 'account_123',
            name: 'Primary Checking',
            type: 'depository',
            subtype: 'checking',
            balances: { current: 1500.00, available: 1450.00 },
          },
        ],
      };

      const accountsExecute = createMockExecuteFunctions({
        resource: 'account',
        operation: 'getAll',
        accessToken: mockCredentials.accessToken,
      });

      accountsExecute.helpers.httpRequest.mockResolvedValue(mockAccountsResponse);

      const accountsResult = await plaidNode.execute.call(accountsExecute);

      // Verify accounts were retrieved
      expect(accountsResult[0]).toHaveLength(1);
      expect(accountsResult[0][0].json.account_id).toBe('account_123');

      // Step 2: Use account ID for transaction filtering
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

      transactionsExecute.helpers.httpRequest.mockResolvedValue(mockTransactionsSyncResponse);

      const transactionsResult = await plaidNode.execute.call(transactionsExecute);

      // Verify transactions were processed
      expect(transactionsResult[0]).toHaveLength(2);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle temporary API failures gracefully', async () => {
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

      // First call fails
      const apiError = {
        response: {
          body: {
            error_type: 'API_ERROR',
            error_code: 'INTERNAL_SERVER_ERROR',
            error_message: 'Internal server error',
          },
          status: 500,
        },
        message: 'Request failed',
      };

      mockExecute.helpers.httpRequest.mockRejectedValue(apiError);

      const result = await plaidNode.execute.call(mockExecute);

      // Should return error information instead of throwing
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.error).toContain('Plaid API Error');
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

      sandboxExecute.helpers.httpRequest.mockResolvedValue(mockTransactionsSyncResponse);
      
      await plaidNode.execute.call(sandboxExecute);

      expect(sandboxExecute.helpers.httpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://sandbox.plaid.com/transactions/sync'
        })
      );

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

      productionExecute.helpers.httpRequest.mockResolvedValue(mockTransactionsSyncResponse);

      await plaidNode.execute.call(productionExecute);

      expect(productionExecute.helpers.httpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://production.plaid.com/transactions/sync'
        })
      );
    });
  });

  describe('Data Processing Workflow', () => {
    it('should process and enrich transaction data correctly', async () => {
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

      mockExecute.helpers.httpRequest.mockResolvedValue(mockTransactionsSyncResponse);

      const result = await plaidNode.execute.call(mockExecute);

      // Check data is processed correctly
      const coffeeTransaction = result[0][0].json;
      const payrollTransaction = result[0][1].json;

      // Both should have sync information
      expect(coffeeTransaction.sync_status).toBe('added');
      expect(coffeeTransaction.next_cursor).toBe('next_cursor_token_123');
      expect(payrollTransaction.sync_status).toBe('added');
      expect(payrollTransaction.next_cursor).toBe('next_cursor_token_123');
    });
  });

  describe('Batch Processing Workflow', () => {
    it('should handle multiple input items correctly', async () => {
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

      mockExecute.helpers.httpRequest.mockResolvedValue(mockTransactionsSyncResponse);

      const result = await plaidNode.execute.call(mockExecute);

      // Should have called HTTP twice (once per input)
      expect(mockExecute.helpers.httpRequest).toHaveBeenCalledTimes(2);

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