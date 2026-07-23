import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardMetrics } from '../../core/models/dashboard.model';
import { MotionService } from '../../core/motion/motion.service';
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
    },
    {
      id: 'project-2',
      name: 'Billing',
      key: 'BILL',
      description: null,
      updatedAt: '2026-06-20T00:00:00Z'
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

const ZERO_METRICS: DashboardMetrics = {
  totalProjects: 0,
  totalStories: 0,
  storiesWithGeneratedTests: 0,
  storiesWithoutGeneratedTests: 0,
  totalTestSuites: 0,
  totalTestCases: 0,
  approvedTestCases: 0,
  rejectedTestCases: 0,
  pendingReviewTestCases: 0,
  draftTestCases: 0,
  totalExports: 0,
  storiesWithUncoveredHighRiskRequirements: 0,
  approvalRate: 0,
  rejectionRate: 0,
  pendingReviewRate: 0,
  exportReadinessRate: 0,
  recentProjects: [],
  recentActivity: []
};

const documentVisible = signal(true);

function createComponent(role: string, metrics: DashboardMetrics | null = MOCK_METRICS, error = false) {
  TestBed.resetTestingModule();
  const dashboardSvc = jasmine.createSpyObj<DashboardService>('DashboardService', ['getMetrics']);
  dashboardSvc.getMetrics.and.returnValue(
    error ? throwError(() => new Error('fail')) : of(metrics!)
  );

  const authSvc = jasmine.createSpyObj<AuthService>('AuthService', ['hasRole']);
  authSvc.hasRole.and.callFake((r: string | string[]) => {
    if (Array.isArray(r)) return r.includes(role);
    return r === role;
  });

  TestBed.configureTestingModule({
    imports: [DashboardPageComponent],
    providers: [
      provideRouter([]),
      { provide: DashboardService, useValue: dashboardSvc },
      { provide: AuthService, useValue: authSvc },
      {
        provide: MotionService,
        useValue: {
          cursorEffectsEnabled: () => false,
          documentVisible,
          reducedMotion: () => true
        }
      }
    ]
  });

  const fixture = TestBed.createComponent(DashboardPageComponent);
  fixture.detectChanges();
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

describe('DashboardPageComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    documentVisible.set(true);
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

  it('pauses the pipeline from the shared document visibility policy', () => {
    const { fixture, element } = createComponent('ADMIN');
    expect(element.querySelector('.workflow-pipeline')?.classList).not.toContain('is-flow-paused');

    documentVisible.set(false);
    fixture.detectChanges();

    expect(element.querySelector('.workflow-pipeline')?.classList).toContain('is-flow-paused');
  });

  it('renders the next action hero for pending review work', () => {
    const { element } = createComponent('ADMIN');
    expect(element.textContent).toContain('NEXT ACTION');
    expect(element.textContent).toContain('14 test cases are waiting for review');
    expect(element.textContent).toContain('Review Board');
    expect(element.textContent).toContain('View coverage');
  });

  it('prioritizes project creation when there are no projects', () => {
    const { element } = createComponent('ADMIN', ZERO_METRICS);
    expect(element.textContent).toContain('Create your first project');
    expect(element.textContent).toContain('Add a project, then move one story through analysis, generation, review, and export.');
    expect(element.textContent).toContain('Analyze');
    expect(element.textContent).toContain('Generate');
    expect(element.textContent).toContain('Review');
    expect(element.textContent).toContain('Export');
    expect(element.querySelector('[aria-live="polite"]')?.textContent).toContain('Step 1 of 6');
  });

  it('shows export action when approved cases are ready and review is clear', () => {
    const metrics: DashboardMetrics = {
      ...MOCK_METRICS,
      pendingReviewTestCases: 0,
      approvedTestCases: 7
    };
    const { element } = createComponent('QA_ENGINEER', metrics);
    expect(element.textContent).toContain('7 cases approved and ready to export');
    expect(element.textContent).toContain('Export');
  });

  it('shows all-clear state without hero buttons', () => {
    const metrics: DashboardMetrics = {
      ...MOCK_METRICS,
      pendingReviewTestCases: 0,
      approvedTestCases: 0
    };
    const { element } = createComponent('VIEWER', metrics);
    expect(element.textContent).toContain("You're all caught up. Great work.");
    expect(element.querySelector('.hero-actions')).toBeNull();
  });

  it('renders a workflow pipeline strip with accessible immediate counts', () => {
    const { element } = createComponent('ADMIN');
    const nodes = Array.from(element.querySelectorAll<HTMLElement>('.pipeline-node'));

    expect(nodes.length).toBe(6);
    expect(element.textContent).toContain('Stories');
    expect(element.textContent).toContain('Analyzed');
    expect(element.textContent).toContain('Generated');
    expect(element.textContent).toContain('In Review');
    expect(element.textContent).toContain('Approved');
    expect(element.textContent).toContain('Exported');
    expect(element.textContent).toContain('72');
    expect(nodes[0].getAttribute('aria-label')).toBe('Stories: 12');
    expect(nodes[0].querySelector('[data-count="totalStories"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(nodes[0].querySelector('.sr-only')?.textContent).toContain('12');
  });

  it('routes pipeline nodes to their corresponding filtered pages', () => {
    const { element } = createComponent('ADMIN');
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('.pipeline-node'));

    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/stories?stage=all',
      '/stories?stage=analyzed',
      '/review-board?stage=generated',
      '/review-board?status=NEEDS_REVIEW',
      '/review-board?status=APPROVED',
      '/export?stage=exported'
    ]);
  });

  it('removes quick actions and the old attention chip strip', () => {
    const { element } = createComponent('ADMIN');
    expect(element.querySelector('.chip-strip')).toBeNull();
    expect(element.textContent).not.toContain('Quick actions');
    expect(element.textContent).not.toContain('User administration');
  });

  it('renders quality pipeline and story coverage panels', () => {
    const { element } = createComponent('ADMIN');
    expect(element.textContent).toContain('QUALITY PIPELINE');
    expect(element.textContent).toContain('Approval');
    expect(element.textContent).toContain('STORY COVERAGE');
    expect(element.textContent).toContain('75% stories have tests');
    expect(element.textContent).toContain('2 stories have uncovered high-risk requirements');
  });

  it('shows recent activity items', () => {
    const { element } = createComponent('QA_ENGINEER');
    expect(element.textContent).toContain('RECENT ACTIVITY');
    expect(element.textContent).toContain('Test Generation Requested');
    expect(element.textContent).toContain('qa@example.com');
  });

  it('shows audit link for ADMIN only', () => {
    const admin = createComponent('ADMIN').element;
    const viewer = createComponent('VIEWER').element;
    expect(admin.textContent).toContain('View audit');
    expect(viewer.textContent).not.toContain('View audit');
  });

  it('renders recent project cards and new project action for mutating roles', () => {
    const { element } = createComponent('QA_ENGINEER');
    expect(element.textContent).toContain('RECENT PROJECTS');
    expect(element.textContent).toContain('Claims Portal');
    expect(element.textContent).toContain('Billing');
    expect(element.textContent).toContain('+ New project');
  });

  it('assigns deterministic accent names to project keys', () => {
    const { fixture } = createComponent('ADMIN');
    const component = fixture.componentInstance;

    expect(component.projectAccent('CLAIMS')).toBe(component.projectAccent('CLAIMS'));
    expect(['accent', 'cyan', 'purple', 'green', 'amber']).toContain(component.projectAccent('BILL'));
  });

  it('binds project card accents as data attributes', () => {
    const { element } = createComponent('QA_ENGINEER');
    const cards = Array.from(element.querySelectorAll<HTMLElement>('.project-card'));

    expect(cards.map(card => card.dataset['accent'])).toEqual(['cyan', 'accent']);
  });

  it('hides new project action for VIEWER', () => {
    const { element } = createComponent('VIEWER');
    expect(element.textContent).not.toContain('+ New project');
  });

  it('shows error state when API fails', () => {
    const { element } = createComponent('ADMIN', null, true);
    expect(element.textContent).toContain('Dashboard unavailable');
  });

  it('computes avgCasesPerSuite correctly', () => {
    const { fixture } = createComponent('ADMIN');
    expect(fixture.componentInstance.avgCasesPerSuite()).toBe('4.0');
  });

  it('returns a dash for avgCasesPerSuite when no suites', () => {
    const { fixture } = createComponent('ADMIN', ZERO_METRICS);
    expect(fixture.componentInstance.avgCasesPerSuite()).toBe('-');
  });

  it('formats action strings correctly', () => {
    const { fixture } = createComponent('ADMIN');
    expect(fixture.componentInstance.formatAction('TEST_GENERATION_REQUESTED')).toBe('Test Generation Requested');
  });
});
