import { z } from 'zod';
import { Judge } from '../eval-runner';
import { Criterion, CriterionEvaluationParams, CriterionResult } from './criterion';

export const aiAssertion: (options: { prompt: string; judge: Judge }) => Criterion<boolean> = (
  options,
) => ({
  name: options.prompt,

  async evaluate(params: CriterionEvaluationParams): Promise<CriterionResult<boolean>> {
    const prompt = `
    You are a judge.

    You evaluate the truth value of an assertion based on a given prompt.
    The prompt is a statement about a conversation between the AI assistant and the user.

    You need to determine if the response is a correct answer to the prompt.

    Assertion prompt:
    <assertion-prompt>
    ${options.prompt}
    </assertion-prompt>

    Conversation between AI and user:
    <conversation>
    ${params.messages
      .map((message) => {
        return `<${message.role}>${message.content.toString()}</${message.role}>`;
      })
      .join('\n\n')}
    </conversation>
    `;

    const {
      output: { verdict, reason },
    } = await options.judge.invoke({
      messages: [{ role: 'system', content: prompt }],
      schema: z.object({
        verdict: z.boolean().describe('True if the assertion is correct, false otherwise'),

        reason: z
          .string()
          .nullable()
          .describe('If false, explain why the assertion fails. Null if the assertion passes.'),
      }),
    });

    return {
      output: verdict,
      reason: reason?.trim() || undefined,
      status: verdict ? 'success' : 'failure',
    };
  },
});
