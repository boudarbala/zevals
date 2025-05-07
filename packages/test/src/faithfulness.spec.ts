import { aiEval, evaluate, faithfulnessCriterion, message } from '@zevals/core';
import { langChainZEvalsAgent, langChainZEvalsJudge } from '@zevals/langchain';
import { getTestModel } from './test.util.js';

describe('FaithfulnessCriterion', () => {
  const agent = langChainZEvalsAgent({
    runnable: getTestModel(),
  });
  const judge = langChainZEvalsJudge({ model: getTestModel() });

  it.concurrent('should evaluate basic scenario correctly', async () => {
    const { results } = await evaluate({
      agent,
      segments: [
        message({
          role: 'system',
          content:
            'A Zeeber is a large pink cylinder. When asked about Zeeber, give this definition, no more, no less.',
        }),

        message({ role: 'user', content: 'What is a Zeeber?' }),
        message({ role: 'assistant', content: 'A Zeeber is a large pink cylinder.' }),
        aiEval(faithfulnessCriterion({ judge })),
      ],
    });

    expect(results.length > 0).toBe(true);
    expect((results[3] as any)?.evalResult?.output.results[0].supported).toBe(true);
  });
});
