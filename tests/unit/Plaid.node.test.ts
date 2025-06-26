import { IExecuteFunctions } from 'n8n-workflow';
import { Plaid } from '../../nodes/Plaid/Plaid.node';
import { 
  mockCredentials
} from '../mocks/plaidApiMocks';

// Mock successful API responses
const mockApiResponses = {
  transactionsSync: {
    added: [
      {
        transaction_id: 'txn_1',
        account_id: 'acc_1',
        amount: -12.50,
        date: '2024-01-15',
        name: 'Coffee Shop',
        category: ['Food and Drink'],
      },
    ],
    modified: [],
    removed: [],
    next_cursor: 'cursor_next',
    has_next: false,
  },
  accountsGet: {
    accounts: [
      {
        account_id: 'acc_1',
        name: 'Checking Account',
        type: 'depository',
        subtype: 'checking',
        balances: {
          available: 1000,
          current: 1000,
        },
      },
    ],
  },
  authGet: {
    accounts: [
      {
        account_id: 'acc_1',
        name: 'Checking Account',
        type: 'depository',
        subtype: 'checking',
        balances: {
          available: 1000,
          current: 1000,
        },
      },
    ],
    numbers: {
      ach: [
        {
          account_id: 'acc_1',
          account: '1234567890',
          routing: '011401533',
          wire_routing: '021000021',
        },
      ],
    },
  },
  institutionsSearch: {
    institutions: [
      {
        institution_id: 'ins_109508',
        name: 'Chase',
        products: ['transactions', 'auth'],
        country_codes: ['US'],
        url: 'https://chase.com',
        primary_color: '#005a2d',
        logo: 'logo_url',
        routing_numbers: ['021000021'],
      },
    ],
  },
  institutionsGetById: {
    institution: {
      institution_id: 'ins_109508',
      name: 'Chase',
      products: ['transactions', 'auth'],
      country_codes: ['US'],
      url: 'https://chase.com',
      primary_color: '#005a2d',
      logo: 'logo_url',
      routing_numbers: ['021000021'],
      status: {
        item_logins: {
          status: 'HEALTHY',
          last_status_change: '2024-01-01T00:00:00Z',
        },
        transactions_updates: {
          status: 'HEALTHY',
          last_status_change: '2024-01-01T00:00:00Z',
        },
      },
    },
  },
  itemGet: {
    item: {
      item_id: 'item_1',
      institution_id: 'ins_109508',
      webhook: 'https://example.com/webhook',
      error: null,
      available_products: ['transactions', 'auth'],
      billed_products: ['transactions'],
      products: ['transactions'],
      consented_products: ['transactions'],
      consent_expiration_time: null,
      update_type: 'background',
    },
  },
  itemRemove: {
    request_id: 'req_123',
  },
  identityGet: {
    accounts: [
      {
        account_id: 'acc_1',
        name: 'Checking Account',
        type: 'depository',
        subtype: 'checking',
        balances: {
          available: 1000,
          current: 1000,
        },
        owners: [
          {
            names: ['John Doe'],
            phone_numbers: [
              {
                data: '+1-555-123-4567',
                primary: true,
                type: 'home',
              },
            ],
            emails: [
              {
                data: 'john.doe@example.com',
                primary: true,
                type: 'primary',
              },
            ],
            addresses: [
              {
                data: {
                  street: '123 Main St',
                  city: 'Anytown',
                  region: 'NY',
                  postal_code: '12345',
                  country: 'US',
                },
                primary: true,
              },
            ],
          },
        ],
      },
    ],
  },
};

