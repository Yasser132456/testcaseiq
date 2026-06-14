import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { HealthResponse } from '../../core/models/health.model';
import { Project } from '../../core/models/project.model';
import { Story } from '../../core/models/story.model';
import { HealthService } from '../../core/services/health.service';
import { ProjectService } from '../../core/services/project.service';
import { StoryService } from '../../core/services/story.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DatePipe, RouterLink, StateMessageComponent],
  template: `
    <section class="page-stack">
      <div class="hero-panel">
        <p class="eyebrow">TestCaseIQ</p>
        <h2>Transform stories into test intelligence.</h2>
        <p>Manage project intake and user stories before analysis, generation, and review enter the workflow.</p>
      </div>

      @if (loading()) {
        <app-state-message title="Loading dashboard" message="Collecting projects, stories, and API health." />
      } @else if (error()) {
        <app-state-message title="Dashboard unavailable" [message]="error()" tone="error" />
      } @else {
        <div class="metric-grid">
          <article class="metric-card">
            <span>Total projects</span>
            <strong>{{ projects().length }}</strong>
          </article>
          <article class="metric-card">
            <span>Recent projects</span>
            <strong>{{ recentProjects().length }}</strong>
          </article>
          <article class="metric-card">
            <span>Recent stories</span>
            <strong>{{ recentStories().length }}</strong>
          </article>
          <article class="metric-card">
            <span>Backend health</span>
            <strong>{{ health()?.status ?? 'OFFLINE' }}</strong>
          </article>
        </div>

        <div class="content-grid">
          <section class="panel">
            <div class="section-header">
              <div>
                <p class="eyebrow">Recent</p>
                <h3>Projects</h3>
              </div>
              <a routerLink="/projects">View all</a>
            </div>

            @if (recentProjects().length === 0) {
              <app-state-message title="No projects yet" message="Create your first project to begin organizing stories." />
            } @else {
              <div class="list-stack">
                @for (project of recentProjects(); track project.id) {
                  <a class="list-row" [routerLink]="['/projects', project.id]">
                    <strong>{{ project.name }}</strong>
                    <span>{{ project.createdAt | date:'mediumDate' }}</span>
                  </a>
                }
              </div>
            }
          </section>

          <section class="panel">
            <div class="section-header">
              <div>
                <p class="eyebrow">Recent</p>
                <h3>Stories</h3>
              </div>
            </div>

            @if (recentStories().length === 0) {
              <app-state-message title="No stories yet" message="Stories will appear here after they are created under a project." />
            } @else {
              <div class="list-stack">
                @for (story of recentStories(); track story.id) {
                  <a class="list-row" [routerLink]="['/stories', story.id]">
                    <strong>{{ story.title }}</strong>
                    <span>{{ story.status }} · {{ story.type }}</span>
                  </a>
                }
              </div>
            }
          </section>
        </div>
      }
    </section>
  `
})
export class DashboardPageComponent implements OnInit {
  private readonly projectService = inject(ProjectService);
  private readonly storyService = inject(StoryService);
  private readonly healthService = inject(HealthService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly projects = signal<Project[]>([]);
  readonly recentStories = signal<Story[]>([]);
  readonly health = signal<HealthResponse | null>(null);

  readonly recentProjects = signal<Project[]>([]);

  ngOnInit(): void {
    this.projectService.list().pipe(
      switchMap((projects) => {
        this.projects.set(projects);
        this.recentProjects.set(projects.slice(0, 5));
        const storyCalls = projects.slice(0, 5).map((project) =>
          this.storyService.listForProject(project.id).pipe(catchError(() => of([] as Story[])))
        );
        return forkJoin({
          stories: storyCalls.length ? forkJoin(storyCalls) : of([] as Story[][]),
          health: this.healthService.getHealth().pipe(catchError(() => of(null)))
        });
      }),
      catchError(() => {
        this.error.set('Unable to load dashboard data. Confirm the backend is running.');
        return of({ stories: [] as Story[][], health: null });
      })
    ).subscribe(({ stories, health }) => {
      this.recentStories.set(stories.flat().slice(0, 6));
      this.health.set(health);
      this.loading.set(false);
    });
  }
}
