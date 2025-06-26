// ==============================================================================
// PLAID NODE - NO DEPENDENCIES VERSION
// This version removes the Plaid SDK dependency for n8n Cloud verification
// ==============================================================================

import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	IHttpRequestOptions,
	NodeConnectionType,
} from 'n8n-workflow';

// ==============================================================================
// PLAID API TYPES (Inline - No SDK Dependency)
// ==============================================================================

interface PlaidCredentials {
	clientId: string;
	secret: string;
	accessToken: string;
	environment: 'sandbox' | 'development' | 'production';
}

interface PlaidTransaction {
	transaction_id: string;
	account_id: string;
	amount: number;
	iso_currency_code: string;
	unofficial_currency_code?: string;
	category: string[];
	category_id: string;
	date: string;
	authorized_date?: string;
	name: string;
	merchant_name?: string;
	payment_channel: string;
	pending: boolean;
	account_owner?: string;
	personal_finance_category?: {
		primary: string;
		detailed: string;
	};
	website?: string;
	logo_url?: string;
	authorized_datetime?: string;
	datetime?: string;
	payment_meta?: any;
	counterparties?: any[];
	merchant_entity_id?: string;
}

interface PlaidAccount {
	account_id: string;
	balances: {
		available?: number;
		current?: number;
		iso_currency_code?: string;
		limit?: number;
		unofficial_currency_code?: string;
	};
	mask: string;
	name: string;
	official_name?: string;
	type: string;
	subtype?: string;
	verification_status?: string;
}

interface PlaidInstitution {
	institution_id: string;
	name: string;
	products: string[];
	country_codes: string[];
	url?: string;
	primary_color?: string;
	logo?: string;
	routing_numbers?: string[];
	oauth: boolean;
	status?: any;
}

interface PlaidItem {
	item_id: string;
	webhook?: string;
	error?: any;
	available_products: string[];
	billed_products: string[];
	consent_expiration_time?: string;
	update_type: string;
}

interface PlaidIdentity {
	account_id: string;
	owners: Array<{
		names: string[];
		phone_numbers: Array<{
			data: string;
			primary: boolean;
			type: string;
		}>;
		emails: Array<{
			data: string;
			primary: boolean;
			type: string;
		}>;
		addresses: Array<{
			data: {
				street: string;
				city: string;
				region: string;
				postal_code: string;
				country: string;
			};
			primary: boolean;
		}>;
	}>;
}

interface PlaidAuth {
	account_id: string;
	routing: string;
	account: string;
	wire_routing?: string;
}

// ==============================================================================
// PLAID API HELPER CLASS
// ==============================================================================

class PlaidApiHelper {
	private credentials: PlaidCredentials;
	private httpRequest: any;

	constructor(credentials: PlaidCredentials, httpRequest: any) {
		this.credentials = credentials;
		this.httpRequest = httpRequest;
	}

	private getBaseUrl(): string {
		switch (this.credentials.environment) {
			case 'sandbox':
				return 'https://sandbox.plaid.com';
			case 'development':
				return 'https://development.plaid.com';
			case 'production':
				return 'https://production.plaid.com';
			default:
				return 'https://sandbox.plaid.com';
		}
	}

	private async makeRequest(endpoint: string, body: any): Promise<any> {
		const options: IHttpRequestOptions = {
			method: 'POST',
			url: `${this.getBaseUrl()}${endpoint}`,
			headers: {
				'Content-Type': 'application/json',
				'PLAID-CLIENT-ID': this.credentials.clientId,
				'PLAID-SECRET': this.credentials.secret,
				'Plaid-Version': '2020-09-14',
			},
			body: {
				...body,
				client_id: this.credentials.clientId,
				secret: this.credentials.secret,
			},
			json: true,
		};

		try {
			const response = await this.httpRequest(options);
			return response;
		} catch (error: any) {
			// Enhanced error handling
			if (error.response?.body?.error_code) {
				const plaidError = error.response.body;
				throw new Error(
					`Plaid API Error (${plaidError.error_code}): ${plaidError.error_message}`
				);
			}
			throw new Error(`Plaid API Request Failed: ${error.message}`);
		}
	}

	// ==============================================================================
	// TRANSACTION OPERATIONS
	// ==============================================================================

	async getTransactions(
		accessToken: string,
		startDate: string,
		endDate: string,
		options: { count?: number; offset?: number } = {}
	): Promise<{ transactions: PlaidTransaction[]; total_transactions: number }> {
		return this.makeRequest('/transactions/get', {
			access_token: accessToken,
			start_date: startDate,
			end_date: endDate,
			count: options.count || 500,
			offset: options.offset || 0,
		});
	}

