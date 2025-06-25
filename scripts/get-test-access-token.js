#!/usr/bin/env node

/**
 * Plaid Test Access Token Generator
 * 
 * This script helps developers get sandbox access tokens for testing
 * their n8n-nodes-plaid integration without going through the full
 * Plaid Link flow.
 * 
 * Usage:
 * 1. Get your sandbox credentials from https://dashboard.plaid.com
 * 2. Set environment variables or edit the config below
 * 3. Run: node scripts/get-test-access-token.js
 */

require('dotenv').config();

const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require('plaid');

// Configuration - you can set these via environment variables or edit directly
const config = {
  clientId: process.env.PLAID_CLIENT_ID || 'YOUR_SANDBOX_CLIENT_ID',
  secret: process.env.PLAID_SECRET || 'YOUR_SANDBOX_SECRET',
  environment: 'sandbox', // Always use sandbox for testing
};

const INSTITUTIONS = {
  chase: 'ins_3',
  bofa: 'ins_4', 
  wells_fargo: 'ins_5',
  citi: 'ins_6',
  capital_one: 'ins_7',
  pnc: 'ins_8',
};

async function generateTestAccessToken(institutionId = 'ins_3') {
  console.log('🚀 Plaid Test Access Token Generator');
  console.log('═'.repeat(50));
  
  if (config.clientId === 'YOUR_SANDBOX_CLIENT_ID') {
    console.log('❌ Please set your Plaid credentials first!');
    console.log('');
    console.log('Option 1: Set environment variables:');
    console.log('  export PLAID_CLIENT_ID=your_sandbox_client_id');
    console.log('  export PLAID_SECRET=your_sandbox_secret');
    console.log('');
    console.log('Option 2: Edit this script and replace the config values');
    console.log('');
    console.log('Get your credentials at: https://dashboard.plaid.com');
    process.exit(1);
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': config.clientId,
        'PLAID-SECRET': config.secret,
      },
    },
  });

  const client = new PlaidApi(configuration);

  try {
    console.log('🔗 Step 1: Creating link token...');
    
    // Step 1: Create a link token
    const linkTokenResponse = await client.linkTokenCreate({
      user: {
        client_user_id: `test-user-${Date.now()}`
      },
      client_name: 'n8n Plaid Test',
      products: [Products.Transactions, Products.Auth],
      country_codes: [CountryCode.Us],
      language: 'en'
    });
    
    console.log('✅ Link token created:', linkTokenResponse.data.link_token);
    console.log('⏰ Expires at:', linkTokenResponse.data.expiration);
    
    console.log('');
    console.log('🏦 Step 2: Creating test public token...');
    console.log(`   Using institution: ${institutionId} (${getInstitutionName(institutionId)})`);
    
    // Step 2: Create test public token (bypasses Plaid Link UI - sandbox only)
    const publicTokenResponse = await client.sandboxPublicTokenCreate({
      institution_id: institutionId,
      initial_products: [Products.Transactions, Products.Auth]
    });
    
    console.log('✅ Public token created:', publicTokenResponse.data.public_token);
    
    console.log('');
    console.log('🔑 Step 3: Exchanging for access token...');
    
    // Step 3: Exchange public token for access token
    const exchangeResponse = await client.itemPublicTokenExchange({
      public_token: publicTokenResponse.data.public_token
    });
    
    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;
    
    console.log('✅ Access token created!');
    console.log('📋 Item ID:', itemId);
    
    console.log('');
    console.log('🎯 SUCCESS! Here\'s your test access token:');
    console.log('═'.repeat(60));
    console.log('ACCESS TOKEN:', accessToken);
    console.log('═'.repeat(60));
    
    console.log('');
    console.log('🧪 Testing the access token...');
    
    // Test the access token
    const accountsResponse = await client.accountsGet({
      access_token: accessToken
    });
    
    console.log('✅ Test successful! Found', accountsResponse.data.accounts.length, 'test accounts:');
    
    accountsResponse.data.accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.name} (${account.subtype})`);
      console.log(`     Balance: $${account.balances.current || 'N/A'}`);
      console.log(`     Account ID: ${account.account_id}`);
    });
    
    console.log('');
    console.log('📝 How to use this in n8n:');
    console.log('1. Go to n8n Settings → Credentials');
    console.log('2. Create new Plaid API credential');
    console.log('3. Set Environment: Sandbox');
    console.log('4. Enter your Client ID and Secret');
    console.log('5. In your Plaid node, paste the access token above');
    
    console.log('');
    console.log('🔄 Want a different bank? Run with:');
    Object.entries(INSTITUTIONS).forEach(([name, id]) => {
      console.log(`   node scripts/get-test-access-token.js ${id}  # ${name}`);
    });
    
    return {
      accessToken,
      itemId,
      linkToken: linkTokenResponse.data.link_token,
      publicToken: publicTokenResponse.data.public_token,
      accounts: accountsResponse.data.accounts.length
    };
    
  } catch (error) {
    console.error('');
    console.error('❌ Error generating access token:');
    console.error('Message:', error.message);
    
    if (error.response && error.response.data) {
      console.error('Plaid Error Details:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.error_code === 'INVALID_CREDENTIALS') {
        console.error('');
        console.error('💡 This usually means:');
        console.error('   - Your Client ID or Secret is incorrect');
        console.error('   - You\'re using production credentials in sandbox');
        console.error('   - Check your credentials at https://dashboard.plaid.com');
      }
    }
    
    throw error;
  }
}

function getInstitutionName(institutionId) {
  const institutionNames = {
    'ins_3': 'Chase',
    'ins_4': 'Bank of America', 
    'ins_5': 'Wells Fargo',
    'ins_6': 'Citibank',
    'ins_7': 'Capital One',
    'ins_8': 'PNC Bank',
  };
  return institutionNames[institutionId] || 'Unknown Institution';
}

// CLI usage
if (require.main === module) {
  const institutionId = process.argv[2] || 'ins_3';
  
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('Usage: node get-test-access-token.js [institution_id]');
    console.log('');
    console.log('Available institutions:');
    Object.entries(INSTITUTIONS).forEach(([name, id]) => {
      console.log(`  ${id} - ${name}`);
    });
    process.exit(0);
  }
  
  generateTestAccessToken(institutionId)
    .then(() => {
      console.log('');
      console.log('🎉 Done! Your access token is ready for n8n testing.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('');
      console.error('💥 Failed to generate access token');
      process.exit(1);
    });
}

module.exports = { generateTestAccessToken };