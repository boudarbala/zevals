import FastifyBearerAuthPlugin from '@fastify/bearer-auth';
import FastifySwaggerPlugin from '@fastify/swagger';
import FastifySwaggerUIPlugin from '@fastify/swagger-ui';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import Fastify, { type FastifyRequest } from 'fastify';
import { buildRetailDB, OrdersSchema } from './data/db';
import { scenarios } from './data/trajectories';

export async function policy() {
  return fetch(
    'https://raw.githubusercontent.com/sierra-research/tau-bench/14bf0ef52e595922d597a38f32d3e8c0dce3a8f8/tau_bench/envs/retail/wiki.md',
  ).then((res) => res.text());
}

export { scenarios };

function getRootFastify() {
  return Fastify().withTypeProvider<TypeBoxTypeProvider>();
}

export async function serve({
  port = 5552,
  auth,
}: {
  port?: number;
  auth?: { validateToken: (token: string) => boolean; header?: string };
}) {
  const rootFastify = getRootFastify();

  await rootFastify.register(FastifySwaggerPlugin, {
    exposeHeadRoutes: false,
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Tau-Bench Retail API',
        description:
          'API for Tau-Bench Retail, providing access to products, categories, brands, orders, and customers',
        version: '0.1.0',
      },
      components: {
        securitySchemes: {
          Bearer: {
            type: 'http',
            scheme: 'bearer',
          },
          Tenant: {
            type: 'apiKey',
            in: 'header',
            name: 'x-tenant-id',
          },
        },
      },
      security: [{ Bearer: [], Tenant: [] }],
      servers: [
        {
          url: `http://localhost:${port}`,
        },
      ],
    },
  });

  await rootFastify.register(FastifySwaggerUIPlugin, {
    routePrefix: '/docs',
  });

  let dbContext: ReturnType<typeof privateRoutes>;
  if (auth) {
    rootFastify.register(async (fastify) => {
      fastify.register(FastifyBearerAuthPlugin, {
        keys: new Set([auth.header ?? 'authorizatiion']),
        auth: auth.validateToken,
      });

      dbContext = privateRoutes(fastify);
    });
  } else {
    dbContext = privateRoutes(rootFastify);
  }

  // Listen on port
  rootFastify.listen({ port }, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Tau-Bench Retail Server docs at http://localhost:${port}/docs`);
  });

  await rootFastify.ready();

  return { server: rootFastify, ...dbContext! };
}

function getTenantId(request: FastifyRequest) {
  const tenantId = request.headers['x-tenant-id'] as string;
  if (!tenantId) {
    return 'default';
  }

  return tenantId;
}

