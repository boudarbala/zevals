import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB, OrdersSchema } from '../data/db';

export const GetOrderDetailsInput = Type.Object({
  order_id: Type.String({
    description:
      "The order id, such as '#W0000000'. Be careful there is a '#' symbol at the beginning of the order id.",
  }),
});

export type GetOrderDetailsInputType = Static<typeof GetOrderDetailsInput>;
export type GetOrderDetailsOutputType = Static<typeof OrdersSchema>;

export const getOrderDetailsTool: TaubenchTool<
  typeof GetOrderDetailsInput,
  typeof OrdersSchema,
  DB
> = {
  id: 'get_order_details',
  inputSchema: GetOrderDetailsInput,
  outputSchema: OrdersSchema,
  async invoke(input, db) {
    const { order_id } = input;
    const order = db.orders[order_id];
    if (!order) {
      return { success: false, status: 404, message: 'Order not found' };
    }
    return { success: true, output: order };
  },
};
