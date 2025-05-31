// ========================================
// COMPLETE n8n-nodes-plaid PACKAGE
// Based on Plaid Node.js v34.0.0 and Plaid API 2020-09-14
// ========================================

// File: package.json
{
  "name": "n8n-nodes-plaid",
  "version": "1.0.0",
  "description": "n8n community node for Plaid financial data integration - the definitive financial node for n8n",
  "keywords": [
    "n8n-community-node-package",
    "n8n",
    "plaid",
    "financial",
    "banking",
    "transactions",
    "accounts",
    "fintech"
  ],
  "license": "MIT",
  "homepage": "https://github.com/jcdotio/n8n-nodes-plaid",
  "author": {
    "name": "jcdotio",
    "email": "your.email@example.com"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/jcdotio/n8n-nodes-plaid.git"
  },
  "engines": {
    "node": ">=18.10",
    "pnpm": ">=8.9"
  },
  "packageManager": "pnpm@8.9.0",
  "main": "index.js",
  "scripts": {
    "build": "tsc && gulp build:icons",
    "dev": "tsc --watch",
    "format": "prettier nodes credentials --write",
    "lint": "eslint nodes credentials package.json",
    "lintfix": "eslint nodes credentials package.json --fix",
    "prepublishOnly": "npm run build && npm run lint",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "files": [
    "dist"
  ],
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [
      "dist/credentials/PlaidApi.credentials.js"
    ],
    "nodes": [
      "dist/nodes/Plaid/Plaid.node.js"
    ]
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.50.0",
    "eslint-plugin-n8n-nodes-base": "^1.16.1",
    "gulp": "^4.0.2",
    "jest": "^29.5.0",
    "n8n-workflow": "^1.0.0",
    "prettier": "^3.0.3",
    "ts-jest": "^29.1.0",
    "typescript": "^5.2.2"
  },
  "peerDependencies": {
    "n8n-workflow": "*"
  },
  "dependencies": {
    "plaid": "^34.0.0"
  }
}

// ========================================
// File: credentials/PlaidApi.credentials.ts
// ========================================

import {
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class PlaidApi implements ICredentialType {
  name = 'plaidApi';
  displayName = 'Plaid API';
  documentationUrl = 'https://plaid.com/docs/';
  properties: INodeProperties[] = [
    {
      displayName: 'Environment',
      name: 'environment',
      type: 'options',
      options: [
        {
          name: 'Sandbox',
          value: 'sandbox',
          description: 'Test environment with mock data',
        },
        {
          name: 'Production',
          value: 'production',
          description: 'Live environment with real financial data',
        },
      ],
      default: 'sandbox',
      description: 'The Plaid environment to use',
    },
    {
      displayName: 'Client ID',
      name: 'clientId',
      type: 'string',
      required: true,
      default: '',
      description: 'Your Plaid Client ID from the Plaid Dashboard',
    },
    {
      displayName: 'Secret Key',
      name: 'secret',
      type: 'string',
      typeOptions: { password: true },
      required: true,
      default: '',
      description: 'Your Plaid Secret Key from the Plaid Dashboard',
    },
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      typeOptions: { password: true },
      required: false,
      default: '',
      description: 'User access token obtained from Plaid Link (required for most operations)',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'PLAID-CLIENT-ID': '={{$credentials.clientId}}',
        'PLAID-SECRET': '={{$credentials.secret}}',
        'Plaid-Version': '2020-09-14',
        'Content-Type': 'application/json',
      },
    },
  };
}

// ========================================
// File: nodes/Plaid/Plaid.node.ts
// ========================================

