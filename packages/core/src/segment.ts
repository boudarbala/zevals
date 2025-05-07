import { Criterion, CriterionResult } from './criteria/criterion';
import { Agent, AgentInvocationResult, AIMessage, Message, UserMessage } from './eval-runner';

/** An AI that plays the role of a user. */
export interface SyntheticUser {
  respond(params: { messages: Array<UserMessage | AIMessage> }): Promise<UserMessage>;
}

/** Part of a scenario to be evaluated. */
export interface Segment<A extends Agent = Agent> {
  /** Adds to the 'history', or events of the evaluation.
   * @returns An array of {@link SegmentEvaluationPromise}s to add to the evaluation history/results.
   */
  evaluate(params: {
    agent: A;
    previousActualMessages: Message[];
  }): Promise<Array<SegmentEvaluationPromise>>;
}

/** Simply adds a message to the evaluation history. No magic here. */
export function message(message: Message): Segment {
  return {
    async evaluate() {
      return [{ type: 'message', message }];
    },
  };
}

/** Invokes the AI agent to generate a response. */
export function agentResponse<A extends Agent = Agent>(): Segment<A> {
  return {
    async evaluate({ agent, previousActualMessages }) {
      const agentResponse = await agent.invoke(previousActualMessages);

      return [{ type: 'agent_response', agentResponse }];
    },
  };
}

/** Evaluates the conversation history against a {@link Criterion}. */
export function aiEval(criterion: Criterion<any>): Segment {
  return {
    async evaluate({ previousActualMessages }) {
      if (previousActualMessages.length === 0) {
        throw new Error('Criterion evaluation appears before any messages');
      }

      const evalResult = criterion.evaluate({
        messages: previousActualMessages,
      });

      return [{ type: 'eval', evalResult, criterion }];
    },
  };
}

// export type Segment =
//   | { type: 'message'; message: Message }
//   | { type: 'user_simulation'; until: Criterion<any>; user: SyntheticUser; max?: number }
//   | { type: 'agent_response' };

/** The result of evaluating a {@link Segment}. */
export type SegmentEvaluationPromise =
  | {
      type: 'eval';
      criterion: Criterion<any>;
      evalResult: Promise<CriterionResult<any>>;
    }
  | { type: 'agent_response'; agentResponse: AgentInvocationResult }
  | { type: 'message'; message: Message };

export function userSimulation({
  user,
  max,
  until,
}: {
  user: SyntheticUser;
  until: Criterion<any>;
  max?: number;
}): Segment {
  return {
    async evaluate({ agent, previousActualMessages }) {
      const evaluatedSegmentPromises: Array<SegmentEvaluationPromise> = [];

      for (let i = 0; i < (max ?? 10); i++) {
        const userResponse = await user.respond({
          messages: previousActualMessages.flatMap((m) => {
            if (m.role === 'user' || m.role === 'assistant') return [m];
            return [];
          }),
        });
        evaluatedSegmentPromises.push({
          type: 'message',
          message: { role: 'user', content: userResponse.content },
        });
        previousActualMessages.push({ role: 'user', content: userResponse.content });

        const agentResponse = await agent.invoke(previousActualMessages);

        evaluatedSegmentPromises.push({
          type: 'agent_response',
          agentResponse: agentResponse,
        });
        previousActualMessages.push(agentResponse.response);

        const breakConditionResult = await until.evaluate({
          messages: previousActualMessages,
        });

        evaluatedSegmentPromises.push({
          type: 'eval',
          criterion: until,
          evalResult: Promise.resolve(breakConditionResult),
        });

        if (breakConditionResult.status === 'success') {
          break;
        }
      }

      return evaluatedSegmentPromises;
    },
  };
}
