import { RiskLevel } from './analysis.model';
import { ReviewStatus } from './generated-test.model';

export interface CaseRef {
  id: string;
  title: string;
  status: ReviewStatus;
}

export interface RequirementCoverage {
  reference: string | null;
  title: string;
  riskLevel: RiskLevel | null;
  linkedCases: CaseRef[];
  covered: boolean;
}

export interface CoverageGap {
  key: string;
  description: string;
  riskLevel: RiskLevel | null;
  kind: 'REQUIREMENT' | 'CATEGORY';
}

export interface CoverageReportResponse {
  storyId: string;
  requirements: RequirementCoverage[];
  gaps: CoverageGap[];
  coveredCount: number;
  totalRequirements: number;
}
