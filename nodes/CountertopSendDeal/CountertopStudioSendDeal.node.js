"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountertopStudioSendDeal = void 0;
function toNullableTrimmedString(value) {
    if (value === null || value === undefined)
        return null;
    const s = String(value).trim();
    return s.length ? s : null;
}
function get(obj, path) {
    if (!obj || typeof obj !== 'object')
        return undefined;
    return path.split('.').reduce((acc, key) => (acc?.[key] !== undefined ? acc[key] : undefined), obj);
}
function safeRandomId() {
    try {
        const c = globalThis.crypto;
        if (c?.randomUUID)
            return c.randomUUID();
        const { randomUUID } = require('crypto');
        return randomUUID();
    }
    catch {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}
class CountertopStudioSendDeal {
    constructor() {
        this.description = {
            displayName: 'Countertop Studio - Send Deal',
            name: 'countertopStudioSendDeal',
            group: ['output'],
            version: 1,
            description: 'Sendet normalisierte Deal-Daten an die API (pro Item 1 Request)',
            icon: 'file:countertopStudioLogo.svg',
            defaults: { name: 'Countertop Studio - Send Deal' },
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
                    description: 'Wenn aktiv, werden Originaldaten beibehalten und Ergebnisfelder hinzugefügt.',
                },
                {
                    displayName: 'Include Request Body in Output',
                    name: 'includeRequestBody',
                    type: 'boolean',
                    default: true,
                    description: 'Wenn aktiv, wird der gesendete Request-Body im Output mit ausgegeben (hilfreich fürs Debugging).',
                },
                {
                    displayName: 'Include Response Body in Output',
                    name: 'includeResponseBody',
                    type: 'boolean',
                    default: true,
                    description: 'Wenn aktiv, wird der Response-Body im Output mit ausgegeben (hilfreich fürs Debugging).',
                },
                {
                    displayName: 'Advanced Options',
                    name: 'advanced',
                    type: 'boolean',
                    default: false,
                    description: 'Show advanced configuration options',
                },
                //Advanced Options
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
    }
    async execute() {
        const items = this.getInputData();
        const sent = [];
        const failed = [];
        const defaultUrl = 'http://n8n_test.test/api/deals';
        const defaultTimeout = 30000;
        const creds = (await this.getCredentials('countertopStudioApi'));
        for (let i = 0; i < items.length; i++) {
            const originalJson = (items[i].json ?? {});
            const overrideUrl = this.getNodeParameter('url', i, '');
            const url = overrideUrl?.trim() || defaultUrl;
            const keepOriginalFields = this.getNodeParameter('keepOriginalFields', i);
            const includeRequestBody = this.getNodeParameter('includeRequestBody', i);
            const includeResponseBody = this.getNodeParameter('includeResponseBody', i);
            const overrideTimeout = this.getNodeParameter('timeout', i);
            const timeout = Number.isFinite(overrideTimeout) && overrideTimeout > 0
                ? overrideTimeout
                : defaultTimeout;
            const body = {
                name: toNullableTrimmedString(get(originalJson, 'name')),
                employee_id: toNullableTrimmedString(get(originalJson, 'employee_id')),
                note: toNullableTrimmedString(get(originalJson, 'note')),
            };
            // volume als integer/null
            const volumeRaw = get(originalJson, 'volume');
            if (volumeRaw === null || volumeRaw === undefined || String(volumeRaw).trim() === '') {
                body.volume = null;
            }
            else {
                const n = Number(volumeRaw);
                body.volume = Number.isFinite(n) ? Math.trunc(n) : null;
            }
            // Customer: bestehend oder neu (jeweils als Array mit 1 Element)
            const customerId = toNullableTrimmedString(get(originalJson, 'customer_ids.0'));
            if (customerId) {
                body.customer_ids = [customerId];
            }
            else {
                const customer = get(originalJson, 'customers.0');
                if (customer && Object.values(customer).some((v) => v !== null && v !== undefined && String(v).trim() !== '')) {
                    body.customers = [customer];
                }
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
            }
            catch (err) {
                // n8n httpRequest wirft oft Errors mit response/statusCode/body
                const statusCode = err?.statusCode ??
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
exports.CountertopStudioSendDeal = CountertopStudioSendDeal;
