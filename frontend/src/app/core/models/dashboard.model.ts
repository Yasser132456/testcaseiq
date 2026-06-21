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
  approvalRate: number;
  rejectionRate: number;
  pendingReviewRate: number;
  exportReadinessRate: number;
  recentActivity: RecentActivityItem[];
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
