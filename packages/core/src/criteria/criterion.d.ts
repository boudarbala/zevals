import { type Message } from '../eval-runner';
/** A way of evaluating the subject's responses. */
export interface Criterion<Output> {
    name: string;
    evaluate(params: CriterionEvaluationParams): Promise<CriterionResult<Output>>;
}
export type CriterionEvaluationParams = {
    messages: Array<Message>;
};
/** The result of a criterion evaluation. */
export type CriterionResult<Output> = {
    output: Output;
    /** The reason for this outcomme */
    reason?: string;
    /** Error thrown during criterion evaluation. */
    error?: unknown;
    /** Whether the test passed or failed. Undefined if status was not determined during evaluation. */
    status?: 'success' | 'failure';
};
export declare const Criterion: {
    negate<T>(c: Criterion<T>): Criterion<T>;
    and<T, U>(c1: Criterion<T>, c2: Criterion<U>): Criterion<[T, U]>;
    pipe<T, U>(c: Criterion<T>, fn: (output: T) => U): Criterion<U>;
};
