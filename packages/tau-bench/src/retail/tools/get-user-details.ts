import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB, UserSchema } from '../data/db';

export const GetUserDetailsInput = Type.Object({
  user_id: Type.String({
    description: "The user id, such as 'sara_doe_496'.",
  }),
});

export const GetUserDetailsOutput = UserSchema;

export type GetUserDetailsInputType = Static<typeof GetUserDetailsInput>;
export type GetUserDetailsOutputType = Static<typeof GetUserDetailsOutput>;

export const getUserDetailsTool: TaubenchTool<
  typeof GetUserDetailsInput,
  typeof GetUserDetailsOutput,
  DB
> = {
  id: 'get_user_details',
  inputSchema: GetUserDetailsInput,
  outputSchema: GetUserDetailsOutput,
  async invoke(input, db) {
    const { user_id } = input;
    const user = db.users[user_id];
    if (!user) {
      return { success: false, status: 404, message: 'User not found' };
    }
    return { success: true, output: user };
  },
};