	async syncTransactions(
		accessToken: string,
		cursor?: string
	): Promise<{
		added: PlaidTransaction[];
		modified: PlaidTransaction[];
		removed: Array<{ transaction_id: string }>;
		next_cursor: string;
		has_next: boolean;
	}> {
		const body: any = {
			access_token: accessToken,
		};

		if (cursor) {
			body.cursor = cursor;
		}

		return this.makeRequest('/transactions/sync', body);
	}

	// ==============================================================================
	// ACCOUNT OPERATIONS
	// ==============================================================================

	async getAccounts(accessToken: string): Promise<{ accounts: PlaidAccount[] }> {
		return this.makeRequest('/accounts/get', {
			access_token: accessToken,
		});
	}

	async getAccountBalances(accessToken: string): Promise<{ accounts: PlaidAccount[] }> {
		return this.makeRequest('/accounts/balance/get', {
			access_token: accessToken,
		});
	}

	// ==============================================================================
	// AUTH OPERATIONS
	// ==============================================================================

	async getAuth(accessToken: string): Promise<{ accounts: PlaidAccount[]; numbers: { ach: PlaidAuth[] } }> {
		return this.makeRequest('/auth/get', {
			access_token: accessToken,
		});
	}

	// ==============================================================================
	// INSTITUTION OPERATIONS
	// ==============================================================================

	async searchInstitutions(
		query: string,
		countryCodes: string[] = ['US']
	): Promise<{ institutions: PlaidInstitution[] }> {
		return this.makeRequest('/institutions/search', {
			query,
			products: ['transactions'],
			country_codes: countryCodes,
		});
	}

	async getInstitutionById(
		institutionId: string,
		countryCodes: string[] = ['US']
	): Promise<{ institution: PlaidInstitution }> {
		return this.makeRequest('/institutions/get_by_id', {
			institution_id: institutionId,
			country_codes: countryCodes,
		});
	}

	// ==============================================================================
	// ITEM OPERATIONS
	// ==============================================================================

	async getItem(accessToken: string): Promise<{ item: PlaidItem }> {
		return this.makeRequest('/item/get', {
			access_token: accessToken,
		});
	}

	async removeItem(accessToken: string): Promise<{ removed: boolean }> {
		return this.makeRequest('/item/remove', {
			access_token: accessToken,
		});
	}

	// ==============================================================================
	// IDENTITY OPERATIONS
	// ==============================================================================

	async getIdentity(accessToken: string): Promise<{ accounts: PlaidAccount[]; identity: PlaidIdentity[] }> {
		return this.makeRequest('/identity/get', {
			access_token: accessToken,
		});
	}
}

// ==============================================================================
// MAIN NODE IMPLEMENTATION
// ==============================================================================

