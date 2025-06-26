#!/usr/bin/env node

/**
 * Get Test Access Token for Plaid Sandbox
 * 
 * This script helps you get test access tokens for development and testing
 * without needing the full Plaid Link flow.
 * 
 * Usage:
 *   node scripts/get-test-access-token.js
 *   node scripts/get-test-access-token.js ins_3  # Specific institution
 * 
 * Environment Variables:
 *   PLAID_CLIENT_ID - Your Plaid client ID
 *   PLAID_SECRET - Your Plaid secret key
 */

const https = require('https');

// Default test institution IDs for different banks
const TEST_INSTITUTIONS = {
  'ins_3': 'Chase',
  'ins_4': 'Bank of America', 
  'ins_5': 'Wells Fargo',
  'ins_6': 'Citibank',
  'ins_7': 'Capital One',
  'ins_109508': 'First Republic Bank',
  'ins_109509': 'Tartan Bank'
};

// Get credentials from environment or prompt
const CLIENT_ID = process.env.PLAID_CLIENT_ID;
const SECRET = process.env.PLAID_SECRET;
const INSTITUTION_ID = process.argv[2] || 'ins_109509'; // Default to Tartan Bank

if (!CLIENT_ID || !SECRET) {
  console.error('❌ Missing credentials!');
  console.error('');
  console.error('Please set environment variables:');
  console.error('  export PLAID_CLIENT_ID=your_sandbox_client_id');
  console.error('  export PLAID_SECRET=your_sandbox_secret');
  console.error('');
  console.error('Get these from: https://dashboard.plaid.com/team/keys');
  process.exit(1);
}

console.log('🏦 Plaid Test Access Token Generator');
console.log('=====================================');
console.log('');
console.log(`Using institution: ${TEST_INSTITUTIONS[INSTITUTION_ID] || INSTITUTION_ID}`);
console.log('Environment: Sandbox');
console.log('');

/**
 * Make HTTPS request to Plaid API
 */
function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      ...data,
      client_id: CLIENT_ID,
      secret: SECRET
    });

    const options = {
      hostname: 'sandbox.plaid.com',
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Plaid-Version': '2020-09-14'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.error_message || data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Create a Link Token
 */
async function createLinkToken() {
  console.log('📝 Step 1: Creating Link Token...');
  
  try {
    const response = await makeRequest('/link/token/create', {
      user: {
        client_user_id: 'test_user_' + Date.now()
      },
      client_name: 'n8n Plaid Test',
      products: ['transactions', 'auth'],
      country_codes: ['US'],
      language: 'en'
    });

    console.log('✅ Link token created successfully');
    return response.link_token;
  } catch (error) {
    console.error('❌ Failed to create link token:', error.message);
    throw error;
  }
}

/**
 * Create a test public token (sandbox only)
 */
async function createPublicToken(linkToken) {
  console.log('🔗 Step 2: Creating Public Token...');
  
  try {
    const response = await makeRequest('/sandbox/public_token/create', {
      institution_id: INSTITUTION_ID,
      initial_products: ['transactions', 'auth'],
      options: {
        webhook: null
      }
    });

    console.log('✅ Public token created successfully');
    return response.public_token;
  } catch (error) {
    console.error('❌ Failed to create public token:', error.message);
    throw error;
  }
}

/**
 * Exchange public token for access token
 */
async function exchangeToken(publicToken) {
  console.log('🔄 Step 3: Exchanging for Access Token...');
  
  try {
    const response = await makeRequest('/item/public_token/exchange', {
      public_token: publicToken
    });

    console.log('✅ Access token created successfully');
    return {
      access_token: response.access_token,
      item_id: response.item_id
    };
  } catch (error) {
    console.error('❌ Failed to exchange token:', error.message);
    throw error;
  }
}

/**
 * Test the access token by getting accounts
 */
async function testAccessToken(accessToken) {
  console.log('🧪 Step 4: Testing Access Token...');
  
  try {
    const response = await makeRequest('/accounts/get', {
      access_token: accessToken
    });

    console.log('✅ Access token works! Found', response.accounts.length, 'accounts');
    return response.accounts;
  } catch (error) {
    console.error('❌ Failed to test access token:', error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Create link token
    const linkToken = await createLinkToken();
    
    // Step 2: Create public token (sandbox shortcut)
    const publicToken = await createPublicToken(linkToken);
    
    // Step 3: Exchange for access token
    const { access_token, item_id } = await exchangeToken(publicToken);
    
    // Step 4: Test the access token
    const accounts = await testAccessToken(access_token);
    
    // Success! Show results
    console.log('');
    console.log('🎉 SUCCESS! Your test tokens are ready:');
    console.log('==========================================');
    console.log('');
    console.log('🔗 LINK TOKEN:');
    console.log(`   ${linkToken}`);
    console.log('   ⏱️  Expires in: 4 hours');
    console.log('   📝 Use this to initialize Plaid Link in your frontend');
    console.log('');
    console.log('🔑 PUBLIC TOKEN:');
    console.log(`   ${publicToken}`);
    console.log('   ⏱️  Expires in: 30 minutes');
    console.log('   📝 This is what Plaid Link returns after user authentication');
    console.log('');
    console.log('🎯 ACCESS TOKEN:');
    console.log(`   ${access_token}`);
    console.log('   ⏱️  Permanent (until revoked)');
    console.log('   📝 Use this for all Plaid API operations in n8n');
    console.log('');
    console.log('📋 ITEM ID:');
    console.log(`   ${item_id}`);
    console.log('   📝 Unique identifier for this connected account');
    console.log('');
    console.log('📊 TEST ACCOUNTS:');
    accounts.forEach((account, index) => {
      console.log(`   ${index + 1}. ${account.name} (${account.subtype})`);
      console.log(`      Account ID: ${account.account_id}`);
      console.log(`      Balance: $${account.balances.current || 0}`);
    });
    console.log('');
    console.log('🔄 TOKEN FLOW EXPLANATION:');
    console.log('   Link Token   → Initialize Plaid Link UI');
    console.log('   Public Token → Temporary token from successful auth');
    console.log('   Access Token → Permanent token for API operations');
    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('   1. For n8n: Copy the ACCESS TOKEN above');
    console.log('   2. For frontend: Use the LINK TOKEN to initialize Plaid Link');
    console.log('   3. For backend: Exchange PUBLIC TOKEN for ACCESS TOKEN');
    console.log('   4. Test with transaction sync or account operations');
    console.log('');
    console.log('💡 QUICK n8n TEST:');
    console.log('   • Add Plaid node to workflow');
    console.log('   • Set operation: Transaction → Sync');
    console.log(`   • Access Token: ${access_token}`);
    console.log('   • Click "Execute Node" ✨');
    
  } catch (error) {
    console.error('');
    console.error('💥 FAILED:', error.message);
    console.error('');
    console.error('🔧 TROUBLESHOOTING:');
    console.error('   1. Check your PLAID_CLIENT_ID and PLAID_SECRET');
    console.error('   2. Make sure you\'re using sandbox credentials');
    console.error('   3. Verify your Plaid dashboard access');
    console.error('');
    process.exit(1);
  }
}

// Show available institutions if requested
if (process.argv[2] === '--list' || process.argv[2] === '-l') {
  console.log('Available test institutions:');
  console.log('============================');
  Object.entries(TEST_INSTITUTIONS).forEach(([id, name]) => {
    console.log(`  ${id}: ${name}`);
  });
  console.log('');
  console.log('Usage: node scripts/get-test-access-token.js [institution_id]');
  process.exit(0);
}

// Run the script
main(); 