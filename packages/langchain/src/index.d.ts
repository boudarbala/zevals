import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage as LCBaseMessage } from '@langchain/core/messages';
import { Runnable } from '@langchain/core/runnables';
import { Agent, Judge, Message } from '../../core/src/eval-runner';
import { SyntheticUser } from '../../core/src/segment';
export declare function langChainMessageToZEvals(message: LCBaseMessage): Message | undefined;
export declare function langChainMessageFromZEvals(messages: Message): LCBaseMessage | undefined;
export declare function langChainZEvalsSyntheticUser({ runnable, }: {
    runnable: Runnable<LCBaseMessage[], LCBaseMessage>;
}): SyntheticUser;
export declare function langChainZEvalsAgent({ runnable, }: {
    runnable: Runnable<LCBaseMessage[], LCBaseMessage>;
}): Agent;
export declare function langChainZEvalsJudge({ model }: {
    model: BaseChatModel;
}): Judge;
