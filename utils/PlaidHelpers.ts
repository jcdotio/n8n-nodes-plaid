import { PlaidEnvironments, Products } from 'plaid';
import { PlaidApi } from 'plaid';

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

/**
 * Create a Link token for Plaid Link initialization
 */
export async function createLinkToken(
  client: PlaidApi,
  credentials: any,
  userId: string = 'default_user',
  products: string[] = ['transactions', 'auth']
): Promise<string> {
  const countryCodes = credentials.countryCodes 
    ? credentials.countryCodes.split(',').map((code: string) => code.trim())
    : ['US'];

  // Convert string products to Products enum
  const plaidProducts: Products[] = products.map(product => {
    switch (product.toLowerCase()) {
      case 'transactions': return Products.Transactions;
      case 'auth': return Products.Auth;
      case 'identity': return Products.Identity;
      case 'assets': return Products.Assets;
      case 'investments': return Products.Investments;
      case 'liabilities': return Products.Liabilities;
      default: return Products.Transactions;
    }
  });

  const request = {
    client_name: credentials.clientName || 'n8n Plaid Integration',
    country_codes: countryCodes,
    language: credentials.language || 'en',
    user: {
      client_user_id: userId,
    },
    products: plaidProducts,
  };

  const response = await client.linkTokenCreate(request);
  return response.data.link_token;
}

/**
 * Exchange a public token for an access token
 */
export async function exchangePublicToken(
  client: PlaidApi,
  publicToken: string
): Promise<{ accessToken: string; itemId: string }> {
  const request = {
    public_token: publicToken,
  };

  const response = await client.itemPublicTokenExchange(request);
  return {
    accessToken: response.data.access_token,
    itemId: response.data.item_id,
  };
}

/**
 * Get the appropriate access token based on authentication method
 */
export async function getAccessToken(
  client: PlaidApi,
  credentials: any
): Promise<string> {
  const authMethod = credentials.authMethod || 'accessToken';

  switch (authMethod) {
    case 'accessToken':
      if (!credentials.accessToken) {
        throw new Error('Access token is required for legacy authentication method');
      }
      return credentials.accessToken as string;

    case 'publicToken':
      if (!credentials.publicToken) {
        throw new Error('Public token is required for public token exchange method');
      }
      const { accessToken } = await exchangePublicToken(client, credentials.publicToken as string);
      return accessToken;

    case 'clientOnly':
      throw new Error('Access token not available for client-only authentication method');

    default:
      throw new Error(`Unknown authentication method: ${authMethod}`);
  }
}

/**
 * Check if operation requires access token
 */
export function requiresAccessToken(resource: string, operation: string): boolean {
  // Operations that don't require access token (only client credentials)
  const noTokenOperations = [
    { resource: 'link', operation: 'createToken' },
    { resource: 'link', operation: 'exchangeToken' },
    { resource: 'institution', operation: 'search' },
    { resource: 'institution', operation: 'getById' },
  ];

  return !noTokenOperations.some(
    op => op.resource === resource && op.operation === operation
  );
} 