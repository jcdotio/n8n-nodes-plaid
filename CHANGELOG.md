# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added
- Initial release of n8n-nodes-plaid
- Complete Plaid API integration using latest Node.js SDK v34.0.0
- Support for Transactions (sync and get operations)
- Support for Accounts (get all and balances)
- Support for Auth (routing and account numbers)
- Support for Institutions (search and get by ID)
- Support for Items (get and remove)
- Support for Identity (get owner information)
- Enhanced transaction processing with categorization
- Spending score calculation
- Recurring transaction detection
- Comprehensive error handling
- Production-ready security practices
- Extensive documentation and examples

### Security
- Encrypted credential storage
- Environment isolation (Sandbox vs Production)
- Proper API key handling
- Rate limiting compliance

### Documentation
- Complete README with setup instructions
- Example workflows for common use cases
- Troubleshooting guide
- Migration guide from HTTP Request nodes

## [Unreleased]

### Planned
- Webhook trigger node for real-time events
- Investment accounts support
- Liabilities data integration
- Enhanced analytics and reporting 