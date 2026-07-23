export interface DashboardMetrics {
  totalProjects: number;
  totalStories: number;
  storiesWithGeneratedTests: number;
  storiesWithoutGeneratedTests: number;
  totalTestSuites: number;
  totalTestCases: number;
  approvedTestCases: number;
  rejectedTestCases: number;
  pendingReviewTestCases: number;
  draftTestCases: number;
  totalExports: number;
  storiesWithUncoveredHighRiskRequirements: number;
  approvalRate: number;
  rejectionRate: number;
  pendingReviewRate: number;
  exportReadinessRate: number;
  recentProjects: RecentProjectItem[];
  recentActivity: RecentActivityItem[];
}

export interface RecentProjectItem {
  id: string;
  name: string;
  key: string;
  description: string | null;
  updatedAt: string;
}

export interface RecentActivityItem {
  timestamp: string;
  action: string;
  actorEmail: string | null;
  actorRole: string | null;
  resourceType: string | null;
  outcome: string;
  summary: string | null;
}
