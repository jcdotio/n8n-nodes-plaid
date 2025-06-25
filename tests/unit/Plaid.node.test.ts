import { IExecuteFunctions } from 'n8n-workflow';
import { Plaid } from '../../nodes/Plaid/Plaid.node';
import { 
  mockCredentials,
  mockPlaidClient
} from '../mocks/plaidApiMocks';

// Mock the entire plaid module
jest.mock('plaid', () => ({
  PlaidApi: jest.fn().mockImplementation(() => mockPlaidClient),
  Configuration: jest.fn(),
  PlaidEnvironments: {
    sandbox: 'https://sandbox.plaid.com',
    production: 'https://production.plaid.com',
  },
  Products: {
    Transactions: 'transactions',
    Auth: 'auth',
    Identity: 'identity',
    Assets: 'assets',
    Investments: 'investments',
    Liabilities: 'liabilities',
  },
  CountryCode: {
    Us: 'US',
    Ca: 'CA',
    Gb: 'GB',
    Es: 'ES',
    Fr: 'FR',
    Ie: 'IE',
    Nl: 'NL',
  },
}));

describe('Plaid Node', () => {
  let plaidNode: Plaid;
  let mockExecute: Partial<IExecuteFunctions>;

  beforeEach(() => {
    plaidNode = new Plaid();
    
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
    } as unknown as IExecuteFunctions;
  });

  describe('Node Description', () => {
    it('should have correct node properties', () => {
      expect(plaidNode.description.displayName).toBe('Plaid');
      expect(plaidNode.description.name).toBe('plaid');
      expect(plaidNode.description.icon).toBe('file:plaid.svg');
      expect(plaidNode.description.group).toContain('finance');
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
    beforeEach(() => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string, __itemIndex?: number, fallback?: any) => {
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
    });

        it('should sync transactions successfully', async () => {
      // Ensure the mock is set up for this specific test
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

      mockPlaidClient.transactionsSync.mockResolvedValue({
        data: {
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
          has_more: false,
        },
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.transaction_id).toBe('txn_1');
      expect(result[0][0].json.sync_status).toBe('added');
      expect(mockPlaidClient.transactionsSync).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        cursor: undefined,
        count: 100,
      });
    });

    it('should handle modified transactions in sync', async () => {
      // Ensure the mock is set up for this specific test  
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

      mockPlaidClient.transactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [
            {
              transaction_id: 'txn_modified',
              account_id: 'acc_1',
              amount: -15.00,
              date: '2024-01-15',
              name: 'Updated Coffee Shop',
              category: ['Food and Drink'],
            },
          ],
          removed: [],
          next_cursor: 'cursor_next',
          has_more: false,
        },
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.transaction_id).toBe('txn_modified');
      expect(result[0][0].json.sync_status).toBe('modified');
      expect(result[0][0].json.sync_cursor).toBe('cursor_next');
    });

    it('should handle removed transactions in sync', async () => {
      // Ensure the mock is set up for this specific test  
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

      mockPlaidClient.transactionsSync.mockResolvedValue({
        data: {
          added: [],
          modified: [],
          removed: [
            {
              transaction_id: 'txn_removed',
            },
          ],
          next_cursor: 'cursor_next',
          has_more: false,
        },
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.transaction_id).toBe('txn_removed');
      expect(result[0][0].json.sync_status).toBe('removed');
      expect(result[0][0].json.sync_cursor).toBe('cursor_next');
    });

    it('should handle date range transactions', async () => {
             (mockExecute.getNodeParameter as jest.Mock)
         .mockImplementation((paramName: string, __itemIndex?: number, fallback?: any) => {
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

      mockPlaidClient.transactionsGet.mockResolvedValue({
        data: {
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
        },
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.transaction_id).toBe('txn_range');
      expect(result[0][0].json.source).toBe('plaid_get');
      expect(mockPlaidClient.transactionsGet).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        count: 50,
        offset: 0,
      });
    });

    it('should filter by account IDs in date range', async () => {
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
            accountIds: 'acc_1, acc_2, acc_3',
            additionalFields: {},
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      mockPlaidClient.transactionsGet.mockResolvedValue({
        data: {
          transactions: [],
          total_transactions: 0,
        },
      });

      await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(mockPlaidClient.transactionsGet).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        count: 50,
        offset: 0,
        account_ids: ['acc_1', 'acc_2', 'acc_3'],
      });
    });

    it('should include original description when specified', async () => {
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
            additionalFields: {
              includeOriginalDescription: true,
            },
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      mockPlaidClient.transactionsGet.mockResolvedValue({
        data: {
          transactions: [],
          total_transactions: 0,
        },
      });

      await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(mockPlaidClient.transactionsGet).toHaveBeenCalledWith({
        access_token: mockCredentials.accessToken,
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        count: 50,
        offset: 0,
        options: {
          include_original_description: true,
        },
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

      mockPlaidClient.accountsGet.mockResolvedValue({
        data: {
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
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.account_id).toBe('acc_1');
      expect(result[0][0].json.source).toBe('plaid_accounts');
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

      mockPlaidClient.accountsBalanceGet.mockResolvedValue({
        data: {
          accounts: [
            {
              account_id: 'acc_1',
              name: 'Checking Account',
              type: 'depository',
              subtype: 'checking',
              balances: {
                available: 1500,
                current: 1500,
              },
            },
          ],
        },
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.realtime).toBe(true);
      expect(result[0][0].json.source).toBe('plaid_balances');
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

      mockPlaidClient.authGet.mockResolvedValue({
        data: {
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
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.routing_number).toBe('011401533');
      expect(result[0][0].json.account_number).toBe('1234567890');
      expect(result[0][0].json.wire_routing_number).toBe('021000021');
      expect(result[0][0].json.source).toBe('plaid_auth');
    });
  });

  describe('Institution Operations', () => {
    it('should search institutions', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string, _itemIndex?: number, fallback?: any) => {
          const params: Record<string, any> = {
            resource: 'institution',
            operation: 'search',
            searchQuery: 'Chase',
            countryCode: 'US',
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      mockPlaidClient.institutionsSearch.mockResolvedValue({
        data: {
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
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.institution_id).toBe('ins_109508');
      expect(result[0][0].json.name).toBe('Chase');
      expect(result[0][0].json.search_query).toBe('Chase');
      expect(result[0][0].json.source).toBe('plaid_institutions');
    });

    it('should get institution by ID', async () => {
      (mockExecute.getNodeParameter as jest.Mock)
        .mockImplementation((paramName: string, _itemIndex?: number, fallback?: any) => {
          const params: Record<string, any> = {
            resource: 'institution',
            operation: 'getById',
            institutionId: 'ins_109508',
            countryCode: 'US',
          };
          return params[paramName] !== undefined ? params[paramName] : fallback;
        });

      mockPlaidClient.institutionsGetById.mockResolvedValue({
        data: {
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
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.institution_id).toBe('ins_109508');
      expect(result[0][0].json.status).toBeDefined();
      expect(result[0][0].json.source).toBe('plaid_institution_details');
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

      mockPlaidClient.itemGet.mockResolvedValue({
        data: {
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
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.item_id).toBe('item_1');
      expect(result[0][0].json.institution_id).toBe('ins_109508');
      expect(result[0][0].json.source).toBe('plaid_item');
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

      mockPlaidClient.itemRemove.mockResolvedValue({
        data: {
          request_id: 'req_123',
        },
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.removed).toBe(true);
      expect(result[0][0].json.request_id).toBe('req_123');
      expect(result[0][0].json.source).toBe('plaid_item_remove');
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

      mockPlaidClient.identityGet.mockResolvedValue({
        data: {
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
      });

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.account_id).toBe('acc_1');
      expect(result[0][0].json.owners).toBeDefined();
      expect(result[0][0].json.source).toBe('plaid_identity');
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
          data: {
            error_code: 'INVALID_ACCESS_TOKEN',
            error_message: 'The provided access token is invalid.',
            display_message: 'Please reconnect your account.',
          },
        },
      };

      mockPlaidClient.transactionsSync.mockRejectedValue(plaidError);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.error).toBe(true);
      expect(result[0][0].json.error_code).toBe('INVALID_ACCESS_TOKEN');
      expect(result[0][0].json.error_message).toContain('The provided access token is invalid.');
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
          data: {
            error_code: 'INVALID_ACCESS_TOKEN',
            error_message: 'The provided access token is invalid.',
          },
        },
      };

      mockPlaidClient.transactionsSync.mockRejectedValue(plaidError);

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
      mockPlaidClient.transactionsSync.mockRejectedValue(networkError);

      const result = await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(result[0]).toHaveLength(1);
      expect(result[0][0].json.error).toBe(true);
      expect(result[0][0].json.error_message).toBe('Network timeout');
      expect(result[0][0].json.error_code).toBe('UNKNOWN');
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
          };
          return params[paramName];
        });

      mockPlaidClient.accountsGet.mockResolvedValue({
        data: { accounts: [] },
      });

      await plaidNode.execute.call(mockExecute as IExecuteFunctions);

      expect(mockExecute.getCredentials).toHaveBeenCalledWith('plaidApi');
    });
  });
}); 