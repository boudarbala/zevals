import * as zevals from '@zevals/core';
import { simpleExampleAgent } from './simple-example-agent.js';

test('Tool calls example', { timeout: 20000 }, async () => {
  const agent = simpleExampleAgent();

  // We expect the `get_current_date` tool to be called and to return the current date
  const dateToolCalledAssertion = zevals.aiToolCalls({
    assertion(toolCalls) {
      const date = new Date();

      expect(toolCalls).toEqual(
        expect.arrayContaining([
          {
            name: 'get_current_date',
            args: {},
            result: {
              day: date.getDate(),
              month: date.getMonth(),
              year: date.getFullYear(),
            },
          },
        ]),
      );
    },
  });

  const { getResultOrThrow } = await zevals.evaluate({
    agent,
    segments: [
      zevals.message({ role: 'user', content: 'What day of month are we at?' }),

      zevals.agentResponse(),

      zevals.aiEval(dateToolCalledAssertion),
    ],
  });

  expect(getResultOrThrow(dateToolCalledAssertion).status).toEqual('success');
});
