import { tool } from '@langchain/core/tools';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import zevals from '@zevals/core';
import { langChainMessagesFromZEvals, langChainMessageToZEvals } from '@zevals/langchain';

/**
 * This is an example {@link zevals.Agent} implementation that you can use as a reference for adapting your own agent to zevals.
 */
export function simpleExampleAgent(): zevals.Agent {
  // Object representing mock session state
  // In the real world, you would store this in the database
  const sessionState: { messages: zevals.Message[] } = { messages: [] };

  const model = new ChatOpenAI({ model: 'gpt-4.1-mini', temperature: 0 });

  // We track tools called for each agent invocation
  const currentToolCalls: Array<zevals.ToolCall> = [];

  const dateTool = tool(
    () => {
      const date = new Date();
      const result = {
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
      };
      currentToolCalls.push({ name: 'get_current_date', args: {}, result });
      return result;
    },
    {
      name: 'get_current_date',
      description: 'Get the current date',
    },
  );

  // Imagine you're getting your own AI agent logic here, not this pre-build langchain agent
  const agent = createReactAgent({ llm: model, tools: [dateTool] });

  return {
    async invoke({ messages }) {
      const userMessage = messages.findLast((m) => m.role === 'user');
      if (!userMessage) {
        throw new Error('No user message found');
      }

      sessionState.messages.push(userMessage);

      const agentResponse = await agent
        .invoke({
          messages: langChainMessagesFromZEvals(sessionState.messages),
        })
        .then((res) => res.messages.at(-1));

      if (!agentResponse || agentResponse.getType() !== 'ai') {
        throw new Error('No agent response generated');
      }

      // We save the agent's response in session state for the next user message
      // (in a real agent, this is where you would talk to your database)
      sessionState.messages.push(langChainMessageToZEvals(agentResponse)!);

      // We include this context with the response to let the evaluator know about any tool calls made by the agent
      const context: zevals.AgentResponseGenerationContext = { tool_calls: [...currentToolCalls] };

      // We reset the current tool calls buffer
      currentToolCalls.length = 0;

      return {
        // We return our AI agent's response to the evaluator
        message: { role: 'assistant', content: agentResponse.content.toString(), context },
      };
    },
  };
}
