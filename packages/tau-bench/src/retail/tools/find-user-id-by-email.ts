import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB } from '../data/db';

export const FindUserIdByEmailInput = Type.Object({
  email: Type.String({
    description: "The email of the user, such as 'something@example.com'.",
  }),
});

export const FindUserIdByEmailOutput = Type.Object({
  user_id: Type.String(),
});

export type FindUserIdByEmailInputType = Static<typeof FindUserIdByEmailInput>;
export type FindUserIdByEmailOutputType = Static<typeof FindUserIdByEmailOutput>;

export const findUserIdByEmailTool: TaubenchTool<
  typeof FindUserIdByEmailInput,
  typeof FindUserIdByEmailOutput,
  DB
> = {
  id: 'find_user_id_by_email',
  inputSchema: FindUserIdByEmailInput,
  outputSchema: FindUserIdByEmailOutput,
  async invoke(input, db) {
    const { email } = input;
    const user = Object.entries(db.users).find(
      ([, profile]) => profile.email.toLowerCase() === email.toLowerCase(),
    );
    if (!user) {
      return { success: false, status: 404, message: 'User not found' };
    }
    return { success: true, output: { user_id: user[0] } };
  },
};
