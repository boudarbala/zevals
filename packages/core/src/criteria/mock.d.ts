import { Criterion, CriterionResult } from './criterion';
export declare class MockCriterion<Output> implements Criterion<Output> {
    private params;
    name: string;
    constructor(params: {
        result: CriterionResult<Output>;
        name?: string;
    });
    evaluate(_: any): Promise<CriterionResult<Output>>;
}
