import { Judge } from '../eval-runner';
import { Criterion } from './criterion';
export declare const aiAssertion: (options: {
    prompt: string;
    judge: Judge;
}) => Criterion<boolean>;
