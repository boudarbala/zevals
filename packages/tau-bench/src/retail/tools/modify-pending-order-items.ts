import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB, OrdersSchema } from '../data/db';

export const ModifyPendingOrderItemsInput = Type.Object({
  order_id: Type.String({
    description:
      "The order id, such as '#W0000000'. Be careful there is a '#' symbol at the beginning of the order id.",
  }),
  item_ids: Type.Array(Type.String(), {
    description:
      "The item ids to be modified, each such as '1008292230'. There could be duplicate items in the list.",
  }),
  new_item_ids: Type.Array(Type.String(), {
    description:
      "The item ids to be modified for, each such as '1008292230'. There could be duplicate items in the list. Each new item id should match the item id in the same position and be of the same product.",
  }),
  payment_method_id: Type.String({
    description:
      "The payment method id to pay or receive refund for the item price difference, such as 'gift_card_0000000' or 'credit_card_0000000'. These can be looked up from the user or order details.",
  }),
});

export type ModifyPendingOrderItemsInputType = Static<typeof ModifyPendingOrderItemsInput>;
export type ModifyPendingOrderItemsOutputType = Static<typeof OrdersSchema>;

export const modifyPendingOrderItemsTool: TaubenchTool<
  typeof ModifyPendingOrderItemsInput,
  typeof OrdersSchema,
  DB
> = {
  id: 'modify_pending_order_items',
  inputSchema: ModifyPendingOrderItemsInput,
  outputSchema: OrdersSchema,
  async invoke(input, db) {
    const { order_id, item_ids, new_item_ids, payment_method_id } = input;
    const order = db.orders[order_id];
    if (!order) {
      return { success: false, status: 404, message: 'Order not found' };
    }
    if (order.status !== 'pending') {
      return { success: false, status: 400, message: 'Non-pending order cannot be modified' };
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
    if (item_ids.length !== new_item_ids.length) {
      return {
        success: false,
        status: 400,
        message: 'The number of items to be exchanged should match',
      };
    }
    let diffPrice = 0;
    for (const [itemId, newItemId] of item_ids.map((id, i) => [id, new_item_ids[i]])) {
      const item = order.items.find((item) => item.item_id === itemId)!;
      const productId = item.product_id;
      const variant = db.products[productId].variants[newItemId];
      if (!variant || !variant.available) {
        return {
          success: false,
          status: 400,
          message: `New item ${newItemId} not found or available`,
        };
      }
      const oldPrice = item.price;
      const newPrice = variant.price;
      diffPrice += newPrice - oldPrice;
    }
    const paymentMethod = db.users[order.user_id].payment_methods[payment_method_id];
    if (!paymentMethod) {
      return { success: false, status: 400, message: 'Payment method not found' };
    }
    if (paymentMethod.source === 'gift_card' && paymentMethod.balance < diffPrice) {
      return {
        success: false,
        status: 400,
        message: 'Insufficient gift card balance to pay for the new item',
      };
    }
    order.payment_history.push({
      transaction_type: diffPrice > 0 ? 'payment' : 'refund',
      amount: Math.abs(diffPrice),
      payment_method_id,
    });
    if (paymentMethod.source === 'gift_card') {
      paymentMethod.balance = Number((paymentMethod.balance - diffPrice).toFixed(2));
    }
    for (const [itemId, newItemId] of item_ids.map((id, i) => [id, new_item_ids[i]])) {
      const item = order.items.find((item) => item.item_id === itemId)!;
      const productId = item.product_id;
      const variant = db.products[productId].variants[newItemId];
      item.item_id = newItemId;
      item.price = variant.price;
      item.options = variant.options;
    }
    order.status = 'pending (item modified)';
    return { success: true, output: order };
  },
};
