import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AmbiguitySeverity,
  CoverageCategory,
  ExtractedRequirement,
  RequirementType,
  StoryAnalysisResult
} from '../../core/models/analysis.model';
import { STORY_TYPES, Story, StoryStatus, StoryType } from '../../core/models/story.model';
import { AnalysisService } from '../../core/services/analysis.service';
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
            <p>{{ story()?.status }} / {{ story()?.type }} / Updated {{ story()?.updatedAt | date:'medium' }}</p>
          </div>
          <div class="action-row">
            <a class="button secondary" [routerLink]="['/projects', story()?.projectId]">Back to project</a>
            <button class="button analysis-button" type="button" (click)="analyzeStory()" [disabled]="analyzing()">
              {{ analyzing() ? 'Analyzing...' : 'Analyze Story' }}
            </button>
            <button class="button danger" type="button" (click)="deleteStory()">Delete story</button>
          </div>
        </div>

        <section class="panel story-summary-panel">
          <div class="section-header">
            <div>
              <p class="eyebrow">Story summary</p>
              <h3>{{ story()?.title }}</h3>
            </div>
            <div class="badge-row">
              <span class="badge">{{ story()?.type }}</span>
              <span class="badge status-badge">{{ story()?.status }}</span>
            </div>
          </div>
          <p class="raw-story-text">{{ story()?.rawText }}</p>
        </section>

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

        <section class="panel analysis-panel">
          <div class="section-header">
            <div>
              <p class="eyebrow analysis-eyebrow">AI analysis</p>
              <h3>Story analysis</h3>
            </div>
            @if (analysis()?.generatedAt) {
              <span class="muted-text">Generated {{ analysis()?.generatedAt | date:'medium' }}</span>
            }
          </div>

          @if (analysisLoading()) {
            <app-state-message title="Loading analysis" message="Checking for existing story analysis." />
          } @else if (analysisError()) {
            <app-state-message title="Analysis unavailable" [message]="analysisError()" tone="error" />
          } @else if (!hasAnalysis()) {
            <div class="empty-analysis">
              <p class="eyebrow analysis-eyebrow">Ready for analysis</p>
              <h3>No analysis has been generated yet.</h3>
              <p>Run the mock AI analysis to extract requirements, ambiguities, scores, and coverage suggestions.</p>
              <button class="button analysis-button" type="button" (click)="analyzeStory()" [disabled]="analyzing()">
                {{ analyzing() ? 'Analyzing...' : 'Analyze Story' }}
              </button>
            </div>
          } @else {
            <div class="score-grid">
              <article class="score-card">
                <span>Requirement quality</span>
                <strong>{{ formatScore(analysis()?.qaValidation?.requirementQualityScore) }}</strong>
              </article>
              <article class="score-card">
                <span>Testability</span>
                <strong>{{ formatScore(analysis()?.qaValidation?.testabilityScore) }}</strong>
              </article>
              <article class="score-card">
                <span>Confidence</span>
                <strong>{{ formatScore(analysis()?.confidenceScore) }}</strong>
              </article>
            </div>

            <div class="analysis-grid">
              <section class="analysis-card">
                <div class="analysis-card-header">
                  <p class="eyebrow analysis-eyebrow">Understanding</p>
                  <h4>Extracted story understanding</h4>
                </div>
                <dl class="definition-list">
                  <div>
                    <dt>Actor</dt>
                    <dd>{{ analysis()?.actor || 'Not identified' }}</dd>
                  </div>
                  <div>
                    <dt>Goal</dt>
                    <dd>{{ analysis()?.goal || 'Not identified' }}</dd>
                  </div>
                  <div>
                    <dt>Business value</dt>
                    <dd>{{ analysis()?.businessValue || 'Not provided by this analysis contract' }}</dd>
                  </div>
                </dl>
              </section>

              <section class="analysis-card">
                <div class="analysis-card-header">
                  <p class="eyebrow analysis-eyebrow">Warnings</p>
                  <h4>QA validation notes</h4>
                </div>
                @if ((analysis()?.qaValidation?.warnings?.length ?? 0) > 0) {
                  <div class="list-stack compact">
                    @for (warning of qaWarnings(); track warning) {
                      <div class="inline-note amber-note">{{ warning }}</div>
                    }
                  </div>
                } @else {
                  <app-state-message title="No warnings" message="The analysis did not flag additional QA validation warnings." />
                }
              </section>
            </div>

            <section class="analysis-card full-span">
              <div class="analysis-card-header">
                <p class="eyebrow analysis-eyebrow">Requirements</p>
                <h4>Extracted requirements</h4>
              </div>
              @if (requirementCount() === 0) {
                <app-state-message title="No requirements extracted" message="Run analysis again after adding more story detail." />
              } @else {
                <div class="requirement-groups">
                  @for (type of requirementTypes; track type) {
                    @if (requirementsByType(type).length > 0) {
                      <div class="requirement-group">
                        <h5>{{ formatLabel(type) }}</h5>
                        <div class="list-stack compact">
                          @for (requirement of requirementsByType(type); track requirement.reference || requirement.title) {
                            <article class="result-row">
                              <div>
                                <strong>{{ requirement.title }}</strong>
                                <p>{{ requirement.description || 'No description provided.' }}</p>
                              </div>
                              <div class="badge-row">
                                @if (requirement.reference) {
                                  <span class="badge cyan-badge">{{ requirement.reference }}</span>
                                }
                                @if (requirement.priority) {
                                  <span class="badge">{{ requirement.priority }}</span>
                                }
                                @if (requirement.riskLevel) {
                                  <span class="badge amber-badge">{{ requirement.riskLevel }} risk</span>
                                }
                              </div>
                            </article>
                          }
                        </div>
                      </div>
                    }
                  }
                  @if ((analysis()?.requirements?.acceptanceCriteria?.length ?? 0) > 0) {
                    <div class="requirement-group">
                      <h5>Acceptance criteria</h5>
                      <div class="list-stack compact">
                        @for (criterion of acceptanceCriteria(); track criterion) {
                          <div class="inline-note">{{ criterion }}</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </section>

            <div class="analysis-grid">
              <section class="analysis-card">
                <div class="analysis-card-header">
                  <p class="eyebrow analysis-eyebrow">Ambiguities</p>
                  <h4>Questions and risks</h4>
                </div>
                @if ((analysis()?.ambiguities?.ambiguities?.length ?? 0) === 0) {
                  <app-state-message title="No ambiguities found" message="The story is clear enough for this analysis pass." />
                } @else {
                  <div class="list-stack compact">
                    @for (severity of ambiguitySeverities; track severity) {
                      @if (ambiguitiesBySeverity(severity).length > 0) {
                        <div class="severity-group">
                          <span class="badge" [class]="severityClass(severity)">{{ severity }}</span>
                          @for (ambiguity of ambiguitiesBySeverity(severity); track ambiguity.question) {
                            <article class="result-row ambiguity-row">
                              <div>
                                <strong>{{ ambiguity.question }}</strong>
                                <p>{{ ambiguity.context || ambiguity.impact || 'Impact has not been specified.' }}</p>
                                @if (ambiguity.affectedArea) {
                                  <small>Affected area: {{ ambiguity.affectedArea }}</small>
                                }
                              </div>
                            </article>
                          }
                        </div>
                      }
                    }
                  </div>
                }
              </section>

              <section class="analysis-card">
                <div class="analysis-card-header">
                  <p class="eyebrow analysis-eyebrow">Coverage</p>
                  <h4>Coverage suggestions</h4>
                </div>
                @if ((analysis()?.coveragePlan?.coverageItems?.length ?? 0) === 0) {
                  <app-state-message title="No coverage suggestions" message="Coverage planning will appear after analysis produces suggestions." />
                } @else {
                  <div class="coverage-grid">
                    @for (category of coverageCategories; track category) {
                      <article class="coverage-tile" [class.empty]="coverageByCategory(category).length === 0">
                        <span>{{ formatLabel(category) }}</span>
                        @if (coverageByCategory(category).length > 0) {
                          @for (coverage of coverageByCategory(category); track coverage.description) {
                            <p>{{ coverage.description }}</p>
                            <div class="badge-row">
                              @if (coverage.requirementReference) {
                                <span class="badge cyan-badge">{{ coverage.requirementReference }}</span>
                              }
                              @if (coverage.riskLevel) {
                                <span class="badge amber-badge">{{ coverage.riskLevel }}</span>
                              }
                            </div>
                          }
                        } @else {
                          <p>No suggestion yet.</p>
                        }
                      </article>
                    }
                  </div>
                }
              </section>
            </div>
          }
        </section>
      }
    </section>
  `
})
export class StoryDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly storyService = inject(StoryService);
  private readonly analysisService = inject(AnalysisService);

  readonly storyTypes = STORY_TYPES;
  readonly requirementTypes: RequirementType[] = [
    'FUNCTIONAL',
    'ACCEPTANCE_CRITERION',
    'BUSINESS_RULE',
    'DATA_RULE',
    'SECURITY',
    'ROLE_PERMISSION',
    'NON_FUNCTIONAL',
    'INTEGRATION'
  ];
  readonly ambiguitySeverities: AmbiguitySeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  readonly coverageCategories: CoverageCategory[] = [
    'HAPPY_PATH',
    'NEGATIVE_PATH',
    'BOUNDARY',
    'ROLE_BASED',
    'API',
    'E2E',
    'SECURITY',
    'PERFORMANCE',
    'ACCESSIBILITY',
    'REGRESSION'
  ];

  readonly story = signal<Story | null>(null);
  readonly analysis = signal<StoryAnalysisResult | null>(null);
  readonly loading = signal(true);
  readonly analysisLoading = signal(false);
  readonly analyzing = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly analysisError = signal('');
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
        this.loadAnalysis();
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

  analyzeStory(): void {
    if (!this.storyId) {
      return;
    }
    this.analyzing.set(true);
    this.analysisError.set('');
    this.analysisService.analyzeStory(this.storyId).subscribe({
      next: (analysis) => {
        this.analysis.set(analysis);
        const currentStory = this.story();
        if (currentStory) {
          this.story.set({ ...currentStory, status: 'ANALYZED' });
          this.form.patchValue({ status: 'ANALYZED' });
        }
        this.analyzing.set(false);
      },
      error: () => {
        this.analysisError.set('The story could not be analyzed. Confirm the backend is running and try again.');
        this.analyzing.set(false);
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

  hasAnalysis(): boolean {
    const analysis = this.analysis();
    return !!analysis && (
      !!analysis.actor ||
      !!analysis.goal ||
      (analysis.requirements?.requirements?.length ?? 0) > 0 ||
      (analysis.ambiguities?.ambiguities?.length ?? 0) > 0 ||
      (analysis.coveragePlan?.coverageItems?.length ?? 0) > 0
    );
  }

  requirementCount(): number {
    return this.analysis()?.requirements?.requirements?.length ?? 0;
  }

  qaWarnings(): string[] {
    return this.analysis()?.qaValidation?.warnings ?? [];
  }

  acceptanceCriteria(): string[] {
    return this.analysis()?.requirements?.acceptanceCriteria ?? [];
  }

  requirementsByType(type: RequirementType): ExtractedRequirement[] {
    return this.analysis()?.requirements?.requirements?.filter((requirement) => requirement.type === type) ?? [];
  }

  ambiguitiesBySeverity(severity: AmbiguitySeverity) {
    return this.analysis()?.ambiguities?.ambiguities?.filter((ambiguity) => ambiguity.severity === severity) ?? [];
  }

  coverageByCategory(category: CoverageCategory) {
    return this.analysis()?.coveragePlan?.coverageItems?.filter((coverage) => coverage.category === category) ?? [];
  }

  formatScore(score: number | null | undefined): string {
    if (score === null || score === undefined || score <= 0) {
      return 'N/A';
    }
    return `${Math.round(score * 100)}%`;
  }

  formatLabel(value: string): string {
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  severityClass(severity: AmbiguitySeverity): string {
    return `severity-${severity.toLowerCase()}`;
  }

  private loadAnalysis(): void {
    if (!this.storyId) {
      return;
    }
    this.analysisLoading.set(true);
    this.analysisError.set('');
    this.analysisService.getAnalysis(this.storyId).subscribe({
      next: (analysis) => {
        this.analysis.set(analysis);
        this.analysisLoading.set(false);
      },
      error: () => {
        this.analysis.set(null);
        this.analysisLoading.set(false);
      }
    });
  }
}
