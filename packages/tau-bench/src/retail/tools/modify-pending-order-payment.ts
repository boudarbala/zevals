import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB, OrdersSchema } from '../data/db';

export const ModifyPendingOrderPaymentInput = Type.Object({
  order_id: Type.String({
    description:
      "The order id, such as '#W0000000'. Be careful there is a '#' symbol at the beginning of the order id.",
  }),
  payment_method_id: Type.String({
    description:
      "The payment method id to pay or receive refund for the item price difference, such as 'gift_card_0000000' or 'credit_card_0000000'. These can be looked up from the user or order details.",
  }),
});

export type ModifyPendingOrderPaymentInputType = Static<typeof ModifyPendingOrderPaymentInput>;
export type ModifyPendingOrderPaymentOutputType = Static<typeof OrdersSchema>;

export const modifyPendingOrderPaymentTool: TaubenchTool<
  typeof ModifyPendingOrderPaymentInput,
  typeof OrdersSchema,
  DB
> = {
  id: 'modify_pending_order_payment',
  inputSchema: ModifyPendingOrderPaymentInput,
  outputSchema: OrdersSchema,
  async invoke(input, db) {
    const { order_id, payment_method_id } = input;
    const order = db.orders[order_id];
    if (!order) {
      return { success: false, status: 404, message: 'Order not found' };
    }
    if (order.status !== 'pending') {
      return { success: false, status: 400, message: 'Non-pending order cannot be modified' };
    }
    const paymentMethod = db.users[order.user_id].payment_methods[payment_method_id];
    if (!paymentMethod) {
      return { success: false, status: 400, message: 'Payment method not found' };
    }
    if (
      order.payment_history.length > 1 ||
      order.payment_history[0].transaction_type !== 'payment'
    ) {
      return {
        success: false,
        status: 400,
        message: 'There should be exactly one payment for a pending order',
      };
    }
    if (order.payment_history[0].payment_method_id === payment_method_id) {
      return {
        success: false,
        status: 400,
        message: 'The new payment method should be different from the current one',
      };
    }
    const amount = order.payment_history[0].amount;
    if (paymentMethod.source === 'gift_card' && paymentMethod.balance < amount) {
      return {
        success: false,
        status: 400,
        message: 'Insufficient gift card balance to pay for the order',
      };
    }
    order.payment_history.push(
      {
        transaction_type: 'payment',
        amount,
        payment_method_id,
      },
      {
        transaction_type: 'refund',
        amount,
        payment_method_id: order.payment_history[0].payment_method_id,
      },
    );
    if (paymentMethod.source === 'gift_card') {
      paymentMethod.balance = Number((paymentMethod.balance - amount).toFixed(2));
    }
    const oldPaymentMethodId = order.payment_history[0].payment_method_id;
    if (oldPaymentMethodId.includes('gift_card')) {
      const oldPaymentMethod = db.users[order.user_id].payment_methods[oldPaymentMethodId];
      if (oldPaymentMethod.source === 'gift_card') {
        oldPaymentMethod.balance = Number((oldPaymentMethod.balance + amount).toFixed(2));
      }
    }
    return { success: true, output: order };
  },
};
