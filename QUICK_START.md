# ⚡ Plaid n8n Node - Quick Start

**Get your Plaid node running in n8n in 10 minutes**

## 🚀 **1. Install**
```bash
npm install -g n8n-nodes-plaid
```

## 🔑 **2. Get Plaid Credentials**
1. Sign up at [Plaid Dashboard](https://dashboard.plaid.com/signup)
2. Go to **Team Settings** → **Keys**
3. Copy your **Client ID** and **Secret**

## ⚙️ **3. Start n8n**
```bash
N8N_COMMUNITY_PACKAGES="n8n-nodes-plaid" npx n8n start
```

## 🔐 **4. Configure Credentials**
1. Add **Plaid node** to workflow
2. Create **new credential**:
   ```
   Environment: Sandbox
   Client ID: [your_client_id]
   Secret Key: [your_secret]  
   Access Token: access-sandbox-xxx-xxx-xxx-xxx-xxx
   ```

## 🧪 **5. Test**
Configure node:
```
Resource: Account
Operation: Get All
```

Click **"Execute Node"** → You should see account data! ✅

## 📚 **Full Setup Guide**
See `docs/PLAID_SETUP_GUIDE.md` for complete instructions.

## 🆘 **Need Help?**
- 🐛 [Issues](https://github.com/jcdotio/n8n-nodes-plaid/issues)
- 📧 [Contact](mailto:jc@jc.io) 