function privateRoutes(fastify: ReturnType<typeof getRootFastify>) {
  const dbsByTenantId = new Map<string, Awaited<ReturnType<typeof buildRetailDB>>>();

  async function getDB(tenantId: string) {
    if (!dbsByTenantId.has(tenantId)) {
      dbsByTenantId.set(tenantId, await buildRetailDB());
    }
    return dbsByTenantId.get(tenantId)!;
  }

  fastify.post(
    '/cancel-pending-order',
    {
      schema: {
        operationId: 'cancel_pending_order',
        description:
          "Cancel a pending order. If the order is already processed or delivered, it cannot be cancelled. The agent needs to explain the cancellation detail and ask for explicit user confirmation (yes/no) to proceed. If the user confirms, the order status will be changed to 'cancelled' and the payment will be refunded. The refund will be added to the user's gift card balance immediately if the payment was made using a gift card, otherwise the refund would take 5-7 business days to process. The function returns the order details after the cancellation.",
        body: Type.Object({
          order_id: Type.String({
            description:
              "The order id, such as '#W0000000'. Be careful there is a '#' symbol at the beginning of the order id.",
          }),
          reason: Type.Union(
            [Type.Literal('no longer needed'), Type.Literal('ordered by mistake')],
            {
              description:
                "The reason for cancellation, which should be either 'no longer needed' or 'ordered by mistake'.",
            },
          ),
        }),
        response: {
          200: OrdersSchema,
          400: Type.Object({
            error: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { order_id, reason } = request.body;

      // Check if order exists and is pending
      const order = db.orders[order_id];
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      if (order.status !== 'pending') {
        return reply.status(400).send({ error: 'Non-pending order cannot be cancelled' });
      }

      // Handle refunds
      const refunds = order.payment_history.map((payment) => ({
        transaction_type: 'refund',
        amount: payment.amount,
        payment_method_id: payment.payment_method_id,
      }));

      // Update gift card balances if applicable
      for (const payment of order.payment_history) {
        if (payment.payment_method_id.includes('gift_card')) {
          const paymentMethod = db.users[order.user_id].payment_methods[payment.payment_method_id];
          if (paymentMethod.source === 'gift_card') {
            paymentMethod.balance = Number((paymentMethod.balance + payment.amount).toFixed(2));
          }
        }
      }

      // Update order status
      order.status = 'cancelled';
      order.payment_history.push(...refunds);

      return reply.send(order);
    },
  );

  fastify.post(
    '/exchange-delivered-order-items',
    {
      schema: {
        operationId: 'exchange_delivered_order_items',
        description:
          'Exchange items in a delivered order to new items of the same product type. For a delivered order, return or exchange can be only done once by the agent. The agent needs to explain the exchange detail and ask for explicit user confirmation (yes/no) to proceed.',
        body: Type.Object({
          order_id: Type.String({
            description:
              "The order id, such as '#W0000000'. Be careful there is a '#' symbol at the beginning of the order id.",
          }),
          item_ids: Type.Array(Type.String(), {
            description:
              "The item ids to be exchanged, each such as '1008292230'. There could be duplicate items in the list.",
          }),
          new_item_ids: Type.Array(Type.String(), {
            description:
              "The item ids to be exchanged for, each such as '1008292230'. There could be duplicate items in the list. Each new item id should match the item id in the same position and be of the same product.",
          }),
          payment_method_id: Type.String({
            description:
              "The payment method id to pay or receive refund for the item price difference, such as 'gift_card_0000000' or 'credit_card_0000000'. These can be looked up from the user or order details.",
          }),
        }),
        response: {
          200: OrdersSchema,
          400: Type.Object({
            error: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { order_id, item_ids, new_item_ids, payment_method_id } = request.body;

      // Check if order exists and is delivered
      const order = db.orders[order_id];
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      if (order.status !== 'delivered') {
        return reply.status(400).send({ error: 'Non-delivered order cannot be exchanged' });
      }

      // Check the items to be exchanged exist
      const allItemIds = order.items.map((item) => item.item_id);
      for (const itemId of item_ids) {
        if (
          item_ids.filter((id) => id === itemId).length >
          allItemIds.filter((id) => id === itemId).length
        ) {
          return reply.status(400).send({ error: `Item ${itemId} not found` });
        }
      }

      // Check new items exist and match old items and are available
      if (item_ids.length !== new_item_ids.length) {
        return reply
          .status(400)
          .send({ error: 'The number of items to be exchanged should match' });
      }

      let diffPrice = 0;
      for (const [itemId, newItemId] of item_ids.map((id, i) => [id, new_item_ids[i]])) {
        const item = order.items.find((item) => item.item_id === itemId)!;
        const productId = item.product_id;
        const variant = db.products[productId].variants[newItemId];

        if (!variant || !variant.available) {
          return reply.status(400).send({ error: `New item ${newItemId} not found or available` });
        }

        const oldPrice = item.price;
        const newPrice = variant.price;
        diffPrice += newPrice - oldPrice;
      }

      diffPrice = Number(diffPrice.toFixed(2));

      // Check payment method exists and can cover the price difference if gift card
      const paymentMethod = db.users[order.user_id].payment_methods[payment_method_id];
      if (!paymentMethod) {
        return reply.status(400).send({ error: 'Payment method not found' });
      }

      if (paymentMethod.source === 'gift_card' && paymentMethod.balance < diffPrice) {
        return reply.status(400).send({
          error: 'Insufficient gift card balance to pay for the price difference',
        });
      }

      // Modify the order
      order.status = 'exchange requested';

      return reply.send(order);
    },
  );

  fastify.get(
    '/find-user-id-by-email',
    {
      schema: {
        operationId: 'find_user_id_by_email',
        description:
          'Find user id by email. If the user is not found, the function will return an error message.',
        querystring: Type.Object({
          email: Type.String({
            description: "The email of the user, such as 'something@example.com'.",
          }),
        }),
        response: {
          200: Type.Object({
            user_id: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { email } = request.query;

      const user = Object.entries(db.users).find(
        ([_, profile]) => profile.email.toLowerCase() === email.toLowerCase(),
      );

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({ user_id: user[0] });
    },
  );

  fastify.get(
    '/find-user-id-by-name-zip',
    {
      schema: {
        operationId: 'find_user_id_by_name_zip',
        description:
          'Find user id by first name, last name, and zip code. If the user is not found, the function will return an error message. By default, find user id by email, and only call this function if the user is not found by email or cannot remember email.',
        querystring: Type.Object({
          first_name: Type.String({
            description: "The first name of the customer, such as 'John'.",
          }),
          last_name: Type.String({
            description: "The last name of the customer, such as 'Doe'.",
          }),
          zip: Type.String({
            description: "The zip code of the customer, such as '12345'.",
          }),
        }),
        response: {
          200: Type.Object({
            user_id: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { first_name, last_name, zip } = request.query;

      const user = Object.entries(db.users).find(
        ([_, profile]) =>
          profile.name.first_name.toLowerCase() === first_name.toLowerCase() &&
          profile.name.last_name.toLowerCase() === last_name.toLowerCase() &&
          profile.address.zip === zip,
      );

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({ user_id: user[0] });
    },
  );

  fastify.get(
    '/get-order-details',
    {
      schema: {
        operationId: 'get_order_details',
        description: 'Get the status and details of an order.',
        querystring: Type.Object({
          order_id: Type.String({
            description:
              "The order id, such as '#W0000000'. Be careful there is a '#' symbol at the beginning of the order id.",
          }),
        }),
        response: {
          200: OrdersSchema,
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { order_id } = request.query;

      const order = db.orders[order_id];
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      return reply.send(order);
    },
  );

  fastify.get(
    '/get-product-details',
    {
      schema: {
        operationId: 'get_product_details',
        description: 'Get the inventory details of a product.',
        querystring: Type.Object({
          product_id: Type.String({
            description:
              "The product id, such as '6086499569'. Be careful the product id is different from the item id.",
          }),
        }),
        response: {
          200: Type.Object({
            name: Type.String(),
            product_id: Type.String(),
            variants: Type.Record(
              Type.String(),
              Type.Object({
                item_id: Type.String(),
                options: Type.Record(Type.String(), Type.String()),
                available: Type.Boolean(),
                price: Type.Number(),
              }),
            ),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { product_id } = request.query;

      const product = db.products[product_id];
      if (!product) {
        return reply.status(404).send({ error: 'Product not found' });
      }

      return reply.send(product);
    },
  );

  fastify.get(
    '/get-user-details',
    {
      schema: {
        operationId: 'get_user_details',
        description: 'Get the details of a user, including their orders.',
        querystring: Type.Object({
          user_id: Type.String({
            description: "The user id, such as 'sara_doe_496'.",
          }),
        }),
        response: {
          200: Type.Object({
            name: Type.Object({
              first_name: Type.String(),
              last_name: Type.String(),
            }),
            address: Type.Object({
              address1: Type.String(),
              address2: Type.String(),
              city: Type.String(),
              country: Type.String(),
              state: Type.String(),
              zip: Type.String(),
            }),
            email: Type.String(),
            payment_methods: Type.Record(
              Type.String(),
              Type.Union([
                Type.Object({
                  source: Type.Literal('paypal'),
                  id: Type.String(),
                }),
                Type.Object({
                  source: Type.Literal('credit_card'),
                  brand: Type.String(),
                  last_four: Type.String(),
                  id: Type.String(),
                }),
                Type.Object({
                  source: Type.Literal('gift_card'),
                  balance: Type.Number(),
                  id: Type.String(),
                }),
              ]),
            ),
            orders: Type.Array(Type.String()),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { user_id } = request.query;

      const user = db.users[user_id];
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send(user);
    },
  );

  fastify.get(
    '/list-all-product-types',
    {
      schema: {
        operationId: 'list_all_product_types',
        description:
          'List the name and product id of all product types. Each product type has a variety of different items with unique item ids and options. There are only 50 product types in the store.',
        response: {
          200: Type.Record(Type.String(), Type.String()),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);

      const productDict: Record<string, string> = {};
      for (const [productId, product] of Object.entries(db.products)) {
        productDict[product.name] = productId;
      }

      // Sort by product name
      const sortedDict = Object.fromEntries(
        Object.entries(productDict).sort(([a], [b]) => a.localeCompare(b)),
      );

      return reply.send(sortedDict);
    },
  );

  fastify.post(
    '/modify-pending-order-address',
    {
      schema: {
        operationId: 'modify_pending_order_address',
        description:
          'Modify the shipping address of a pending order. The agent needs to explain the modification detail and ask for explicit user confirmation (yes/no) to proceed.',
        body: Type.Object({
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
        }),
        response: {
          200: OrdersSchema,
          400: Type.Object({
            error: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { order_id, address1, address2, city, state, country, zip } = request.body;

      // Check if order exists and is pending
      const order = db.orders[order_id];
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      if (order.status !== 'pending') {
        return reply.status(400).send({ error: 'Non-pending order cannot be modified' });
      }

      // Update the address
      order.address = {
        address1,
        address2,
        city,
        state,
        country,
        zip,
      };

      return reply.send(order);
    },
  );

  fastify.post(
    '/modify-pending-order-items',
    {
      schema: {
        operationId: 'modify_pending_order_items',
        description:
          'Modify items in a pending order to new items of the same product type. For a pending order, this function can only be called once. The agent needs to explain the exchange detail and ask for explicit user confirmation (yes/no) to proceed.',
        body: Type.Object({
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
        }),
        response: {
          200: OrdersSchema,
          400: Type.Object({
            error: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { order_id, item_ids, new_item_ids, payment_method_id } = request.body;

      // Check if order exists and is pending
      const order = db.orders[order_id];
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      if (order.status !== 'pending') {
        return reply.status(400).send({ error: 'Non-pending order cannot be modified' });
      }

      // Check if the items to be modified exist
      const allItemIds = order.items.map((item) => item.item_id);
      for (const itemId of item_ids) {
        if (
          item_ids.filter((id) => id === itemId).length >
          allItemIds.filter((id) => id === itemId).length
        ) {
          return reply.status(400).send({ error: `Item ${itemId} not found` });
        }
      }

      // Check new items exist, match old items, and are available
      if (item_ids.length !== new_item_ids.length) {
        return reply
          .status(400)
          .send({ error: 'The number of items to be exchanged should match' });
      }

      let diffPrice = 0;
      for (const [itemId, newItemId] of item_ids.map((id, i) => [id, new_item_ids[i]])) {
        const item = order.items.find((item) => item.item_id === itemId)!;
        const productId = item.product_id;
        const variant = db.products[productId].variants[newItemId];

        if (!variant || !variant.available) {
          return reply.status(400).send({ error: `New item ${newItemId} not found or available` });
        }

        const oldPrice = item.price;
        const newPrice = variant.price;
        diffPrice += newPrice - oldPrice;
      }

      // Check if the payment method exists
      const paymentMethod = db.users[order.user_id].payment_methods[payment_method_id];
      if (!paymentMethod) {
        return reply.status(400).send({ error: 'Payment method not found' });
      }

      // If the new item is more expensive, check if the gift card has enough balance
      if (paymentMethod.source === 'gift_card' && paymentMethod.balance < diffPrice) {
        return reply.status(400).send({
          error: 'Insufficient gift card balance to pay for the new item',
        });
      }

      // Handle the payment or refund
      order.payment_history.push({
        transaction_type: diffPrice > 0 ? 'payment' : 'refund',
        amount: Math.abs(diffPrice),
        payment_method_id,
      });

      // Update gift card balance if applicable
      if (paymentMethod.source === 'gift_card') {
        paymentMethod.balance = Number((paymentMethod.balance - diffPrice).toFixed(2));
      }

      // Modify the order items
      for (const [itemId, newItemId] of item_ids.map((id, i) => [id, new_item_ids[i]])) {
        const item = order.items.find((item) => item.item_id === itemId)!;
        const productId = item.product_id;
        const variant = db.products[productId].variants[newItemId];

        item.item_id = newItemId;
        item.price = variant.price;
        item.options = variant.options;
      }

      order.status = 'pending (item modified)';

      return reply.send(order);
    },
  );

  fastify.post(
    '/modify-pending-order-payment',
    {
      schema: {
        operationId: 'modify_pending_order_payment',
        description:
          'Modify the payment method of a pending order. The agent needs to explain the modification detail and ask for explicit user confirmation (yes/no) to proceed.',
        body: Type.Object({
          order_id: Type.String({
            description:
              "The order id, such as '#W0000000'. Be careful there is a '#' symbol at the beginning of the order id.",
          }),
          payment_method_id: Type.String({
            description:
              "The payment method id to pay or receive refund for the item price difference, such as 'gift_card_0000000' or 'credit_card_0000000'. These can be looked up from the user or order details.",
          }),
        }),
        response: {
          200: OrdersSchema,
          400: Type.Object({
            error: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { order_id, payment_method_id } = request.body;

      // Check if order exists and is pending
      const order = db.orders[order_id];
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      if (order.status !== 'pending') {
        return reply.status(400).send({ error: 'Non-pending order cannot be modified' });
      }

      // Check if the payment method exists
      const paymentMethod = db.users[order.user_id].payment_methods[payment_method_id];
      if (!paymentMethod) {
        return reply.status(400).send({ error: 'Payment method not found' });
      }

      // Check that the payment history should only have one payment
      if (
        order.payment_history.length > 1 ||
        order.payment_history[0].transaction_type !== 'payment'
      ) {
        return reply.status(400).send({
          error: 'There should be exactly one payment for a pending order',
        });
      }

      // Check that the payment method is different
      if (order.payment_history[0].payment_method_id === payment_method_id) {
        return reply.status(400).send({
          error: 'The new payment method should be different from the current one',
        });
      }

      const amount = order.payment_history[0].amount;

      // Check if the new payment method has enough balance if it is a gift card
      if (paymentMethod.source === 'gift_card' && paymentMethod.balance < amount) {
        return reply.status(400).send({
          error: 'Insufficient gift card balance to pay for the order',
        });
      }

      // Modify the payment method
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

      // If payment is made by gift card, update the balance
      if (paymentMethod.source === 'gift_card') {
        (paymentMethod as { source: 'gift_card'; id: string; balance: number }).balance = Number(
          (paymentMethod.balance - amount).toFixed(2),
        );
      }

      // If refund is made to a gift card, update the balance
      const oldPaymentMethodId = order.payment_history[0].payment_method_id;
      if (oldPaymentMethodId.includes('gift_card')) {
        const oldPaymentMethod = db.users[order.user_id].payment_methods[oldPaymentMethodId];
        if (oldPaymentMethod.source === 'gift_card') {
          oldPaymentMethod.balance = Number((oldPaymentMethod.balance + amount).toFixed(2));
        }
      }

      return reply.send(order);
    },
  );

  fastify.post(
    '/modify-user-address',
    {
      schema: {
        operationId: 'modify_user_address',
        description:
          'Modify the default address of a user. The agent needs to explain the modification detail and ask for explicit user confirmation (yes/no) to proceed.',
        body: Type.Object({
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
        }),
        response: {
          200: Type.Object({
            name: Type.Object({
              first_name: Type.String(),
              last_name: Type.String(),
            }),
            address: Type.Object({
              address1: Type.String(),
              address2: Type.String(),
              city: Type.String(),
              country: Type.String(),
              state: Type.String(),
              zip: Type.String(),
            }),
            email: Type.String(),
            payment_methods: Type.Record(
              Type.String(),
              Type.Union([
                Type.Object({
                  source: Type.Literal('paypal'),
                  id: Type.String(),
                }),
                Type.Object({
                  source: Type.Literal('credit_card'),
                  brand: Type.String(),
                  last_four: Type.String(),
                  id: Type.String(),
                }),
                Type.Object({
                  source: Type.Literal('gift_card'),
                  balance: Type.Number(),
                  id: Type.String(),
                }),
              ]),
            ),
            orders: Type.Array(Type.String()),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { user_id, address1, address2, city, state, country, zip } = request.body;

      // Check if user exists
      const user = db.users[user_id];
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Update the address
      user.address = {
        address1,
        address2,
        city,
        state,
        country,
        zip,
      };

      return reply.send(user);
    },
  );

  fastify.post(
    '/return-delivered-order-items',
    {
      schema: {
        operationId: 'return_delivered_order_items',
        description:
          "Return some items of a delivered order. The order status will be changed to 'return requested'. The agent needs to explain the return detail and ask for explicit user confirmation (yes/no) to proceed. The user will receive follow-up email for how and where to return the item.",
        body: Type.Object({
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
        }),
        response: {
          200: OrdersSchema,
          400: Type.Object({
            error: Type.String(),
          }),
          404: Type.Object({
            error: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = getTenantId(request);
      const db = await getDB(tenantId);
      const { order_id, item_ids, payment_method_id } = request.body;

      // Check if order exists and is delivered
      const order = db.orders[order_id];
      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      if (order.status !== 'delivered') {
        return reply.status(400).send({ error: 'Non-delivered order cannot be returned' });
      }

      // Check if the payment method exists and is either the original payment method or a gift card
      const paymentMethod = db.users[order.user_id].payment_methods[payment_method_id];
      if (!paymentMethod) {
        return reply.status(400).send({ error: 'Payment method not found' });
      }

      if (
        !payment_method_id.includes('gift_card') &&
        payment_method_id !== order.payment_history[0].payment_method_id
      ) {
        return reply.status(400).send({
          error: 'Payment method should be either the original payment method or a gift card',
        });
      }

      // Check if the items to be returned exist
      const allItemIds = order.items.map((item) => item.item_id);
      for (const itemId of item_ids) {
        if (
          item_ids.filter((id) => id === itemId).length >
          allItemIds.filter((id) => id === itemId).length
        ) {
          return reply.status(400).send({ error: `Item ${itemId} not found` });
        }
      }

      // Update the order status
      order.status = 'return requested';

      return reply.send(order);
    },
  );

  return { dbsByTenantId, getDB };
}
