import { Criterion, CriterionResult } from './criterion';

export class MockCriterion<Output> implements Criterion<Output> {
  name: string;

  constructor(
    private params: {
      result: CriterionResult<Output>;
      name?: string;
    },
  ) {
    this.name = params.name ?? 'Mock';
  }

  async evaluate(_: any) {
    return this.params.result;
  }
}
