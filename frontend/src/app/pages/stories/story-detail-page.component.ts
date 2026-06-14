import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { STORY_TYPES, Story, StoryStatus, StoryType } from '../../core/models/story.model';
import { StoryService } from '../../core/services/story.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';

@Component({
  selector: 'app-story-detail-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, StateMessageComponent],
  template: `
    <section class="page-stack">
      @if (loading()) {
        <app-state-message title="Loading story" message="Opening story detail." />
      } @else if (error()) {
        <app-state-message title="Story unavailable" [message]="error()" tone="error" />
      } @else if (story()) {
        <div class="detail-hero">
          <div>
            <p class="eyebrow">Story</p>
            <h2>{{ story()?.title }}</h2>
            <p>{{ story()?.status }} · {{ story()?.type }} · Updated {{ story()?.updatedAt | date:'medium' }}</p>
          </div>
          <div class="action-row">
            <a class="button secondary" [routerLink]="['/projects', story()?.projectId]">Back to project</a>
            <button class="button danger" type="button" (click)="deleteStory()">Delete story</button>
          </div>
        </div>

        <form class="panel form-panel wide" [formGroup]="form" (ngSubmit)="saveStory()">
          <h3>Edit story</h3>
          <label>
            <span>Title</span>
            <input formControlName="title" />
          </label>
          @if (form.controls.title.touched && form.controls.title.invalid) {
            <small class="field-error">Story title is required.</small>
          }
          <label>
            <span>Raw text</span>
            <textarea formControlName="rawText" rows="10"></textarea>
          </label>
          @if (form.controls.rawText.touched && form.controls.rawText.invalid) {
            <small class="field-error">Story raw text is required.</small>
          }
          <div class="form-grid">
            <label>
              <span>Type</span>
              <select formControlName="type">
                @for (type of storyTypes; track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </label>
            <label>
              <span>Status</span>
              <select formControlName="status">
                <option value="DRAFT">DRAFT</option>
                <option value="ANALYZED">ANALYZED</option>
                <option value="TESTS_GENERATED">TESTS_GENERATED</option>
                <option value="REVIEWED">REVIEWED</option>
                <option value="EXPORTED">EXPORTED</option>
              </select>
            </label>
          </div>
          @if (saveMessage()) {
            <app-state-message title="Story saved" [message]="saveMessage()" />
          }
          @if (saveError()) {
            <app-state-message title="Could not save story" [message]="saveError()" tone="error" />
          }
          <button class="button" type="submit" [disabled]="form.invalid || saving()">
            {{ saving() ? 'Saving...' : 'Save changes' }}
          </button>
        </form>
      }
    </section>
  `
})
export class StoryDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly storyService = inject(StoryService);

  readonly storyTypes = STORY_TYPES;
  readonly story = signal<Story | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly saveError = signal('');
  readonly saveMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    rawText: ['', Validators.required],
    type: ['USER_STORY' as StoryType, Validators.required],
    status: ['DRAFT' as StoryStatus, Validators.required]
  });

  private storyId = '';

  ngOnInit(): void {
    this.storyId = this.route.snapshot.paramMap.get('storyId') ?? '';
    this.storyService.get(this.storyId).subscribe({
      next: (story) => {
        this.story.set(story);
        this.form.patchValue({
          title: story.title,
          rawText: story.rawText,
          type: story.type,
          status: story.status
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Story not found or backend unavailable.');
        this.loading.set(false);
      }
    });
  }

  saveStory(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set('');
    this.saveMessage.set('');
    this.storyService.update(this.storyId, this.form.getRawValue()).subscribe({
      next: (story) => {
        this.story.set(story);
        this.saveMessage.set('The story details were updated.');
        this.saving.set(false);
      },
      error: () => {
        this.saveError.set('The story could not be saved.');
        this.saving.set(false);
      }
    });
  }

  deleteStory(): void {
    const story = this.story();
    if (!story || !confirm(`Delete story "${story.title}"?`)) {
      return;
    }
    this.storyService.delete(story.id).subscribe({
      next: () => this.router.navigate(['/projects', story.projectId]),
      error: () => this.error.set('The story could not be deleted.')
    });
  }
}
