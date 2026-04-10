import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

function normalizeToNullableString(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	const str = String(value).trim();
	return str.length === 0 ? null : str;
}

function hasAnyValue(obj: Record<string, unknown>): boolean {
	return Object.values(obj).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
}


const DEAL_ADDITIONAL_OPTIONS: Array<{ name: string; value: string }> = [
	{ name: 'Volume (volume)', value: 'volume' },
	{ name: 'Employee ID (employee_id)', value: 'employee_id' },
	{ name: 'Deal  (deal_origin)', value: 'deal_origin' },
	{ name: 'Note (note)', value: 'note' },
];

const CUSTOMER_ADDITIONAL_OPTIONS: Array<{ name: string; value: string }> = [
	{ name: 'First Name (first_name)', value: 'first_name' },
	{ name: 'Company (company)', value: 'company' },
	{ name: 'Website (website)', value: 'website' },
	{ name: 'Title (title)', value: 'title' },

	{ name: 'Phone 1 Label (phone_1_label)', value: 'phone_1_label' },
	{ name: 'Phone 1 (phone_1)', value: 'phone_1' },
	{ name: 'Phone 2 Label (phone_2_label)', value: 'phone_2_label' },
	{ name: 'Phone 2 (phone_2)', value: 'phone_2' },
	{ name: 'Phone 3 Label (phone_3_label)', value: 'phone_3_label' },
	{ name: 'Phone 3 (phone_3)', value: 'phone_3' },

	{ name: 'Email (email)', value: 'email' },
	{ name: 'Postcode (postcode)', value: 'postcode' },
	{ name: 'Address (address)', value: 'address' },
	{ name: 'City (city)', value: 'city' },
	{ name: 'State/Province (state)', value: 'state' },
	{ name: 'Country (country)', value: 'country' },

	{ name: 'Contact Origin (contact_origin)', value: 'contact_origin' },
	{ name: 'Birthday (birthday)', value: 'birthday' },
	{ name: 'Note (note)', value: 'note' },
];

