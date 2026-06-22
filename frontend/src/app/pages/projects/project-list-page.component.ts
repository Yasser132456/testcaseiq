import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FolderKanban, LucideAngularModule } from 'lucide-angular';
import { Project } from '../../core/models/project.model';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ToastService } from '../../core/services/toast.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { DrawerComponent } from '../../shared/components/drawer.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { TableStaggerDirective } from '../../shared/directives/table-stagger.directive';

@Component({
  selector: 'app-project-list-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, LucideAngularModule, DrawerComponent, StateMessageComponent, SkeletonComponent, EmptyStateComponent, TableStaggerDirective],
  styles: [`.td-muted { color: var(--color-text-2); white-space: nowrap; }`],
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
          } @else if (projects().length === 0) {
            <app-empty-state
              [icon]="FolderKanban"
              title="No projects yet"
              message="Create a project to start mapping your product to stories and generate your first test suite."
            />
          } @else {
            <table class="data-table" tableStagger>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (project of projects(); track project.id) {
                  <tr [routerLink]="['/projects', project.id]">
                    <td><div class="row-inner"><strong>{{ project.name }}</strong></div></td>
                    <td><div class="row-inner td-muted">{{ project.createdAt | date:'mediumDate' }}</div></td>
                    <td>
                      <a class="button ghost" [routerLink]="['/projects', project.id]" (click)="$event.stopPropagation()">
                        Open →
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      </div>
    </section>
  `
})
export class ProjectListPageComponent implements OnInit {
  readonly FolderKanban = FolderKanban;

  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly canEdit = computed(() => {
    if (!this.authService.isAuthenticated()) return true;
    const role = this.authService.currentRole();
    return role === 'ADMIN' || role === 'QA_ENGINEER';
  });

  readonly isViewer = computed(() =>
    this.authService.isAuthenticated() && this.authService.currentRole() === 'VIEWER'
  );

  readonly projects = signal<Project[]>([]);
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

  private loadProjects(): void {
    this.loading.set(true);
    this.projectService.list().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Unable to load projects. Confirm the backend is running.');
        this.loading.set(false);
      }
    });
  }
}
