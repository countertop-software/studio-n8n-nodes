"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountertopStudioApi = void 0;
class CountertopStudioApi {
    constructor() {
        this.name = 'countertopStudioApi';
        this.displayName = 'Countertop Studio API';
        this.properties = [
            {
                displayName: 'X-API-Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
            },
            {
                displayName: 'X-Department-Id',
                name: 'departmentId',
                type: 'string',
                default: '',
                required: true,
            },
        ];
    }
}
exports.CountertopStudioApi = CountertopStudioApi;
