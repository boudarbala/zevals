import { ChatOpenAI } from '@langchain/openai';
import {
  aiAssertion,
  aiEval,
  evaluate,
  message,
  MockCriterion,
  userSimulation,
} from '@zevals/core';
import { langChainZEvalsAgent, langChainZEvalsJudge } from '@zevals/langchain';
import { getTestModel } from './test.util.js';

describe('Evaluator', () => {
  const agent = langChainZEvalsAgent({ runnable: getTestModel() });

  it.concurrent('should traverse the scenario correctly', async () => {
    const { results } = await evaluate({
      agent,
      segments: [
        message({ role: 'user', content: 'Hello' }),
        message({ role: 'assistant', content: 'Hi there!' }),
      ],
    });

    expect(results).toHaveLength(2);
  });

  it.concurrent('should evaluate criteria correctly', async () => {
    const { results } = await evaluate({
      agent: agent,
      segments: [
        message({ role: 'system', content: 'You are a helpful assistant named Mark.' }),

        message({ role: 'user', content: 'Hi! What is your name?' }),

        message({ role: 'assistant', content: 'My name is Mark!' }),

        aiEval(
          new MockCriterion({
            result: {
              status: 'success',
              reason: 'All good!',
              output: 'Mock!',
            },
          }),
        ),
      ],
    });

    expect(results).toHaveLength(4);

    expect(results[0].type).toBe('message');
    expect(results[1].type).toBe('message');
    expect(results[2].type).toBe('message');
    expect((results[3] as any).evalResult).toMatchObject({
      status: 'success',
      reason: 'All good!',
      output: 'Mock!',
    });
  });

  test('User simulation', { timeout: 10000 }, async () => {
    const res = await evaluate({
      agent: agent,
      segments: [
        userSimulation({
          until: aiAssertion({
            judge: langChainZEvalsJudge({ model: new ChatOpenAI({ model: 'gpt-4.1-mini' }) }),
            prompt: 'The AI has greeted the user',
          }),
          user: {
            async respond() {
              return { role: 'user', content: 'Hi!' };
            },
          },
        }),
      ],
    });

    expect(res.results).toHaveLength(3);

    expect(
      res.results[0].type === 'message' && res.results[0].message.content.toString() === 'Hi!',
    ).toBeTruthy();

    expect(
      res.results[1].type === 'agent_response' &&
        res.results[1].agentResponse.response.role === 'assistant',
    ).toBeTruthy();

    expect(
      res.results[2].type === 'eval' && res.results[2].evalResult.status === 'success',
    ).toBeTruthy();
  });
});
