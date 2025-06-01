import { IExecuteFunctions } from 'n8n-workflow';
import { Plaid } from '../../nodes/Plaid/Plaid.node';
import { 
  mockCredentials, 
  mockTransactionsSyncResponse, 
  mockAccountsResponse,
  mockAuthResponse,
  mockPlaidApiError 
} from '../mocks/plaidApiMocks';

// Mock the plaid module
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
  },
}));

describe('Plaid Node', () => {
  let plaidNode: Plaid;
  let mockExecuteFunctions: Partial<IExecuteFunctions>;
  let mockPlaidClient: any;

  beforeEach(() => {
    plaidNode = new Plaid();
    
    // Mock PlaidApi client
    const { PlaidApi } = require('plaid');
    mockPlaidClient = {
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
    };
    PlaidApi.mockImplementation(() => mockPlaidClient);

    // Mock execute functions
    mockExecuteFunctions = {
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      getCredentials: jest.fn().mockResolvedValue(mockCredentials),
      getNodeParameter: jest.fn(),
      continueOnFail: jest.fn().mockReturnValue(false),
      getNode: jest.fn().mockReturnValue({ name: 'Plaid Test Node' }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Node Description', () => {
    it('should have correct node properties', () => {
      expect(plaidNode.description.displayName).toBe('Plaid');
      expect(plaidNode.description.name).toBe('plaid');
      expect(plaidNode.description.group).toContain('finance');
      expect(plaidNode.description.version).toBe(1);
    });

    it('should require plaidApi credentials', () => {
      const credentials = plaidNode.description.credentials;
      expect(credentials).toHaveLength(1);
      expect(credentials![0].name).toBe('plaidApi');
      expect(credentials![0].required).toBe(true);
    });
  });

  describe('Transaction Operations', () => {
    beforeEach(() => {
      (mockExecuteFunctions.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          switch (paramName) {
            case 'resource': return 'transaction';
            case 'operation': return 'sync';
            case 'cursor': return '';
            case 'returnAll': return false;
            case 'limit': return 100;
            case 'accountIds': return '';
            case 'additionalFields': return {};
            default: return '';
          }
        });
    });

    it('should sync transactions successfully', async () => {
      mockPlaidClient.transactionsSync.mockResolvedValue(mockTransactionsSyncResponse);

      const result = await plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(mockPlaidClient.transactionsSync).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        cursor: undefined,
        count: 100,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(2); // 2 transactions in mock response
      expect(result[0][0].json.transaction_id).toBe('test_transaction_1');
      expect(result[0][0].json.amount).toBe(50.25); // Math.abs applied
      expect(result[0][0].json.transaction_type).toBe('expense');
      expect(result[0][1].json.transaction_type).toBe('income');
    });

    it('should handle date range transactions', async () => {
      (mockExecuteFunctions.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          switch (paramName) {
            case 'resource': return 'transaction';
            case 'operation': return 'getRange';
            case 'startDate': return '2024-01-01T00:00:00Z';
            case 'endDate': return '2024-01-31T23:59:59Z';
            case 'returnAll': return false;
            case 'limit': return 100;
            case 'accountIds': return '';
            case 'additionalFields': return {};
            default: return '';
          }
        });

      const mockTransactionsGetResponse = {
        data: {
          transactions: mockTransactionsSyncResponse.data.added,
          total_transactions: 2,
        },
      };

      mockPlaidClient.transactionsGet.mockResolvedValue(mockTransactionsGetResponse);

      const result = await plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(mockPlaidClient.transactionsGet).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        count: 100,
        offset: 0,
      });

      expect(result[0]).toHaveLength(2);
    });

    it('should filter by account IDs', async () => {
      (mockExecuteFunctions.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          switch (paramName) {
            case 'resource': return 'transaction';
            case 'operation': return 'sync';
            case 'accountIds': return 'account1, account2, account3';
            case 'returnAll': return false;
            case 'limit': return 100;
            case 'cursor': return '';
            case 'additionalFields': return {};
            default: return '';
          }
        });

      mockPlaidClient.transactionsSync.mockResolvedValue(mockTransactionsSyncResponse);

      await plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(mockPlaidClient.transactionsSync).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        cursor: undefined,
        count: 100,
        account_ids: ['account1', 'account2', 'account3'],
      });
    });
  });

  describe('Account Operations', () => {
    beforeEach(() => {
      (mockExecuteFunctions.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          switch (paramName) {
            case 'resource': return 'account';
            case 'operation': return 'getAll';
            default: return '';
          }
        });
    });

    it('should get all accounts', async () => {
      mockPlaidClient.accountsGet.mockResolvedValue(mockAccountsResponse);

      const result = await plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(mockPlaidClient.accountsGet).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
      });

      expect(result[0]).toHaveLength(2);
      expect(result[0][0].json.account_id).toBe('test_account_1');
      expect(result[0][0].json.source).toBe('plaid_accounts');
    });

    it('should get account balances', async () => {
      (mockExecuteFunctions.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          switch (paramName) {
            case 'resource': return 'account';
            case 'operation': return 'getBalances';
            default: return '';
          }
        });

      mockPlaidClient.accountsBalanceGet.mockResolvedValue(mockAccountsResponse);

      const result = await plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(mockPlaidClient.accountsBalanceGet).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
      });

      expect(result[0][0].json.source).toBe('plaid_balances');
      expect(result[0][0].json.realtime).toBe(true);
    });
  });

  describe('Auth Operations', () => {
    beforeEach(() => {
      (mockExecuteFunctions.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          switch (paramName) {
            case 'resource': return 'auth';
            case 'operation': return 'get';
            default: return '';
          }
        });
    });

    it('should get auth data with routing numbers', async () => {
      mockPlaidClient.authGet.mockResolvedValue(mockAuthResponse);

      const result = await plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(mockPlaidClient.authGet).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
      });

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.routing_number).toBe('011401533');
      expect(result[0][0].json.account_number).toBe('1234567890');
      expect(result[0][0].json.source).toBe('plaid_auth');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      (mockExecuteFunctions.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          switch (paramName) {
            case 'resource': return 'transaction';
            case 'operation': return 'sync';
            case 'cursor': return '';
            case 'returnAll': return false;
            case 'limit': return 100;
            case 'accountIds': return '';
            case 'additionalFields': return {};
            default: return '';
          }
        });
    });

    it('should handle Plaid API errors gracefully when continueOnFail is true', async () => {
      (mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
      mockPlaidClient.transactionsSync.mockRejectedValue(mockPlaidApiError);

      const result = await plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.error).toBe(true);
      expect(result[0][0].json.error_code).toBe('INVALID_ACCESS_TOKEN');
      expect(result[0][0].json.error_message).toBe('the provided access token is not valid');
    });

    it('should throw NodeOperationError when continueOnFail is false', async () => {
      (mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
      mockPlaidClient.transactionsSync.mockRejectedValue(mockPlaidApiError);

      await expect(
        plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions)
      ).rejects.toThrow('Plaid API Error (INVALID_ACCESS_TOKEN): the provided access token is not valid');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      (mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
      mockPlaidClient.transactionsSync.mockRejectedValue(networkError);

      const result = await plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(result[0][0].json.error).toBe(true);
      expect(result[0][0].json.error_message).toBe('Network connection failed');
      expect(result[0][0].json.error_code).toBe('UNKNOWN');
    });
  });

  describe('Environment Configuration', () => {
    it('should use sandbox environment by default', async () => {
      const { Configuration } = require('plaid');
      
      (mockExecuteFunctions.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          switch (paramName) {
            case 'resource': return 'transaction';
            case 'operation': return 'sync';
            default: return '';
          }
        });

      mockPlaidClient.transactionsSync.mockResolvedValue(mockTransactionsSyncResponse);
      
      await plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions);

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
    });

    it('should use production environment when specified', async () => {
      const productionCredentials = { ...mockCredentials, environment: 'production' };
      (mockExecuteFunctions.getCredentials as jest.Mock).mockResolvedValue(productionCredentials);

      const { Configuration } = require('plaid');
      
      (mockExecuteFunctions.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          switch (paramName) {
            case 'resource': return 'transaction';
            case 'operation': return 'sync';
            default: return '';
          }
        });

      mockPlaidClient.transactionsSync.mockResolvedValue(mockTransactionsSyncResponse);
      
      await plaidNode.execute.call(mockExecuteFunctions as IExecuteFunctions);

      expect(Configuration).toHaveBeenCalledWith({
        basePath: 'https://production.plaid.com',
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': productionCredentials.clientId,
            'PLAID-SECRET': productionCredentials.secret,
            'Plaid-Version': '2020-09-14',
          },
        },
      });
    });
  });
}); 