import { Criterion, CriterionEvaluationParams, CriterionResult } from '@zevals/core';
import { Score } from 'autoevals';

/** Criterion that uses an [autoevals](https://github.com/braintrustdata/autoevals) scorer for evaluation. */
export class AutoEvalsScorerCriterion implements Criterion<Score> {
  name: string;

  constructor(
    readonly params: {
      name: string;
      scorer: (
        params: Parameters<typeof AutoEvalsScorerCriterion.prototype.evaluate>[0],
      ) => Score | Promise<Score>;
      successThreshold?: number;
    },
  ) {
    this.name = params.name;
  }

  async evaluate(params: CriterionEvaluationParams): Promise<CriterionResult<Score>> {
    const result = await this.params.scorer(params);

    return {
      output: result,
      status:
        result.score !== null
          ? result.score >= (this.params.successThreshold ?? 1)
            ? 'success'
            : 'failure'
          : 'failure',
    };
  }
}
