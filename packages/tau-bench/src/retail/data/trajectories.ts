import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

export const TrajectorySchema = Type.Object({
  task_id: Type.Integer(),
  info: Type.Object({
    task: Type.Object({
      user_id: Type.String(),
      instruction: Type.String(),
      actions: Type.Array(
        Type.Object({
          name: Type.String(),
          kwargs: Type.Record(Type.String(), Type.Unknown()),
        }),
      ),
    }),
  }),
});

export async function scenarios(params: { indexes?: Array<number> }) {
  const json: any = await fetch(
    'https://raw.githubusercontent.com/sierra-research/tau-bench/14bf0ef52e595922d597a38f32d3e8c0dce3a8f8/historical_trajectories/gpt-4o-retail.json',
  )
    .then((res) => res.json())
    .then((res) => (res as any[]).slice(0, 115));

  let items: any[] = [];

  if (params.indexes && params.indexes.length > 0) {
    for (const index of params.indexes) {
      items.push(json[index]);
    }
  } else {
    items = json;
  }

  return Value.Decode(Type.Array(TrajectorySchema), items);
}
