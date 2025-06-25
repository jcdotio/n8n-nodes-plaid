import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
} from 'n8n-workflow';

import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  TransactionsSyncRequest,
  TransactionsGetRequest,
  AccountsGetRequest,
  AccountsBalanceGetRequest,
  AuthGetRequest,
  InstitutionsSearchRequest,
  InstitutionsGetByIdRequest,
  ItemGetRequest,
  IdentityGetRequest,
  LinkTokenCreateRequest,
  ItemPublicTokenExchangeRequest,
  Products,
  CountryCode,
} from 'plaid';

export class Plaid implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Plaid',
    name: 'plaid',
    icon: 'file:plaid.svg',
    group: ['finance'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Access Plaid financial data - transactions, accounts, and more',
    defaults: {
      name: 'Plaid',
    },
    inputs: ['main'] as any,
    outputs: ['main'] as any,
    credentials: [
      {
        name: 'plaidApi',
        required: true,
      },
    ],
    properties: [
      // Resource selection
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Link Token',
            value: 'linkToken',
            description: 'Create link tokens for Plaid Link authentication flow',
          },
          {
            name: 'Institution',
            value: 'institution',
            description: 'Search and get information about financial institutions',
          },
          {
            name: 'Transaction',
            value: 'transaction',
            description: 'Work with bank transactions',
          },
          {
            name: 'Account',
            value: 'account',
            description: 'Work with bank accounts',
          },
          {
            name: 'Auth',
            value: 'auth',
            description: 'Get bank account routing and account numbers',
          },
          {
            name: 'Item',
            value: 'item',
            description: 'Manage Plaid Items (bank connections)',
          },
          {
            name: 'Identity',
            value: 'identity',
            description: 'Get account owner identity information',
          },
        ],
        default: 'linkToken',
        description: 'The Plaid resource to work with',
      },

      // Link Token operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['linkToken'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a link token for Plaid Link initialization',
            action: 'Create a link token',
          },
          {
            name: 'Exchange Public Token',
            value: 'exchangeToken',
            description: 'Exchange a public token for an access token',
            action: 'Exchange public token',
          },
        ],
        default: 'create',
      },

      // Institution operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['institution'],
          },
        },
        options: [
          {
            name: 'Search',
            value: 'search',
            description: 'Search for financial institutions',
            action: 'Search institutions',
          },
          {
            name: 'Get by ID',
            value: 'getById',
            description: 'Get institution details by ID',
            action: 'Get institution by ID',
          },
        ],
        default: 'search',
      },

      // Transaction operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['transaction'],
          },
        },
        options: [
          {
            name: 'Sync',
            value: 'sync',
            description: 'Get new/updated transactions using cursor (recommended)',
            action: 'Sync transactions',
          },
          {
            name: 'Get Range',
            value: 'getRange',
            description: 'Get transactions within a date range',
            action: 'Get transactions in date range',
          },
        ],
        default: 'sync',
      },

      // Account operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['account'],
          },
        },
        options: [
          {
            name: 'Get All',
            value: 'getAll',
            description: 'Get all accounts (cached data)',
            action: 'Get all accounts',
          },
          {
            name: 'Get Balances',
            value: 'getBalances',
            description: 'Get real-time account balances',
            action: 'Get account balances',
          },
        ],
        default: 'getAll',
      },

      // Auth operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['auth'],
          },
        },
        options: [
          {
            name: 'Get',
            value: 'get',
            description: 'Get bank account and routing numbers',
            action: 'Get auth data',
          },
        ],
        default: 'get',
      },

      // Item operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['item'],
          },
        },
        options: [
          {
            name: 'Get',
            value: 'get',
            description: 'Get Item information',
            action: 'Get item information',
          },
          {
            name: 'Remove',
            value: 'remove',
            description: 'Remove Item (disconnect bank)',
            action: 'Remove item',
          },
        ],
        default: 'get',
      },

      // Identity operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['identity'],
          },
        },
        options: [
          {
            name: 'Get',
            value: 'get',
            description: 'Get account owner identity data',
            action: 'Get identity data',
          },
        ],
        default: 'get',
      },

      // Link Token creation parameters
      {
        displayName: 'User ID',
        name: 'userId',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['linkToken'],
            operation: ['create'],
          },
        },
        default: '',
        placeholder: 'user_12345',
        description: 'Unique identifier for the user in your system (should not contain PII)',
      },
      {
        displayName: 'Client Name',
        name: 'clientName',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['linkToken'],
            operation: ['create'],
          },
        },
        default: '',
        placeholder: 'My Financial App',
        description: 'The name of your application as it will appear to users',
      },
      {
        displayName: 'Products',
        name: 'products',
        type: 'multiOptions',
        required: true,
        displayOptions: {
          show: {
            resource: ['linkToken'],
            operation: ['create'],
          },
        },
        options: [
          { name: 'Transactions', value: 'transactions' },
          { name: 'Auth', value: 'auth' },
          { name: 'Identity', value: 'identity' },
          { name: 'Assets', value: 'assets' },
          { name: 'Investments', value: 'investments' },
          { name: 'Liabilities', value: 'liabilities' },
        ],
        default: ['transactions', 'auth'],
        description: 'Plaid products to enable for this Link token',
      },
      {
        displayName: 'Country Codes',
        name: 'countryCodes',
        type: 'multiOptions',
        required: true,
        displayOptions: {
          show: {
            resource: ['linkToken'],
            operation: ['create'],
          },
        },
        options: [
          { name: 'United States', value: 'US' },
          { name: 'Canada', value: 'CA' },
          { name: 'United Kingdom', value: 'GB' },
          { name: 'France', value: 'FR' },
          { name: 'Ireland', value: 'IE' },
          { name: 'Netherlands', value: 'NL' },
          { name: 'Spain', value: 'ES' },
        ],
        default: ['US'],
        description: 'Countries to support in the Link flow',
      },
      {
        displayName: 'Language',
        name: 'language',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['linkToken'],
            operation: ['create'],
          },
        },
        options: [
          { name: 'English', value: 'en' },
          { name: 'French', value: 'fr' },
          { name: 'Spanish', value: 'es' },
          { name: 'Dutch', value: 'nl' },
          { name: 'German', value: 'de' },
        ],
        default: 'en',
        description: 'Language for the Link UI',
      },

      // Public Token Exchange
      {
        displayName: 'Public Token',
        name: 'publicToken',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['linkToken'],
            operation: ['exchangeToken'],
          },
        },
        default: '',
        placeholder: 'public-sandbox-abc123...',
        description: 'Public token received from Plaid Link frontend flow',
      },

      // Access Token field for operations that need it
      {
        displayName: 'Access Token',
        name: 'accessToken',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            resource: ['transaction', 'account', 'auth', 'item', 'identity'],
          },
        },
        default: '',
        placeholder: 'access-sandbox-abc123...',
        description: 'User access token obtained from Plaid Link flow. Create a Link Token first, then complete the Plaid Link flow to get this token.',
        hint: 'To get this token: 1) Create Link Token, 2) Use token in Plaid Link UI, 3) Exchange public_token for access_token',
      },

      // Institution search parameters
      {
        displayName: 'Search Query',
        name: 'searchQuery',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['institution'],
            operation: ['search'],
          },
        },
        required: true,
        default: '',
        placeholder: 'Chase',
        description: 'Search term for finding institutions (e.g., "Chase", "Bank of America")',
      },
      {
        displayName: 'Institution ID',
        name: 'institutionId',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['institution'],
            operation: ['getById'],
          },
        },
        required: true,
        default: '',
        placeholder: 'ins_3',
        description: 'Plaid institution ID (e.g., ins_3 for Chase)',
      },
      {
        displayName: 'Country Code',
        name: 'countryCode',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['institution'],
          },
        },
        options: [
          { name: 'United States', value: 'US' },
          { name: 'Canada', value: 'CA' },
          { name: 'United Kingdom', value: 'GB' },
          { name: 'France', value: 'FR' },
          { name: 'Germany', value: 'DE' },
          { name: 'Spain', value: 'ES' },
          { name: 'Italy', value: 'IT' },
          { name: 'Netherlands', value: 'NL' },
        ],
        default: 'US',
        description: 'Country code for institution search',
      },

      // Transaction parameters
      {
        displayName: 'Cursor',
        name: 'cursor',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['transaction'],
            operation: ['sync'],
          },
        },
        default: '',
        description: 'Cursor for pagination (leave empty for initial sync)',
      },
      {
        displayName: 'Start Date',
        name: 'startDate',
        type: 'dateTime',
        displayOptions: {
          show: {
            resource: ['transaction'],
            operation: ['getRange'],
          },
        },
        default: '',
        description: 'Start date for transaction search (YYYY-MM-DD)',
        required: true,
      },
      {
        displayName: 'End Date',
        name: 'endDate',
        type: 'dateTime',
        displayOptions: {
          show: {
            resource: ['transaction'],
            operation: ['getRange'],
          },
        },
        default: '',
        description: 'End date for transaction search (YYYY-MM-DD)',
        required: true,
      },

      // Return all vs limit
      {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions: {
          show: {
            resource: ['transaction'],
          },
        },
        default: false,
        description: 'Whether to return all results or only up to a given limit',
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
          show: {
            resource: ['transaction'],
            returnAll: [false],
          },
        },
        typeOptions: {
          minValue: 1,
          maxValue: 500,
        },
        default: 100,
        description: 'Max number of results to return',
      },

      // Account filtering
      {
        displayName: 'Account IDs',
        name: 'accountIds',
        type: 'string',
        displayOptions: {
          show: {
            resource: ['transaction'],
          },
        },
        default: '',
        description: 'Comma-separated list of account IDs to filter (optional)',
      },

      // Additional options
      {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
          show: {
            resource: ['transaction'],
          },
        },
        options: [
          {
            displayName: 'Include Original Description',
            name: 'includeOriginalDescription',
            type: 'boolean',
            default: false,
            description: 'Include the original, unmodified description from the financial institution',
          },
          {
            displayName: 'Include Personal Finance Category',
            name: 'includePersonalFinanceCategory',
            type: 'boolean',
            default: true,
            description: 'Include Plaid\'s enhanced personal finance categorization',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const credentials = await this.getCredentials('plaidApi');
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    // Initialize Plaid client using modern v34.0.0 API
    const environment = credentials.environment === 'production' 
      ? PlaidEnvironments.production 
      : PlaidEnvironments.sandbox;

    const configuration = new Configuration({
      basePath: environment,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': credentials.clientId as string,
          'PLAID-SECRET': credentials.secret as string,
          'Plaid-Version': '2020-09-14',
        },
      },
    });

    const client = new PlaidApi(configuration);

    for (let i = 0; i < items.length; i++) {
      try {
        if (resource === 'linkToken') {
          if (operation === 'create') {
            // Create Link token for frontend initialization
            const userId = this.getNodeParameter('userId', i) as string;
            const clientName = this.getNodeParameter('clientName', i) as string;
            const products = this.getNodeParameter('products', i) as string[];
            const countryCodes = this.getNodeParameter('countryCodes', i) as string[];
            const language = this.getNodeParameter('language', i, 'en') as string;

            // Convert string arrays to Plaid enums
            const plaidProducts = products.map(p => Products[p as keyof typeof Products]);
            const plaidCountryCodes = countryCodes.map(c => CountryCode[c as keyof typeof CountryCode]);

            const request: LinkTokenCreateRequest = {
              user: {
                client_user_id: userId,
              },
              client_name: clientName,
              products: plaidProducts,
              country_codes: plaidCountryCodes,
              language: language,
            };

            const response = await client.linkTokenCreate(request);
            
            returnData.push({
              json: {
                link_token: response.data.link_token,
                expiration: response.data.expiration,
                request_id: response.data.request_id,
                user_id: userId,
                client_name: clientName,
                products: products,
                country_codes: countryCodes,
                environment: credentials.environment,
                created_at: new Date().toISOString(),
                instructions: {
                  next_steps: [
                    '1. Use this link_token to initialize Plaid Link in your frontend',
                    '2. User completes authentication in Plaid Link UI',
                    '3. Plaid Link returns a public_token',
                    '4. Exchange public_token for access_token using the "Exchange Public Token" operation',
                    '5. Use access_token in other n8n Plaid operations'
                  ],
                  plaid_link_docs: 'https://plaid.com/docs/link/',
                  token_exchange_docs: 'https://plaid.com/docs/api/tokens/#itemPublic_tokenexchange'
                },
                source: 'plaid_link_token',
              },
              pairedItem: { item: i },
            });

          } else if (operation === 'exchangeToken') {
            // Exchange public token for access token
            const publicToken = this.getNodeParameter('publicToken', i) as string;
            
            const request: ItemPublicTokenExchangeRequest = {
              public_token: publicToken,
            };

            const response = await client.itemPublicTokenExchange(request);
            
            returnData.push({
              json: {
                access_token: response.data.access_token,
                item_id: response.data.item_id,
                request_id: response.data.request_id,
                public_token: publicToken,
                environment: credentials.environment,
                exchanged_at: new Date().toISOString(),
                instructions: {
                  message: 'Store this access_token securely - you\'ll use it in other Plaid operations',
                  usage: 'Copy the access_token and paste it into the "Access Token" field of other Plaid operations'
                },
                source: 'plaid_token_exchange',
              },
              pairedItem: { item: i },
            });
          }

        } else if (resource === 'institution') {
          if (operation === 'search') {
            // Search institutions
            const searchQuery = this.getNodeParameter('searchQuery', i) as string;
            const countryCode = this.getNodeParameter('countryCode', i, 'US') as string;

            const request: InstitutionsSearchRequest = {
              query: searchQuery,
              products: [Products.Transactions], // Default to transactions
              country_codes: [countryCode as CountryCode],
            };

            const response = await client.institutionsSearch(request);
            
            for (const institution of response.data.institutions) {
              returnData.push({
                json: {
                  institution_id: institution.institution_id,
                  name: institution.name,
                  products: institution.products,
                  country_codes: institution.country_codes,
                  url: institution.url,
                  primary_color: institution.primary_color,
                  logo: institution.logo,
                  routing_numbers: institution.routing_numbers,
                  // Metadata
                  source: 'plaid_institutions',
                  search_query: searchQuery,
                  processed_at: new Date().toISOString(),
                },
                pairedItem: { item: i },
              });
            }
            
          } else if (operation === 'getById') {
            // Get institution by ID
            const institutionId = this.getNodeParameter('institutionId', i) as string;
            const countryCode = this.getNodeParameter('countryCode', i, 'US') as string;

            const request: InstitutionsGetByIdRequest = {
              institution_id: institutionId,
              country_codes: [countryCode as CountryCode],
              options: {
                include_optional_metadata: true,
                include_status: true,
              },
            };

            const response = await client.institutionsGetById(request);
            const institution = response.data.institution;
            
            returnData.push({
              json: {
                institution_id: institution.institution_id,
                name: institution.name,
                products: institution.products,
                country_codes: institution.country_codes,
                url: institution.url,
                primary_color: institution.primary_color,
                logo: institution.logo,
                routing_numbers: institution.routing_numbers,
                status: institution.status,
                // Metadata
                source: 'plaid_institution_details',
                processed_at: new Date().toISOString(),
              },
              pairedItem: { item: i },
            });
          }

        } else if (resource === 'transaction') {
          const accessToken = this.getNodeParameter('accessToken', i) as string;

          if (operation === 'sync') {
            // Modern transaction sync using cursor
            const cursor = this.getNodeParameter('cursor', i, '') as string;
            const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
            const limit = returnAll ? 500 : this.getNodeParameter('limit', i, 100) as number;
            const accountIds = this.getNodeParameter('accountIds', i, '') as string;
            const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

            const request: TransactionsSyncRequest = {
              access_token: accessToken,
              cursor: cursor || undefined,
              count: limit,
            } as any;

            if (accountIds) {
              (request as any).account_ids = accountIds.split(',').map(id => id.trim());
            }

            if (additionalFields.includeOriginalDescription) {
              request.options = { 
                ...request.options,
                include_original_description: true 
              };
            }

            const response = await client.transactionsSync(request);
            
            // Process added transactions
            for (const transaction of response.data.added) {
              returnData.push({
                json: {
                  transaction_id: transaction.transaction_id,
                  account_id: transaction.account_id,
                  amount: Math.abs(transaction.amount),
                  transaction_type: transaction.amount < 0 ? 'expense' : 'income',
                  iso_currency_code: transaction.iso_currency_code,
                  date: transaction.date,
                  datetime: transaction.datetime,
                  name: transaction.name,
                  merchant_name: transaction.merchant_name,
                  category: transaction.category,
                  category_id: transaction.category_id,
                  personal_finance_category: transaction.personal_finance_category,
                  location: transaction.location,
                  payment_meta: transaction.payment_meta,
                  account_owner: transaction.account_owner,
                  original_description: transaction.original_description,
                  // Metadata
                  sync_status: 'added',
                  sync_cursor: response.data.next_cursor,
                  has_more: response.data.has_more,
                  source: 'plaid_sync',
                  processed_at: new Date().toISOString(),
                },
                pairedItem: { item: i },
              });
            }

            // Also process modified and removed transactions
            for (const transaction of response.data.modified) {
              returnData.push({
                json: {
                  ...transaction,
                  sync_status: 'modified',
                  sync_cursor: response.data.next_cursor,
                  processed_at: new Date().toISOString(),
                },
                pairedItem: { item: i },
              });
            }

            for (const removedTransaction of response.data.removed) {
              returnData.push({
                json: {
                  transaction_id: removedTransaction.transaction_id,
                  sync_status: 'removed',
                  sync_cursor: response.data.next_cursor,
                  processed_at: new Date().toISOString(),
                },
                pairedItem: { item: i },
              });
            }

          } else if (operation === 'getRange') {
            // Legacy transaction get with date range
            const startDate = this.getNodeParameter('startDate', i) as string;
            const endDate = this.getNodeParameter('endDate', i) as string;
            const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
            const limit = returnAll ? 500 : this.getNodeParameter('limit', i, 100) as number;
            const accountIds = this.getNodeParameter('accountIds', i, '') as string;
            const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

            const request: TransactionsGetRequest = {
              access_token: accessToken,
              start_date: startDate.split('T')[0],
              end_date: endDate.split('T')[0],
              count: limit,
              offset: 0,
            } as any;

            if (accountIds) {
              (request as any).account_ids = accountIds.split(',').map(id => id.trim());
            }

            if (additionalFields.includeOriginalDescription) {
              request.options = { 
                ...request.options,
                include_original_description: true 
              };
            }

            const response = await client.transactionsGet(request);
            
            // Process transactions
            for (const transaction of response.data.transactions) {
              returnData.push({
                json: {
                  transaction_id: transaction.transaction_id,
                  account_id: transaction.account_id,
                  amount: Math.abs(transaction.amount),
                  transaction_type: transaction.amount < 0 ? 'expense' : 'income',
                  iso_currency_code: transaction.iso_currency_code,
                  date: transaction.date,
                  datetime: transaction.datetime,
                  name: transaction.name,
                  merchant_name: transaction.merchant_name,
                  category: transaction.category,
                  category_id: transaction.category_id,
                  personal_finance_category: transaction.personal_finance_category,
                  location: transaction.location,
                  payment_meta: transaction.payment_meta,
                  account_owner: transaction.account_owner,
                  original_description: transaction.original_description,
                  // Metadata
                  total_transactions: response.data.total_transactions,
                  source: 'plaid_get',
                  processed_at: new Date().toISOString(),
                },
                pairedItem: { item: i },
              });
            }
          }
          
        } else if (resource === 'account') {
          const accessToken = this.getNodeParameter('accessToken', i) as string;

          if (operation === 'getAll') {
            // Get all accounts (cached)
            const request: AccountsGetRequest = {
              access_token: accessToken,
            };

            const response = await client.accountsGet(request);
            
            for (const account of response.data.accounts) {
              returnData.push({
                json: {
                  account_id: account.account_id,
                  persistent_account_id: account.persistent_account_id,
                  name: account.name,
                  official_name: account.official_name,
                  type: account.type,
                  subtype: account.subtype,
                  mask: account.mask,
                  balances: account.balances,
                  verification_status: account.verification_status,
                  class_type: (account as any).class_type,
                  // Metadata
                  source: 'plaid_accounts',
                  processed_at: new Date().toISOString(),
                },
                pairedItem: { item: i },
              });
            }
            
          } else if (operation === 'getBalances') {
            // Get real-time balances
            const request: AccountsBalanceGetRequest = {
              access_token: accessToken,
            };

            const response = await client.accountsBalanceGet(request);
            
            for (const account of response.data.accounts) {
              returnData.push({
                json: {
                  account_id: account.account_id,
                  name: account.name,
                  type: account.type,
                  subtype: account.subtype,
                  balances: account.balances,
                  // Metadata
                  source: 'plaid_balances',
                  realtime: true,
                  processed_at: new Date().toISOString(),
                },
                pairedItem: { item: i },
              });
            }
          }
          
        } else if (resource === 'auth') {
          const accessToken = this.getNodeParameter('accessToken', i) as string;

          if (operation === 'get') {
            // Get auth data (routing/account numbers)
            const request: AuthGetRequest = {
              access_token: accessToken,
            };

            const response = await client.authGet(request);
            
            for (const account of response.data.accounts) {
              const authNumbers = response.data.numbers.ach?.find(
                (ach: any) => ach.account_id === account.account_id
              );
              
              returnData.push({
                json: {
                  account_id: account.account_id,
                  name: account.name,
                  type: account.type,
                  subtype: account.subtype,
                  balances: account.balances,
                  routing_number: authNumbers?.routing,
                  account_number: authNumbers?.account,
                  wire_routing_number: authNumbers?.wire_routing,
                  // Metadata
                  source: 'plaid_auth',
                  processed_at: new Date().toISOString(),
                },
                pairedItem: { item: i },
              });
            }
          }
          
        } else if (resource === 'item') {
          const accessToken = this.getNodeParameter('accessToken', i) as string;

          if (operation === 'get') {
            // Get item information
            const request: ItemGetRequest = {
              access_token: accessToken,
            };

            const response = await client.itemGet(request);
            const item = response.data.item;
            
            returnData.push({
              json: {
                item_id: item.item_id,
                institution_id: item.institution_id,
                webhook: item.webhook,
                error: item.error,
                available_products: item.available_products,
                billed_products: item.billed_products,
                products: item.products,
                consented_products: item.consented_products,
                consent_expiration_time: item.consent_expiration_time,
                update_type: item.update_type,
                // Metadata
                source: 'plaid_item',
                processed_at: new Date().toISOString(),
              },
              pairedItem: { item: i },
            });
            
          } else if (operation === 'remove') {
            // Remove item (disconnect bank)
            const request = {
              access_token: accessToken,
            };

            const response = await client.itemRemove(request);
            
            returnData.push({
              json: {
                removed: true,
                request_id: response.data.request_id,
                // Metadata
                source: 'plaid_item_remove',
                processed_at: new Date().toISOString(),
              },
              pairedItem: { item: i },
            });
          }
          
        } else if (resource === 'identity') {
          const accessToken = this.getNodeParameter('accessToken', i) as string;

          if (operation === 'get') {
            // Get identity data
            const request: IdentityGetRequest = {
              access_token: accessToken,
            };

            const response = await client.identityGet(request);
            
            for (const account of response.data.accounts) {
              returnData.push({
                json: {
                  account_id: account.account_id,
                  name: account.name,
                  type: account.type,
                  subtype: account.subtype,
                  balances: account.balances,
                  owners: account.owners,
                  // Metadata
                  source: 'plaid_identity',
                  processed_at: new Date().toISOString(),
                },
                pairedItem: { item: i },
              });
            }
          }
        }
        
      } catch (error: any) {
        // Enhanced error handling for Plaid API errors
        let errorMessage = 'Unknown error occurred';
        let errorCode = 'UNKNOWN';
        
        if (error.response?.data) {
          // Plaid API error
          const plaidError = error.response.data;
          errorMessage = plaidError.error_message || plaidError.display_message || error.message;
          errorCode = plaidError.error_code || 'PLAID_ERROR';
          
          // Provide helpful hints for common errors
          if (errorCode === 'INVALID_FIELD' && errorMessage.includes('access_token')) {
            errorMessage += '\n\nHint: Make sure you have provided a valid access token. To get an access token:\n1. Create a Link Token using the "Link Token" → "Create" operation\n2. Use the link_token in Plaid Link UI to authenticate a user\n3. Exchange the public_token for an access_token using "Link Token" → "Exchange Public Token"\n4. Use that access_token in this operation';
          } else if (errorCode === 'INVALID_ACCESS_TOKEN') {
            errorMessage += '\n\nHint: Your access token may be expired or invalid. Try creating a new one through the Plaid Link flow.';
          } else if (errorCode === 'ITEM_LOGIN_REQUIRED') {
            errorMessage += '\n\nHint: The user needs to re-authenticate through Plaid Link. Create a new Link Token in update mode.';
          }
        } else {
          // Network or other error
          errorMessage = error.message;
        }

        if (this.continueOnFail()) {
          returnData.push({
            json: { 
              error: true,
              error_message: errorMessage,
              error_code: errorCode,
              resource,
              operation,
              plaid_error_details: error.response?.data || null,
              processed_at: new Date().toISOString(),
            },
            pairedItem: { item: i },
          });
          continue;
        }
        
        throw new NodeApiError(
          this.getNode(), 
          error,
          { 
            itemIndex: i,
            description: `Plaid API Error (${errorCode}): ${errorMessage}`,
          }
        );
      }
    }

    return [returnData];
  }
}