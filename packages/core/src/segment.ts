import { Criterion, CriterionResult } from './criteria/criterion';
import { Agent, AIMessage, Message, UserMessage } from './eval-runner';

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
      const agentResponse = await agent.invoke({ messages: previousActualMessages });

      return [{ type: 'message', message: agentResponse.message }];
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

/** The result of evaluating a {@link Segment}. */
export type SegmentEvaluationPromise =
  | {
      type: 'eval';
      criterion: Criterion<any>;
      evalResult: Promise<CriterionResult<any>>;
    }
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

      const maxIterations = max ?? 10;

      for (let i = 0; i < maxIterations; i++) {
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

        const agentResponse = await agent.invoke({ messages: previousActualMessages });

        evaluatedSegmentPromises.push({
          type: 'message',
          message: agentResponse.message,
        });
        previousActualMessages.push(agentResponse.message);

        const breakConditionResult = await until.evaluate({
          messages: previousActualMessages,
        });

        // If break condition is met, we add the last successful criterion evaluation result
        if (breakConditionResult.status === 'success') {
          evaluatedSegmentPromises.push({
            type: 'eval',
            criterion: until,
            evalResult: Promise.resolve(breakConditionResult),
          });

          return evaluatedSegmentPromises;
        }

        // If max is reached, we add the last failed criterion evaluation result
        if (i === maxIterations - 1) {
          evaluatedSegmentPromises.push({
            type: 'eval',
            criterion: until,
            evalResult: Promise.resolve(breakConditionResult),
          });

          return evaluatedSegmentPromises;
        }
      }

      return evaluatedSegmentPromises;
    },
  };
}
