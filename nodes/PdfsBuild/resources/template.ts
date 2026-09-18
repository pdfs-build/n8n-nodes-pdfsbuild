import type { INodeProperties } from 'n8n-workflow';
import { templateLocator } from '../shared';

export const templateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['template'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get template',
				description: 'Retrieve a template with its JSON schema and sample data',
				routing: {
					request: {
						method: 'GET',
						url: '=/templates/{{encodeURIComponent($parameter.template)}}',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many templates',
				description: 'Retrieve a list of the published templates in your organization',
				routing: {
					request: {
						method: 'GET',
						url: '/templates',
					},
				},
			},
		],
		default: 'getAll',
	},
	{
		...templateLocator,
		displayOptions: { show: { resource: ['template'], operation: ['get'] } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['template'], operation: ['getAll'] } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { resource: ['template'], operation: ['getAll'], returnAll: [false] } },
		routing: {
			output: { maxResults: '={{$value}}' },
		},
	},
];
