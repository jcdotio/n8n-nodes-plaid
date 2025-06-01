// n8n-nodes-plaid - This package is configured via package.json n8n section

// Export statement for n8n to discover our nodes and credentials
module.exports = {
	nodes: [
		'./dist/nodes/Plaid/Plaid.node.js'
	],
	credentials: [
		'./dist/credentials/PlaidApi.credentials.js'
	]
};
