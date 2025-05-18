import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB, OrdersSchema } from '../data/db';

export const CancelPendingOrderInput = Type.Object({
  order_id: Type.String({
    description:
      "The order id, such as '#W0000000'. Be careful there is a '#' symbol at the beginning of the order id.",
  }),
  reason: Type.Union([Type.Literal('no longer needed'), Type.Literal('ordered by mistake')], {
    description:
      "The reason for cancellation, which should be either 'no longer needed' or 'ordered by mistake'.",
  }),
});

export const CancelPendingOrderOutput = OrdersSchema;

export type CancelPendingOrderInputType = Static<typeof CancelPendingOrderInput>;
export type CancelPendingOrderOutputType = Static<typeof CancelPendingOrderOutput>;

export const cancelPendingOrderTool: TaubenchTool<
  typeof CancelPendingOrderInput,
  typeof CancelPendingOrderOutput,
  DB
> = {
  id: 'cancel_pending_order',
  inputSchema: CancelPendingOrderInput,
  outputSchema: CancelPendingOrderOutput,
  async invoke(input, db) {
    const { order_id } = input;
    const order = db.orders[order_id];
    if (!order) {
      return { success: false, status: 404, message: 'Order not found' };
    }
    if (order.status !== 'pending') {
      return { success: false, status: 400, message: 'Non-pending order cannot be cancelled' };
    }
    const refunds = order.payment_history.map((payment) => ({
      transaction_type: 'refund',
      amount: payment.amount,
      payment_method_id: payment.payment_method_id,
    }));
    for (const payment of order.payment_history) {
      if (payment.payment_method_id.includes('gift_card')) {
        const paymentMethod = db.users[order.user_id].payment_methods[payment.payment_method_id];
        if (paymentMethod.source === 'gift_card' && typeof paymentMethod.balance === 'number') {
          paymentMethod.balance = Number((paymentMethod.balance + payment.amount).toFixed(2));
        }
      }
    }
    order.status = 'cancelled';
    order.payment_history.push(...refunds);
    return { success: true, output: order };
  },
};