export class CountertopStudioNormalizeDeal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Countertop Studio - Normalize Deal',
		name: 'countertopStudioNormalizeDeal',
		group: ['transform'],
		version: 1,
		description: 'Transforms incoming data into the standardized Deal payload format.',
		icon: 'file:countertopStudioLogo.svg',
		defaults: {
			name: 'Countertop Studio - Normalize Deal',
		},
		codex: {
			categories: ['Countertop Studio'],
			subcategories: {
				'Countertop Studio': ['Deals'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.countertop.app/n8n/deal-create-nodes#normalize-deal',
					},
				],
			},
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Deal Information',
				name: 'dealSection',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				description:
					'Normalize transforms input into the structure required by the API. It does NOT validate business rules (validation happens in the Validate Deal node).',
			},
			{
				displayName: 'Deal Name',
				name: 'dealName',
				type: 'string',
				required: true,
				default: '',
				description: 'Example: ={{$json.deal_name}}',
			},
			{
				displayName: 'Additional Deal Fields',
				name: 'dealAdditionalFields',
				type: 'fixedCollection',
				default: {},
				description: 'Optional: Add more deal properties (values are trimmed, empty strings become null).',
				typeOptions: { multipleValues: true },
				options: [
					{
						name: 'fields',
						displayName: 'Fields',
						values: [
							{
								displayName: 'Field',
								name: 'fieldKey',
								type: 'options',
								default: '',
								typeOptions: { loadOptionsMethod: 'getDealAdditionalFieldOptions' },
							},
							{
								displayName: 'Value (Expression)',
								name: 'fieldValue',
								type: 'string',
								default: '',
								description: 'Example: ={{$json.volume}}',
							},
						],
					},
				],
			},

			{
				displayName: 'Customer Information',
				name: 'customerSection',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				description:
					'Optional: Provide existing customers via UUIDs and/or new customer objects. This node only normalizes. The Validate Deal node must enforce API rules (e.g. “no mixing”).',
			},

			{
				displayName: 'Existing Customer IDs (UUIDs)',
				name: 'customerIds',
				type: 'fixedCollection',
				default: {},
				description:
					'Optional: Provide one or more existing customer UUIDs. These become customer_ids: string[].',
				typeOptions: { multipleValues: true },
				options: [
					{
						name: 'items',
						displayName: 'IDs',
						values: [
							{
								displayName: 'Customer ID (UUID)',
								name: 'id',
								type: 'string',
								default: '',
								description: 'Example: ={{$json.customer_id}}',
							},
						],
					},
				],
			},

			{
				displayName: 'New Customers',
				name: 'customers',
				type: 'fixedCollection',
				default: {},
				description:
					'Optional: Provide one or more new customer objects. These become customers: object[]. (Required fields must be validated in Validate Deal.)',
				typeOptions: { multipleValues: true },
				options: [
					{
						name: 'items',
						displayName: 'Customers',
						values: [
							{
								displayName: 'Last Name',
								name: 'last_name',
								type: 'string',
								default: '',
								description: 'Example: ={{$json.last_name}} (required by API rules — validate in Validate Deal).',
							},
							{
								displayName: 'Additional Customer Fields',
								name: 'additional',
								type: 'fixedCollection',
								default: {},
								description: 'Optional fields for creating a new customer.',
								typeOptions: { multipleValues: true },
								options: [
									{
										name: 'fields',
										displayName: 'Fields',
										values: [
											{
												displayName: 'Field',
												name: 'fieldKey',
												type: 'options',
												default: '',
												typeOptions: { loadOptionsMethod: 'getCustomerAdditionalFieldOptions' },
											},
											{
												displayName: 'Value (Expression)',
												name: 'fieldValue',
												type: 'string',
												default: '',
												description: 'Example: ={{$json.email}}',
											},
										],
									},
								],
							},
						],
					},
				],
			},

			{
				displayName: 'Advanced Options',
				name: 'advanced',
				type: 'boolean',
				default: false,
				description: 'Show advanced configuration options.',
			},
			{
				displayName: 'Keep Original Fields (Debug)',
				name: 'keepOriginalFields',
				type: 'boolean',
				default: true,
				displayOptions: { show: { advanced: [true] } },
				description:
					'If enabled, the original input data will be preserved and merged with the normalized output.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getDealAdditionalFieldOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return DEAL_ADDITIONAL_OPTIONS.map((opt) => ({ name: opt.name, value: opt.value }));
			},
			async getCustomerAdditionalFieldOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return CUSTOMER_ADDITIONAL_OPTIONS.map((opt) => ({ name: opt.name, value: opt.value }));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const out: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const advanced = this.getNodeParameter('advanced', i, false) as boolean;
			const keepOriginal = advanced
				? (this.getNodeParameter('keepOriginalFields', i, true) as boolean)
				: false;

			const dealNameRaw = this.getNodeParameter('dealName', i) as unknown;
			const dealName = normalizeToNullableString(dealNameRaw);

			const normalizedDeal: IDataObject = {
				name: dealName,
			};

			const dealAdditional =
				((this.getNodeParameter('dealAdditionalFields', i, {}) as any)?.fields as Array<{
					fieldKey?: string;
					fieldValue?: unknown;
				}>) ?? [];

			for (const entry of dealAdditional) {
				const key = String(entry.fieldKey ?? '').trim();
				if (!key) continue;
				(normalizedDeal as any)[key] = normalizeToNullableString(entry.fieldValue);
			}

			const customerIdsRaw = this.getNodeParameter('customerIds', i, {}) as any;
			const customersRaw = this.getNodeParameter('customers', i, {}) as any;

			const customerIdsItems =
				((customerIdsRaw?.items as Array<{ id?: unknown }>) ?? [])
					.map((x) => normalizeToNullableString(x?.id))
					.filter((v): v is string => !!v);

			if (customerIdsItems.length > 0) {
				normalizedDeal.customer_ids = customerIdsItems;
			}

			const customersItems =
				((customersRaw?.items as Array<any>) ?? [])
					.map((c) => {
						const payload: IDataObject = {
							last_name: normalizeToNullableString(c?.last_name),
						};

						const additional =
							((c?.additional?.fields as Array<{ fieldKey?: string; fieldValue?: unknown }>) ?? []);

						for (const entry of additional) {
							const key = String(entry.fieldKey ?? '').trim();
							if (!key) continue;
							(payload as any)[key] = normalizeToNullableString(entry.fieldValue);
						}

						return payload;
					})
					.filter((p) => hasAnyValue(p as Record<string, unknown>));

			if (customersItems.length > 0) {
				normalizedDeal.customers = customersItems;
			}

			// Output
			const baseJson = keepOriginal ? ({ ...(items[i].json as IDataObject) } as IDataObject) : {};
			out.push({
				json: {
					...baseJson,
					...normalizedDeal,
				},
			});
		}

		return [out];
	}
}