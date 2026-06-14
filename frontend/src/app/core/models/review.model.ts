import { Priority, RiskLevel } from './analysis.model';
import { ReviewStatus, TestCaseType, TestLayer } from './generated-test.model';

export interface TestCaseResponse {
  id: string;
  testSuiteId: string;
  title: string;
  objective: string | null;
  type: TestCaseType;
  testLayer: TestLayer | null;
  priority: Priority | null;
  riskLevel: RiskLevel | null;
  reviewStatus: ReviewStatus | null;
  automationCandidate: boolean;
  preconditions: string | null;
  bddScenario: string | null;
  linkedRequirementReferences: string[];
  steps: TestStepResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface TestStepResponse {
  id: string;
  order: number;
  action: string;
  expectedResult: string | null;
}

export interface TestStepUpdateRequest {
  order: number;
  action: string;
  expectedResult?: string | null;
}

export interface ReviewStatusUpdateRequest {
  status: ReviewStatus;
  comment?: string | null;
}

export interface PriorityUpdateRequest {
  priority: Priority;
  comment?: string | null;
}

export interface RiskUpdateRequest {
  riskLevel: RiskLevel;
  comment?: string | null;
}

export interface AutomationCandidateUpdateRequest {
  automationCandidate: boolean;
  comment?: string | null;
}

export interface TestCaseUpdateRequest {
  title?: string | null;
  objective?: string | null;
  preconditions?: string | null;
  bddScenario?: string | null;
  steps?: TestStepUpdateRequest[] | null;
  comment?: string | null;
}

export interface ReviewEvent {
  id: string;
  testCaseId: string;
  status: ReviewStatus | null;
  actionType: string;
  previousValue: string | null;
  newValue: string | null;
  reviewer: string | null;
  comment: string | null;
  createdAt: string;
}
