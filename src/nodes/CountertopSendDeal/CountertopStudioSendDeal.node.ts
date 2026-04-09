import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

function toNullableTrimmedString(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	const s = String(value).trim();
	return s.length ? s : null;
}

function get(obj: any, path: string): unknown {
	if (!obj || typeof obj !== 'object') return undefined;
	return path.split('.').reduce((acc: any, key) => (acc?.[key] !== undefined ? acc[key] : undefined), obj);
}

function safeRandomId(): string {
	try {
		const c: any = (globalThis as any).crypto;
		if (c?.randomUUID) return c.randomUUID();
		const { randomUUID } = require('crypto');
		return randomUUID();
	} catch {
		return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasAnyValue(obj: Record<string, unknown>): boolean {
	return Object.values(obj).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
}

export class CountertopStudioSendDeal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Countertop Studio - Send Deal',
		name: 'countertopStudioSendDeal',
		group: ['output'],
		version: 1,
		description: 'Sendet normalisierte Deal-Daten an die API (pro Item 1 Request)',
		icon: 'file:countertopStudioLogo.svg',
		defaults: { name: 'Countertop Studio - Send Deal' },
		codex: {
			categories: ['Countertop Studio'],
			subcategories: {
				'Countertop Studio': ['Deals'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.countertop.app/n8n/deal-create-nodes#send-deal',
					},
				],
			},
		},
		inputs: ['main'],
		outputs: ['main', 'main'],
		outputNames: ['Sent', 'Failed'],
		credentials: [{ name: 'countertopStudioApi', required: true }],

		properties: [
			{
				displayName: 'Keep Original Fields',
				name: 'keepOriginalFields',
				type: 'boolean',
				default: true,
				description:
					'Wenn aktiv, werden Originaldaten beibehalten und Ergebnisfelder hinzugefügt.',
			},
			{
				displayName: 'Include Request Body in Output',
				name: 'includeRequestBody',
				type: 'boolean',
				default: true,
				description:
					'Wenn aktiv, wird der gesendete Request-Body im Output mit ausgegeben (hilfreich fürs Debugging).',
			},
			{
				displayName: 'Include Response Body in Output',
				name: 'includeResponseBody',
				type: 'boolean',
				default: true,
				description:
					'Wenn aktiv, wird der Response-Body im Output mit ausgegeben (hilfreich fürs Debugging).',
			},
			{
				displayName: 'Advanced Options',
				name: 'advanced',
				type: 'boolean',
				default: false,
				description: 'Show advanced configuration options',
			},
			// Advanced Options
			{
				displayName: 'URL (override)',
				name: 'url',
				type: 'string',
				default: '',
				description: 'Optional: überschreibt die Standard-API-URL',
				displayOptions: {
					show: { advanced: [true] },
				},
			},
			{
				displayName: 'Timeout (ms)',
				name: 'timeout',
				type: 'number',
				default: 30000,
				description: 'HTTP Timeout in Millisekunden',
				displayOptions: {
					show: {
						advanced: [true],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const sent: INodeExecutionData[] = [];
		const failed: INodeExecutionData[] = [];

		const defaultUrl = 'https://studio.countertop.app/api/v1/integration/deals';
		const defaultTimeout = 30000;

		const creds = (await this.getCredentials('countertopStudioApi')) as {
			apiKey: string;
			departmentId: string;
		};

		for (let i = 0; i < items.length; i++) {
			const originalJson = (items[i].json ?? {}) as Record<string, unknown>;
			const overrideUrl = this.getNodeParameter('url', i, '') as string;
			const url = overrideUrl?.trim() || defaultUrl;

			const keepOriginalFields = this.getNodeParameter('keepOriginalFields', i) as boolean;
			const includeRequestBody = this.getNodeParameter('includeRequestBody', i) as boolean;
			const includeResponseBody = this.getNodeParameter('includeResponseBody', i) as boolean;

			const overrideTimeout = this.getNodeParameter('timeout', i) as number;
			const timeout =
				Number.isFinite(overrideTimeout) && overrideTimeout > 0
					? overrideTimeout
					: defaultTimeout;

			const body: Record<string, unknown> = {
				name: toNullableTrimmedString(get(originalJson, 'name')),
				employee_id: toNullableTrimmedString(get(originalJson, 'employee_id')),
				deal_origin: toNullableTrimmedString(get(originalJson, 'deal_origin')),
				note: toNullableTrimmedString(get(originalJson, 'note')),
			};

			const volumeRaw = get(originalJson, 'volume');
			if (volumeRaw === null || volumeRaw === undefined || String(volumeRaw).trim() === '') {
				body.volume = null;
			} else {
				const n = Number(volumeRaw);
				body.volume = Number.isFinite(n) ? Math.trunc(n) : null;
			}

			const RESERVED_KEYS = new Set([
				'name',
				'employee_id',
				'deal_origin',
				'note',
				'volume',
				'customer_ids',
				'customers',
				'countertopStudio',
				'api',
			]);

			for (const [key, value] of Object.entries(originalJson)) {
				if (RESERVED_KEYS.has(key)) continue;
				if (key in body) continue;
				if (
					value === null ||
					value === undefined ||
					typeof value === 'string' ||
					typeof value === 'number' ||
					typeof value === 'boolean'
				) {
					body[key] = typeof value === 'string' ? toNullableTrimmedString(value) : value;
				}
			}
			const customerIdsRaw = get(originalJson, 'customer_ids');
			const customersRaw = get(originalJson, 'customers');

			const customerIds =
				Array.isArray(customerIdsRaw)
					? customerIdsRaw
						.map((v) => toNullableTrimmedString(v))
						.filter((v): v is string => !!v)
					: [];

			const customers =
				Array.isArray(customersRaw)
					? customersRaw
						.filter((c) => isPlainObject(c))
						.map((c) => c as Record<string, unknown>)
						.filter((c) => hasAnyValue(c))
					: [];

			if (customerIds.length > 0) {
				body.customer_ids = customerIds;
			} else if (customers.length > 0) {
				body.customers = customers;
			}

			const requestId = safeRandomId();

			try {
				const response = await this.helpers.httpRequest({
					method: 'POST',
					url,
					timeout,
					json: true,
					body,
					headers: {
						'Content-Type': 'application/json',
						'X-API-Key': creds.apiKey,
						'X-Department-Id': creds.departmentId,
						'X-Request-Id': requestId,
					},
				});

				const json = keepOriginalFields
					? {
						...originalJson,
						api: {
							ok: true,
							requestId,
							url,
							requestBody: includeRequestBody ? body : undefined,
							responseBody: includeResponseBody ? response : undefined,
						},
					}
					: {
						api: {
							ok: true,
							requestId,
							url,
							requestBody: includeRequestBody ? body : undefined,
							responseBody: includeResponseBody ? response : undefined,
						},
					};

				sent.push({ json });
			} catch (err: any) {
				const statusCode =
					err?.statusCode ??
					err?.response?.statusCode ??
					err?.response?.status ??
					err?.response?.statusCode;

				const responseBody = err?.response?.body ?? err?.responseBody ?? err?.body;

				const json = keepOriginalFields
					? {
						...originalJson,
						api: {
							ok: false,
							requestId,
							url,
							requestBody: includeRequestBody ? body : undefined,
							error: {
								message: err?.message ?? 'Request failed',
								statusCode: statusCode ?? null,
								responseBody: includeResponseBody ? responseBody ?? null : undefined,
							},
						},
					}
					: {
						api: {
							ok: false,
							requestId,
							url,
							requestBody: includeRequestBody ? body : undefined,
							error: {
								message: err?.message ?? 'Request failed',
								statusCode: statusCode ?? null,
								responseBody: includeResponseBody ? responseBody ?? null : undefined,
							},
						},
					};

				failed.push({ json });
			}
		}

		return [sent, failed];
	}
}