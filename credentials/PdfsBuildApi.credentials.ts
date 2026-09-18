import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PdfsBuildApi implements ICredentialType {
	name = 'pdfsBuildApi';

	displayName = 'pdfs.build API';

	icon: Icon = { light: 'file:../icons/pdfsbuild.svg', dark: 'file:../icons/pdfsbuild.dark.svg' };

	documentationUrl = 'https://pdfs.build/docs/#authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'Create a key under Developers > API keys at https://app.pdfs.build. It starts with prs_ and is shown once.',
		},
		{
			displayName: 'Organization ID',
			name: 'organizationId',
			type: 'string',
			required: true,
			default: '',
			description:
				'Shown with a copy button at the top of Developers > API keys. It must be the organization the API key belongs to.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.pdfs.build',
			url: '=/v2/organizations/{{encodeURIComponent($credentials.organizationId.trim())}}/templates',
			method: 'GET',
		},
	};
}
