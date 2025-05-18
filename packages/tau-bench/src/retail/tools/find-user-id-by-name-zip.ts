import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB } from '../data/db';

export const FindUserIdByNameZipInput = Type.Object({
  first_name: Type.String({
    description: "The first name of the customer, such as 'John'.",
  }),
  last_name: Type.String({
    description: "The last name of the customer, such as 'Doe'.",
  }),
  zip: Type.String({
    description: "The zip code of the customer, such as '12345'.",
  }),
});

export const FindUserIdByNameZipOutput = Type.Object({
  user_id: Type.String(),
});

export type FindUserIdByNameZipInputType = Static<typeof FindUserIdByNameZipInput>;
export type FindUserIdByNameZipOutputType = Static<typeof FindUserIdByNameZipOutput>;

export const findUserIdByNameZipTool: TaubenchTool<
  typeof FindUserIdByNameZipInput,
  typeof FindUserIdByNameZipOutput,
  DB
> = {
  id: 'find_user_id_by_name_zip',
  inputSchema: FindUserIdByNameZipInput,
  outputSchema: FindUserIdByNameZipOutput,
  async invoke(input, db) {
    const { first_name, last_name, zip } = input;
    const user = Object.entries(db.users).find(
      ([, profile]) =>
        profile.name.first_name.toLowerCase() === first_name.toLowerCase() &&
        profile.name.last_name.toLowerCase() === last_name.toLowerCase() &&
        profile.address.zip === zip,
    );
    if (!user) {
      return { success: false, status: 404, message: 'User not found' };
    }
    return { success: true, output: { user_id: user[0] } };
  },
};
