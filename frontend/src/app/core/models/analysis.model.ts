import { StoryType } from './story.model';

export type RequirementType =
  | 'FUNCTIONAL'
  | 'NON_FUNCTIONAL'
  | 'BUSINESS_RULE'
  | 'DATA_RULE'
  | 'SECURITY'
  | 'ROLE_PERMISSION'
  | 'INTEGRATION'
  | 'ACCEPTANCE_CRITERION';

export type AmbiguitySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CoverageCategory =
  | 'HAPPY_PATH'
  | 'NEGATIVE_PATH'
  | 'BOUNDARY'
  | 'ROLE_BASED'
  | 'DATA_VALIDATION'
  | 'API'
  | 'E2E'
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'ACCESSIBILITY'
  | 'REGRESSION';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface StoryAnalysisRequest {
  storyId: string;
  title: string;
  rawText: string;
  storyType: StoryType;
  acceptanceCriteria: string[];
}

export interface StoryAnalysisResult {
  storyId: string;
  actor: string | null;
  goal: string | null;
  businessValue?: string | null;
  confidenceScore?: number | null;
  requirements: RequirementExtractionResult;
  ambiguities: AmbiguityDetectionResult;
  coveragePlan: CoveragePlanResult;
  qaValidation: QaValidationResult;
  provider: string;
  generatedAt: string | null;
}

export interface RequirementExtractionResult {
  requirements: ExtractedRequirement[];
  acceptanceCriteria: string[];
}

export interface ExtractedRequirement {
  reference: string | null;
  title: string;
  description: string | null;
  type: RequirementType;
  priority: Priority | null;
  riskLevel: RiskLevel | null;
}

export interface AmbiguityDetectionResult {
  ambiguities: ExtractedAmbiguity[];
}

export interface ExtractedAmbiguity {
  question: string;
  context: string | null;
  impact?: string | null;
  affectedArea?: string | null;
  severity: AmbiguitySeverity;
}

export interface CoveragePlanResult {
  coverageItems: CoverageSuggestion[];
}

export interface CoverageSuggestion {
  requirementReference: string | null;
  category: CoverageCategory;
  description: string;
  riskLevel: RiskLevel | null;
}

export interface QaValidationResult {
  requirementQualityScore: number;
  testabilityScore: number;
  warnings: string[];
}
