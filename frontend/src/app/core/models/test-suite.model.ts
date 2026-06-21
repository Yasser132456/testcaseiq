export interface TestSuiteSummary {
  id: string;
  storyId: string;
  storyTitle: string;
  projectId: string;
  projectName: string;
  name: string;
  description: string | null;
  testLayer: string | null;
  totalCases: number;
  approvedCases: number;
  rejectedCases: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestSuitePage {
  content: TestSuiteSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface TestCaseSummary {
  id: string;
  title: string;
  type: string | null;
  priority: string | null;
  reviewStatus: string | null;
  automationCandidate: boolean;
}

export interface TestSuiteDetail extends TestSuiteSummary {
  testCases: TestCaseSummary[];
}

export interface TestSuiteUpdateRequest {
  description?: string | null;
  testLayer?: string | null;
}

export interface TestSuiteFilters {
  storyId?: string;
  projectId?: string;
  approvedOnly?: boolean;
}
