import { Score } from 'autoevals';
import { Criterion, CriterionEvaluationParams, CriterionResult } from '../../core/src/criteria/criterion';
/** Criterion that uses an [autoevals](https://github.com/braintrustdata/autoevals) scorer for evaluation. */
export declare class AutoEvalsScorerCriterion implements Criterion<Score> {
    readonly params: {
        name: string;
        scorer: (params: Parameters<typeof AutoEvalsScorerCriterion.prototype.evaluate>[0]) => Score | Promise<Score>;
        successThreshold?: number;
    };
    name: string;
    constructor(params: {
        name: string;
        scorer: (params: Parameters<typeof AutoEvalsScorerCriterion.prototype.evaluate>[0]) => Score | Promise<Score>;
        successThreshold?: number;
    });
    evaluate(params: CriterionEvaluationParams): Promise<CriterionResult<Score>>;
}
