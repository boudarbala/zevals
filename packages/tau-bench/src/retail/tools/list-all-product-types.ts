import { Static, Type } from '@sinclair/typebox';
import { TaubenchTool } from '../../taubench-tool';
import { DB } from '../data/db';

export const ListAllProductTypesInput = Type.Object({});
export const ListAllProductTypesOutput = Type.Object({
  result: Type.Record(Type.String(), Type.String()),
});

export type ListAllProductTypesInputType = Static<typeof ListAllProductTypesInput>;
export type ListAllProductTypesOutputType = Static<typeof ListAllProductTypesOutput>;

export const listAllProductTypesTool: TaubenchTool<
  typeof ListAllProductTypesInput,
  typeof ListAllProductTypesOutput,
  DB
> = {
  id: 'list_all_product_types',
  inputSchema: ListAllProductTypesInput,
  outputSchema: ListAllProductTypesOutput,
  async invoke(_input, db) {
    const productDict: Record<string, string> = {};
    for (const [productId, product] of Object.entries(db.products)) {
      productDict[product.name] = productId;
    }
    const sortedDict = Object.fromEntries(
      Object.entries(productDict).sort(([a], [b]) => a.localeCompare(b)),
    );
    return { success: true, output: { result: sortedDict } };
  },
};
