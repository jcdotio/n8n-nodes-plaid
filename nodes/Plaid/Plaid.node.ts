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