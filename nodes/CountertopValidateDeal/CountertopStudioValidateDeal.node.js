"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountertopStudioValidateDeal = void 0;
function isPresentString(value) {
    if (value === null || value === undefined)
        return false;
    if (typeof value !== 'string')
        return String(value).trim().length > 0;
    return value.trim().length > 0;
}
function isArray(value) {
    return Array.isArray(value);
}
function isIntegerString(value) {
    if (value === null || value === undefined)
        return false;
    const s = String(value).trim();
    return /^-?\d+$/.test(s);
}
function isUuid(value) {
    if (value === null || value === undefined)
        return false;
    const s = String(value).trim();
    // UUID v1-v5
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}
function isDateYYYYMMDD(value) {
    if (value === null || value === undefined)
        return false;
    const s = String(value).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function getNested(obj, path) {
    if (!obj || typeof obj !== 'object')
        return undefined;
    const parts = path.split('.');
    let cur = obj;
    for (const part of parts) {
        if (cur && typeof cur === 'object' && part in cur) {
            cur = cur[part];
        }
        else {
            return undefined;
        }
    }
    return cur;
}
class CountertopStudioValidateDeal {
    constructor() {
        this.description = {
            displayName: 'Countertop Studio - Validate Deal',
            name: 'countertopStudioValidateDeal',
            group: ['transform'],
            version: 1,
            description: 'Validiert Deal-Daten (name + customer-Regeln) und routet Valid/Invalid',
            icon: 'file:countertopStudioLogo.svg',
            defaults: {
                name: 'Countertop Studio - Validate Deal',
            },
            inputs: ['main'],
            outputs: ['main', 'main'],
            outputNames: ['Valid', 'Invalid'],
            properties: [
                {
                    displayName: 'Keep Original Fields',
                    name: 'keepOriginalFields',
                    type: 'boolean',
                    default: true,
                    description: 'Wenn aktiv, werden alle originalen Felder beibehalten und validation/errors hinzugefügt.',
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const validOut = [];
        const invalidOut = [];
        for (let i = 0; i < items.length; i++) {
            const keepOriginal = this.getNodeParameter('keepOriginalFields', i);
            const originalJson = (items[i].json ?? {});
            const errors = [];
            const name = getNested(originalJson, 'name');
            if (!isPresentString(name)) {
                errors.push({
                    fieldPath: 'name',
                    rule: 'required',
                    message: 'name ist erforderlich',
                });
            }
            const volume = getNested(originalJson, 'volume');
            if (volume !== undefined && volume !== null && String(volume).trim() !== '') {
                if (!isIntegerString(volume)) {
                    errors.push({
                        fieldPath: 'volume',
                        rule: 'integer',
                        message: 'volume muss eine ganze Zahl sein (integer)',
                    });
                }
            }
            const customerIds = getNested(originalJson, 'customer_ids');
            const customers = getNested(originalJson, 'customers');
            const hasCustomerIds = isArray(customerIds) && customerIds.length > 0;
            const hasCustomers = isArray(customers) && customers.length > 0;
            // nicht beides gleichzeitig
            if (hasCustomerIds && hasCustomers) {
                errors.push({
                    fieldPath: 'customer_ids/customers',
                    rule: 'mutually_exclusive',
                    message: 'Bitte entweder customer_ids oder customers senden, nicht beides.',
                });
            }
            // wenn customers: last_name required, birthday format optional prüfen
            if (hasCustomers) {
                for (let idx = 0; idx < customers.length; idx++) {
                    const c = customers[idx];
                    const lastName = c?.last_name;
                    if (!isPresentString(lastName)) {
                        errors.push({
                            fieldPath: `customers[${idx}].last_name`,
                            rule: 'required',
                            message: 'customers[].last_name ist erforderlich',
                        });
                    }
                    // optional: birthday format
                    if (c?.birthday !== undefined && c?.birthday !== null && String(c.birthday).trim() !== '') {
                        if (!isDateYYYYMMDD(c.birthday)) {
                            errors.push({
                                fieldPath: `customers[${idx}].birthday`,
                                rule: 'date_format',
                                message: 'customers[].birthday muss im Format YYYY-MM-DD sein',
                            });
                        }
                    }
                }
            }
            if (!hasCustomerIds && !hasCustomers) {
                errors.push({
                    fieldPath: 'customer_ids/customers',
                    rule: 'required',
                    message: 'Es muss entweder customer_ids oder customers gesetzt sein.',
                });
            }
            const validation = {
                ok: errors.length === 0,
                errors,
            };
            const json = keepOriginal
                ? {
                    ...originalJson,
                    validation,
                }
                : { validation };
            if (validation.ok) {
                validOut.push({ json });
            }
            else {
                invalidOut.push({ json });
            }
        }
        return [validOut, invalidOut];
    }
}
exports.CountertopStudioValidateDeal = CountertopStudioValidateDeal;
