import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DashboardService } from './dashboard.service';
import { DashboardMetrics } from '../models/dashboard.model';

const MOCK_METRICS: DashboardMetrics = {
  totalProjects: 3,
  totalStories: 12,
  storiesWithGeneratedTests: 9,
  storiesWithoutGeneratedTests: 3,
  totalTestSuites: 18,
  totalTestCases: 72,
  approvedTestCases: 45,
  rejectedTestCases: 8,
  pendingReviewTestCases: 14,
  draftTestCases: 5,
  totalExports: 6,
  storiesWithUncoveredHighRiskRequirements: 2,
  approvalRate: 62.5,
  rejectionRate: 11.1,
  pendingReviewRate: 19.4,
  exportReadinessRate: 62.5,
  recentProjects: [
    {
      id: 'project-1',
      name: 'Claims Portal',
      key: 'CLAIMS',
      description: 'Claims regression coverage',
      updatedAt: '2026-06-21T00:00:00Z'
    }
  ],
  recentActivity: [
    {
      timestamp: '2026-06-21T00:00:00Z',
      action: 'TEST_GENERATION_REQUESTED',
      actorEmail: 'qa@example.com',
      actorRole: 'QA_ENGINEER',
      resourceType: 'STORY',
      outcome: 'SUCCESS',
      summary: 'Tests generated'
    }
  ]
};

describe('DashboardService', () => {
  let service: DashboardService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(DashboardService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should fetch dashboard metrics', () => {
    service.getMetrics().subscribe(metrics => {
      expect(metrics.totalProjects).toBe(3);
      expect(metrics.totalTestCases).toBe(72);
      expect(metrics.approvedTestCases).toBe(45);
      expect(metrics.approvalRate).toBe(62.5);
      expect(metrics.recentProjects.length).toBe(1);
      expect(metrics.recentProjects[0].name).toBe('Claims Portal');
      expect(metrics.recentActivity.length).toBe(1);
      expect(metrics.recentActivity[0].action).toBe('TEST_GENERATION_REQUESTED');
    });
    const req = http.expectOne('/api/dashboard/metrics');
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_METRICS);
  });

  it('should handle zero-data state', () => {
    const emptyMetrics: DashboardMetrics = {
      ...MOCK_METRICS,
      totalProjects: 0,
      totalTestCases: 0,
      approvalRate: 0,
      recentProjects: [],
      recentActivity: []
    };
    service.getMetrics().subscribe(metrics => {
      expect(metrics.totalProjects).toBe(0);
      expect(metrics.recentActivity.length).toBe(0);
    });
    const req = http.expectOne('/api/dashboard/metrics');
    req.flush(emptyMetrics);
  });
});
