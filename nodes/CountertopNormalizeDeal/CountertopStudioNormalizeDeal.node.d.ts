import type { IExecuteFunctions, INodeExecutionData, INodeType, INodeTypeDescription, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
export declare class CountertopStudioNormalizeDeal implements INodeType {
    description: INodeTypeDescription;
    methods: {
        loadOptions: {
            getDealAdditionalFieldOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
            getCustomerAdditionalFieldOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]>;
        };
    };
    execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}
