import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Project } from '../../core/models/project.model';
import { STORY_TYPES, Story, StoryType } from '../../core/models/story.model';
import { ProjectService } from '../../core/services/project.service';
import { StoryService } from '../../core/services/story.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';

@Component({
  selector: 'app-project-detail-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, StateMessageComponent],
  template: `
    <section class="page-stack">
      @if (loading()) {
        <app-state-message title="Loading project" message="Opening project workspace." />
      } @else if (error()) {
        <app-state-message title="Project unavailable" [message]="error()" tone="error" />
      } @else if (project()) {
        <div class="detail-hero">
          <div>
            <p class="eyebrow">Project</p>
            <h2>{{ project()?.name }}</h2>
            <p>{{ project()?.description || 'No description added yet.' }}</p>
          </div>
          <button class="button danger" type="button" (click)="deleteProject()">Delete project</button>
        </div>

        <div class="content-grid">
          <form class="panel form-panel" [formGroup]="storyForm" (ngSubmit)="createStory()">
            <h3>New story</h3>
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
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </label>
            @if (createError()) {
              <app-state-message title="Could not create story" [message]="createError()" tone="error" />
            }
            <button class="button" type="submit" [disabled]="storyForm.invalid || creatingStory()">
              {{ creatingStory() ? 'Creating...' : 'Create story' }}
            </button>
          </form>

          <section class="panel">
            <div class="section-header">
              <div>
                <p class="eyebrow">Stories</p>
                <h3>{{ storyCount() }} in this project</h3>
              </div>
            </div>

            @if (storiesLoading()) {
              <app-state-message title="Loading stories" message="Fetching project stories." />
            } @else if (stories().length === 0) {
              <app-state-message title="No stories yet" message="Create the first story for this project." />
            } @else {
              <div class="list-stack">
                @for (story of stories(); track story.id) {
                  <article class="list-row split">
                    <a [routerLink]="['/stories', story.id]">
                      <strong>{{ story.title }}</strong>
                      <span>{{ story.status }} · {{ story.type }} · {{ story.createdAt | date:'mediumDate' }}</span>
                    </a>
                    <button class="text-danger" type="button" (click)="deleteStory(story)">Delete</button>
                  </article>
                }
              </div>
            }
          </section>
        </div>
      }
    </section>
  `
})
export class ProjectDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly storyService = inject(StoryService);

  readonly storyTypes = STORY_TYPES;
  readonly project = signal<Project | null>(null);
  readonly stories = signal<Story[]>([]);
  readonly loading = signal(true);
  readonly storiesLoading = signal(true);
  readonly creatingStory = signal(false);
  readonly error = signal('');
  readonly createError = signal('');
  readonly storyCount = computed(() => this.stories().length);

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
  }

  createStory(): void {
    if (this.storyForm.invalid) {
      this.storyForm.markAllAsTouched();
      return;
    }
    this.creatingStory.set(true);
    this.createError.set('');
    this.storyService.create(this.projectId, this.storyForm.getRawValue()).subscribe({
      next: (story) => this.router.navigate(['/stories', story.id]),
      error: () => {
        this.createError.set('The story could not be created. Check the backend and try again.');
        this.creatingStory.set(false);
      }
    });
  }

  deleteProject(): void {
    const project = this.project();
    if (!project || !confirm(`Delete project "${project.name}" and its stories?`)) {
      return;
    }
    this.projectService.delete(project.id).subscribe({
      next: () => this.router.navigate(['/projects']),
      error: () => this.error.set('The project could not be deleted.')
    });
  }

  deleteStory(story: Story): void {
    if (!confirm(`Delete story "${story.title}"?`)) {
      return;
    }
    this.storyService.delete(story.id).subscribe({
      next: () => this.stories.set(this.stories().filter((item) => item.id !== story.id)),
      error: () => this.error.set('The story could not be deleted.')
    });
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
}
