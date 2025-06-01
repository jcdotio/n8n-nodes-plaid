import { PlaidHelpers } from '../../utils/PlaidHelpers';
import { 
  createLinkToken, 
  exchangePublicToken, 
  getAccessToken, 
  requiresAccessToken 
} from '../../utils/PlaidHelpers';

// Mock the plaid module for environment URLs and API client
jest.mock('plaid', () => ({
  PlaidEnvironments: {
    production: 'https://production.plaid.com',
    sandbox: 'https://sandbox.plaid.com',
  },
  Products: {
    Transactions: 'transactions',
    Auth: 'auth',
    Identity: 'identity',
    Assets: 'assets',
    Investments: 'investments',
    Liabilities: 'liabilities',
  },
}));

describe('PlaidHelpers', () => {
  describe('getEnvironmentUrl', () => {
    it('should return production URL for production environment', () => {
      const url = PlaidHelpers.getEnvironmentUrl('production');
      expect(url).toBe('https://production.plaid.com');
    });

    it('should return sandbox URL for sandbox environment', () => {
      const url = PlaidHelpers.getEnvironmentUrl('sandbox');
      expect(url).toBe('https://sandbox.plaid.com');
    });

    it('should return sandbox URL for any other environment', () => {
      const url = PlaidHelpers.getEnvironmentUrl('development');
      expect(url).toBe('https://sandbox.plaid.com');
    });
  });

  describe('formatTransactionAmount', () => {
    it('should format negative amount as expense', () => {
      const result = PlaidHelpers.formatTransactionAmount(-50.25);
      expect(result.amount).toBe(50.25);
      expect(result.type).toBe('expense');
    });

    it('should format positive amount as income', () => {
      const result = PlaidHelpers.formatTransactionAmount(2500.00);
      expect(result.amount).toBe(2500.00);
      expect(result.type).toBe('income');
    });

    it('should format zero amount as income', () => {
      const result = PlaidHelpers.formatTransactionAmount(0);
      expect(result.amount).toBe(0);
      expect(result.type).toBe('income');
    });
  });

  describe('parseAccountIds', () => {
    it('should parse comma-separated account IDs', () => {
      const result = PlaidHelpers.parseAccountIds('account1,account2,account3');
      expect(result).toEqual(['account1', 'account2', 'account3']);
    });

    it('should handle spaces around commas', () => {
      const result = PlaidHelpers.parseAccountIds(' account1 , account2 , account3 ');
      expect(result).toEqual(['account1', 'account2', 'account3']);
    });

    it('should filter out empty strings', () => {
      const result = PlaidHelpers.parseAccountIds('account1,,account2,');
      expect(result).toEqual(['account1', 'account2']);
    });

    it('should return undefined for empty string', () => {
      const result = PlaidHelpers.parseAccountIds('');
      expect(result).toBeUndefined();
    });

    it('should return undefined for whitespace-only string', () => {
      const result = PlaidHelpers.parseAccountIds('   ');
      expect(result).toBeUndefined();
    });

    it('should handle single account ID', () => {
      const result = PlaidHelpers.parseAccountIds('single_account');
      expect(result).toEqual(['single_account']);
    });
  });

  describe('formatDate', () => {
    it('should extract date from ISO string', () => {
      const result = PlaidHelpers.formatDate('2024-01-15T10:30:00Z');
      expect(result).toBe('2024-01-15');
    });

    it('should handle date-only string', () => {
      const result = PlaidHelpers.formatDate('2024-01-15');
      expect(result).toBe('2024-01-15');
    });

    it('should handle date with time but no timezone', () => {
      const result = PlaidHelpers.formatDate('2024-01-15T10:30:00');
      expect(result).toBe('2024-01-15');
    });
  });

  describe('enhanceCategories', () => {
    it('should enhance transaction with category data', () => {
      const transaction = {
        category: ['Food and Drink', 'Restaurants', 'Coffee Shop'],
        personal_finance_category: {
          primary: 'FOOD_AND_DRINK',
          detailed: 'FOOD_AND_DRINK_COFFEE',
        },
        name: 'Starbucks',
        amount: -5.50,
      };

      const result = PlaidHelpers.enhanceCategories(transaction);

      expect(result.category_primary).toBe('Food and Drink');
      expect(result.category_secondary).toBe('Restaurants');
      expect(result.category_detailed).toBe('Coffee Shop');
      expect(result.category_full).toBe('Food and Drink > Restaurants > Coffee Shop');
      expect(result.enhanced_category).toBe('FOOD_AND_DRINK');
      expect(result.enhanced_subcategory).toBe('FOOD_AND_DRINK_COFFEE');
    });

    it('should handle transaction with no categories', () => {
      const transaction = {
        name: 'Unknown Transaction',
        amount: -10.00,
      };

      const result = PlaidHelpers.enhanceCategories(transaction);

      expect(result.category_primary).toBe('Other');
      expect(result.category_secondary).toBe('');
      expect(result.category_detailed).toBe('');
      expect(result.category_full).toBe('Other');
      expect(result.enhanced_category).toBe('Other');
      expect(result.enhanced_subcategory).toBe('');
    });

    it('should handle transaction with partial category data', () => {
      const transaction = {
        category: ['Travel'],
        name: 'Airline Ticket',
        amount: -350.00,
      };

      const result = PlaidHelpers.enhanceCategories(transaction);

      expect(result.category_primary).toBe('Travel');
      expect(result.category_secondary).toBe('');
      expect(result.category_detailed).toBe('');
      expect(result.category_full).toBe('Travel');
      expect(result.enhanced_category).toBe('Travel');
      expect(result.enhanced_subcategory).toBe('');
    });
  });

  describe('detectRecurring', () => {
    it('should detect Netflix as recurring', () => {
      expect(PlaidHelpers.detectRecurring('NETFLIX.COM')).toBe(true);
      expect(PlaidHelpers.detectRecurring('Netflix Monthly')).toBe(true);
    });

    it('should detect Spotify as recurring', () => {
      expect(PlaidHelpers.detectRecurring('SPOTIFY PREMIUM')).toBe(true);
      expect(PlaidHelpers.detectRecurring('spotify monthly')).toBe(true);
    });

    it('should detect subscription keywords', () => {
      expect(PlaidHelpers.detectRecurring('Monthly Subscription')).toBe(true);
      expect(PlaidHelpers.detectRecurring('Annual Membership')).toBe(true);
    });

    it('should detect utility payments', () => {
      expect(PlaidHelpers.detectRecurring('Electric Utilities Payment')).toBe(true);
      expect(PlaidHelpers.detectRecurring('Phone Bill')).toBe(true);
      expect(PlaidHelpers.detectRecurring('Internet Service')).toBe(true);
    });

    it('should detect insurance and mortgage', () => {
      expect(PlaidHelpers.detectRecurring('Car Insurance Premium')).toBe(true);
      expect(PlaidHelpers.detectRecurring('Mortgage Payment')).toBe(true);
      expect(PlaidHelpers.detectRecurring('Monthly Rent')).toBe(true);
    });

    it('should not detect one-time purchases as recurring', () => {
      expect(PlaidHelpers.detectRecurring('Starbucks Coffee')).toBe(false);
      expect(PlaidHelpers.detectRecurring('Grocery Store Purchase')).toBe(false);
      expect(PlaidHelpers.detectRecurring('Gas Station')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(PlaidHelpers.detectRecurring('NETFLIX')).toBe(true);
      expect(PlaidHelpers.detectRecurring('netflix')).toBe(true);
      expect(PlaidHelpers.detectRecurring('Netflix')).toBe(true);
    });
  });

  describe('calculateSpendingScore', () => {
    it('should calculate base spending score correctly', () => {
      // $100 = score 1.0, $1000 = score 10.0 (max)
      expect(PlaidHelpers.calculateSpendingScore(100, [])).toBe(1.0);
      expect(PlaidHelpers.calculateSpendingScore(500, [])).toBe(5.0);
      expect(PlaidHelpers.calculateSpendingScore(1000, [])).toBe(10.0);
      expect(PlaidHelpers.calculateSpendingScore(2000, [])).toBe(10.0); // Capped at 10
    });

    it('should apply category multipliers correctly', () => {
      // Food and Drink: 1.0x multiplier
      expect(PlaidHelpers.calculateSpendingScore(100, ['Food and Drink'])).toBe(1.0);
      
      // Shops: 1.2x multiplier
      expect(PlaidHelpers.calculateSpendingScore(100, ['Shops'])).toBe(1.2);
      
      // Recreation: 1.3x multiplier
      expect(PlaidHelpers.calculateSpendingScore(100, ['Recreation'])).toBe(1.3);
      
      // Transportation: 0.8x multiplier
      expect(PlaidHelpers.calculateSpendingScore(100, ['Transportation'])).toBe(0.8);
      
      // Healthcare: 0.7x multiplier
      expect(PlaidHelpers.calculateSpendingScore(100, ['Healthcare'])).toBe(0.7);
      
      // Bills: 0.5x multiplier
      expect(PlaidHelpers.calculateSpendingScore(100, ['Bills'])).toBe(0.5);
      
      // Transfer: 0.3x multiplier
      expect(PlaidHelpers.calculateSpendingScore(100, ['Transfer'])).toBe(0.3);
    });

    it('should use default multiplier for unknown categories', () => {
      expect(PlaidHelpers.calculateSpendingScore(100, ['Unknown Category'])).toBe(1.0);
      expect(PlaidHelpers.calculateSpendingScore(100, [])).toBe(1.0);
    });

    it('should use first category for multiplier calculation', () => {
      // Should use 'Recreation' (1.3x) not 'Food and Drink' (1.0x)
      expect(PlaidHelpers.calculateSpendingScore(100, ['Recreation', 'Food and Drink'])).toBe(1.3);
    });

    it('should handle negative amounts correctly', () => {
      expect(PlaidHelpers.calculateSpendingScore(-100, ['Food and Drink'])).toBe(1.0);
      expect(PlaidHelpers.calculateSpendingScore(-500, ['Recreation'])).toBe(6.5);
    });

    it('should round to one decimal place', () => {
      // 333.33 / 100 * 1.3 = 4.333... should round to 4.3
      expect(PlaidHelpers.calculateSpendingScore(333.33, ['Recreation'])).toBe(4.3);
    });
  });

  // Tests for new authentication functions
  describe('Authentication Functions', () => {
    let mockPlaidClient: any;

    beforeEach(() => {
      mockPlaidClient = {
        linkTokenCreate: jest.fn(),
        itemPublicTokenExchange: jest.fn(),
      };
    });

    describe('createLinkToken', () => {
      it('should create link token with default parameters', async () => {
        const mockResponse = {
          data: {
            link_token: 'link-sandbox-test-token',
          },
        };
        mockPlaidClient.linkTokenCreate.mockResolvedValue(mockResponse);

        const credentials = {
          clientName: 'Test App',
          countryCodes: 'US',
          language: 'en',
        };

        const result = await createLinkToken(mockPlaidClient, credentials);

        expect(result).toBe('link-sandbox-test-token');
        expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith({
          client_name: 'Test App',
          country_codes: ['US'],
          language: 'en',
          user: {
            client_user_id: 'default_user',
          },
          products: ['transactions', 'auth'],
        });
      });

      it('should create link token with custom parameters', async () => {
        const mockResponse = {
          data: {
            link_token: 'link-custom-token',
          },
        };
        mockPlaidClient.linkTokenCreate.mockResolvedValue(mockResponse);

        const credentials = {
          clientName: 'Custom App',
          countryCodes: 'US,CA,GB',
          language: 'es',
        };

        const result = await createLinkToken(
          mockPlaidClient, 
          credentials,
          'user_123',
          ['transactions', 'identity', 'auth']
        );

        expect(result).toBe('link-custom-token');
        expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith({
          client_name: 'Custom App',
          country_codes: ['US', 'CA', 'GB'],
          language: 'es',
          user: {
            client_user_id: 'user_123',
          },
          products: ['transactions', 'identity', 'auth'],
        });
      });

      it('should handle default values when credentials are missing', async () => {
        const mockResponse = {
          data: {
            link_token: 'link-default-token',
          },
        };
        mockPlaidClient.linkTokenCreate.mockResolvedValue(mockResponse);

        const credentials = {}; // Empty credentials

        const result = await createLinkToken(mockPlaidClient, credentials);

        expect(result).toBe('link-default-token');
        expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith({
          client_name: 'n8n Plaid Integration',
          country_codes: ['US'],
          language: 'en',
          user: {
            client_user_id: 'default_user',
          },
          products: ['transactions', 'auth'],
        });
      });

      it('should convert string products to Products enum correctly', async () => {
        const mockResponse = {
          data: {
            link_token: 'link-products-token',
          },
        };
        mockPlaidClient.linkTokenCreate.mockResolvedValue(mockResponse);

        const credentials = {};
        
        await createLinkToken(
          mockPlaidClient, 
          credentials,
          'user_123',
          ['transactions', 'auth', 'identity', 'assets', 'investments', 'liabilities', 'unknown']
        );

        expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith({
          client_name: 'n8n Plaid Integration',
          country_codes: ['US'],
          language: 'en',
          user: {
            client_user_id: 'user_123',
          },
          products: ['transactions', 'auth', 'identity', 'assets', 'investments', 'liabilities', 'transactions'], // unknown maps to transactions
        });
      });
    });

    describe('exchangePublicToken', () => {
      it('should exchange public token for access token', async () => {
        const mockResponse = {
          data: {
            access_token: 'access-sandbox-test-token',
            item_id: 'item_123456',
          },
        };
        mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(mockResponse);

        const result = await exchangePublicToken(mockPlaidClient, 'public-sandbox-token');

        expect(result).toEqual({
          accessToken: 'access-sandbox-test-token',
          itemId: 'item_123456',
        });
        expect(mockPlaidClient.itemPublicTokenExchange).toHaveBeenCalledWith({
          public_token: 'public-sandbox-token',
        });
      });

      it('should handle exchange errors', async () => {
        const mockError = new Error('Invalid public token');
        mockPlaidClient.itemPublicTokenExchange.mockRejectedValue(mockError);

        await expect(exchangePublicToken(mockPlaidClient, 'invalid-token'))
          .rejects.toThrow('Invalid public token');
      });
    });

    describe('getAccessToken', () => {
      it('should return access token for legacy authMethod', async () => {
        const credentials = {
          authMethod: 'accessToken',
          accessToken: 'access-legacy-token',
        };

        const result = await getAccessToken(mockPlaidClient, credentials);

        expect(result).toBe('access-legacy-token');
      });

      it('should throw error for legacy authMethod without access token', async () => {
        const credentials = {
          authMethod: 'accessToken',
        };

        await expect(getAccessToken(mockPlaidClient, credentials))
          .rejects.toThrow('Access token is required for legacy authentication method');
      });

      it('should exchange public token for publicToken authMethod', async () => {
        const mockResponse = {
          data: {
            access_token: 'access-from-public-token',
            item_id: 'item_789',
          },
        };
        mockPlaidClient.itemPublicTokenExchange.mockResolvedValue(mockResponse);

        const credentials = {
          authMethod: 'publicToken',
          publicToken: 'public-test-token',
        };

        const result = await getAccessToken(mockPlaidClient, credentials);

        expect(result).toBe('access-from-public-token');
        expect(mockPlaidClient.itemPublicTokenExchange).toHaveBeenCalledWith({
          public_token: 'public-test-token',
        });
      });

      it('should throw error for publicToken authMethod without public token', async () => {
        const credentials = {
          authMethod: 'publicToken',
        };

        await expect(getAccessToken(mockPlaidClient, credentials))
          .rejects.toThrow('Public token is required for public token exchange method');
      });

      it('should throw error for clientOnly authMethod', async () => {
        const credentials = {
          authMethod: 'clientOnly',
        };

        await expect(getAccessToken(mockPlaidClient, credentials))
          .rejects.toThrow('Access token not available for client-only authentication method');
      });

      it('should throw error for unknown authMethod', async () => {
        const credentials = {
          authMethod: 'unknown',
        };

        await expect(getAccessToken(mockPlaidClient, credentials))
          .rejects.toThrow('Unknown authentication method: unknown');
      });

      it('should default to accessToken authMethod when not specified', async () => {
        const credentials = {
          accessToken: 'default-access-token',
        };

        const result = await getAccessToken(mockPlaidClient, credentials);

        expect(result).toBe('default-access-token');
      });
    });

    describe('requiresAccessToken', () => {
      it('should return false for operations that do not require access token', () => {
        expect(requiresAccessToken('link', 'createToken')).toBe(false);
        expect(requiresAccessToken('link', 'exchangeToken')).toBe(false);
        expect(requiresAccessToken('institution', 'search')).toBe(false);
        expect(requiresAccessToken('institution', 'getById')).toBe(false);
      });

      it('should return true for operations that require access token', () => {
        expect(requiresAccessToken('transaction', 'sync')).toBe(true);
        expect(requiresAccessToken('transaction', 'getRange')).toBe(true);
        expect(requiresAccessToken('account', 'getAll')).toBe(true);
        expect(requiresAccessToken('account', 'getBalances')).toBe(true);
        expect(requiresAccessToken('auth', 'get')).toBe(true);
        expect(requiresAccessToken('item', 'get')).toBe(true);
        expect(requiresAccessToken('item', 'remove')).toBe(true);
        expect(requiresAccessToken('identity', 'get')).toBe(true);
      });

      it('should return true for unknown operations by default', () => {
        expect(requiresAccessToken('unknown', 'operation')).toBe(true);
        expect(requiresAccessToken('transaction', 'unknown')).toBe(true);
      });
    });
  });
}); 