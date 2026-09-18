import type { INodeProperties } from 'n8n-workflow';
import { pdfOrJsonResponse, rawPdfRequest } from '../shared';

export const renderJobDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['renderJob'] } },
		options: [
			{
				name: 'Download PDF',
				value: 'download',
				action: 'Download PDF of render job',
				description: 'Download the PDF of a background render job that has succeeded',
				routing: {
					request: {
						method: 'GET',
						url: '=/renders/{{encodeURIComponent($parameter.jobId)}}/pdf',
						...rawPdfRequest,
					},
					output: { postReceive: [pdfOrJsonResponse] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get render job',
				description: 'Retrieve the status of a background render job',
				routing: {
					request: {
						method: 'GET',
						url: '=/renders/{{encodeURIComponent($parameter.jobId)}}',
					},
				},
			},
		],
		default: 'get',
	},
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. job_7a1b9c2d',
		description: 'The ID returned by PDF > Render with Run in Background turned on',
		displayOptions: { show: { resource: ['renderJob'] } },
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the output binary field to put the PDF in',
		displayOptions: { show: { resource: ['renderJob'], operation: ['download'] } },
	},
];
