import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB, OrdersSchema } from '../data/db';

export const ReturnDeliveredOrderItemsInput = Type.Object({
  order_id: Type.String({
    description:
      "The order id, such as '#W0000000'. Be careful there is a '#' symbol at the beginning of the order id.",
  }),
  item_ids: Type.Array(Type.String(), {
    description:
      "The item ids to be returned, each such as '1008292230'. There could be duplicate items in the list.",
  }),
  payment_method_id: Type.String({
    description:
      "The payment method id to pay or receive refund for the item price difference, such as 'gift_card_0000000' or 'credit_card_0000000'. These can be looked up from the user or order details.",
  }),
});

export type ReturnDeliveredOrderItemsInputType = Static<typeof ReturnDeliveredOrderItemsInput>;
export type ReturnDeliveredOrderItemsOutputType = Static<typeof OrdersSchema>;

export const returnDeliveredOrderItemsTool: TaubenchTool<
  typeof ReturnDeliveredOrderItemsInput,
  typeof OrdersSchema,
  DB
> = {
  id: 'return_delivered_order_items',
  inputSchema: ReturnDeliveredOrderItemsInput,
  outputSchema: OrdersSchema,
  async invoke(input, db) {
    const { order_id, item_ids, payment_method_id } = input;
    const order = db.orders[order_id];
    if (!order) {
      return { success: false, status: 404, message: 'Order not found' };
    }
    if (order.status !== 'delivered') {
      return { success: false, status: 400, message: 'Non-delivered order cannot be returned' };
    }
    const paymentMethod = db.users[order.user_id].payment_methods[payment_method_id];
    if (!paymentMethod) {
      return { success: false, status: 400, message: 'Payment method not found' };
    }
    if (
      !payment_method_id.includes('gift_card') &&
      payment_method_id !== order.payment_history[0].payment_method_id
    ) {
      return {
        success: false,
        status: 400,
        message: 'Payment method should be either the original payment method or a gift card',
      };
    }
    const allItemIds = order.items.map((item) => item.item_id);
    for (const itemId of item_ids) {
      if (
        item_ids.filter((id) => id === itemId).length >
        allItemIds.filter((id) => id === itemId).length
      ) {
        return { success: false, status: 400, message: `Item ${itemId} not found` };
      }
    }
    order.status = 'return requested';
    return { success: true, output: order };
  },
};
