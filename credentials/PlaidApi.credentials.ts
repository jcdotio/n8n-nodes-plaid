import {
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class PlaidApi implements ICredentialType {
  name = 'plaidApi';
  displayName = 'Plaid API';
  documentationUrl = 'https://plaid.com/docs/';
  properties: INodeProperties[] = [
    {
      displayName: 'Environment',
      name: 'environment',
      type: 'options',
      options: [
        {
          name: 'Sandbox',
          value: 'sandbox',
          description: 'Test environment with mock data',
        },
        {
          name: 'Production',
          value: 'production',
          description: 'Live environment with real financial data',
        },
      ],
      default: 'sandbox',
      description: 'The Plaid environment to use',
    },
    {
      displayName: 'Client ID',
      name: 'clientId',
      type: 'string',
      required: true,
      default: '',
      description: 'Your Plaid Client ID from the Plaid Dashboard',
    },
    {
      displayName: 'Secret Key',
      name: 'secret',
      type: 'string',
      typeOptions: { password: true },
      required: true,
      default: '',
      description: 'Your Plaid Secret Key from the Plaid Dashboard',
    },
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      typeOptions: { password: true },
      required: false,
      default: '',
      description: 'User access token obtained from Plaid Link (required for most operations)',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'PLAID-CLIENT-ID': '={{$credentials.clientId}}',
        'PLAID-SECRET': '={{$credentials.secret}}',
        'Plaid-Version': '2020-09-14',
        'Content-Type': 'application/json',
      },
    },
  };
} 