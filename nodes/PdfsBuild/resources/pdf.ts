import type { INodeProperties } from 'n8n-workflow';
import { pdfOrJsonResponse, rawPdfRequest, sendRenderData, templateLocator } from '../shared';

const showForRender = { resource: ['pdf'], operation: ['render'] };

export const pdfDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['pdf'] } },
		options: [
			{
				name: 'Render',
				value: 'render',
				action: 'Render PDF from template',
				description: 'Fill a published template with JSON data and get the PDF back',
				routing: {
					request: {
						method: 'POST',
						url: '=/templates/{{encodeURIComponent($parameter.template)}}/render',
						...rawPdfRequest,
					},
					send: { preSend: [sendRenderData] },
					output: { postReceive: [pdfOrJsonResponse] },
				},
			},
		],
		default: 'render',
	},
	{
		...templateLocator,
		displayOptions: { show: showForRender },
	},
	{
		displayName: 'Data',
		name: 'data',
		type: 'json',
		required: true,
		default: '{}',
		description:
			"JSON object with the values for the template's fields. Use Template > Get to see the schema it expects.",
		displayOptions: { show: showForRender },
	},
	{
		displayName: 'Run in Background',
		name: 'runInBackground',
		type: 'boolean',
		default: false,
		description:
			'Whether to queue the render and return a job (ID, status, status URL) instead of waiting for the PDF. Fetch the result later with Render Job > Get and Render Job > Download PDF, or wait for the render.completed webhook.',
		displayOptions: { show: showForRender },
		routing: {
			send: { type: 'body', property: 'async' },
		},
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		hint: 'The name of the output binary field to put the PDF in',
		displayOptions: { show: { ...showForRender, runInBackground: [false] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showForRender },
		options: [
			{
				displayName: 'Version',
				name: 'version',
				type: 'string',
				default: '',
				placeholder: 'e.g. 4, draft, or staging',
				description:
					'Which template version to render: a version number, "draft" for the working copy, or a channel name. Leave empty to use the "latest" channel.',
				routing: {
					send: { type: 'body', property: 'version' },
				},
			},
			{
				displayName: 'Webhook Endpoint IDs',
				name: 'webhookIds',
				type: 'string',
				default: '',
				placeholder: 'e.g. whe_5xg6Kq0PSTeK1bXf3eDR3w',
				description:
					'Comma-separated webhook endpoint IDs to notify about this render. Without this option every enabled endpoint is notified; added but left empty, none are.',
				routing: {
					send: {
						type: 'body',
						property: 'webhookIds',
						value: '={{ $value.split(",").map((id) => id.trim()).filter((id) => id) }}',
					},
				},
			},
		],
	},
];
