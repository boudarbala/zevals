import { Static, TObject } from '@sinclair/typebox';

export interface TaubenchTool<Input extends TObject, Output extends TObject, Context> {
  id: string;
  inputSchema: Input;
  outputSchema: Output;
  invoke: (
    input: Static<Input>,
    context: Context,
  ) => Promise<
    { success: true; output: Static<Output> } | { success: false; status: number; message: string }
  >;
}
