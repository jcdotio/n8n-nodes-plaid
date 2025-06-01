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
      displayName: 'Authentication Method',
      name: 'authMethod',
      type: 'options',
      options: [
        {
          name: 'Access Token (Legacy)',
          value: 'accessToken',
          description: 'Use an existing access token (for backward compatibility)',
        },
        {
          name: 'Public Token Exchange',
          value: 'publicToken',
          description: 'Exchange a public token from Link for an access token (recommended)',
        },
        {
          name: 'Client-Only (Link Operations)',
          value: 'clientOnly',
          description: 'For Link token creation and institution operations only',
        },
      ],
      default: 'publicToken',
      description: 'How to authenticate with Plaid API',
    },
    {
      displayName: 'Access Token',
      name: 'accessToken',
      type: 'string',
      typeOptions: { password: true },
      required: true,
      displayOptions: {
        show: {
          authMethod: ['accessToken'],
        },
      },
      default: '',
      description: 'Existing user access token (legacy method)',
    },
    {
      displayName: 'Public Token',
      name: 'publicToken',
      type: 'string',
      typeOptions: { password: true },
      required: true,
      displayOptions: {
        show: {
          authMethod: ['publicToken'],
        },
      },
      default: '',
      description: 'Public token received from Plaid Link flow',
    },
    {
      displayName: 'Application Name',
      name: 'clientName',
      type: 'string',
      required: false,
      displayOptions: {
        show: {
          authMethod: ['clientOnly', 'publicToken'],
        },
      },
      default: 'n8n Plaid Integration',
      description: 'Application name displayed in Plaid Link (max 30 characters)',
    },
    {
      displayName: 'Country Codes',
      name: 'countryCodes',
      type: 'string',
      required: false,
      displayOptions: {
        show: {
          authMethod: ['clientOnly', 'publicToken'],
        },
      },
      default: 'US',
      description: 'Comma-separated country codes (e.g., US,CA,GB)',
    },
    {
      displayName: 'Language',
      name: 'language',
      type: 'options',
      options: [
        { name: 'English', value: 'en' },
        { name: 'Spanish', value: 'es' },
        { name: 'French', value: 'fr' },
        { name: 'German', value: 'de' },
        { name: 'Italian', value: 'it' },
        { name: 'Dutch', value: 'nl' },
        { name: 'Portuguese', value: 'pt' },
      ],
      default: 'en',
      displayOptions: {
        show: {
          authMethod: ['clientOnly', 'publicToken'],
        },
      },
      description: 'Language for Plaid Link interface',
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