import { openai } from '@ai-sdk/openai';
import zevals from '@zevals/core';
import { vercelZEvalsAgent, vercelZEvalsJudge } from '@zevals/vercel';
import { generateText } from 'ai';

test('Vercel AI SDK integration', { timeout: 10000 }, async () => {
  const model = openai.chat('gpt-4.1-mini');

  const agent = vercelZEvalsAgent({
    runnable({ messages }) {
      // Put any agent logic here
      return generateText({ model, messages });
    },
  });

  const judge = vercelZEvalsJudge({ model });

  const { messages, success } = await zevals.evaluate({
    agent,
    segments: [
      zevals.message({ role: 'user', content: 'Hello' }),

      zevals.agentResponse(),

      zevals.aiEval(zevals.aiAssertion({ judge, prompt: 'The assistant greeted the user' })),
    ],
  });

  expect(success).toBe(true);
  expect(messages).toHaveLength(2);
});
