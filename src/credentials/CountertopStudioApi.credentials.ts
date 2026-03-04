import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class CountertopStudioApi implements ICredentialType {
	name = 'countertopStudioApi';
	displayName = 'Countertop Studio API';

	properties: INodeProperties[] = [
		{
			displayName: 'X-API-Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'X-Department-Id',
			name: 'departmentId',
			type: 'string',
			default: '',
			required: true,
		},
	];
}