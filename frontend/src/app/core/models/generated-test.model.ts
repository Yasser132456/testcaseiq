import { Priority, RiskLevel } from './analysis.model';

export type TestCaseType =
  | 'FUNCTIONAL'
  | 'NEGATIVE'
  | 'BOUNDARY'
  | 'API'
  | 'E2E'
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'ACCESSIBILITY'
  | 'REGRESSION'
  | 'BDD';

export type TestLayer = 'UI' | 'API' | 'DATABASE' | 'INTEGRATION' | 'E2E' | 'UNIT' | 'SYSTEM';

export type ReviewStatus =
  | 'DRAFT'
  | 'NEEDS_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_CLARIFICATION'
  | 'EXPORTED';

export interface GeneratedTestSuiteResult {
  id: string | null;
  storyId: string;
  suiteName: string;
  testCases: GeneratedTestCase[];
  qaValidation: {
    requirementQualityScore: number;
    testabilityScore: number;
    warnings: string[];
  };
  provider: string;
  generatedAt: string | null;
  explainabilitySummary?: string | null;
}

export interface GeneratedTestCase {
  id?: string | null;
  title: string;
  description: string | null;
  objective?: string | null;
  type: TestCaseType;
  testLayer: TestLayer | null;
  priority: Priority | null;
  riskLevel: RiskLevel | null;
  automationCandidate: boolean;
  confidenceScore: number | null;
  reviewStatus?: ReviewStatus | null;
  linkedRequirementReferences: string[];
  sourceEvidence?: string | null;
  preconditions?: string | null;
  bddScenario: string | null;
  steps: GeneratedTestStep[];
  testData: GeneratedTestData[];
  qualityScore?: number | null;
  confidenceLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  generationRationale?: string | null;
  linkedAcceptanceCriteriaText?: string | null;
}

export interface GeneratedTestStep {
  id?: string | null;
  order: number;
  action: string;
  expectedResult: string | null;
}

export interface GeneratedTestData {
  id?: string | null;
  name: string;
  valueJson: string | null;
  classification?: string | null;
}
