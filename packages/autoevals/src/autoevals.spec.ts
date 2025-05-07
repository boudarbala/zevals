import { Factuality } from 'autoevals';
import { AutoEvalsScorerCriterion } from '.';
import { evaluate } from '../../core/src/eval-runner';
import { agentResponse, aiEval, message } from '../../core/src/segment';
import { getTestModel } from '../../core/src/test.util';
import { langChainZEvalsAgent } from '../../langchain/src';

describe('Autoevals', () => {
  test('Running autoevals scorers', async () => {
    const criterion = new AutoEvalsScorerCriterion({
      name: 'factuality',
      scorer: ({ messages }) =>
        Factuality({
          input: messages[0].content.toString(),
          output: messages[1].content.toString(),
          expected: 'Paris',
        }),
    });

    const agent = langChainZEvalsAgent({ runnable: getTestModel() });

    const { getResultOrThrow } = await evaluate({
      agent,

      segments: [
        message({
          role: 'user',
          content: 'What is the capital of France? Answer only with the name.',
        }),

        agentResponse(),

        aiEval(criterion),
      ],
    });

    const criterionOutput = getResultOrThrow(criterion);

    expect(criterionOutput.output.score).toBe(1);
    expect(criterionOutput.status).toBe('success');
  });
});
