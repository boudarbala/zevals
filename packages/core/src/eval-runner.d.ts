import { z, ZodObject, ZodRawShape } from 'zod';
import { Criterion, CriterionResult } from './criteria/criterion';
import { Segment } from './segment';
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
export type UserMessage = {
    role: 'user';
    content: string;
};
export type ToolResultMessage = {
    role: 'tool';
    tool_call_id?: string;
    name: string;
    content: Record<string, unknown>;
};
export type SystemMessage = {
    role: 'system';
    content: string;
};
export type Message = AIMessage | UserMessage | ToolResultMessage | SystemMessage;
/**
 * The result of evaluating a {@link Segment}, where each `agent_response` is replaced with the agent's actual response,
 * and each `eval`'s result is included.
 */
export type EvaluatedSegment = {
    type: 'message';
    message: Message;
} | {
    type: 'eval';
    evalResult: CriterionResult<any>;
    criterion: Criterion<any>;
} | {
    type: 'agent_response';
    agentResponse: AgentInvocationResult;
};
/** The context that was used by the agent to generate a response. */
export type AgentResponseGenerationContext = {
    /**
     * Messages that were used as prompts to produce the response.
     * If not specified, the chat history prior to the response will be used for evaluation.
     */
    promptUsed?: Message[];
    /** The tool calls that were made by the LLM. */
    tool_calls?: Array<ToolCall & {
        result?: Record<string, any>;
    }>;
};
/** The result of invoking a {@link Agent} to generate an AI response to be evaluated. */
export type AgentInvocationResult = {
    /** The final response, i.e. the message returned to the user. */
    response: AIMessage;
    /** The context provided to the LLM to produce the output. */
    context?: AgentResponseGenerationContext;
};
/** An AI agent to evaluate. */
export interface Agent {
    invoke(messages: Array<Message>): Promise<AgentInvocationResult>;
}
/** An AI to be used for extracting structured output from the conversation. */
export interface Judge {
    invoke<Shape extends ZodRawShape, T extends ZodObject<Shape>>(params: {
        messages: Array<Message>;
        schema: T;
    }): Promise<{
        output: z.infer<T>;
    }>;
}
/**
 * Evaluates the scenario (`segments`) against the agent.
 */
export declare function evaluate<A extends Agent>({ agent, segments, }: {
    agent: A | (() => Promise<A>);
    /** The {@link Segment}s to evaluate `this.params.agent` against. */
    segments: Array<Segment<A>>;
}): Promise<{
    results: EvaluatedSegment[];
    /**
     * Get all evaluation results for this particular criterion instance (using reference equality).
     */
    getResults: <T>(criterion: Criterion<T>) => CriterionResult<T>[];
    /**
     * Gets the first result of a given criterion instance (using reference equality).
     */
    getResult: <T>(criterion: Criterion<T>) => CriterionResult<T> | undefined;
    /**
     * Gets the first result of a given criterion instance (using reference equality)
     * @throws if the criterion is not found.
     * **Note**: Use `getResults` as a safer alternative.
     */
    getResultOrThrow: <T>(criterion: Criterion<T>) => CriterionResult<T>;
}>;
