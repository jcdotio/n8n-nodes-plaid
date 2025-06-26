// Mock credentials for testing
export const mockCredentials = {
  clientId: 'test_client_id',
  secret: 'test_secret',
  accessToken: 'access-sandbox-test-token',
  environment: 'sandbox',
};

// Mock API responses that match what the new no-dependencies implementation expects
export const mockApiResponses = {
  transactionsSync: {
    added: [
      {
        transaction_id: 'test_transaction_1',
        account_id: 'account_123',
        amount: -50.25,
        date: '2024-01-15',
        name: 'Coffee Shop Purchase',
        category: ['Food and Drink', 'Restaurants', 'Coffee Shop'],
      },
    ],
    modified: [],
    removed: [],
    next_cursor: 'next_cursor_token_123',
    has_next: false,
  },
  
  accountsGet: {
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
  
  authGet: {
    accounts: [
      {
        account_id: 'account_123',
        name: 'Primary Checking',
        type: 'depository',
        subtype: 'checking',
        balances: { current: 1500.00, available: 1450.00 },
      },
    ],
    numbers: {
      ach: [
        {
          account_id: 'account_123',
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
    removed: true,
    request_id: 'req_123',
  },
  
  identityGet: {
    accounts: [
      {
        account_id: 'account_123',
        name: 'Primary Checking',
        type: 'depository',
        subtype: 'checking',
        balances: { current: 1500.00, available: 1450.00 },
      },
    ],
    identity: [
      {
        account_id: 'acc_1',
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

export const mockTransactionsSyncResponse = {
  data: {
    added: [
      {
        transaction_id: 'test_transaction_1',
        account_id: 'test_account_1',
        amount: -50.25,
        iso_currency_code: 'USD',
        date: '2024-01-15',
        datetime: '2024-01-15T10:30:00Z',
        name: 'STARBUCKS COFFEE',
        merchant_name: 'Starbucks',
        category: ['Food and Drink', 'Restaurants', 'Coffee Shop'],
        category_id: '13005043',
        personal_finance_category: {
          primary: 'FOOD_AND_DRINK',
          detailed: 'FOOD_AND_DRINK_COFFEE',
        },
        location: {
          address: '123 Main St',
          city: 'New York',
          region: 'NY',
          postal_code: '10001',
          country: 'US',
        },
        payment_meta: {
          reference_number: null,
          ppd_id: null,
          payee: null,
        },
        account_owner: null,
        original_description: 'STARBUCKS STORE #12345',
      },
      {
        transaction_id: 'test_transaction_2',
        account_id: 'test_account_1',
        amount: 2500.00,
        iso_currency_code: 'USD',
        date: '2024-01-14',
        datetime: '2024-01-14T09:00:00Z',
        name: 'DIRECT DEPOSIT PAYROLL',
        merchant_name: null,
        category: ['Deposit', 'Payroll'],
        category_id: '21006000',
        personal_finance_category: {
          primary: 'INCOME',
          detailed: 'INCOME_WAGES',
        },
        location: {},
        payment_meta: {},
        account_owner: null,
        original_description: 'PAYROLL COMPANY INC',
      },
    ],
    modified: [],
    removed: [],
    next_cursor: 'next_cursor_token_123',
    has_more: false,
  },
};

export const mockAccountsResponse = {
  data: {
    accounts: [
      {
        account_id: 'test_account_1',
        persistent_account_id: 'persistent_test_account_1',
        name: 'Plaid Checking',
        official_name: 'Plaid Gold Standard 0% Interest Checking',
        type: 'depository',
        subtype: 'checking',
        mask: '0000',
        balances: {
          available: 1000.00,
          current: 1000.00,
          limit: null,
          iso_currency_code: 'USD',
        },
        verification_status: 'verified',
        class_type: null,
      },
      {
        account_id: 'test_account_2',
        persistent_account_id: 'persistent_test_account_2',
        name: 'Plaid Saving',
        official_name: 'Plaid Silver Standard 0.1% Interest Saving',
        type: 'depository',
        subtype: 'savings',
        mask: '1111',
        balances: {
          available: 5000.00,
          current: 5000.00,
          limit: null,
          iso_currency_code: 'USD',
        },
        verification_status: 'verified',
        class_type: null,
      },
    ],
  },
};

export const mockInstitutionsResponse = {
  data: {
    institutions: [
      {
        institution_id: 'ins_109508',
        name: 'First Republic Bank',
        products: ['assets', 'auth', 'balance', 'transactions', 'identity'],
        country_codes: ['US'],
        url: 'https://www.firstrepublic.com',
        primary_color: '#074d31',
        logo: 'iVBORw0KGgoAAAANSUhEUgAAAJgAAACY...',
        routing_numbers: ['321081669'],
      },
    ],
  },
};

export const mockItemResponse = {
  data: {
    item: {
      item_id: 'test_item_1',
      institution_id: 'ins_109508',
      webhook: 'https://webhook.example.com',
      error: null,
      available_products: ['identity', 'investments'],
      billed_products: ['assets', 'auth', 'identity', 'transactions'],
      products: ['auth', 'transactions'],
      consented_products: ['auth', 'transactions'],
      consent_expiration_time: null,
      update_type: 'background',
    },
  },
};

export const mockErrorResponse = {
  error_type: 'INVALID_REQUEST',
  error_code: 'INVALID_ACCESS_TOKEN',
  error_message: 'the provided access token is not valid',
  display_message: 'An error occurred. Please try again.',
  request_id: 'test_request_id',
};

export const mockPlaidApiError = {
  response: {
    data: mockErrorResponse,
    status: 400,
  },
  message: 'Request failed with status code 400',
};

// Mock Plaid client with all methods
export const mockPlaidClient = {
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