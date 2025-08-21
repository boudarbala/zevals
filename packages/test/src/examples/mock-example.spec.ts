import { Agent, agentResponse, aiEval, evaluate, message, MockCriterion } from '@zevals/core';

test('Mock example - No API keys required', async () => {
  // Create a simple agent that doesn't require external APIs
  const mockAgent: Agent = {
    async invoke({ messages }) {
      // Simple rule-based response for demo purposes
      const lastMessage = messages[messages.length - 1];
      const userContent = lastMessage.content.toString().toLowerCase();
      
      if (userContent.includes('hello') || userContent.includes('hi')) {
        return { message: { role: 'assistant', content: 'Hello! How can I help you today?' } };
      } else if (userContent.includes('name')) {
        return { message: { role: 'assistant', content: 'I am a helpful AI assistant.' } };
      } else if (userContent.includes('thank')) {
        return { message: { role: 'assistant', content: 'You\'re welcome! Is there anything else I can help with?' } };
      } else {
        return { message: { role: 'assistant', content: 'I understand. Let me help you with that.' } };
      }
    },
  };

  // Create mock evaluation criteria
  const politenessCheck = new MockCriterion({
    name: 'politeness',
    result: {
      status: 'success',
      reason: 'The response is polite and helpful',
      output: true,
    },
  });

  const helpfulnessCheck = new MockCriterion({
    name: 'helpfulness',
    result: {
      status: 'success', 
      reason: 'The response offers assistance',
      output: { score: 0.85, feedback: 'Good helpful response' },
    },
  });

  // Run the evaluation
  const { getResultOrThrow, results } = await evaluate({
    agent: mockAgent,
    segments: [
      // User greets the assistant
      message({ role: 'user', content: 'Hello there!' }),

      // Agent responds
      agentResponse(),

      // Evaluate politeness
      aiEval(politenessCheck),

      // User asks about the assistant
      message({ role: 'user', content: 'What is your name?' }),

      // Agent responds
      agentResponse(),

      // Evaluate helpfulness
      aiEval(helpfulnessCheck),

      // User thanks the assistant
      message({ role: 'user', content: 'Thank you!' }),

      // Agent responds
      agentResponse(),
    ],
  });

  // Verify the conversation flow
  expect(results).toHaveLength(8);
  
  // Check that we have the expected sequence of message and eval results
  expect(results[0].type).toBe('message'); // User: "Hello there!"
  expect(results[1].type).toBe('message'); // Agent response
  expect(results[2].type).toBe('eval');    // Politeness evaluation
  expect(results[3].type).toBe('message'); // User: "What is your name?"
  expect(results[4].type).toBe('message'); // Agent response
  expect(results[5].type).toBe('eval');    // Helpfulness evaluation  
  expect(results[6].type).toBe('message'); // User: "Thank you!"
  expect(results[7].type).toBe('message'); // Agent response

  // Verify evaluation results
  const politenessResult = getResultOrThrow(politenessCheck);
  expect(politenessResult.status).toBe('success');
  expect(politenessResult.output).toBe(true);

  const helpfulnessResult = getResultOrThrow(helpfulnessCheck);
  expect(helpfulnessResult.status).toBe('success');
  expect(helpfulnessResult.output.score).toBe(0.85);

  // Verify agent responses are appropriate
  const greetingResponse = (results[1] as any).message.content;
  expect(greetingResponse).toContain('Hello');

  const nameResponse = (results[4] as any).message.content;
  expect(nameResponse).toContain('assistant');

  const thankResponse = (results[7] as any).message.content;
  expect(thankResponse).toContain('welcome');
});