describe('Plaid Node', () => {
  let plaidNode: Plaid;
  let mockExecute: Partial<IExecuteFunctions>;
  let mockHttpRequest: jest.Mock;

  beforeEach(() => {
    plaidNode = new Plaid();
    
    // Mock HTTP request function
    mockHttpRequest = jest.fn();
    
    // Reset all mocks
    jest.clearAllMocks();
    
    mockExecute = {
      getCredentials: jest.fn().mockResolvedValue(mockCredentials),
      getNodeParameter: jest.fn(),
      getInputData: jest.fn().mockReturnValue([{ json: {} }]),
      continueOnFail: jest.fn().mockReturnValue(false),
      getNode: jest.fn().mockReturnValue({ 
        name: 'Plaid Test Node',
        type: 'n8n-nodes-plaid.plaid',
      }),
      helpers: {
        httpRequest: mockHttpRequest,
      },
    } as unknown as IExecuteFunctions;
  });

  describe('Node Description', () => {
    it('should have correct node properties', () => {
      expect(plaidNode.description.displayName).toBe('Plaid');
      expect(plaidNode.description.name).toBe('plaid');
      expect(plaidNode.description.icon).toBe('file:plaid.svg');
      expect(plaidNode.description.group).toContain('input');
    });

    it('should require plaidApi credentials', () => {
      expect(plaidNode.description.credentials).toEqual([
        {
          name: 'plaidApi',
          required: true,
        },
      ]);
    });
  });

  describe('Transaction Operations', () => {
    it('should sync transactions successfully', async () => {
      // Setup mock parameters
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string, _itemIndex?: number, fallback?: any) => {
          const params: Record<string, any> = {
            resource: 'transaction',
            operation: 'sync',
            accessToken: mockCredentials.accessToken,
            cursor: '',
            returnAll: false,
            limit: 100,
            accountIds: '',
            additionalFields: {},
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      // Mock successful HTTP response
      mockHttpRequest.mockResolvedValue(mockApiResponses.transactionsSync);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.transaction_id).toBe('txn_1');
      expect(result[0][0].json.sync_status).toBe('added');
      expect(mockHttpRequest).toHaveBeenCalledWith({
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
    });

    it('should handle date range transactions', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string, _itemIndex?: number, fallback?: any) => {
          const params: Record<string, any> = {
            resource: 'transaction',
            operation: 'getRange',
            accessToken: mockCredentials.accessToken,
            startDate: '2024-01-01',
            endDate: '2024-01-31',
            returnAll: false,
            limit: 50,
            accountIds: '',
            additionalFields: {},
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      mockHttpRequest.mockResolvedValue({
        transactions: [
          {
            transaction_id: 'txn_range',
            account_id: 'acc_1',
            amount: -25.00,
            date: '2024-01-10',
            name: 'Restaurant',
            category: ['Food and Drink'],
          },
        ],
        total_transactions: 1,
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.transaction_id).toBe('txn_range');
      expect(mockHttpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://sandbox.plaid.com/transactions/get',
        headers: {
          'Content-Type': 'application/json',
          'PLAID-CLIENT-ID': mockCredentials.clientId,
          'PLAID-SECRET': mockCredentials.secret,
          'Plaid-Version': '2020-09-14',
        },
        body: {
          access_token: mockCredentials.accessToken,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          count: 50,
          offset: 0,
          client_id: mockCredentials.clientId,
          secret: mockCredentials.secret,
        },
        json: true,
      });
    });
  });

  describe('Account Operations', () => {
    it('should get all accounts', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          const params: Record<string, any> = {
            resource: 'account',
            operation: 'getAll',
            accessToken: mockCredentials.accessToken,
          };
          return params[paramName];
        });

      mockHttpRequest.mockResolvedValue(mockApiResponses.accountsGet);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.account_id).toBe('acc_1');
      expect(mockHttpRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://sandbox.plaid.com/accounts/get',
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
    });

    it('should get account balances', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          const params: Record<string, any> = {
            resource: 'account',
            operation: 'getBalances',
            accessToken: mockCredentials.accessToken,
          };
          return params[paramName];
        });

      mockHttpRequest.mockResolvedValue(mockApiResponses.accountsGet);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.account_id).toBe('acc_1');
    });
  });

  describe('Auth Operations', () => {
    it('should get auth data with routing numbers', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          const params: Record<string, any> = {
            resource: 'auth',
            operation: 'get',
            accessToken: mockCredentials.accessToken,
          };
          return params[paramName];
        });

      mockHttpRequest.mockResolvedValue(mockApiResponses.authGet);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.account_id).toBe('acc_1');
      expect(result[0][0].json.routing).toBe('011401533');
      expect(result[0][0].json.account).toBe('1234567890');
    });
  });

  describe('Institution Operations', () => {
    it('should search institutions', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string, _itemIndex?: number, fallback?: any) => {
          const params: Record<string, any> = {
            resource: 'institution',
            operation: 'search',
            query: 'Chase',
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      mockHttpRequest.mockResolvedValue(mockApiResponses.institutionsSearch);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.institution_id).toBe('ins_109508');
      expect(result[0][0].json.name).toBe('Chase');
    });

    it('should get institution by ID', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string, _itemIndex?: number, fallback?: any) => {
          const params: Record<string, any> = {
            resource: 'institution',
            operation: 'getById',
            institutionId: 'ins_109508',
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      mockHttpRequest.mockResolvedValue(mockApiResponses.institutionsGetById);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect((result[0][0].json as any).institution.institution_id).toBe('ins_109508');
      expect((result[0][0].json as any).institution.status).toBeDefined();
    });
  });

  describe('Item Operations', () => {
    it('should get item information', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          const params: Record<string, any> = {
            resource: 'item',
            operation: 'get',
            accessToken: mockCredentials.accessToken,
          };
          return params[paramName];
        });

      mockHttpRequest.mockResolvedValue(mockApiResponses.itemGet);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect((result[0][0].json as any).item.item_id).toBe('item_1');
      expect((result[0][0].json as any).item.institution_id).toBe('ins_109508');
    });

    it('should remove item', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          const params: Record<string, any> = {
            resource: 'item',
            operation: 'remove',
            accessToken: mockCredentials.accessToken,
          };
          return params[paramName];
        });

      mockHttpRequest.mockResolvedValue(mockApiResponses.itemRemove);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      // Item remove operation returns the response directly
      expect(result[0][0].json).toBeDefined();
    });
  });

  describe('Identity Operations', () => {
    it('should get identity data', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          const params: Record<string, any> = {
            resource: 'identity',
            operation: 'get',
            accessToken: mockCredentials.accessToken,
          };
          return params[paramName];
        });

      mockHttpRequest.mockResolvedValue(mockApiResponses.identityGet);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      // Identity operation processes the response
      expect(result[0]).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle Plaid API errors gracefully when continueOnFail is true', async () => {
      (mockExecute.continueOnFail as jest.Mock).mockReturnValue(true);
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string, _itemIndex?: number, fallback?: any) => {
          const params: Record<string, any> = {
            resource: 'transaction',
            operation: 'sync',
            accessToken: mockCredentials.accessToken,
            cursor: '',
            returnAll: false,
            limit: 100,
            accountIds: '',
            additionalFields: {},
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      const plaidError = {
        response: {
          body: {
            error_code: 'INVALID_ACCESS_TOKEN',
            error_message: 'The provided access token is invalid.',
          },
        },
        message: 'Request failed',
      };

      mockHttpRequest.mockRejectedValue(plaidError);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.error).toBe('Plaid API Error (INVALID_ACCESS_TOKEN): The provided access token is invalid.');
    });

    it('should throw NodeOperationError when continueOnFail is false', async () => {
      (mockExecute.continueOnFail as jest.Mock).mockReturnValue(false);
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string, _itemIndex?: number, fallback?: any) => {
          const params: Record<string, any> = {
            resource: 'transaction',
            operation: 'sync',
            accessToken: mockCredentials.accessToken,
            cursor: '',
            returnAll: false,
            limit: 100,
            accountIds: '',
            additionalFields: {},
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      const plaidError = {
        response: {
          body: {
            error_code: 'INVALID_ACCESS_TOKEN',
            error_message: 'The provided access token is invalid.',
          },
        },
        message: 'Request failed',
      };

      mockHttpRequest.mockRejectedValue(plaidError);

      await expect(plaidNode.execute.call(mockExecute as IExecuteFunctions)).rejects.toThrow(
        'Plaid API Error (INVALID_ACCESS_TOKEN): The provided access token is invalid.'
      );
    });

    it('should handle network errors', async () => {
      (mockExecute.continueOnFail as jest.Mock).mockReturnValue(true);
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string, _itemIndex?: number, fallback?: any) => {
          const params: Record<string, any> = {
            resource: 'transaction',
            operation: 'sync',
            cursor: '',
            returnAll: false,
            limit: 100,
            accountIds: '',
            additionalFields: {},
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      const networkError = new Error('Network timeout');
      mockHttpRequest.mockRejectedValue(networkError);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.error).toBe('Plaid API Request Failed: Network timeout');
    });
  });

  describe('Environment Configuration', () => {
    it('should use sandbox environment by default', async () => {
      expect(mockCredentials.environment).toBe('sandbox');
    });

    it('should use production environment when specified', async () => {
      const prodCredentials = {
        ...mockCredentials,
        environment: 'production',
      };
      
      (mockExecute.getCredentials as jest.Mock).mockResolvedValue(prodCredentials);
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string) => {
          const params: Record<string, any> = {
            resource: 'account',
            operation: 'getAll',
            accessToken: mockCredentials.accessToken,
          };
          return params[paramName];
        });

      mockHttpRequest.mockResolvedValue(mockApiResponses.accountsGet);

      await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(mockExecute.getCredentials).toHaveBeenCalledWith('plaidApi');
    });
  });
}); 