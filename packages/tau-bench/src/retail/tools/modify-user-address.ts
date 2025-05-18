import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB, UserSchema } from '../data/db';

export const ModifyUserAddressInput = Type.Object({
  user_id: Type.String({
    description: "The user id, such as 'sara_doe_496'.",
  }),
  address1: Type.String({
    description: "The first line of the address, such as '123 Main St'.",
  }),
  address2: Type.String({
    description: "The second line of the address, such as 'Apt 1' or ''.",
  }),
  city: Type.String({
    description: "The city, such as 'San Francisco'.",
  }),
  state: Type.String({
    description: "The state, such as 'CA'.",
  }),
  country: Type.String({
    description: "The country, such as 'USA'.",
  }),
  zip: Type.String({
    description: "The zip code, such as '12345'.",
  }),
});

export type ModifyUserAddressInputType = Static<typeof ModifyUserAddressInput>;
export type ModifyUserAddressOutputType = Static<typeof UserSchema>;

export const modifyUserAddressTool: TaubenchTool<
  typeof ModifyUserAddressInput,
  typeof UserSchema,
  DB
> = {
  id: 'modify_user_address',
  inputSchema: ModifyUserAddressInput,
  outputSchema: UserSchema,
  async invoke(input, db) {
    const { user_id, address1, address2, city, state, country, zip } = input;
    const user = db.users[user_id];
    if (!user) {
      return { success: false, status: 404, message: 'User not found' };
    }
    user.address = { address1, address2, city, state, country, zip };
    return { success: true, output: user };
  },
};
