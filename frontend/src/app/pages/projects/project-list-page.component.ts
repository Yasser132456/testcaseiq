import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideFolderKanban } from '@lucide/angular';
import VanillaTilt, { HTMLVanillaTiltElement, TiltOptions } from 'vanilla-tilt';
import { Project } from '../../core/models/project.model';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/toast.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

type ProjectCard = Project & {
  storyCount?: number;
  suiteCount?: number;
  coveragePercent?: number;
  lastActivityAt?: string;
};

const TILT_OPTIONS: TiltOptions = { max: 4, speed: 400, glare: true, 'max-glare': 0.05 };

@Component({
  selector: 'app-project-list-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DrawerComponent, StateMessageComponent, SkeletonComponent, EmptyStateComponent],
  styles: [`
    .project-card-grid { display: grid; grid-template-columns: minmax(18rem, 1.2fr) minmax(15rem, 0.8fr); gap: var(--space-base); align-items: stretch; }
    .project-card { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 1rem; align-items: start; min-height: 10rem; padding: 1rem; border: 1px solid var(--glass-border); border-radius: var(--radius-lg); background: var(--glass-1); transform-style: preserve-3d; transition: border-color var(--dur) var(--ease), transform var(--dur-slow) var(--ease); }
    .project-card:nth-child(3n + 1) { grid-row: span 2; align-content: start; min-height: 14rem; }
    .project-card:hover { border-color: var(--color-accent-border); transform: translateY(-2px); }
    .coverage-ring { width: 56px; height: 56px; overflow: visible; }
    .coverage-ring-bg, .coverage-ring-arc { fill: none; stroke-width: 6; }
    .coverage-ring-bg { stroke: var(--color-surface-1); }
    .coverage-ring-arc { stroke: var(--color-accent); stroke-linecap: round; transform: rotate(-90deg); transform-origin: 28px 28px; }
    .coverage-ring text { fill: var(--color-text); font-family: var(--font-mono); font-size: 0.68rem; font-weight: 700; text-anchor: middle; dominant-baseline: middle; }
    .project-card-body { display: grid; gap: 0.45rem; min-width: 0; }
    .project-card h4 { margin: 0; color: var(--color-text); overflow-wrap: anywhere; }
    .project-card .secondary-text, .project-card .meta-text { color: var(--color-text-2); }
    .project-open-link { justify-self: start; margin-top: 0.35rem; }
    @media (max-width: 900px) {
      .project-card-grid { grid-template-columns: 1fr; }
      .project-card:nth-child(3n + 1) { grid-row: auto; min-height: 10rem; }
    }
  `],
  template: `
    <section class="page-stack">
      <div class="section-header">
        <h2>Projects</h2>
        @if (canEdit()) {
          <button class="button" type="button" (click)="projectDrawerOpen.set(true)">New project</button>
        }
      </div>

      <app-drawer [open]="projectDrawerOpen()" title="New project" (closed)="projectDrawerOpen.set(false)">
        @defer (when projectDrawerOpen()) {
          <form class="form-panel" [formGroup]="form" (ngSubmit)="createProject()">
            <h3>New project</h3>
            <label>
              <span>Name</span>
              <input formControlName="name" placeholder="Payments modernization" />
            </label>
            @if (form.controls.name.touched && form.controls.name.invalid) {
              <small class="field-error">Project name is required.</small>
            }
            <label>
              <span>Description</span>
              <textarea formControlName="description" rows="4" placeholder="Scope, system context, or product area"></textarea>
            </label>
            <button class="button" type="submit" [disabled]="form.invalid || creating()">
              {{ creating() ? 'Creating...' : 'Create project' }}
            </button>
          </form>
        }
      </app-drawer>

      <div class="content-grid">
        <section class="panel">
          <div class="section-header">
            <h3>All projects</h3>
          </div>

          @if (isViewer()) {
            <div class="inline-note" style="margin-bottom: 1rem;">
              Read-only access. You can view projects but cannot create or modify them.
            </div>
          }

          @if (loading()) {
            <app-skeleton [rows]="5" [cols]="3" />
          } @else if (loadError()) {
            <app-state-message title="Projects unavailable" [message]="loadError()" tone="error" />
            <button class="button secondary" type="button" (click)="loadProjects()">Try again</button>
          } @else if (projects().length === 0) {
            <app-empty-state
              [icon]="LucideFolderKanban"
              title="No projects yet"
              message="Create a project to start mapping your product to stories and generate your first test suite."
            />
          } @else {
            <div class="project-card-grid">
              @for (project of projects(); track project.id) {
                <article class="project-card">
                  <svg class="coverage-ring" viewBox="0 0 56 56" role="img" [attr.aria-label]="'Coverage ' + coveragePercent(project) + '%'">
                    <circle class="coverage-ring-bg" cx="28" cy="28" r="22"></circle>
                    <circle
                      class="coverage-ring-arc"
                      cx="28"
                      cy="28"
                      r="22"
                      [attr.stroke-dasharray]="coverageCircumference"
                      [attr.stroke-dashoffset]="coverageDashOffset(project)"
                    ></circle>
                    <text x="28" y="29">{{ coveragePercent(project) }}%</text>
                  </svg>
                  <div class="project-card-body">
                    <h4 class="card-title">{{ project.name }}</h4>
                    <span class="secondary-text">{{ storyCount(project) }} stories &middot; {{ suiteCount(project) }} suites</span>
                    <span class="meta-text">Last activity {{ relativeActivity(project) }}</span>
                    <a class="button ghost project-open-link" [routerLink]="['/projects', project.id]">Open &rarr;</a>
                  </div>
                </article>
              }
            </div>
          }
        </section>
      </div>
    </section>
  `
})
export class ProjectListPageComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly LucideFolderKanban = LucideFolderKanban;
  readonly coverageCircumference = 2 * Math.PI * 22;

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private tiltElements: HTMLVanillaTiltElement[] = [];

  readonly canEdit = computed(() => {
    if (!this.authService.isAuthenticated()) return true;
    const role = this.authService.currentRole();
    return role === 'ADMIN' || role === 'QA_ENGINEER';
  });

  readonly isViewer = computed(() =>
    this.authService.isAuthenticated() && this.authService.currentRole() === 'VIEWER'
  );

  readonly projects = signal<ProjectCard[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly loadError = signal('');
  readonly projectDrawerOpen = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: ['']
  });

  ngOnInit(): void {
    this.loadProjects();
  }

  ngAfterViewInit(): void {
    this.initProjectTilt();
  }

  ngOnDestroy(): void {
    this.destroyProjectTilt();
  }

  createProject(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.creating.set(true);
    this.projectService.create({
      name: this.form.controls.name.value,
      description: this.form.controls.description.value || null
    }).subscribe({
      next: (project) => this.router.navigate(['/projects', project.id]),
      error: () => {
        this.toastService.show('The project could not be created. Check the backend and try again.', 'error');
        this.creating.set(false);
      }
    });
  }

  storyCount(project: ProjectCard): number {
    return Math.max(0, project.storyCount ?? 0);
  }

  suiteCount(project: ProjectCard): number {
    return Math.max(0, project.suiteCount ?? 0);
  }

  coveragePercent(project: ProjectCard): number {
    return Math.max(0, Math.min(100, Math.round(project.coveragePercent ?? 0)));
  }

  coverageDashOffset(project: ProjectCard): number {
    return this.coverageCircumference * (1 - this.coveragePercent(project) / 100);
  }

  relativeActivity(project: ProjectCard): string {
    const value = new Date(project.lastActivityAt ?? project.updatedAt ?? project.createdAt).getTime();
    if (Number.isNaN(value)) return 'unknown';
    const diffMs = Date.now() - value;
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < minute) return 'just now';
    if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
    if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
    return `${Math.floor(diffMs / day)}d ago`;
  }

  loadProjects(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.projectService.list().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
        queueMicrotask(() => this.initProjectTilt());
      },
      error: () => {
        this.loadError.set('Unable to load projects. Confirm the backend is running.');
        this.loading.set(false);
      }
    });
  }

  private initProjectTilt(): void {
    if (this.prefersReducedMotion()) return;
    this.destroyProjectTilt();
    const cards = Array.from((this.host.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.project-card'));
    if (cards.length === 0) return;
    VanillaTilt.init(cards, TILT_OPTIONS);
    this.tiltElements = cards as HTMLVanillaTiltElement[];
  }

  private destroyProjectTilt(): void {
    this.tiltElements.forEach((el) => el.vanillaTilt?.destroy());
    this.tiltElements = [];
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }
}
