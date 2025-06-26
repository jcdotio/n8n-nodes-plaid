import {
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class PlaidApi implements ICredentialType {
	name = 'plaidApi';
	displayName = 'Plaid API';
	properties: INodeProperties[] = [
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'options',
			options: [
				{
					name: 'Sandbox',
					value: 'sandbox',
				},
				{
					name: 'Development', 
					value: 'development',
				},
				{
					name: 'Production',
					value: 'production',
				},
			],
			default: 'sandbox',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string',
			required: true,
			default: '',
		},
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			required: true,
			default: '',
		},
	];
}