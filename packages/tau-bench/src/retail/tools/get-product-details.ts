import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB } from '../data/db';

export const GetProductDetailsInput = Type.Object({
  product_id: Type.String({
    description:
      "The product id, such as '6086499569'. Be careful the product id is different from the item id.",
  }),
});

export const GetProductDetailsOutput = Type.Object({
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
});

export type GetProductDetailsInputType = Static<typeof GetProductDetailsInput>;
export type GetProductDetailsOutputType = Static<typeof GetProductDetailsOutput>;

export const getProductDetailsTool: TaubenchTool<
  typeof GetProductDetailsInput,
  typeof GetProductDetailsOutput,
  DB
> = {
  id: 'get_product_details',
  inputSchema: GetProductDetailsInput,
  outputSchema: GetProductDetailsOutput,
  async invoke(input, db) {
    const { product_id } = input;
    const product = db.products[product_id];
    if (!product) {
      return { success: false, status: 404, message: 'Product not found' };
    }
    return { success: true, output: product };
  },
};
