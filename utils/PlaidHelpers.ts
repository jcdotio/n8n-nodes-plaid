export class PlaidHelpers {
  /**
   * Get Plaid environment URL
   */
  static getEnvironmentUrl(environment: string): string {
    return environment === 'production' 
      ? 'https://production.plaid.com'
      : 'https://sandbox.plaid.com';
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