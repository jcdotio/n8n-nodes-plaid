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
