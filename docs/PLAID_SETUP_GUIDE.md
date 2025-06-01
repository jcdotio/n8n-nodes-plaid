# 🏦 Complete Plaid Setup Guide for n8n

**Step-by-step instructions to connect Plaid financial data to your n8n workflows**

---

## 📋 **Overview**

This guide will walk you through setting up the **n8n-nodes-plaid** community node to access bank transactions, account data, and financial information in your n8n workflows.

**What you'll accomplish:**
- ✅ Create a Plaid developer account
- ✅ Get API credentials (Client ID, Secret, Access Tokens)
- ✅ Install the n8n-nodes-plaid package
- ✅ Configure credentials in n8n
- ✅ Test your first Plaid workflow

---

## 🚀 **Step 1: Create Plaid Developer Account**

### 1.1 Sign Up for Plaid
1. Go to **[Plaid Dashboard](https://dashboard.plaid.com/signup)**
2. Click **"Get API Keys"** or **"Sign Up"**
3. Fill out the registration form:
   - **Company Name**: Your company/project name
   - **Use Case**: Select appropriate option (e.g., "Personal Financial Management")
   - **Contact Information**: Your details

### 1.2 Verify Your Account
1. **Check your email** for verification link
2. **Complete phone verification** if required
3. **Log into** [Plaid Dashboard](https://dashboard.plaid.com/)

---

## 🔑 **Step 2: Get Your API Credentials**

### 2.1 Access Your Keys
1. In **Plaid Dashboard**, go to **"Team Settings"** → **"Keys"**
2. You'll see two environments:

#### **Sandbox Environment** (Testing)
```
Environment: sandbox
Client ID: 5f8e7d6c4b3a2e1f9g8h7i6j
Secret: 9b8c7d6e5f4a3b2c1d0e9f8g7h6i5j4k
```

#### **Production Environment** (Live)
```
Environment: production  
Client ID: (available after verification)
Secret: (available after verification)
```

### 2.2 Copy Your Credentials
**📝 Save these values - you'll need them for n8n:**
- ✅ **Client ID**
- ✅ **Secret Key**  
- ✅ **Environment** (sandbox or production)

---

## 📦 **Step 3: Install n8n-nodes-plaid**

### 3.1 Global Installation (Recommended)
```bash
npm install -g n8n-nodes-plaid
```

### 3.2 Alternative: Local Project Installation
```bash
# In your n8n project directory
npm install n8n-nodes-plaid
```

### 3.3 Verify Installation
```bash
npm list -g n8n-nodes-plaid
```

**Expected output:**
```
/usr/local/lib
└── n8n-nodes-plaid@1.0.2
```

---

## ⚙️ **Step 4: Configure n8n**

### 4.1 Set Community Package Environment Variable
```bash
export N8N_COMMUNITY_PACKAGES="n8n-nodes-plaid"
```

### 4.2 Start n8n
```bash
# Method 1: With environment variable
N8N_COMMUNITY_PACKAGES="n8n-nodes-plaid" npx n8n start

# Method 2: If variable is exported
npx n8n start
```

### 4.3 Verify Node is Available
1. **Open n8n** in browser: `http://localhost:5678`
2. **Create new workflow**
3. **Search for "Plaid"** in node list
4. **✅ Success**: You should see the Plaid node available

---

## 🔐 **Step 5: Create Plaid Credentials in n8n**

### 5.1 Add New Credential
1. **Click** the Plaid node in your workflow
2. **Click** "Credential to connect with" dropdown
3. **Select** "Create New" → "Plaid API"

### 5.2 Configure Credential Fields

#### **Basic Configuration**
```
Environment: Sandbox
Client ID: [Your Plaid Client ID]
Secret Key: [Your Plaid Secret Key]
Access Token: [Leave empty for now]
```

#### **Field Descriptions:**
- **Environment**: `Sandbox` for testing, `Production` for live data
- **Client ID**: From Plaid Dashboard → Team Settings → Keys
- **Secret Key**: From Plaid Dashboard → Team Settings → Keys  
- **Access Token**: User-specific token (we'll get this next)

### 5.3 Save Credential
1. **Name** your credential (e.g., "Plaid Sandbox")
2. **Click "Save"**

---

## 🔗 **Step 6: Get User Access Tokens**

**Access tokens connect to specific user bank accounts. You need these for most operations.**

### 6.1 For Testing: Use Sandbox Tokens

Plaid provides test access tokens for sandbox:

#### **Quick Test Token:**
```
access-sandbox-82671b1e-6671-4320-9e96-3f13d2b85e0a
```

### 6.2 For Production: Implement Plaid Link

For real users, implement [Plaid Link](https://plaid.com/docs/link/):

```html
<!-- Plaid Link Integration Example -->
<script src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"></script>
<script>
const handler = Plaid.create({
  token: 'link_token_from_your_backend',
  onSuccess: (public_token, metadata) => {
    // Exchange public_token for access_token via your backend
    fetch('/exchange_public_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_token })
    });
  }
});
</script>
```

### 6.3 Update Credential with Access Token
1. **Edit** your Plaid credential in n8n
2. **Add** the access token to "Access Token" field
3. **Save** credential

---

## 🧪 **Step 7: Test Your Setup**

### 7.1 Create Test Workflow

**Create this simple workflow:**
```
[Manual Trigger] → [Plaid Node] → [Edit Fields (Optional)] → [No Op]
```

### 7.2 Configure Plaid Node

#### **Test 1: Get Accounts**
```
Credential: [Your Plaid credential]
Resource: Account
Operation: Get All
```

#### **Test 2: Get Transactions**
```
Credential: [Your Plaid credential] 
Resource: Transaction
Operation: Sync
Cursor: (leave empty)
Return All: false
Limit: 10
```

### 7.3 Execute Test
1. **Click "Execute Node"** or **"Test workflow"**
2. **✅ Success**: You should see account/transaction data
3. **❌ Error**: See troubleshooting section below

---

## 📊 **Step 8: Understanding the Response Data**

### Account Data Example
```json
{
  "account_id": "blgvvBlXw3cq5GMPwqB6s6q4dLKB9WcVqGDGo",
  "balances": {
    "available": 1250.50,
    "current": 1300.75,
    "iso_currency_code": "USD"
  },
  "name": "Checking Account",
  "official_name": "My Primary Checking",
  "type": "depository",
  "subtype": "checking"
}
```

### Transaction Data Example  
```json
{
  "transaction_id": "yhnujmikJDFhsdfhs7dfkj73",
  "amount": -12.50,
  "date": "2024-05-31", 
  "merchant_name": "Starbucks",
  "category": ["Food and Drink", "Restaurants", "Coffee Shop"],
  "account_id": "blgvvBlXw3cq5GMPwqB6s6q4dLKB9WcVqGDGo"
}
```

---

## 🚨 **Troubleshooting**

### **❌ Node Not Found**
**Problem**: Can't find Plaid node in n8n

**Solutions:**
```bash
# 1. Verify global installation
npm list -g n8n-nodes-plaid

# 2. Restart n8n with community packages
N8N_COMMUNITY_PACKAGES="n8n-nodes-plaid" npx n8n start

# 3. Clear n8n cache
rm -rf ~/.n8n/.cache/
```

### **❌ Invalid Client ID**
**Problem**: "INVALID_CLIENT_ID" error

**Solutions:**
1. **Double-check** Client ID from Plaid Dashboard
2. **Verify** you're using correct environment (sandbox vs production)
3. **Copy-paste** credentials (avoid typing errors)

### **❌ Invalid Access Token**
**Problem**: "INVALID_ACCESS_TOKEN" error

**Solutions:**
1. **Check token format**: Should start with `access-sandbox-` or `access-production-`
2. **Verify environment match**: Sandbox tokens only work in sandbox
3. **Test with known good token**: `access-sandbox-82671b1e-6671-4320-9e96-3f13d2b85e0a`

### **❌ No Data Returned**
**Problem**: Node executes but returns empty data

**Solutions:**
1. **Check access token** has connected accounts
2. **Verify account has transactions** (try date range)
3. **Test different operations** (start with Account → Get All)

### **❌ Rate Limits**
**Problem**: "RATE_LIMIT_EXCEEDED" error

**Solutions:**
1. **Sandbox**: 100 requests/minute per client
2. **Add delays** between workflow executions
3. **Use pagination** instead of large data requests

---

## 🎯 **Next Steps & Advanced Usage**

### Production Deployment Checklist
- [ ] **Replace sandbox credentials** with production keys
- [ ] **Implement Plaid Link** for user onboarding
- [ ] **Set up webhook handling** for real-time updates
- [ ] **Add error handling** in workflows
- [ ] **Monitor API usage** and rate limits

### Advanced Workflow Examples

#### **Daily Transaction Sync**
```
[Schedule Trigger: Daily] → [Plaid: Transaction Sync] → [Filter New] → [Database Insert]
```

#### **Account Balance Monitoring**
```
[Schedule Trigger: Hourly] → [Plaid: Get Balances] → [Check Thresholds] → [Send Alert]
```

#### **Financial Reporting**
```
[Manual Trigger] → [Plaid: Date Range Transactions] → [Categorize] → [Generate Report] → [Email]
```

---

## 📚 **Resources**

### **Official Documentation**
- 📖 [Plaid API Documentation](https://plaid.com/docs/)
- 🔗 [Plaid Link Guide](https://plaid.com/docs/link/)
- 🏦 [Supported Institutions](https://plaid.com/docs/institutions/)

### **n8n Resources**
- 📘 [n8n Documentation](https://docs.n8n.io/)
- 🛠️ [Community Nodes Guide](https://docs.n8n.io/integrations/community-nodes/)
- 💬 [n8n Community Forum](https://community.n8n.io/)

### **Support**
- 🐛 [Report Issues](https://github.com/jcdotio/n8n-nodes-plaid/issues)
- 💬 [Discussions](https://github.com/jcdotio/n8n-nodes-plaid/discussions)
- 📧 [Contact Developer](mailto:jc@jc.io)

---

## ⚡ **Quick Reference Commands**

```bash
# Install node
npm install -g n8n-nodes-plaid

# Start n8n with community nodes
N8N_COMMUNITY_PACKAGES="n8n-nodes-plaid" npx n8n start

# Check installation
npm list -g n8n-nodes-plaid

# Update to latest version
npm update -g n8n-nodes-plaid
```

---

**🎉 Congratulations! You're now ready to build powerful financial workflows with Plaid and n8n!**

For additional help, check the [GitHub repository](https://github.com/jcdotio/n8n-nodes-plaid) or reach out to the community. 