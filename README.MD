# n8n-nodes-plaid
[![Tests](https://img.shields.io/badge/tests-55%2F55%20passing-brightgreen)](https://github.com/jcdotio/n8n-nodes-plaid/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)](https://github.com/jcdotio/n8n-nodes-plaid/actions/workflows/test.yml)
The definitive Plaid financial integration node for n8n

## 🚨 **Important Update: Modern Authentication Flow**

**Version 2.0+ now supports the modern Plaid authentication flow!** 

### **What Changed**
- ✅ **Added Link Token creation** for proper Plaid Link flow
- ✅ **Removed access_token from credentials** (access tokens are now per-operation)
- ✅ **Enhanced documentation** with step-by-step authentication guide
- ✅ **Test token generator** for easy development setup

### **Migration Guide**
If you're upgrading from v1.x:
1. **Update your credentials** - remove access token, keep Client ID and Secret
2. **Use Link Token operations** to start authentication flows
3. **Pass access tokens per operation** instead of storing in credentials

---

## 🎯 **Quick Start**

### 1. **Install the Node**
```bash
# Via n8n Community Nodes
# Go to Settings → Community Nodes → Install: n8n-nodes-plaid

# Or via npm
npm install n8n-nodes-plaid
```

### 2. **Get Plaid Credentials**
1. Sign up at [Plaid Dashboard](https://dashboard.plaid.com)
2. Get your credentials:
   - **Client ID**
   - **Secret Key** 
   - **Environment**: `sandbox` (for testing) or `production`

### 3. **Set Up n8n Credentials**
1. Go to **Settings → Credentials → Add Credential**
2. Select **Plaid API**
3. Fill in:
   - **Environment**: `sandbox` (for testing)
   - **Client ID**: Your Plaid Client ID
   - **Secret**: Your Plaid Secret Key
   - ⚠️ **No access token needed** - these are handled per operation now!

---

## 🔐 **Understanding Plaid's Authentication Flow**

### **The Modern Way (2024+)**
Plaid uses a secure multi-step authentication flow:

```
1. Your App → Create Link Token (n8n)
2. User → Complete Plaid Link UI (your frontend)  
3. User → Gets Public Token (your frontend)
4. Your App → Exchange Public Token for Access Token (your backend)
5. Your App → Use Access Token in n8n operations
```

### **What Each Token Does**
- **🔗 Link Token**: Short-lived (4 hours) token to initialize Plaid Link UI
- **🔑 Public Token**: Temporary token from user completing authentication
- **🎯 Access Token**: Permanent token for API calls (what n8n operations need)

---

## 🚀 **Step-by-Step Usage Guide**

### **Step 1: Create Link Token (n8n)**
```json
{
  "node": "Plaid",
  "resource": "Link Token", 
  "operation": "Create",
  "userId": "user_12345",
  "clientName": "My Financial App",
  "products": ["transactions", "auth"],
  "countryCodes": ["US"]
}
```

**Output**: 
```json
{
  "link_token": "link-sandbox-abc123...",
  "expiration": "2024-01-15T14:30:00Z",
  "instructions": {
    "next_steps": [
      "1. Use this link_token to initialize Plaid Link in your frontend",
      "2. User completes authentication in Plaid Link UI", 
      "3. Plaid Link returns a public_token",
      "4. Exchange public_token for access_token",
      "5. Use access_token in other n8n Plaid operations"
    ]
  }
}
```

### **Step 2: Implement Plaid Link (Your Frontend)**
```html
<!-- Include Plaid Link SDK -->
<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>

<script>
const handler = Plaid.create({
  token: 'link-sandbox-abc123...', // from n8n Step 1
  onSuccess: function(public_token, metadata) {
    // Send public_token to your backend
    console.log('Public token:', public_token);
    // Next: exchange this for access_token
  },
  onExit: function(err, metadata) {
    console.log('User exited Link flow');
  }
});

// Open Plaid Link when user clicks connect button
document.getElementById('connect-button').onclick = function() {
  handler.open();
};
</script>
```

### **Step 3: Exchange Tokens (Your Backend)**
```javascript
// Your backend API endpoint
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const client = new PlaidApi(new Configuration({
  basePath: PlaidEnvironments.sandbox, // or production
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': 'your_client_id',
      'PLAID-SECRET': 'your_secret',
    },
  },
}));

// Exchange public_token for access_token
const response = await client.itemPublicTokenExchange({
  public_token: public_token_from_frontend
});

const access_token = response.data.access_token;
// Store this access_token securely - you'll use it in n8n operations
```

### **Step 4: Use Access Token in n8n Operations**
```json
{
  "node": "Plaid",
  "resource": "Transaction",
  "operation": "Sync", 
  "accessToken": "access-sandbox-xyz789..." // from Step 3
}
```

---

## 🧪 **For Development: Get Test Access Tokens**

We've included a helper script to generate test access tokens for development:

### **Quick Test Token**
```bash
# Set your sandbox credentials
export PLAID_CLIENT_ID=your_sandbox_client_id
export PLAID_SECRET=your_sandbox_secret

# Generate test access token
node scripts/get-test-access-token.js

# Output: access-sandbox-abc123... (use this in n8n)
```

### **Different Test Banks**
```bash
node scripts/get-test-access-token.js ins_3  # Chase
node scripts/get-test-access-token.js ins_4  # Bank of America  
node scripts/get-test-access-token.js ins_5  # Wells Fargo
```

This bypasses the Link UI and gives you test access tokens for immediate n8n testing.

---

## 📋 **Complete Operations Reference**

### **🔗 Link Token Operations** (No access token needed)
| Operation | Description | Use Case |
|-----------|-------------|----------|
| **Create** | Create link token for Plaid Link | Start user authentication flow |

### **🏦 Institution Operations** (No access token needed)  
| Operation | Description | Use Case |
|-----------|-------------|----------|
| **Search** | Find financial institutions | Let users search for their bank |
| **Get by ID** | Get institution details | Display bank information |

### **💰 Account Operations** (Requires access token)
| Operation | Description | Use Case |
|-----------|-------------|----------|
| **Get All** | Get connected accounts | Display user's accounts |
| **Get Balances** | Get real-time balances | Show current balances |

### **💳 Transaction Operations** (Requires access token)
| Operation | Description | Use Case |
|-----------|-------------|----------|
| **Sync** | Get new/updated transactions | Real-time transaction updates |
| **Get Range** | Get transactions in date range | Historical transaction analysis |

### **🔐 Auth Operations** (Requires access token)
| Operation |