import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { pdfDescription } from './resources/pdf';
import { renderJobDescription } from './resources/renderJob';
import { templateDescription } from './resources/template';
import { API_BASE_URL, getTemplates } from './shared';

export class PdfsBuild implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'pdfs.build',
		name: 'pdfsBuild',
		icon: { light: 'file:../../icons/pdfsbuild.svg', dark: 'file:../../icons/pdfsbuild.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Render PDFs from pdfs.build templates with JSON data',
		defaults: {
			name: 'pdfs.build',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'pdfsBuildApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: `={{"${API_BASE_URL}/v2/organizations/" + encodeURIComponent($credentials.organizationId.trim())}}`,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'PDF',
						value: 'pdf',
					},
					{
						name: 'Render Job',
						value: 'renderJob',
					},
					{
						name: 'Template',
						value: 'template',
					},
				],
				default: 'pdf',
			},
			...pdfDescription,
			...renderJobDescription,
			...templateDescription,
		],
	};

	methods = {
		listSearch: {
			getTemplates,
		},
	};
}
