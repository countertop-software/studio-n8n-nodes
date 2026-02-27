"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountertopStudioNormalizeDeal = void 0;
function normalizeToNullableString(value) {
    if (value === undefined || value === null)
        return null;
    const str = String(value).trim();
    return str.length === 0 ? null : str;
}
function hasAnyValue(obj) {
    return Object.values(obj).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
}
/**
 * Deal Additional Fields (Top-level im Request)
 */
const DEAL_ADDITIONAL_OPTIONS = [
    { name: 'Volumen (volume)', value: 'volume' },
    { name: 'Mitarbeiter-ID (employee_id)', value: 'employee_id' },
    { name: 'Notiz (note)', value: 'note' },
];
/**
 * Customer Additional Fields (gehen in customers[0].*)
 */
const CUSTOMER_ADDITIONAL_OPTIONS = [
    { name: 'Vorname (first_name)', value: 'first_name' },
    { name: 'Firma (company)', value: 'company' },
    { name: 'Website (website)', value: 'website' },
    { name: 'Titel (title)', value: 'title' },
    { name: 'Telefon 1 Label (phone_1_label)', value: 'phone_1_label' },
    { name: 'Telefon 1 (phone_1)', value: 'phone_1' },
    { name: 'Telefon 2 Label (phone_2_label)', value: 'phone_2_label' },
    { name: 'Telefon 2 (phone_2)', value: 'phone_2' },
    { name: 'Telefon 3 Label (phone_3_label)', value: 'phone_3_label' },
    { name: 'Telefon 3 (phone_3)', value: 'phone_3' },
    { name: 'E-Mail (email)', value: 'email' },
    { name: 'PLZ (postcode)', value: 'postcode' },
    { name: 'Adresse (address)', value: 'address' },
    { name: 'Stadt (city)', value: 'city' },
    { name: 'Bundesland/Region (state)', value: 'state' },
    { name: 'Land (country)', value: 'country' },
    { name: 'Lead-Quelle (lead_origin)', value: 'lead_origin' },
    { name: 'Geburtstag (birthday)', value: 'birthday' },
    { name: 'Notiz (note)', value: 'note' },
];
class CountertopStudioNormalizeDeal {
    constructor() {
        this.description = {
            displayName: 'Countertop Studio - Normalize Deal',
            name: 'countertopStudioNormalizeDeal',
            group: ['transform'],
            version: 1,
            description: 'Normalisiert eingehende Daten auf das Deal-/Customer-Format für die API',
            icon: 'file:countertopStudioLogo.svg',
            defaults: {
                name: 'Countertop Studio - Normalize Deal',
            },
            inputs: ['main'],
            outputs: ['main'],
            properties: [
                // -------------------------
                // DEAL SECTION
                // -------------------------
                {
                    displayName: 'Deal-Daten',
                    name: 'dealSection',
                    type: 'notice',
                    default: '',
                    typeOptions: { theme: 'info' },
                    description: 'Diese Felder werden auf das Deal-Objekt gemappt. Zusätzliche Deal-Felder kannst du unten optional hinzufügen.',
                },
                {
                    displayName: 'Deal-Name',
                    name: 'dealName',
                    type: 'string',
                    required: true,
                    default: '',
                    description: 'z. B. ={{$json.deal_name}}',
                },
                {
                    displayName: 'Zusätzliche Deal-Felder',
                    name: 'dealAdditionalFields',
                    type: 'fixedCollection',
                    default: {},
                    description: 'Optional: Wähle zusätzliche Deal-Felder aus (jedes Feld kann nur einmal hinzugefügt werden).',
                    typeOptions: { multipleValues: true },
                    options: [
                        {
                            name: 'fields',
                            displayName: 'Felder',
                            values: [
                                {
                                    displayName: 'Feld',
                                    name: 'fieldKey',
                                    type: 'options',
                                    default: '',
                                    typeOptions: {
                                        loadOptionsMethod: 'getDealAdditionalFieldOptions',
                                        // optional, aber schadet nicht:
                                        loadOptionsDependsOn: ['dealAdditionalFields'],
                                    },
                                },
                                {
                                    displayName: 'Wert (Expression)',
                                    name: 'fieldValue',
                                    type: 'string',
                                    default: '',
                                    description: 'z. B. ={{$json.deal_volume}}',
                                },
                            ],
                        },
                    ],
                },
                // -------------------------
                // CUSTOMER SECTION
                // -------------------------
                {
                    displayName: 'Customer-Daten',
                    name: 'customerSection',
                    type: 'notice',
                    default: '',
                    typeOptions: { theme: 'info' },
                    description: 'Entweder einen bestehenden Customer verknüpfen (Customer-ID), oder einen neuen Customer anlegen (z. B. Nachname + weitere Felder).',
                },
                {
                    displayName: 'Customer-ID (UUID)',
                    name: 'customerId',
                    type: 'string',
                    default: '',
                    description: 'Optional. Wenn gesetzt, wird der Deal mit einem bestehenden Customer verknüpft (customer_ids). Wenn leer, wird ein neuer Customer erstellt.',
                },
                {
                    displayName: 'Customer Nachname',
                    name: 'customerLastName',
                    type: 'string',
                    default: '',
                    description: 'Wird benötigt, wenn keine Customer-ID gesetzt ist (Neuanlage). z. B. ={{$json.user_lastname}}',
                },
                {
                    displayName: 'Zusätzliche Customer-Felder',
                    name: 'customerAdditionalFields',
                    type: 'fixedCollection',
                    default: {},
                    description: 'Optional: Diese Felder werden nur genutzt, wenn keine Customer-ID gesetzt ist (Neuanlage). Jedes Feld kann nur einmal hinzugefügt werden.',
                    typeOptions: { multipleValues: true },
                    options: [
                        {
                            name: 'fields',
                            displayName: 'Felder',
                            values: [
                                {
                                    displayName: 'Feld',
                                    name: 'fieldKey',
                                    type: 'options',
                                    default: '',
                                    typeOptions: {
                                        loadOptionsMethod: 'getCustomerAdditionalFieldOptions',
                                        // ✅ Fix: sorgt dafür, dass die Options neu geladen werden,
                                        // sobald in customerAdditionalFields etwas ausgewählt wurde.
                                        loadOptionsDependsOn: ['customerAdditionalFields'],
                                    },
                                },
                                {
                                    displayName: 'Wert (Expression)',
                                    name: 'fieldValue',
                                    type: 'string',
                                    default: '',
                                    description: 'z. B. ={{$json.user_email}}',
                                },
                            ],
                        },
                    ],
                },
                // -------------------------
                // GENERAL
                // -------------------------
                {
                    displayName: 'Originalfelder beibehalten',
                    name: 'keepOriginalFields',
                    type: 'boolean',
                    default: true,
                    description: 'Wenn aktiv, werden die ursprünglichen Felder beibehalten und die normalisierten Felder darübergelegt.',
                },
            ],
        };
        this.methods = {
            loadOptions: {
                async getDealAdditionalFieldOptions() {
                    const params = this.getCurrentNodeParameters();
                    const rows = (params?.dealAdditionalFields?.fields ?? []);
                    const selectedKeys = new Set(rows
                        .map((r) => (typeof r?.fieldKey === 'string' ? r.fieldKey : ''))
                        .filter((v) => v.length > 0));
                    return DEAL_ADDITIONAL_OPTIONS
                        .filter((opt) => !selectedKeys.has(opt.value))
                        .map((opt) => ({ name: opt.name, value: opt.value }));
                },
                async getCustomerAdditionalFieldOptions() {
                    const params = this.getCurrentNodeParameters();
                    const rows = (params?.customerAdditionalFields?.fields ?? []);
                    const selectedKeys = new Set(rows
                        .map((r) => (typeof r?.fieldKey === 'string' ? r.fieldKey : ''))
                        .filter((v) => v.length > 0));
                    return CUSTOMER_ADDITIONAL_OPTIONS
                        .filter((opt) => !selectedKeys.has(opt.value))
                        .map((opt) => ({ name: opt.name, value: opt.value }));
                },
            },
        };
    }
    async execute() {
        const items = this.getInputData();
        const out = [];
        for (let i = 0; i < items.length; i++) {
            const keepOriginal = this.getNodeParameter('keepOriginalFields', i);
            // Pflicht
            const dealNameRaw = this.getNodeParameter('dealName', i);
            const customerIdRaw = this.getNodeParameter('customerId', i);
            const customerLastNameRaw = this.getNodeParameter('customerLastName', i);
            const dealName = normalizeToNullableString(dealNameRaw);
            const customerId = normalizeToNullableString(customerIdRaw);
            const customerLastName = normalizeToNullableString(customerLastNameRaw);
            const normalizedDeal = {
                name: dealName,
            };
            // Deal Additional Fields
            const dealAdditional = this.getNodeParameter('dealAdditionalFields', i, {})?.fields ?? [];
            for (const entry of dealAdditional) {
                const key = String(entry.fieldKey ?? '').trim();
                if (!key)
                    continue;
                if (key === 'volume') {
                    const vStr = normalizeToNullableString(entry.fieldValue);
                    if (vStr === null) {
                        normalizedDeal.volume = null;
                    }
                    else {
                        const n = Number(vStr);
                        normalizedDeal.volume = Number.isFinite(n) ? Math.trunc(n) : null;
                    }
                    continue;
                }
                normalizedDeal[key] = normalizeToNullableString(entry.fieldValue);
            }
            // Customer logic
            if (customerId) {
                normalizedDeal.customer_ids = [customerId];
            }
            else {
                const customerPayload = {
                    last_name: customerLastName,
                };
                const customerAdditional = this.getNodeParameter('customerAdditionalFields', i, {})?.fields ?? [];
                for (const entry of customerAdditional) {
                    const key = String(entry.fieldKey ?? '').trim();
                    if (!key)
                        continue;
                    customerPayload[key] = normalizeToNullableString(entry.fieldValue);
                }
                if (hasAnyValue(customerPayload)) {
                    normalizedDeal.customers = [customerPayload];
                }
            }
            const originalJson = (items[i].json ?? {});
            const json = keepOriginal ? { ...originalJson, ...normalizedDeal } : normalizedDeal;
            out.push({ json });
        }
        return [out];
    }
}
exports.CountertopStudioNormalizeDeal = CountertopStudioNormalizeDeal;
