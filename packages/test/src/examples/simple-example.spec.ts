import { ChatOpenAI } from '@langchain/openai';
import * as zevals from '@zevals/core';
import { langChainZEvalsJudge } from '@zevals/langchain';

test('Simple example', async () => {
  const agent: zevals.Agent = {
    async invoke(messages) {
      // Run your application logic to generate a response for the user
      return { response: { role: 'assistant', content: 'What kind of vitamin?' } };
    },
  };

  const judge = langChainZEvalsJudge({
    model: new ChatOpenAI({
      modelName: 'gpt-4.1-mini',
      temperature: 0,
    }),
  });

  const followupAssertion = zevals.aiAssertion({
    judge,
    prompt: 'The assistant asked a followup question',
  });

  const { getResultOrThrow } = await zevals.evaluate({
    agent,
    segments: [
      // The user wants vitamins
      zevals.message({ role: 'user', content: 'I want another bottle of the vitamin' }),

      // The agent responds
      zevals.agentResponse(),

      // We judge the above
      zevals.aiEval(followupAssertion),
    ],
  });

  // Run your assertions on type-safe outputs
  expect(getResultOrThrow(followupAssertion).output).toBe(true);
});
