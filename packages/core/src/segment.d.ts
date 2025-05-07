import { Criterion, CriterionResult } from './criteria/criterion';
import { Agent, AgentInvocationResult, AIMessage, Message, UserMessage } from './eval-runner';
/** An AI that plays the role of a user. */
export interface SyntheticUser {
    respond(params: {
        messages: Array<UserMessage | AIMessage>;
    }): Promise<UserMessage>;
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
export declare function message(message: Message): Segment;
/** Invokes the AI agent to generate a response. */
export declare function agentResponse<A extends Agent = Agent>(): Segment<A>;
/** Evaluates the conversation history against a {@link Criterion}. */
export declare function aiEval(criterion: Criterion<any>): Segment;
/** The result of evaluating a {@link Segment}. */
export type SegmentEvaluationPromise = {
    type: 'eval';
    criterion: Criterion<any>;
    evalResult: Promise<CriterionResult<any>>;
} | {
    type: 'agent_response';
    agentResponse: AgentInvocationResult;
} | {
    type: 'message';
    message: Message;
};
export declare function userSimulation({ user, max, until, }: {
    user: SyntheticUser;
    until: Criterion<any>;
    max?: number;
}): Segment;
