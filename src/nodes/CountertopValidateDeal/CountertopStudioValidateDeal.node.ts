import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

type ValidationError = {
	fieldPath: string;
	rule: string;
	message: string;
};

function isPresentString(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	if (typeof value !== 'string') return String(value).trim().length > 0;
	return value.trim().length > 0;
}

function isArray(value: unknown): value is unknown[] {
	return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isIntegerString(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	const s = String(value).trim();
	return /^-?\d+$/.test(s);
}

function isUuid(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	const s = String(value).trim();
	// UUID v1-v5
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function isDateYYYYMMDD(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	const s = String(value).trim();
	return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function getNested(obj: unknown, path: string): unknown {
	if (!obj || typeof obj !== 'object') return undefined;

	const parts = path.split('.');
	let cur: any = obj;

	for (const part of parts) {
		if (cur && typeof cur === 'object' && part in cur) {
			cur = cur[part];
		} else {
			return undefined;
		}
	}
	return cur;
}

export class CountertopStudioValidateDeal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Countertop Studio - Validate Deal',
		name: 'countertopStudioValidateDeal',
		group: ['transform'],
		version: 1,
		description: 'Validates normalized Deal & Customer data and routes Valid/Invalid.',
		icon: 'file:countertopStudioLogo.svg',
		defaults: {
			name: 'Countertop Studio - Validate Deal',
		},
		codex: {
			categories: ['Countertop Studio'],
			subcategories: {
				'Countertop Studio': ['Deals'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.countertop.app/n8n/deal-create-nodes#validate-deal',
					},
				],
			},
		},
		inputs: ['main'],
		outputs: ['main', 'main'],
		outputNames: ['Valid', 'Invalid'],
		properties: [
			{
				displayName: 'Deal Validation',
				name: 'dealValidationSection',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				description: 'Enable/disable validation rules related to the deal object.',
			},
			{
				displayName: 'Validate Deal',
				name: 'validateDeal',
				type: 'boolean',
				default: true,
				description: 'If enabled, deal-level fields (e.g. name, volume) will be validated.',
			},

			{
				displayName: 'Customer Validation',
				name: 'customerValidationSection',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				description: 'Enable/disable validation rules related to the customer payload.',
			},
			{
				displayName: 'Validate Customer',
				name: 'validateCustomer',
				type: 'boolean',
				default: true,
				description:
					'If enabled, customer-related fields (customer_ids/customers and customer payload rules) will be validated.',
			},

			{
				displayName: 'Advanced Options',
				name: 'advanced',
				type: 'boolean',
				default: false,
				description: 'Show advanced configuration options.',
			},
			{
				displayName: 'Require Customer',
				name: 'requireCustomer',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: { advanced: [true] },
				},
				description:
					'If enabled, either customer_ids or customers must be present. Disable to allow deals without a customer.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const validOut: INodeExecutionData[] = [];
		const invalidOut: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const validateDeal = this.getNodeParameter('validateDeal', i) as boolean;
			const validateCustomer = this.getNodeParameter('validateCustomer', i) as boolean;

			const advanced = this.getNodeParameter('advanced', i, false) as boolean;
			const requireCustomer = advanced
				? (this.getNodeParameter('requireCustomer', i, true) as boolean)
				: true;

			const originalJson = (items[i].json ?? {}) as Record<string, unknown>;
			const errors: ValidationError[] = [];

			if (validateDeal) {
				const name = getNested(originalJson, 'name');
				if (!isPresentString(name)) {
					errors.push({
						fieldPath: 'name',
						rule: 'required',
						message: 'Deal name is required.',
					});
				}

				const volume = getNested(originalJson, 'volume');
				if (volume !== undefined && volume !== null && String(volume).trim() !== '') {
					if (!isIntegerString(volume)) {
						errors.push({
							fieldPath: 'volume',
							rule: 'integer',
							message: 'Volume must be an integer.',
						});
					}
				}

				const employeeId = getNested(originalJson, 'employee_id');
				if (employeeId !== undefined && employeeId !== null && String(employeeId).trim() !== '') {
					if (!isUuid(employeeId)) {
						errors.push({
							fieldPath: 'employee_id',
							rule: 'uuid',
							message: 'Employee ID must be a valid UUID.',
						});
					}
				}
			}

			if (validateCustomer) {
				const customerIds = getNested(originalJson, 'customer_ids');
				const customers = getNested(originalJson, 'customers');

				const customerIdsPresent = customerIds !== undefined && customerIds !== null;
				const customersPresent = customers !== undefined && customers !== null;

				if (customerIdsPresent && !isArray(customerIds)) {
					errors.push({
						fieldPath: 'customer_ids',
						rule: 'array',
						message: 'customer_ids must be an array of UUIDs.',
					});
				}

				if (customersPresent && !isArray(customers)) {
					errors.push({
						fieldPath: 'customers',
						rule: 'array',
						message: 'customers must be an array of customer objects.',
					});
				}

				const hasCustomerIds = isArray(customerIds) && customerIds.length > 0;
				const hasCustomers = isArray(customers) && customers.length > 0;

				// API constraint: either UUIDs OR customer objects (not both)
				if (hasCustomerIds && hasCustomers) {
					errors.push({
						fieldPath: 'customer_ids/customers',
						rule: 'mutually_exclusive',
						message: 'Send either customer_ids or customers, not both.',
					});
				}

				if (hasCustomerIds) {
					for (let idx = 0; idx < (customerIds as unknown[]).length; idx++) {
						const id = (customerIds as unknown[])[idx];
						if (!isUuid(id)) {
							errors.push({
								fieldPath: `customer_ids[${idx}]`,
								rule: 'uuid',
								message: 'customer_ids contains an invalid UUID.',
							});
						}
					}
				}

				if (hasCustomers) {
					for (let idx = 0; idx < (customers as unknown[]).length; idx++) {
						const c = (customers as unknown[])[idx];

						if (!isPlainObject(c)) {
							errors.push({
								fieldPath: `customers[${idx}]`,
								rule: 'object',
								message: 'Each item in customers must be an object.',
							});
							continue;
						}

						const lastName = (c as Record<string, unknown>)?.last_name;
						if (!isPresentString(lastName)) {
							errors.push({
								fieldPath: `customers[${idx}].last_name`,
								rule: 'required',
								message: 'Customer last_name is required when creating a new customer.',
							});
						}

						const birthday = (c as Record<string, unknown>)?.birthday;
						if (birthday !== undefined && birthday !== null && String(birthday).trim() !== '') {
							if (!isDateYYYYMMDD(birthday)) {
								errors.push({
									fieldPath: `customers[${idx}].birthday`,
									rule: 'date_format',
									message: 'Customer birthday must be in YYYY-MM-DD format.',
								});
							}
						}
					}
				}
				if (requireCustomer && !hasCustomerIds && !hasCustomers) {
					errors.push({
						fieldPath: 'customer_ids/customers',
						rule: 'required',
						message: 'Either customer_ids or customers must be provided.',
					});
				}
			}

			const validation = {
				ok: errors.length === 0,
				errors,
			};

			const meta = {
				countertopStudio: {
					...(originalJson.countertopStudio as Record<string, unknown>),
					validation,
				},
			};

			const json = {
				...originalJson,
				...meta,
			};

			if (validation.ok) {
				validOut.push({ json });
			} else {
				invalidOut.push({ json });
			}
		}

		return [validOut, invalidOut];
	}
}