export class Plaid implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Plaid',
		name: 'plaid',
		icon: 'file:plaid.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access the Plaid API - No Dependencies',
		defaults: {
			name: 'Plaid',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'plaidApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Transaction',
						value: 'transaction',
					},
					{
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Auth',
						value: 'auth',
					},
					{
						name: 'Institution',
						value: 'institution',
					},
					{
						name: 'Item',
						value: 'item',
					},
					{
						name: 'Identity',
						value: 'identity',
					},
				],
				default: 'transaction',
			},
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
						name: 'Get Range',
						value: 'getRange',
						description: 'Get transactions within a date range',
						action: 'Get transactions within a date range',
					},
					{
						name: 'Sync',
						value: 'sync',
						description: 'Get new and updated transactions',
						action: 'Get new and updated transactions',
					},
				],
				default: 'sync',
			},
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
						description: 'Get all connected accounts',
						action: 'Get all connected accounts',
					},
					{
						name: 'Get Balances',
						value: 'getBalances',
						description: 'Get real-time account balances',
						action: 'Get real-time account balances',
					},
				],
				default: 'getAll',
			},
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
						action: 'Get bank account and routing numbers',
					},
				],
				default: 'get',
			},
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
						description: 'Search for institutions',
						action: 'Search for institutions',
					},
					{
						name: 'Get by ID',
						value: 'getById',
						description: 'Get institution by ID',
						action: 'Get institution by ID',
					},
				],
				default: 'search',
			},
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
						description: 'Get item information',
						action: 'Get item information',
					},
					{
						name: 'Remove',
						value: 'remove',
						description: 'Remove item connection',
						action: 'Remove item connection',
					},
				],
				default: 'get',
			},
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
						description: 'Get account owner information',
						action: 'Get account owner information',
					},
				],
				default: 'get',
			},
			// Access Token field
			{
				displayName: 'Access Token',
				name: 'accessToken',
				type: 'string',
				required: true,
				default: '',
				description: 'The Plaid access token for the user account',
			},
			// Date fields for transaction range
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
				required: true,
				description: 'Start date for transaction range (YYYY-MM-DD)',
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
				required: true,
				description: 'End date for transaction range (YYYY-MM-DD)',
			},
			// Cursor for sync
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
				description: 'Cursor for incremental sync (leave empty for initial sync)',
			},
			// Search query for institutions
			{
				displayName: 'Search Query',
				name: 'query',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['institution'],
						operation: ['search'],
					},
				},
				default: '',
				required: true,
				description: 'Search query for institutions',
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
				required: true,
				description: 'The institution ID to retrieve',
			},
			// Return all or limit
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['getRange'],
					},
				},
				default: false,
				description: 'Whether to return all results or only up to the limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['getRange'],
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get credentials
		const credentials = await this.getCredentials('plaidApi') as PlaidCredentials;
		
		// Create Plaid API helper
		const plaidApi = new PlaidApiHelper(credentials, this.helpers.httpRequest);

		// Get parameters
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: any;

				if (resource === 'transaction') {
					const accessToken = this.getNodeParameter('accessToken', i) as string;

					if (operation === 'getRange') {
						const startDate = this.getNodeParameter('startDate', i) as string;
						const endDate = this.getNodeParameter('endDate', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i) as boolean;
						const limit = returnAll ? 500 : (this.getNodeParameter('limit', i) as number);

						responseData = await plaidApi.getTransactions(accessToken, startDate, endDate, {
							count: limit,
						});

						// Return individual transactions
						for (const transaction of responseData.transactions) {
							returnData.push({
								json: transaction,
								pairedItem: { item: i },
							});
						}
						continue;

					} else if (operation === 'sync') {
						const cursor = this.getNodeParameter('cursor', i) as string || undefined;
						responseData = await plaidApi.syncTransactions(accessToken, cursor);

						// Return added transactions
						for (const transaction of responseData.added) {
							returnData.push({
								json: {
									...transaction,
									sync_status: 'added',
									next_cursor: responseData.next_cursor,
									has_next: responseData.has_next,
								},
								pairedItem: { item: i },
							});
						}

						// Return modified transactions
						for (const transaction of responseData.modified) {
							returnData.push({
								json: {
									...transaction,
									sync_status: 'modified',
									next_cursor: responseData.next_cursor,
									has_next: responseData.has_next,
								},
								pairedItem: { item: i },
							});
						}

						// Return removed transactions
						for (const transaction of responseData.removed) {
							returnData.push({
								json: {
									...transaction,
									sync_status: 'removed',
									next_cursor: responseData.next_cursor,
									has_next: responseData.has_next,
								},
								pairedItem: { item: i },
							});
						}
						continue;
					}

				} else if (resource === 'account') {
					const accessToken = this.getNodeParameter('accessToken', i) as string;

					if (operation === 'getAll') {
						responseData = await plaidApi.getAccounts(accessToken);
					} else if (operation === 'getBalances') {
						responseData = await plaidApi.getAccountBalances(accessToken);
					}

					// Return individual accounts
					for (const account of responseData.accounts) {
						returnData.push({
							json: account,
							pairedItem: { item: i },
						});
					}
					continue;

				} else if (resource === 'auth') {
					const accessToken = this.getNodeParameter('accessToken', i) as string;
					responseData = await plaidApi.getAuth(accessToken);

					// Return auth information for each account
					for (const authData of responseData.numbers.ach) {
						returnData.push({
							json: authData,
							pairedItem: { item: i },
						});
					}
					continue;

				} else if (resource === 'institution') {
					if (operation === 'search') {
						const query = this.getNodeParameter('query', i) as string;
						responseData = await plaidApi.searchInstitutions(query);

						// Return individual institutions
						for (const institution of responseData.institutions) {
							returnData.push({
								json: institution,
								pairedItem: { item: i },
							});
						}
						continue;

					} else if (operation === 'getById') {
						const institutionId = this.getNodeParameter('institutionId', i) as string;
						responseData = await plaidApi.getInstitutionById(institutionId);
					}

				} else if (resource === 'item') {
					const accessToken = this.getNodeParameter('accessToken', i) as string;

					if (operation === 'get') {
						responseData = await plaidApi.getItem(accessToken);
					} else if (operation === 'remove') {
						responseData = await plaidApi.removeItem(accessToken);
					}

				} else if (resource === 'identity') {
					const accessToken = this.getNodeParameter('accessToken', i) as string;
					responseData = await plaidApi.getIdentity(accessToken);

					// Return individual identity records
					if (responseData.identity && Array.isArray(responseData.identity)) {
						for (const identity of responseData.identity) {
							returnData.push({
								json: identity,
								pairedItem: { item: i },
							});
						}
					} else {
						// Fallback: return the entire response if identity array is not available
						returnData.push({
							json: responseData,
							pairedItem: { item: i },
						});
					}
					continue;
				}

				// Default return for operations that don't continue above
				returnData.push({
					json: responseData,
					pairedItem: { item: i },
				});

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: i },
					});
				} else {
					throw new NodeOperationError(this.getNode(), error instanceof Error ? error.message : String(error), { itemIndex: i });
				}
			}
		}

		return [returnData];
	}
}