import { z, ZodObject, ZodRawShape } from 'zod';
import { Criterion, CriterionResult } from './criteria/criterion';
import { Segment, SegmentEvaluationPromise } from './segment';
import { groupBy } from './utils';

export type ToolCall = {
  id?: string;
  name: string;
  args: Record<string, unknown>;
  result?: Record<string, any>;
};
export type AIMessage = {
  role: 'assistant';
  content: string;
  tool_calls?: Array<ToolCall>;
  context?: AgentResponseGenerationContext;
};
export type UserMessage = { role: 'user'; content: string };
export type ToolResultMessage = {
  role: 'tool';
  tool_call_id?: string;
  name: string;
  content: Record<string, unknown>;
};
export type SystemMessage = { role: 'system'; content: string };

export type Message = AIMessage | UserMessage | ToolResultMessage | SystemMessage;

export type EvaluatedSegment =
  | { type: 'message'; message: Message }
  | {
      type: 'eval';
      evalResult: CriterionResult<any>;
      criterion: Criterion<any>;
    };

/** The context that was used by the agent to generate a response. */
export type AgentResponseGenerationContext = {
  /**
   * Messages that were used as prompts to produce the response.
   * If not specified, the chat history prior to the response will be used for evaluation.
   */
  prompt_used?: Message[];
  /** The tool calls that were made by the LLM. */
  tool_calls?: Array<ToolCall & { result?: Record<string, any> }>;
};

/** The result of invoking a {@link Agent} to generate an AI response to be evaluated. */
export type AgentInvocationResult = {
  /** The final response, i.e. the message returned to the user. */
  message: AIMessage;
};

/** An AI agent to evaluate. */
export interface Agent {
  invoke(params: { messages: Array<Message> }): Promise<AgentInvocationResult>;
}

/** An AI to be used for extracting structured output from the conversation. */
export interface Judge {
  invoke<Shape extends ZodRawShape, T extends ZodObject<Shape>>(params: {
    messages: Array<Message>;
    schema: T;
  }): Promise<{ output: z.infer<T> }>;
}

/**
 * Evaluates the scenario (`segments`) against the agent.
 */
export async function evaluate<A extends Agent>({
  agent,
  segments,
}: {
  agent: A | (() => Promise<A>);
  /** The {@link Segment}s to evaluate `this.params.agent` against. */
  segments: Array<Segment<A>>;
}) {
  // Initialize the agent
  const _agent = typeof agent === 'function' ? await agent() : agent;

  const evaluatedSegmentPromises: Array<SegmentEvaluationPromise> = [];

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    const previousActualMessages = evaluatedSegmentPromises.flatMap((m) =>
      m.type === 'message' ? [m.message] : [],
    );

    const segmentResult = await segment.evaluate({ agent: _agent, previousActualMessages });

    evaluatedSegmentPromises.push(...segmentResult);
  }

  const results: EvaluatedSegment[] = await Promise.all(
    evaluatedSegmentPromises.map((res) => {
      if (res.type === 'eval') {
        return res.evalResult.then((evalResult) => ({
          type: 'eval' as const,
          evalResult,
          criterion: res.criterion,
        }));
      } else {
        return res;
      }
    }),
  );

  const getResult = <T>(criterion: Criterion<T>): CriterionResult<T> | undefined => {
    const res = results.find((r) => r.type === 'eval' && r.criterion === criterion);

    return (res as { evalResult: CriterionResult<T> } | undefined)?.evalResult;
  };

  const resultsByStatus = groupBy(
    results.flatMap((r) => (r.type === 'eval' && r.evalResult.status ? [r] : [])),
    (r) => r.evalResult.status ?? ('unknown' as const),
  );

  return {
    /** Evaluation history, including messages and eval results. */
    results,
    /** Evaluation results grouped by status. */
    resultsByStatus,
    /** Resulting messages. */
    messages: evaluatedSegmentPromises.flatMap((m) => (m.type === 'message' ? [m.message] : [])),

    /** True if no evals failed. */
    success: resultsByStatus.failure.length === 0,

    /**
     * Get all evaluation results for this particular criterion instance (using reference equality).
     */
    getResults: <T>(criterion: Criterion<T>): CriterionResult<T>[] => {
      return results.flatMap((r) =>
        r.type === 'eval' && r.criterion === criterion ? [r.evalResult] : [],
      );
    },

    /**
     * Gets the first result of a given criterion instance (using reference equality).
     */
    getResult,

    /**
     * Gets the first result of a given criterion instance (using reference equality)
     * @throws if the criterion is not found.
     * **Note**: Use `getResults` as a safer alternative.
     */
    getResultOrThrow: <T>(criterion: Criterion<T>): CriterionResult<T> => {
      const res = getResult(criterion);

      if (!res) {
        throw new Error(`Cannot find results for criterion ${criterion.name}`);
      }

      return res;
    },
  };
}
