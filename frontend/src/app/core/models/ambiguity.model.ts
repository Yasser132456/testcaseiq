import { AmbiguitySeverity } from './analysis.model';

export type AmbiguityResolutionStatus = 'OPEN' | 'ANSWERED' | 'DISMISSED';

export interface AmbiguityResponse {
  id: string;
  question: string;
  context: string | null;
  severity: AmbiguitySeverity;
  status: AmbiguityResolutionStatus;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
}

export interface AmbiguityResolutionRequest {
  resolutionNotes: string | null;
  status: AmbiguityResolutionStatus;
}
