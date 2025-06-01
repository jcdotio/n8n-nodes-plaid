# n8n Local Development Setup Guide

## 🎯 Connect Your Local n8n-nodes-plaid to n8n

There are several ways to test your community node locally. Here's the complete guide:

---

## Method 1: 🔗 **npm link** (Recommended for Development)

### Step 1: Prepare Your Node
```bash
# In your n8n-nodes-plaid directory
cd ~/src/n8n-nodes-plaid

# Build the project
npm run build

# Create global npm link
npm link
```

### Step 2: Set Up Local n8n Instance
```bash
# Create a new directory for n8n testing
mkdir ~/n8n-test && cd ~/n8n-test

# Install n8n locally
npm init -y
npm install n8n

# Link your node to this n8n instance
npm link n8n-nodes-plaid
```

### Step 3: Start n8n
```bash
# Start n8n with your linked node
npx n8n start

# n8n will run at http://localhost:5678
```

### Step 4: Verify Installation
1. Open http://localhost:5678
2. Create a new workflow
3. Click the **+ Add Node** button
4. Search for **"Plaid"** - you should see your node!

---

## Method 2: 🐳 **Docker with Volume Mount**

### Step 1: Create Docker Setup
```bash
# In your n8n-nodes-plaid directory
npm run build

# Create custom Dockerfile
cat > Dockerfile << 'EOF'
FROM n8nio/n8n:latest

# Copy your built node
COPY dist/ /home/node/.n8n/custom/

# Install node dependencies
USER root
RUN npm install -g n8n-nodes-plaid
USER node
EOF
```

### Step 2: Build and Run
```bash
# Build custom n8n image
docker build -t n8n-with-plaid .

# Run with your node
docker run -it --rm \
  --name n8n-plaid-test \
  -p 5678:5678 \
  -e N8N_CUSTOM_EXTENSIONS="/home/node/.n8n/custom" \
  n8n-with-plaid
```

---

## Method 3: 📦 **Copy to n8n Custom Directory**

### Step 1: Find n8n Directory
```bash
# Find your n8n home directory
echo $N8N_USER_FOLDER
# or
find ~ -name ".n8n" -type d
```

### Step 2: Copy Built Files
```bash
# Build your node
cd ~/src/n8n-nodes-plaid
npm run build

# Copy to n8n custom directory
mkdir -p ~/.n8n/custom
cp -r dist/* ~/.n8n/custom/
```

### Step 3: Restart n8n
```bash
# If n8n is running globally
n8n start

# If n8n is running via npm
npx n8n start
```

---

## Method 4: 🏗️ **Development with n8n Source Code**

### Step 1: Clone n8n Repository
```bash
# Clone n8n for development
git clone https://github.com/n8n-io/n8n.git
cd n8n

# Install dependencies
npm install
```

### Step 2: Link Your Node
```bash
# In n8n directory
npm link n8n-nodes-plaid

# Start n8n in dev mode
npm run dev
```

---

## 🔧 **Troubleshooting Common Issues**

### Issue: "Node not found"
```bash
# Check if link exists
ls -la $(npm root -g)/n8n-nodes-plaid

# Re-link if needed
cd ~/src/n8n-nodes-plaid
npm unlink
npm link

# In n8n directory
npm link n8n-nodes-plaid
```

### Issue: "Build errors"
```bash
# Clear and rebuild
cd ~/src/n8n-nodes-plaid
rm -rf dist node_modules
npm install
npm run build
```

### Issue: "Credentials not working"
```bash
# Check file structure in dist/
ls -la dist/
ls -la dist/credentials/
ls -la dist/nodes/

# Verify package.json n8n config
cat package.json | grep -A 10 '"n8n"'
```

### Issue: "TypeScript errors"
```bash
# Install missing dependencies
npm install n8n-workflow --save-peer

# Check TypeScript config
npx tsc --noEmit
```

---

## 🎯 **Quick Test Workflow**

Once your node is connected, create this test workflow:

