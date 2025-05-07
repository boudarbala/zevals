import { Judge } from '../eval-runner';
import { Criterion } from './criterion';
type FaithfulnessCriterionResult = {
    results: {
        claim: string;
        supported: boolean;
    }[];
};
export declare function faithfulnessCriterion(params: {
    judge: Judge;
    /** The threshold for the score to be considered successful. Number between 0 and 1.  Default is 1 */
    scoreThreshold?: number;
}): Criterion<FaithfulnessCriterionResult>;
export {};
