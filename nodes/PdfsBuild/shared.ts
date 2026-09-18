import {
	NodeApiError,
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeListSearchResult,
	type INodeProperties,
	type JsonObject,
} from 'n8n-workflow';

export const API_BASE_URL = 'https://api.pdfs.build';

export const templateLocator: INodeProperties = {
	displayName: 'Template',
	name: 'template',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The template to use. Only published templates appear in the list.',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a template...',
			typeOptions: {
				searchListMethod: 'getTemplates',
				searchable: true,
			},
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. invoice-primary',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[A-Za-z0-9._~-]{1,128}$',
						errorMessage: 'Not a valid template ID',
					},
				},
			],
		},
	],
};

type TemplateSummary = { externalId: string; name: string };

export async function getTemplates(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const { organizationId } = await this.getCredentials<{ organizationId: string }>('pdfsBuildApi');
	const templates = (await this.helpers.httpRequestWithAuthentication.call(this, 'pdfsBuildApi', {
		method: 'GET',
		url: `${API_BASE_URL}/v2/organizations/${encodeURIComponent(organizationId.trim())}/templates`,
		json: true,
	})) as TemplateSummary[];

	const query = filter?.toLowerCase();
	return {
		results: templates
			.filter(
				(t) =>
					!query ||
					t.name.toLowerCase().includes(query) ||
					t.externalId.toLowerCase().includes(query),
			)
			.map((t) => ({ name: t.name, value: t.externalId })),
	};
}

/** Parses the Data parameter, which arrives as a JSON string or, via an expression, an object. */
export async function sendRenderData(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	let data = this.getNodeParameter('data', '{}');
	if (typeof data === 'string') {
		try {
			data = JSON.parse(data);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Data is not valid JSON', {
				itemIndex: this.getItemIndex(),
			});
		}
	}
	if (data === null || typeof data !== 'object' || Array.isArray(data)) {
		throw new NodeOperationError(this.getNode(), 'Data must be a JSON object', {
			itemIndex: this.getItemIndex(),
			description:
				'Pass an object whose fields match the template schema, e.g. {"company": "Acme"}',
		});
	}
	(requestOptions.body as IDataObject).data = data as IDataObject;
	return requestOptions;
}

type ApiErrorBody = {
	error?: string;
	message?: string;
	details?: Array<{ path: string; message?: string }>;
	diagnostics?: Array<{ message: string; line?: number }>;
};

function describeApiError(body: ApiErrorBody): string | undefined {
	if (body.message) return body.message;
	const lines = [
		...(body.details ?? []).map((d) => `${d.path}: ${d.message ?? 'invalid value'}`),
		...(body.diagnostics ?? []).map((d) => (d.line ? `Line ${d.line}: ${d.message}` : d.message)),
	];
	return lines.length ? lines.join('\n') : undefined;
}

/**
 * Turns a raw (arraybuffer) response into items: a PDF becomes binary data, a JSON body (such as
 * the 202 job handle of a background render) becomes JSON, and an HTTP error becomes a NodeApiError
 * carrying the API's error code and message.
 */
export async function pdfOrJsonResponse(
	this: IExecuteSingleFunctions,
	_items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const body = Buffer.from(response.body as Buffer);
	const contentType = String(response.headers['content-type'] ?? '');

	if (response.statusCode < 400 && contentType.includes('application/pdf')) {
		const disposition = String(response.headers['content-disposition'] ?? '');
		const fileName = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? 'document.pdf';
		const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 'data') as string;
		const binary = await this.helpers.prepareBinaryData(body, fileName, 'application/pdf');
		return [
			{ json: { fileName, fileSize: body.length }, binary: { [binaryPropertyName]: binary } },
		];
	}

	let json: ApiErrorBody & IDataObject;
	try {
		json = JSON.parse(body.toString('utf8'));
	} catch {
		json = { error: body.toString('utf8') || `HTTP ${response.statusCode}` };
	}

	if (response.statusCode >= 400) {
		throw new NodeApiError(this.getNode(), json as JsonObject, {
			httpCode: String(response.statusCode),
			message: json.error ?? `Request failed with status ${response.statusCode}`,
			description: describeApiError(json),
			itemIndex: this.getItemIndex(),
		});
	}

	return [{ json }];
}

/** Request options for endpoints that may answer with a PDF: keep the body raw and handle errors ourselves. */
export const rawPdfRequest = {
	encoding: 'arraybuffer',
	ignoreHttpStatusErrors: true,
	headers: { Accept: 'application/pdf, application/json' },
} as const;
