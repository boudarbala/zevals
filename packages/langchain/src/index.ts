import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AIMessage as LCAIMessage,
  BaseMessage as LCBaseMessage,
  HumanMessage as LCHumanMessage,
  SystemMessage as LCSystemMessage,
  ToolMessage as LCToolMessage,
} from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { Agent, Judge, Message } from '../../core/src/eval-runner';
import { SyntheticUser } from '../../core/src/segment';

export function langChainMessageToZEvals(message: LCBaseMessage): Message | undefined {
  if (message instanceof LCSystemMessage) {
    return {
      role: 'system',
      content: message.content.toString(),
    };
  }
  if (message instanceof LCAIMessage) {
    return {
      role: 'assistant',
      content: message.content.toString(),
      tool_calls: message.tool_calls?.map((tc) => ({ id: tc.id, name: tc.name, args: tc.args })),
    };
  } else if (message instanceof LCHumanMessage) {
    return {
      role: 'user',
      content: message.content.toString(),
    };
  } else if (message instanceof LCToolMessage) {
    return {
      role: 'tool',
      name: message.name ?? '_unknown_',
      tool_call_id: message.tool_call_id,
      content: JSON.parse(message.content.toString()),
    };
  }
}

export function langChainMessageFromZEvals(messages: Message): LCBaseMessage | undefined {
  if (messages.role === 'system') {
    return new LCSystemMessage(messages.content);
  } else if (messages.role === 'user') {
    return new LCHumanMessage(messages.content);
  } else if (messages.role === 'assistant') {
    return new LCAIMessage(messages.content);
  } else if (messages.role === 'tool') {
    return new LCToolMessage({
      tool_call_id: messages.tool_call_id ?? crypto.randomUUID(),
      name: messages.name,
      content: JSON.stringify(messages.content),
    });
  }
}

export function langChainZEvalsSyntheticUser({
  runnable,
}: {
  runnable: Runnable<LCBaseMessage[], LCBaseMessage>;
}): SyntheticUser {
  return {
    async respond(params) {
      const lcMessages = params.messages.flatMap((m) => {
        const message = langChainMessageFromZEvals(m);
        return message ? [message] : [];
      });

      const userResponse = langChainMessageToZEvals(await runnable.invoke(lcMessages));

      if (!userResponse) {
        throw new Error('No result from LangChain');
      }

      return { role: 'user', content: userResponse.content.toString() };
    },
  };
}

export function langChainZEvalsAgent({
  runnable,
}: {
  runnable: Runnable<LCBaseMessage[], LCBaseMessage>;
}): Agent {
  return {
    async invoke(messages) {
      const lcMessages = messages.flatMap((m) => {
        const message = langChainMessageFromZEvals(m);
        return message ? [message] : [];
      });

      const response = langChainMessageToZEvals(await runnable.invoke(lcMessages));

      if (!response) {
        throw new Error('No result from LangChain');
      }

      return { response: { role: 'assistant', content: response.content.toString() } };
    },
  };
}

export function langChainZEvalsJudge({ model }: { model: BaseChatModel }): Judge {
  return {
    async invoke({ messages, schema }) {
      const lcMessages = messages.flatMap((m) => {
        const message = langChainMessageFromZEvals(m);
        return message ? [message] : [];
      });

      const output = await model.withStructuredOutput?.(schema).invoke(lcMessages);
      if (!output) {
        throw new Error('Given model does not support structured output');
      }

      return { output };
    },
  };
}
