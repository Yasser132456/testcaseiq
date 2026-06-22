import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardMetrics } from '../../core/models/dashboard.model';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { DashboardPageComponent } from './dashboard-page.component';

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
  approvalRate: 62.5,
  rejectionRate: 11.1,
  pendingReviewRate: 19.4,
  exportReadinessRate: 62.5,
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

const ZERO_METRICS: DashboardMetrics = {
  totalProjects: 0, totalStories: 0, storiesWithGeneratedTests: 0,
  storiesWithoutGeneratedTests: 0, totalTestSuites: 0, totalTestCases: 0,
  approvedTestCases: 0, rejectedTestCases: 0, pendingReviewTestCases: 0,
  draftTestCases: 0, totalExports: 0,
  approvalRate: 0, rejectionRate: 0, pendingReviewRate: 0, exportReadinessRate: 0,
  recentActivity: []
};

function createComponent(role: string, metrics: DashboardMetrics | null = MOCK_METRICS, error = false) {
  const dashboardSvc = jasmine.createSpyObj<DashboardService>('DashboardService', ['getMetrics']);
  dashboardSvc.getMetrics.and.returnValue(
    error ? throwError(() => new Error('fail')) : of(metrics!)
  );

  const authSvc = jasmine.createSpyObj<AuthService>('AuthService', ['hasRole']);
  authSvc.hasRole.and.callFake((r: any) => {
    if (Array.isArray(r)) return r.includes(role);
    return r === role;
  });

  TestBed.configureTestingModule({
    imports: [DashboardPageComponent],
    providers: [
      provideRouter([]),
      { provide: DashboardService, useValue: dashboardSvc },
      { provide: AuthService, useValue: authSvc }
    ]
  });

  const fixture = TestBed.createComponent(DashboardPageComponent);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('DashboardPageComponent', () => {
  beforeEach(() => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true
    } as MediaQueryList);
  });

  it('renders KPI cards with data', () => {
    const { element } = createComponent('ADMIN');
    const cards = element.querySelectorAll('.metric-card');
    expect(cards.length).toBe(8);
    expect(element.textContent).toContain('3');  // totalProjects
    expect(element.textContent).toContain('72'); // totalTestCases
    expect(element.textContent).toContain('45'); // approvedTestCases
  });

  it('shows error state when API fails', () => {
    const { element } = createComponent('ADMIN', null, true);
    expect(element.textContent).toContain('Dashboard unavailable');
  });

  it('shows zero-data state gracefully', () => {
    const { element } = createComponent('ADMIN', ZERO_METRICS);
    expect(element.textContent).toContain('0');
    expect(element.textContent).not.toContain('Dashboard unavailable');
  });

  it('shows recent activity items', () => {
    const { element } = createComponent('QA_ENGINEER');
    expect(element.textContent).toContain('Test Generation Requested');
    expect(element.textContent).toContain('qa@example.com');
  });

  it('shows audit log link for ADMIN only', () => {
    const { element } = createComponent('ADMIN');
    const links = Array.from(element.querySelectorAll('a[href]'));
    const auditLinks = links.filter(l => l.getAttribute('href')?.includes('audit'));
    expect(auditLinks.length).toBeGreaterThan(0);
  });

  it('hides audit log link for VIEWER', () => {
    const { element } = createComponent('VIEWER');
    const links = Array.from(element.querySelectorAll('a'));
    const auditLinks = links.filter(l => l.textContent?.includes('Activity log'));
    expect(auditLinks.length).toBe(0);
  });

  it('shows admin-only quick actions for ADMIN', () => {
    const { element } = createComponent('ADMIN');
    expect(element.textContent).toContain('User administration');
  });

  it('hides admin quick actions for QA_ENGINEER', () => {
    const { element } = createComponent('QA_ENGINEER');
    expect(element.textContent).not.toContain('User administration');
  });

  it('shows new project action for QA_ENGINEER', () => {
    const { element } = createComponent('QA_ENGINEER');
    expect(element.textContent).toContain('New project');
  });

  it('hides new project action for VIEWER', () => {
    const { element } = createComponent('VIEWER');
    expect(element.textContent).not.toContain('New project');
  });

  it('computes avgCasesPerSuite correctly', () => {
    const { fixture } = createComponent('ADMIN');
    expect(fixture.componentInstance.avgCasesPerSuite()).toBe('4.0');
  });

  it('returns em-dash for avgCasesPerSuite when no suites', () => {
    const { fixture } = createComponent('ADMIN', ZERO_METRICS);
    expect(fixture.componentInstance.avgCasesPerSuite()).toBe('—');
  });

  it('formats action strings correctly', () => {
    const { fixture } = createComponent('ADMIN');
    expect(fixture.componentInstance.formatAction('TEST_GENERATION_REQUESTED')).toBe('Test Generation Requested');
  });

  it('assigns correct outcome class', () => {
    const { fixture } = createComponent('ADMIN');
    expect(fixture.componentInstance.outcomeClass('SUCCESS')).toBe('outcome-ok');
    expect(fixture.componentInstance.outcomeClass('FAILURE')).toBe('outcome-fail');
    expect(fixture.componentInstance.outcomeClass('PENDING')).toBe('outcome-other');
  });
});
