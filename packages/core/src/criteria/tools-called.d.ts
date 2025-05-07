import { Message, ToolCall } from '../eval-runner';
import { Criterion } from './criterion';
type AssertionResult = boolean | Promise<boolean> | undefined | Promise<undefined> | void | Promise<void>;
type ToolCallAssertionFn = (
/** The tool call that was made. */
toolCall: ToolCall) => AssertionResult;
type ToolCallAssertion = {
    /** Assert that the tool with this name was called. */
    name: string;
    /** Arbitrary assertion used to check the tool call's arguments and result. */
    assertion?: ToolCallAssertionFn;
};
type ToolCallsCriterionOutput = {
    toolCallOrderSatisfied: boolean;
};
export declare function extractToolCallsFromMessages(messages: Array<Message>): Array<ToolCall>;
export declare function aiToolCalls<T>(options: {
    assertion: (toolCalls: Array<ToolCall>) => T | Promise<T>;
}): Criterion<Awaited<T> | undefined>;
export declare const aiToolsCalled: (options: {
    /** Assert that the tool calls are in the same order as in the `toolCalls` array. */
    assertOrder?: boolean;
    /** Tool calls that must be made for this criterion to pass. */
    toolCalls: Array<ToolCallAssertion>;
}) => Criterion<ToolCallsCriterionOutput>;
export {};