### Test Workflow Setup
1. **Add Manual Trigger**: Click + → Triggers → Manual Trigger
2. **Add Your Plaid Node**: Click + → Search "Plaid" → Add
3. **Configure Plaid Node**:
   - Resource: Institution
   - Operation: Search
   - Search Query: "Chase"
   - Country: US
4. **Add Credentials**: Click "Select Credential" → Create new Plaid API credential
5. **Test**: Click "Test workflow"

### Expected Results
```json
{
  "institution_id": "ins_3",
  "name": "Chase",
  "products": ["transactions", "auth", "identity"],
  "country_codes": ["US"],
  "url": "https://www.chase.com/",
  "primary_color": "#005a5b",
  "logo": "iVBORw0KGgoAAAANSUhEUgAAA...",
  "source": "plaid_institutions",
  "processed_at": "2024-01-15T10:30:00.000Z"
}
```

---

## 🚀 **Development Workflow**

### Live Development Loop
```bash
# Terminal 1: Watch for changes
cd ~/src/n8n-nodes-plaid
npm run dev  # This runs tsc --watch

# Terminal 2: Run n8n
cd ~/n8n-test
npx n8n start

# When you make changes:
# 1. Save your TypeScript files
# 2. tsc --watch automatically rebuilds
# 3. Restart n8n to see changes
```

### Testing Different Scenarios
```bash
# Test different operations
# 1. Institution search
# 2. Account operations (need access token)
# 3. Transaction operations (need access token)
# 4. Error handling (invalid credentials)
```

---

## 🔑 **Getting Test Credentials**

### Step 1: Sign up for Plaid
1. Go to https://dashboard.plaid.com
2. Sign up for free developer account
3. Get your sandbox credentials:
   - Client ID: `your_client_id`
   - Secret: `your_secret_key`

### Step 2: Get Access Token
You need to implement Plaid Link to get user access tokens. For testing, use Plaid's Quickstart:

```bash
# Clone Plaid Quickstart
git clone https://github.com/plaid/quickstart.git
cd quickstart

# Follow setup to get test access token
# Use sandbox credentials: user_good / pass_good
```

### Step 3: Test Credentials in n8n
```json
{
  "environment": "sandbox",
  "clientId": "your_client_id", 
  "secret": "your_secret_key",
  "accessToken": "access-sandbox-abc123..."
}
```

---

## 📋 **Development Checklist**

### ✅ Node Setup
- [ ] npm link created successfully
- [ ] n8n instance running locally
- [ ] Node appears in n8n node list
- [ ] No console errors when adding node

### ✅ Credentials Test
- [ ] Plaid API credentials configured
- [ ] Institution search works
- [ ] Proper error messages for invalid credentials

### ✅ Operations Test
- [ ] Institution search returns results
- [ ] Account operations work (with access token)
- [ ] Transaction operations work (with access token)
- [ ] Error handling displays user-friendly messages

### ✅ Data Verification
- [ ] Response data structure is correct
- [ ] Enhanced fields are populated
- [ ] Metadata fields included
- [ ] Proper pairedItem structure

---

## 🎯 **Next Steps After Local Testing**

### 1. Publish Alpha Version
```bash
# Update version
npm version 1.0.0-alpha.1

# Publish to npm
npm publish --tag alpha
```

### 2. Test Published Version
```bash
# Install from npm
npm install n8n-nodes-plaid@alpha
```

### 3. Submit for n8n Verification
- Follow n8n community node guidelines
- Submit to n8n team for review
- Get featured in n8n marketplace

---

## 💡 **Pro Tips**

### Development Efficiency
- Use `npm run dev` for auto-rebuild
- Keep n8n running and refresh workflows
- Use n8n's "Execute Node" for quick testing
- Check browser console for errors

### Debugging
- Add console.log in your node code
- Check n8n logs: `~/.n8n/logs/`
- Use n8n's "Copy execution data" feature
- Test with minimal workflows first

### Performance
- Test with large transaction datasets
- Verify memory usage doesn't spike
- Check API response times
- Ensure proper error recovery

**Your node should now be connected and testable in n8n!** 🚀

Let me know which method works best for you or if you run into any issues!