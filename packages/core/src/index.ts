import * as criteria from './criteria/index';
import * as runner from './eval-runner';
import * as segments from './segment';

export * from './criteria/index';
export * from './eval-runner';
export * from './segment';

const zevals = { ...criteria, ...runner, ...segments };

export default zevals;
