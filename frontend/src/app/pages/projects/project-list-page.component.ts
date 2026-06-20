import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Project } from '../../core/models/project.model';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';

@Component({
  selector: 'app-project-list-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, StateMessageComponent],
  template: `
    <section class="page-stack">
      <div class="section-header">
        <div>
          <p class="eyebrow">Projects</p>
          <h2>Project intake</h2>
        </div>
      </div>

      <div class="content-grid">
        @if (canEdit()) {
          <form class="panel form-panel" [formGroup]="form" (ngSubmit)="createProject()">
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
            @if (createError()) {
              <app-state-message title="Could not create project" [message]="createError()" tone="error" />
            }
            <button class="button" type="submit" [disabled]="form.invalid || creating()">
              {{ creating() ? 'Creating...' : 'Create project' }}
            </button>
          </form>
        }

        <section class="panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">Workspace</p>
              <h3>All projects</h3>
            </div>
          </div>

          @if (isViewer()) {
            <div class="inline-note" style="margin-bottom: 1rem;">
              Read-only access. You can view projects but cannot create or modify them.
            </div>
          }

          @if (loading()) {
            <app-state-message title="Loading projects" message="Fetching project workspace." />
          } @else if (loadError()) {
            <app-state-message title="Projects unavailable" [message]="loadError()" tone="error" />
          } @else if (projects().length === 0) {
            <app-state-message title="No projects yet" message="Create a project to start adding stories." />
          } @else {
            <div class="list-stack">
              @for (project of projects(); track project.id) {
                <a class="list-row" [routerLink]="['/projects', project.id]">
                  <strong>{{ project.name }}</strong>
                  <span>{{ project.createdAt | date:'mediumDate' }}</span>
                </a>
              }
            </div>
          }
        </section>
      </div>
    </section>
  `
})
export class ProjectListPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

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
  readonly createError = signal('');

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
    this.createError.set('');
    this.projectService.create({
      name: this.form.controls.name.value,
      description: this.form.controls.description.value || null
    }).subscribe({
      next: (project) => this.router.navigate(['/projects', project.id]),
      error: () => {
        this.createError.set('The project could not be created. Check the backend and try again.');
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
