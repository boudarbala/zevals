import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB, OrdersSchema } from '../data/db';

export const ModifyPendingOrderAddressInput = Type.Object({
  order_id: Type.String({
    description:
      "The order id, such as '#W0000000'. Be careful there is a '#' symbol at the beginning of the order id.",
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

export type ModifyPendingOrderAddressInputType = Static<typeof ModifyPendingOrderAddressInput>;
export type ModifyPendingOrderAddressOutputType = Static<typeof OrdersSchema>;

export const modifyPendingOrderAddressTool: TaubenchTool<
  typeof ModifyPendingOrderAddressInput,
  typeof OrdersSchema,
  DB
> = {
  id: 'modify_pending_order_address',
  inputSchema: ModifyPendingOrderAddressInput,
  outputSchema: OrdersSchema,
  async invoke(input, db) {
    const { order_id, address1, address2, city, state, country, zip } = input;
    const order = db.orders[order_id];
    if (!order) {
      return { success: false, status: 404, message: 'Order not found' };
    }
    if (order.status !== 'pending') {
      return { success: false, status: 400, message: 'Non-pending order cannot be modified' };
    }
    order.address = { address1, address2, city, state, country, zip };
    return { success: true, output: order };
  },
};
