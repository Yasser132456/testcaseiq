import { ReviewStatus } from '../models/generated-test.model';

export type AsyncOperationPhase = 'idle' | 'running' | 'success' | 'error';

export interface StoryAiOperationState {
  phase: AsyncOperationPhase;
  storyId: string | null;
  sequence: number;
}

export interface ReviewOperationState {
  phase: AsyncOperationPhase;
  testCaseId: string | null;
  verdict: ReviewStatus | null;
  sequence: number;
}
