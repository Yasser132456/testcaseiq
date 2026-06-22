import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuditEvent } from '../../core/models/audit-event.model';
import { Project } from '../../core/models/project.model';
import { STORY_TYPES, Story, StoryType } from '../../core/models/story.model';
import { TestSuiteSummary } from '../../core/models/test-suite.model';
import { AuditEventService } from '../../core/services/audit-event.service';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { StoryService } from '../../core/services/story.service';
import { TestSuiteService } from '../../core/services/test-suite.service';
import { ToastService } from '../../core/services/toast.service';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

type ProjectDetailTab = 'overview' | 'stories' | 'test-suites' | 'coverage';
type StoryDisplayStatus = 'DRAFT' | 'ANALYZED' | 'TESTS_GENERATED' | 'ALL_REVIEWED';

@Component({
  selector: 'app-project-detail-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, DrawerComponent, StateMessageComponent, SkeletonComponent],
  template: `
    <section class="page-stack">
      @if (loading()) {
        <app-skeleton [rows]="4" [cols]="3" />
      } @else if (error()) {
        <app-state-message title="Project unavailable" [message]="error()" tone="error" />
      } @else if (project()) {
        <div class="detail-hero">
          <div>
            <h2>{{ project()?.name }}</h2>
            <p>{{ project()?.description || 'No description added yet.' }}</p>
          </div>
          <div class="action-row">
            <span class="health-badge">{{ healthScore() }}% health</span>
            @if (canDelete()) {
              <button class="button danger" type="button" (click)="deleteProject()">Delete project</button>
            }
          </div>
        </div>

        <nav class="detail-tabs" aria-label="Project sections">
          <button class="tab-btn" type="button" [class.active]="activeTab() === 'overview'" (click)="setTab('overview')">Overview</button>
          <button class="tab-btn" type="button" [class.active]="activeTab() === 'stories'" (click)="setTab('stories')">Stories</button>
          <button class="tab-btn" type="button" [class.active]="activeTab() === 'test-suites'" (click)="setTab('test-suites')">Test Suites</button>
          <button class="tab-btn" type="button" [class.active]="activeTab() === 'coverage'" (click)="setTab('coverage')">Coverage</button>
        </nav>

        <app-drawer [open]="storyDrawerOpen()" title="New story" (closed)="storyDrawerOpen.set(false)">
          @defer (when storyDrawerOpen()) {
            <form class="form-panel" [formGroup]="storyForm" (ngSubmit)="createStory()">
              <label>
                <span>Title</span>
                <input formControlName="title" placeholder="Buyer completes checkout" />
              </label>
              @if (storyForm.controls.title.touched && storyForm.controls.title.invalid) {
                <small class="field-error">Story title is required.</small>
              }
              <label>
                <span>Raw text</span>
                <textarea formControlName="rawText" rows="7" placeholder="As a buyer, I want..."></textarea>
              </label>
              @if (storyForm.controls.rawText.touched && storyForm.controls.rawText.invalid) {
                <small class="field-error">Story raw text is required.</small>
              }
              <label>
                <span>Type</span>
                <select formControlName="type">
                  @for (type of storyTypes; track type) {
                    <option [value]="type">{{ formatLabel(type) }}</option>
                  }
                </select>
              </label>
              <button class="button" type="submit" [disabled]="storyForm.invalid || creatingStory()">
                {{ creatingStory() ? 'Creating...' : 'Create story' }}
              </button>
            </form>
          }
        </app-drawer>

        @if (activeTab() === 'overview') {
          <section class="panel">
            <div class="section-header">
              <h3>Project metadata</h3>
            </div>
            <dl class="metadata-grid">
              <div><dt>Name</dt><dd>{{ project()?.name }}</dd></div>
              <div><dt>Description</dt><dd>{{ project()?.description || 'No description added yet.' }}</dd></div>
              <div><dt>Created</dt><dd>{{ project()?.createdAt | date:'mediumDate' }}</dd></div>
              <div><dt>Stories with tests</dt><dd>{{ storiesWithTests() }} / {{ storyCount() }}</dd></div>
            </dl>
          </section>

          <section class="panel">
            <div class="section-header">
              <h3>Recent activity</h3>
            </div>
            @if (activityLoading()) {
              <app-state-message title="Loading activity" message="Fetching project activity." />
            } @else if (recentActivity().length === 0) {
              <app-state-message title="No activity found" message="Project activity will appear after significant changes." />
            } @else {
              <div class="list-stack compact">
                @for (event of recentActivity(); track event.id) {
                  <article class="activity-row">
                    <strong>{{ formatLabel(event.action) }}</strong>
                    <span>{{ event.timestamp | date:'medium' }}</span>
                  </article>
                }
              </div>
            }
          </section>
        }

        @if (activeTab() === 'stories') {
          <section class="panel">
            <div class="section-header">
              <h3>{{ storyCount() }} stories</h3>
              @if (canEdit()) {
                <button class="button" type="button" (click)="storyDrawerOpen.set(true)">New story</button>
              }
            </div>

            @if (storiesLoading()) {
              <app-state-message title="Loading stories" message="Fetching project stories." />
            } @else if (stories().length === 0) {
              <app-state-message title="No stories yet" message="Create the first story for this project." />
            } @else {
              <div class="list-stack">
                @for (story of stories(); track story.id) {
                  <article class="list-row split">
                    <a [routerLink]="['/stories', story.id]" [state]="{ projectContext: projectContext() }">
                      <strong>{{ story.title }}</strong>
                      <span>{{ formatLabel(story.type) }} · {{ story.createdAt | date:'mediumDate' }}</span>
                    </a>
                    <span class="story-status" [class]="statusClass(displayStoryStatus(story))">{{ formatLabel(displayStoryStatus(story)) }}</span>
                    @if (canDelete()) {
                      <button class="text-danger" type="button" (click)="deleteStory(story)">Delete</button>
                    }
                  </article>
                }
              </div>
            }
          </section>
        }

        @if (activeTab() === 'test-suites') {
          <section class="panel">
            <div class="section-header">
              <h3>{{ testSuites().length }} test suites</h3>
            </div>
            @if (testSuitesLoading()) {
              <app-state-message title="Loading test suites" message="Fetching suites for this project." />
            } @else if (testSuites().length === 0) {
              <app-state-message title="No test suites yet" message="Generate test cases from project stories to populate this list." />
            } @else {
              <div class="list-stack">
                @for (suite of testSuites(); track suite.id) {
                  <article class="list-row split">
                    <a [routerLink]="['/test-suites', suite.id]">
                      <strong>{{ suite.name }}</strong>
                      <span>{{ suite.storyTitle }} · {{ suite.totalCases }} cases · {{ suite.createdAt | date:'mediumDate' }}</span>
                    </a>
                    <span class="suite-count">{{ suite.approvedCases }} approved</span>
                  </article>
                }
              </div>
            }
          </section>
        }

        @if (activeTab() === 'coverage') {
          <section class="panel">
            <div class="coverage-summary-grid">
              <article><span>Stories with tests</span><strong>{{ storiesWithTests() }}</strong></article>
              <article><span>All reviewed</span><strong>{{ allReviewedStories() }}</strong></article>
              <article><span>Coverage</span><strong>{{ coveragePercent() }}%</strong></article>
            </div>
            <div class="coverage-list">
              @for (story of stories(); track story.id) {
                <div class="coverage-row">
                  <div>
                    <strong>{{ story.title }}</strong>
                    <span>{{ formatLabel(displayStoryStatus(story)) }}</span>
                  </div>
                  <span>{{ suitesForStory(story.id).length }} suites</span>
                </div>
              }
            </div>
          </section>
        }
      }
    </section>
  `,
  styles: [`
    .detail-tabs { display: inline-flex; gap: 0.25rem; width: fit-content; padding: 0.25rem; border: 1px solid var(--color-border); border-radius: 9999px; background: var(--color-surface-1); }
    .tab-btn { background: transparent; border: 1px solid transparent; border-radius: 9999px; color: var(--color-text-2); cursor: pointer; font-size: 0.875rem; font-weight: 500; padding: 0.45rem 0.9rem; }
    .tab-btn:hover { color: var(--color-text); }
    .tab-btn:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    .tab-btn.active { background: var(--color-surface-2); color: var(--color-text); border-color: var(--color-border); }
    .metadata-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.85rem; margin: 0; }
    .metadata-grid div, .coverage-summary-grid article, .coverage-row { padding: 0.85rem; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface-2); }
    .metadata-grid dt, .coverage-summary-grid span, .coverage-row span { color: var(--color-text-2); font-size: 0.8rem; }
    .metadata-grid dd { margin: 0.25rem 0 0; overflow-wrap: anywhere; }
    .health-badge, .suite-count, .story-status { display: inline-flex; min-height: 1.55rem; align-items: center; padding: 0 0.5rem; border: 1px solid var(--color-green-border); border-radius: 6px; background: var(--color-green-bg); color: var(--color-green); font-size: 0.73rem; font-weight: 600; white-space: nowrap; }
    .story-status.status-draft { border-color: var(--color-purple-border); background: var(--color-purple-bg); color: var(--color-purple); }
    .story-status.status-analyzed { border-color: var(--color-cyan-border); background: var(--color-cyan-bg); color: var(--color-cyan); }
    .story-status.status-tests-generated { border-color: var(--color-amber-border); background: var(--color-amber-bg); color: var(--color-amber); }
    .story-status.status-all-reviewed { border-color: var(--color-green-border); background: var(--color-green-bg); color: var(--color-green); }
    .activity-row { display: flex; justify-content: space-between; gap: 1rem; padding: 0.75rem; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface-2); }
    .activity-row span { color: var(--color-text-2); white-space: nowrap; }
    .coverage-summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.85rem; margin-bottom: 1rem; }
    .coverage-summary-grid article { display: grid; gap: 0.35rem; }
    .coverage-summary-grid strong { color: var(--color-accent); font-size: 1.75rem; line-height: 1; }
    .coverage-list { display: grid; gap: 0.65rem; }
    .coverage-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .coverage-row div { display: grid; gap: 0.2rem; min-width: 0; }
    @media (max-width: 900px) {
      .detail-tabs { width: 100%; overflow-x: auto; border-radius: 8px; }
      .metadata-grid, .coverage-summary-grid { grid-template-columns: 1fr; }
      .coverage-row, .activity-row { align-items: flex-start; flex-direction: column; }
    }
  `]
})
export class ProjectDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly storyService = inject(StoryService);
  private readonly testSuiteService = inject(TestSuiteService);
  private readonly auditEventService = inject(AuditEventService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly canEdit = computed(() => {
    if (!this.authService.isAuthenticated()) return true;
    const role = this.authService.currentRole();
    return role === 'ADMIN' || role === 'QA_ENGINEER';
  });

  readonly canDelete = computed(() => {
    if (!this.authService.isAuthenticated()) return true;
    return this.authService.currentRole() === 'ADMIN';
  });

  readonly storyTypes = STORY_TYPES;
  readonly project = signal<Project | null>(null);
  readonly stories = signal<Story[]>([]);
  readonly testSuites = signal<TestSuiteSummary[]>([]);
  readonly recentActivity = signal<AuditEvent[]>([]);
  readonly loading = signal(true);
  readonly storiesLoading = signal(true);
  readonly testSuitesLoading = signal(true);
  readonly activityLoading = signal(true);
  readonly creatingStory = signal(false);
  readonly error = signal('');
  readonly createError = signal('');
  readonly activeTab = signal<ProjectDetailTab>('overview');
  readonly storyDrawerOpen = signal(false);
  readonly storyCount = computed(() => this.stories().length);
  readonly storiesWithTests = computed(() => new Set(this.testSuites().map((suite) => suite.storyId)).size);
  readonly allReviewedStories = computed(() => this.stories().filter((story) => this.displayStoryStatus(story) === 'ALL_REVIEWED').length);
  readonly coveragePercent = computed(() => this.storyCount() === 0 ? 0 : Math.round(this.storiesWithTests() / this.storyCount() * 100));
  readonly healthScore = computed(() => this.coveragePercent());
  readonly projectContext = computed(() => {
    const project = this.project();
    if (!project) return null;
    return { projectId: project.id, name: project.name, storyCount: this.storyCount(), coveragePercent: this.coveragePercent() };
  });

  readonly storyForm = this.fb.nonNullable.group({
    title: ['', Validators.required],
    rawText: ['', Validators.required],
    type: ['USER_STORY' as StoryType, Validators.required]
  });

  private projectId = '';

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
    this.loadProject();
    this.loadStories();
    this.loadTestSuites();
    this.loadActivity();
  }

  setTab(tab: ProjectDetailTab): void {
    this.activeTab.set(tab);
  }

  createStory(): void {
    if (this.storyForm.invalid) {
      this.storyForm.markAllAsTouched();
      return;
    }
    this.creatingStory.set(true);
    this.createError.set('');
    this.storyService.create(this.projectId, this.storyForm.getRawValue()).subscribe({
      next: (story) => this.router.navigate(['/stories', story.id], { state: { projectContext: this.projectContext() } }),
      error: () => {
        const message = 'The story could not be created. Check the backend and try again.';
        this.createError.set(message);
        this.toastService.show(message, 'error');
        this.creatingStory.set(false);
      }
    });
  }

  deleteProject(): void {
    const project = this.project();
    if (!project || !confirm(`Delete project "${project.name}" and its stories?`)) return;
    this.projectService.delete(project.id).subscribe({
      next: () => this.router.navigate(['/projects']),
      error: () => this.toastService.show('The project could not be deleted.', 'error')
    });
  }

  deleteStory(story: Story): void {
    if (!confirm(`Delete story "${story.title}"?`)) return;
    this.storyService.delete(story.id).subscribe({
      next: () => this.stories.set(this.stories().filter((item) => item.id !== story.id)),
      error: () => this.toastService.show('The story could not be deleted.', 'error')
    });
  }

  displayStoryStatus(story: Story): StoryDisplayStatus {
    if (story.status === 'REVIEWED' || story.status === 'EXPORTED') return 'ALL_REVIEWED';
    return story.status;
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase().replaceAll('_', '-')}`;
  }

  suitesForStory(storyId: string): TestSuiteSummary[] {
    return this.testSuites().filter((suite) => suite.storyId === storyId);
  }

  formatLabel(value: string): string {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private loadProject(): void {
    this.projectService.get(this.projectId).subscribe({
      next: (project) => {
        this.project.set(project);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Project not found or backend unavailable.');
        this.loading.set(false);
      }
    });
  }

  private loadStories(): void {
    this.storyService.listForProject(this.projectId).subscribe({
      next: (stories) => {
        this.stories.set(stories);
        this.storiesLoading.set(false);
      },
      error: () => {
        this.stories.set([]);
        this.storiesLoading.set(false);
      }
    });
  }

  private loadTestSuites(): void {
    this.testSuiteService.listSuites({ projectId: this.projectId }, 0, 100).subscribe({
      next: (page) => {
        this.testSuites.set(page.content);
        this.testSuitesLoading.set(false);
      },
      error: () => {
        this.testSuites.set([]);
        this.testSuitesLoading.set(false);
      }
    });
  }

  private loadActivity(): void {
    this.auditEventService.listEvents({ resourceId: this.projectId }, 0, 5).subscribe({
      next: (page) => {
        this.recentActivity.set(page.content);
        this.activityLoading.set(false);
      },
      error: () => {
        this.recentActivity.set([]);
        this.activityLoading.set(false);
      }
    });
  }
}