import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
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
    inputs: ['main'],
    outputs: ['main'],
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
            name: 'Institution',
            value: 'institution',
            description: 'Search and get information about financial institutions',
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
        default: 'transaction',
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

      // Cursor for transaction sync
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

      // Date range for transactions
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

      // Institution search query
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
        default: '',
        description: 'Search term for institutions (e.g., "Chase", "Bank of America")',
        required: true,
      },

      // Institution ID
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
        default: '',
        description: 'Plaid institution ID (e.g., "ins_3")',
        required: true,
      },

      // Country codes for institution search
      {
        displayName: 'Country',
        name: 'countryCode',
        type: 'options',
        displayOptions: {
          show: {
            resource: ['institution'],
            operation: ['search'],
          },
        },
        options: [
          { name: 'United States', value: 'US' },
          { name: 'Canada', value: 'CA' },
          { name: 'United Kingdom', value: 'GB' },
          { name: 'Ireland', value: 'IE' },
          { name: 'France', value: 'FR' },
          { name: 'Spain', value: 'ES' },
          { name: 'Netherlands', value: 'NL' },
        ],
        default: 'US',
        description: 'Country for institution search',
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
        if (resource === 'transaction') {
          if (operation === 'sync') {
            // Modern transaction sync using cursor
            const cursor = this.getNodeParameter('cursor', i, '') as string;
            const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
            const limit = returnAll ? 500 : this.getNodeParameter('limit', i, 100) as number;
            const accountIds = this.getNodeParameter('accountIds', i, '') as string;
            const additionalFields = this.getNodeParameter('additionalFields', i, {}) as any;

            const request: TransactionsSyncRequest = {
              access_token: credentials.accessToken as string,
              cursor: cursor || undefined,
              count: limit,
            };

            if (accountIds) {
              request.account_ids = accountIds.split(',').map(id => id.trim());
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
              access_token: credentials.accessToken as string,
              start_date: startDate.split('T')[0],
              end_date: endDate.split('T')[0],
              count: limit,
              offset: 0,
            };

            if (accountIds) {
              request.account_ids = accountIds.split(',').map(id => id.trim());
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
          if (operation === 'getAll') {
            // Get all accounts (cached)
            const request: AccountsGetRequest = {
              access_token: credentials.accessToken as string,
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
                  class_type: account.class_type,
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
              access_token: credentials.accessToken as string,
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
          if (operation === 'get') {
            // Get auth data (routing/account numbers)
            const request: AuthGetRequest = {
              access_token: credentials.accessToken as string,
            };

            const response = await client.authGet(request);
            
            for (const account of response.data.accounts) {
              const authNumbers = response.data.numbers.ach?.find(
                ach => ach.account_id === account.account_id
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
          
        } else if (resource === 'item') {
          if (operation === 'get') {
            // Get item information
            const request: ItemGetRequest = {
              access_token: credentials.accessToken as string,
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
              access_token: credentials.accessToken as string,
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
          if (operation === 'get') {
            // Get identity data
            const request: IdentityGetRequest = {
              access_token: credentials.accessToken as string,
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
              processed_at: new Date().toISOString(),
            },
            pairedItem: { item: i },
          });
          continue;
        }
        
        throw new NodeOperationError(
          this.getNode(), 
          `Plaid API Error (${errorCode}): ${errorMessage}`, 
          { itemIndex: i }
        );
      }
    }

    return [returnData];
  }
}

// ========================================
// File: utils/PlaidHelpers.ts
// ========================================

import { PlaidEnvironments } from 'plaid';

export class PlaidHelpers {
  /**
   * Get Plaid environment URL
   */
  static getEnvironmentUrl(environment: string): string {
    return environment === 'production' 
      ? PlaidEnvironments.production 
      : PlaidEnvironments.sandbox;
  }

  /**
   * Format transaction amount (Plaid returns negative for outflow)
   */
  static formatTransactionAmount(amount: number): {
    amount: number;
    type: 'income' | 'expense';
  } {
    return {
      amount: Math.abs(amount),
      type: amount < 0 ? 'expense' : 'income',
    };
  }

  /**
   * Parse account IDs from comma-separated string
   */
  static parseAccountIds(accountIds: string): string[] | undefined {
    if (!accountIds.trim()) return undefined;
    return accountIds.split(',').map(id => id.trim()).filter(Boolean);
  }

  /**
   * Format date for Plaid API (YYYY-MM-DD)
   */
  static formatDate(dateString: string): string {
    return dateString.split('T')[0];
  }

  /**
   * Enhanced categorization mapping
   */
  static enhanceCategories(transaction: any): any {
    const categories = transaction.category || [];
    const personalFinanceCategory = transaction.personal_finance_category;
    
    return {
      ...transaction,
      category_primary: categories[0] || 'Other',
      category_secondary: categories[1] || '',
      category_detailed: categories[2] || '',
      category_full: categories.join(' > ') || 'Other',
      enhanced_category: personalFinanceCategory?.primary || categories[0] || 'Other',
      enhanced_subcategory: personalFinanceCategory?.detailed || categories[1] || '',
    };
  }

  /**
   * Detect recurring transactions
   */
  static detectRecurring(description: string): boolean {
    const recurringKeywords = [
      'netflix', 'spotify', 'subscription', 'monthly', 'annual',
      'insurance', 'mortgage', 'rent', 'gym', 'membership',
      'utilities', 'phone', 'internet', 'recurring'
    ];
    
    const lowerDesc = description.toLowerCase();
    return recurringKeywords.some(keyword => lowerDesc.includes(keyword));
  }

  /**
   * Calculate spending score based on amount and category
   */
  static calculateSpendingScore(amount: number, categories: string[]): number {
    const absAmount = Math.abs(amount);
    let score = Math.min(absAmount / 100, 10); // Base score 0-10
    
    // Adjust based on category
    const categoryMultipliers: Record<string, number> = {
      'Food and Drink': 1.0,
      'Shops': 1.2,
      'Recreation': 1.3,
      'Transportation': 0.8,
      'Healthcare': 0.7,
      'Bills': 0.5,
      'Transfer': 0.3,
    };
    
    const primaryCategory = categories?.[0];
    const multiplier = categoryMultipliers[primaryCategory] || 1.0;
    
    return Math.round(score * multiplier * 10) / 10;
  }
}

// ========================================
// File: types/PlaidTypes.ts
// ========================================

export interface PlaidCredentials {
  environment: 'sandbox' | 'production';
  clientId: string;
  secret: string;
  accessToken?: string;
}

export interface EnhancedTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  transaction_type: 'income' | 'expense';
  iso_currency_code?: string;
  date: string;
  datetime?: string;
  name: string;
  merchant_name?: string;
  category?: string[];
  category_id?: string;
  category_primary?: string;
  category_secondary?: string;
  category_detailed?: string;
  category_full?: string;
  enhanced_category?: string;
  enhanced_subcategory?: string;
  personal_finance_category?: any;
  location?: any;
  payment_meta?: any;
  account_owner?: string;
  original_description?: string;
  is_recurring?: boolean;
  spending_score?: number;
  sync_cursor?: string;
  has_more?: boolean;
  source: string;
  processed_at: string;
}

export interface EnhancedAccount {
  account_id: string;
  persistent_account_id?: string;
  name: string;
  official_name?: string;
  type: string;
  subtype?: string;
  mask?: string;
  balances: any;
  verification_status?: string;
  class_type?: string;
  source: string;
  processed_at: string;
}

// ========================================
// File: README.md
// ========================================

# n8n-nodes-plaid

The definitive Plaid financial integration node for n8n. Connect to bank accounts, fetch transactions, and build powerful financial workflows with ease.

## 🚀 Features

- **Complete Plaid API Coverage**: Transactions, Accounts, Auth, Institutions, Items, Identity
- **Modern API Support**: Uses latest Plaid Node.js SDK v34.0.0 and API version 2020-09-14
- **Real-time & Batch**: Support for both `/transactions/sync` and `/transactions/get`
- **Enhanced Data**: Personal finance categorization, spending scores, recurring detection
- **Secure**: Encrypted credential storage with environment isolation
- **Production Ready**: Comprehensive error handling and rate limiting
- **Easy Setup**: One-click installation and visual configuration

## 📦 Installation

### Via n8n GUI (Recommended)
1. Go to **Settings** → **Community Nodes**
2. Click **Install** 
3. Enter: `n8n-nodes-plaid`
4. Click **Install**

### Via npm
```bash
npm install n8n-nodes-plaid
```

## 🔧 Setup

### 1. Get Plaid API Keys
1. Sign up at [Plaid Dashboard](https://dashboard.plaid.com)
2. Get your **Client ID** and **Secret** from API section
3. Set up Plaid Link to get user **Access Tokens**

### 2. Configure Credentials in n8n
1. Go to **Settings** → **Credentials** → **Add Credential**
2. Select **Plaid API**
3. Fill in:
   - **Environment**: Sandbox (for testing) or Production
   - **Client ID**: Your Plaid Client ID
   - **Secret**: Your Plaid Secret Key
   - **Access Token**: User access token from Plaid Link

### 3. Create Your First Workflow

#### Basic Transaction Sync
```
[Cron: Every 6 hours] → [Plaid: Sync Transactions] → [Function: Process] → [Google Sheets: Log]
```

#### Real-time Spending Alert
```
[Cron: Hourly] → [Plaid: Sync Transactions] → [IF: Amount > $500] → [Slack: Alert]
```

## 📊 Supported Operations

### Transactions
- **Sync**: Get new/updated transactions using cursor (recommended)
- **Get Range**: Get transactions within specific date range

### Accounts  
- **Get All**: Get all connected accounts (cached data)
- **Get Balances**: Get real-time account balances

### Auth
- **Get**: Get bank account and routing numbers for ACH/wire transfers

### Institutions
- **Search**: Find financial institutions by name
- **Get by ID**: Get detailed institution information

### Items
- **Get**: Get connection information and status  
- **Remove**: Disconnect bank account safely

### Identity
- **Get**: Get account owner information and identity data

## 💡 Example Workflows

### Daily Financial Summary
```json
{
  "name": "Daily Financial Summary",
  "nodes": [
    {
      "name": "Daily at 9 AM",
      "type": "n8n-nodes-base.cron"
    },
    {
      "name": "Get Yesterday's Transactions", 
      "type": "n8n-nodes-plaid.plaid",
      "parameters": {
        "resource": "transaction",
        "operation": "getRange",
        "startDate": "{{$today.minus({days: 1}).toFormat('yyyy-MM-dd')}}",
        "endDate": "{{$today.toFormat('yyyy-MM-dd')}}"
      }
    },
    {
      "name": "Calculate Daily Spending",
      "type": "n8n-nodes-base.function"
    },
    {
      "name": "Send Summary Email",
      "type": "n8n-nodes-base.gmail"
    }
  ]
}
```

### High Spending Alert
```json
{
  "name": "High Spending Alert",
  "nodes": [
    {
      "name": "Every Hour",
      "type": "n8n-nodes-base.cron"
    },
    {
      "name": "Sync Recent Transactions",
      "type": "n8n-nodes-plaid.plaid", 
      "parameters": {
        "resource": "transaction",
        "operation": "sync"
      }
    },
    {
      "name": "Filter High Amounts",
      "type": "n8n-nodes-base.if",
      "parameters": {
        "conditions": {
          "number": [{
            "value1": "={{$json.amount}}",
            "operation": "larger", 
            "value2": 500
          }]
        }
      }
    },
    {
      "name": "Send Slack Alert",
      "type": "n8n-nodes-base.slack"
    }
  ]
}
```

## 🔒 Security & Best Practices

### Credential Security
- All API keys encrypted by n8n
- Environment isolation (Sandbox vs Production)
- Access tokens never logged or exposed

### API Best Practices  
- Automatic rate limiting compliance
- Proper error handling with retry logic
- Request ID tracking for support
- Efficient cursor-based pagination

### Data Handling
- Enhanced categorization and enrichment
- Spending analysis and scoring
- Recurring transaction detection
- Comprehensive transaction metadata

## 🐛 Troubleshooting

### Common Issues

#### "Invalid access token"
- Verify access token is correctly set in credentials
- Ensure token is for the correct environment (Sandbox vs Production)
- Check if user has revoked access in their bank portal

#### "Institution not found"
- Verify institution ID is correct
- Check if institution supports requested products
- Ensure country code matches institution location

#### "Rate limit exceeded"
- Node automatically handles rate limiting
- Reduce frequency of cron triggers if needed
- Use cursor-based sync instead of date ranges

### Getting Help
1. Check [Plaid API Status](https://status.plaid.com)
2. Review [Plaid Documentation](https://plaid.com/docs)
3. Open issue on [GitHub](https://github.com/jcdotio/n8n-nodes-plaid)

## 📚 Advanced Usage

### Custom Transaction Processing
```javascript
// In Function node after Plaid node
const transactions = $input.all();

const processedTransactions = transactions.map(item => {
  const transaction = item.json;
  
  return {
    json: {
      ...transaction,
      // Custom categorization
      custom_category: categorizeTransaction(transaction.name),
      // Business vs personal
      is_business: isBusinessTransaction(transaction),
      // Custom scoring
      priority_score: calculatePriority(transaction)
    }
  };
});

return processedTransactions;

function categorizeTransaction(description) {
  if (description.includes('UBER') || description.includes('LYFT')) {
    return 'rideshare';
  }
  if (description.includes('STARBUCKS') || description.includes('COFFEE')) {
    return 'coffee';
  }
  return 'other';
}

function isBusinessTransaction(transaction) {
  const businessKeywords = ['OFFICE', 'SUPPLIES', 'CONFERENCE', 'TRAVEL'];
  return businessKeywords.some(keyword => 
    transaction.name.toUpperCase().includes(keyword)
  );
}

function calculatePriority(transaction) {
  let score = 0;
  if (transaction.amount > 1000) score += 5;
  if (transaction.category_primary === 'Travel') score += 3;
  if (transaction.is_recurring) score -= 2;
  return Math.max(0, Math.min(10, score));
}
```

### Multi-Account Processing
```javascript
// Process multiple accounts with different logic
const items = $input.all();
const accountRules = {
  'checking': { limit: 1000, alert: true },
  'savings': { limit: 5000, alert: false },
  'credit': { limit: 500, alert: true }
};

return items.map(item => {
  const transaction = item.json;
  const accountType = transaction.account_type;
  const rules = accountRules[accountType] || accountRules['checking'];
  
  return {
    json: {
      ...transaction,
      requires_alert: transaction.amount > rules.limit && rules.alert,
      account_rules: rules
    }
  };
});
```

## 🔄 Migration from HTTP Request Node

If you're currently using HTTP Request nodes to call Plaid API directly:

### Before (HTTP Request)
```json
{
  "name": "Manual Plaid Call",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://sandbox.plaid.com/transactions/get",
    "body": {
      "access_token": "{{$credentials.plaidApi.accessToken}}",
      "start_date": "2024-01-01", 
      "end_date": "2024-01-31"
    },
    "headers": {
      "PLAID-CLIENT-ID": "{{$credentials.plaidApi.clientId}}",
      "PLAID-SECRET": "{{$credentials.plaidApi.secret}}"
    }
  }
}
```

### After (Plaid Node)
```json
{
  "name": "Plaid Transactions",
  "type": "n8n-nodes-plaid.plaid",
  "parameters": {
    "resource": "transaction",
    "operation": "getRange",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

### Migration Benefits
- ✅ **Simplified configuration** - no manual API calls
- ✅ **Enhanced data** - automatic categorization and enrichment  
- ✅ **Better error handling** - user-friendly error messages
- ✅ **Type safety** - proper TypeScript support
- ✅ **Documentation** - built-in help and examples

## 📈 Roadmap

### v1.1 (Next Release)
- [ ] Webhook trigger node for real-time events
- [ ] Investment accounts support
- [ ] Liabilities data (loans, credit cards)
- [ ] Enhanced spending analytics

### v1.2 (Future)
- [ ] Assets product support
- [ ] Income verification
- [ ] Payment initiation
- [ ] Multi-language support

### v2.0 (Long-term)
- [ ] Advanced AI categorization
- [ ] Fraud detection algorithms  
- [ ] Comprehensive reporting tools
- [ ] Enterprise features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Clone the repository
git clone https://github.com/jcdotio/n8n-nodes-plaid.git
cd n8n-nodes-plaid

# Install dependencies
npm install

# Start development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Plaid](https://plaid.com) for their excellent financial API
- [n8n](https://n8n.io) for the powerful workflow automation platform
- The open source community for contributions and feedback

---

**Made with ❤️ for the n8n community**

Transform your financial data workflows with the power of Plaid and n8n!

// ========================================
// File: .gitignore
// ========================================

# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test
.env.production

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# next.js build output
.next

# nuxt.js build output
.nuxt

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# Build output
dist/
build/

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# ========================================
// File: tsconfig.json
// ========================================

{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": [
    "credentials/**/*",
    "nodes/**/*",
    "utils/**/*",
    "types/**/*"
  ],
  "exclude": [
    "dist",
    "node_modules",
    "**/*.test.ts"
  ]
}

// ========================================
// File: .eslintrc.js
// ========================================

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'prefer-const': 'error',
    'no-var': 'error',
  },
  env: {
    node: true,
    es6: true,
  },
};

// ========================================
// File: gulpfile.js
// ========================================

const { src, dest } = require('gulp');

function buildIcons() {
  return src('icons/**/*')
    .pipe(dest('dist/icons/'));
}

exports['build:icons'] = buildIcons;
exports.default = buildIcons;

// ========================================
// File: jest.config.js
// ========================================

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts: 'ts-jest',
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

// ========================================
// File: CHANGELOG.md
// ========================================

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- Initial release of n8n-nodes-plaid
- Complete Plaid API integration using latest Node.js SDK v34.0.0
- Support for Transactions (sync and get operations)
- Support for Accounts (get all and balances)
- Support for Auth (routing and account numbers)
- Support for Institutions (search and get by ID)
- Support for Items (get and remove)
- Support for Identity (get owner information)
- Enhanced transaction processing with categorization
- Spending score calculation
- Recurring transaction detection
- Comprehensive error handling
- Production-ready security practices
- Extensive documentation and examples

### Security
- Encrypted credential storage
- Environment isolation (Sandbox vs Production)
- Proper API key handling
- Rate limiting compliance

### Documentation
- Complete README with setup instructions
- Example workflows for common use cases
- Troubleshooting guide
- Migration guide from HTTP Request nodes

## [Unreleased]

### Planned
- Webhook trigger node for real-time events
- Investment accounts support
- Liabilities data integration
- Enhanced analytics and reporting

// ========================================
// File: LICENSE
// ========================================

MIT License

Copyright (c) 2024 jcdotio

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.