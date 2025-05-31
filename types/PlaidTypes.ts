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