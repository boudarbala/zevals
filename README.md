# Zevals

Simple, practical AI evaluations in TypeScript.

Zevals provides utilities for testing AI agents. Unlike the few existing AI eval libraries and frameworks:

- Treats AI evals like end-to-end tests, with less focus on metrics and more focus on binary assertions
- Designed to evaluate full conversations, not just single query/response pairs
- Does not impose any testing framework or test runner

# Example

```typescript
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
```

# Installation

```sh
npm install @zevals/core
```

# Features

- Support for evaluating entire scenarios, with optional user simulation
- Utilities for LLM-as-a-judge, and more programmatic assertion functions for tool calling
- Utilities for wrapping your existing user message-handling logic into an agent that can be easily tested
- Very simple, extensible design, with no assumptions about how you will use the library
- Facilities for benchmarking using popular benchmarks like tau-bench
- (Optionally) integrates with any LLM provider via LangChain
- (Optionally) integrates with Braintrust's autoeval scorers
- As type-safe as practically possible

## Assertions

Zevals provies a few ways to assert that your agent did what it was supposed to do. Most notably, you can run assertions on the tool calls made by your agents:

```typescript
import * as zevals from '@zevals/core';
import { simpleExampleAgent } from './simple-example-agent.js';

test('Tool calls example', { timeout: 10000 }, async () => {
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
```

> [!NOTE]
> You can find more examples in the [examples directory](./packages/test/src/examples/).
