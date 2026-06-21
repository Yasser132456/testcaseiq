import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  AmbiguitySeverity,
  CoverageCategory,
  ExtractedRequirement,
  Priority,
  RequirementType,
  RiskLevel,
  StoryAnalysisResult
} from '../../core/models/analysis.model';
import {
  GeneratedTestCase,
  GeneratedTestData,
  GeneratedTestStep,
  GeneratedTestSuiteResult,
  ReviewStatus
} from '../../core/models/generated-test.model';
import { ReviewEvent, TestCaseResponse } from '../../core/models/review.model';
import { STORY_TYPES, Story, StoryStatus, StoryType } from '../../core/models/story.model';
import { AnalysisService } from '../../core/services/analysis.service';
import { ExportFormat, ExportService } from '../../core/services/export.service';
import { ReviewService } from '../../core/services/review.service';
import { StoryService } from '../../core/services/story.service';
import { TestGenerationService } from '../../core/services/test-generation.service';
import { StateMessageComponent } from '../../shared/components/state-message.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';

interface ReviewDraft {
  title?: string;
  objective?: string;
  comment?: string;
  steps?: Record<number, Partial<GeneratedTestStep>>;
}

@Component({
  selector: 'app-story-detail-page',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, StateMessageComponent, SkeletonComponent],
  template: `
    <section class="page-stack">
      @if (loading()) {
        <app-skeleton [rows]="5" [cols]="3" />
      } @else if (error()) {
        <app-state-message title="Story unavailable" [message]="error()" tone="error" />
      } @else if (story()) {
        <div class="detail-hero">
          <div>
            <h2>{{ story()?.title }}</h2>
            <p>{{ formatLabel(story()?.status ?? '') }} / {{ formatLabel(story()?.type ?? '') }} / Updated {{ story()?.updatedAt | date:'medium' }}</p>
          </div>
          <div class="action-row">
            <a class="button secondary" [routerLink]="['/projects', story()?.projectId]">Back to project</a>
            @if (canEdit()) {
              <button class="button analysis-button" type="button" (click)="analyzeStory()" [disabled]="analyzing()">
                {{ analyzing() ? 'Analyzing...' : 'Analyze Story' }}
              </button>
              <button class="button generate-button" type="button" (click)="generateTestCases()" [disabled]="generatingTests()">
                {{ generatingTests() ? 'Generating...' : 'Generate Test Cases' }}
              </button>
            }
            @if (canDelete()) {
              <button class="button danger" type="button" (click)="deleteStory()">Delete story</button>
            }
          </div>
        </div>

        <section class="panel story-summary-panel">
          <div class="section-header">
            <div class="badge-row">
              <span class="badge">{{ formatLabel(story()?.type ?? '') }}</span>
              <span class="badge status-badge">{{ formatLabel(story()?.status ?? '') }}</span>
            </div>
            <button class="button secondary toggle-btn" type="button" (click)="toggleStorySummary()" [attr.aria-expanded]="storySummaryExpanded()">
              {{ storySummaryExpanded() ? 'Hide story' : 'Show story text' }}
            </button>
          </div>
          @if (storySummaryExpanded()) {
            <p class="raw-story-text">{{ story()?.rawText }}</p>
          }
        </section>

        @if (canEdit()) {
          <section class="panel form-panel wide">
            <div class="section-header">
              <h3>Edit story</h3>
              <button class="button secondary toggle-btn" type="button" (click)="toggleEditForm()" [attr.aria-expanded]="editFormExpanded()">
                {{ editFormExpanded() ? 'Close' : 'Edit' }}
              </button>
            </div>
          @if (editFormExpanded()) {
          <form [formGroup]="form" (ngSubmit)="saveStory()">

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
                    <option [value]="type">{{ formatLabel(type) }}</option>
                  }
                </select>
              </label>
              <label>
                <span>Status</span>
                <select formControlName="status">
                  @for (status of storyStatuses; track status) {
                    <option [value]="status">{{ formatLabel(status) }}</option>
                  }
                </select>
              </label>
            </div>
            @if (saveMessage()) {
              <app-state-message title="Story saved" [message]="saveMessage()" tone="success" />
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
        }

        <section class="panel analysis-panel">
          <div class="section-header">
            <div>
              <h3>Story analysis</h3>
              @if (analysis()?.generatedAt) {
                <span class="muted-text">Generated {{ analysis()?.generatedAt | date:'medium' }}</span>
              }
            </div>
            <button class="button secondary toggle-btn" type="button" (click)="toggleAnalysis()" [attr.aria-expanded]="analysisExpanded()">
              {{ analysisExpanded() ? 'Collapse' : 'Expand' }}
            </button>
          </div>

          @if (analysisLoading()) {
            <app-skeleton [rows]="3" [cols]="3" />
          } @else if (analysisError()) {
            <app-state-message title="Analysis unavailable" [message]="analysisError()" tone="error" />
          } @else if (!hasAnalysis()) {
            <div class="empty-analysis">
              <h3>No analysis has been generated yet.</h3>
              <p>Run the mock AI analysis to extract requirements, ambiguities, scores, and coverage suggestions.</p>
              @if (canEdit()) {
                <button class="button analysis-button" type="button" (click)="analyzeStory()" [disabled]="analyzing()">
                  {{ analyzing() ? 'Analyzing...' : 'Analyze Story' }}
                </button>
              }
            </div>
          } @else {
            @if (analysisExpanded()) {
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
                  <h4>Story understanding</h4>
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
                  <h4>QA validation notes</h4>
                </div>
                @if ((analysis()?.qaValidation?.warnings?.length ?? 0) > 0) {
                  <div class="list-stack compact">
                    @for (warning of qaWarnings(); track warning) {
                      <div class="inline-note amber-note">{{ warning }}</div>
                    }
                  </div>
                } @else {
                  <app-state-message title="No warnings" message="The analysis did not flag any QA validation warnings." tone="success" />
                }
              </section>
            </div>

            <section class="analysis-card full-span">
              <div class="analysis-card-header">
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
                  <h4>Questions and risks</h4>
                </div>
                @if ((analysis()?.ambiguities?.ambiguities?.length ?? 0) === 0) {
                  <app-state-message title="No ambiguities found" message="The story is clear enough for this analysis pass." tone="success" />
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
            } @else {
              <p class="muted-text">Expand to view extracted requirements, ambiguities, and coverage suggestions.</p>
            }
          }
        </section>

        <section class="panel generated-tests-panel">
          <div class="section-header">
            <div>
              <h3>Generated test cases</h3>
            </div>
            <div class="badge-row">
              <span class="badge cyan-badge">{{ testSuites().length }} suites</span>
              <span class="badge status-badge">{{ totalTestCases() }} cases</span>
            </div>
          </div>
          @if (reviewMessage()) {
            <app-state-message title="Review updated" [message]="reviewMessage()" tone="success" />
          }
          @if (reviewError()) {
            <app-state-message title="Review update failed" [message]="reviewError()" tone="error" />
          }
          @if (exportMessage()) {
            <app-state-message title="Export ready" [message]="exportMessage()" tone="success" />
          }
          @if (exportError()) {
            <app-state-message title="Export failed" [message]="exportError()" tone="error" />
          }

          <section class="export-panel">
            <div class="export-copy">
              <h4>Download reviewed manual tests</h4>
              <p>Only APPROVED test cases are exported. Draft, rejected, and needs-review cases stay out of the file.</p>
            </div>
            <div class="export-action-grid">
              @for (option of exportOptions; track option.format) {
                <button
                  class="export-card"
                  [class.playwright-card]="option.format === 'playwright'"
                  [class.postman-card]="option.format === 'postman'"
                  [class.xray-card]="option.format === 'xray-csv'"
                  [class.azure-card]="option.format === 'azure-devops-csv'"
                  type="button"
                  (click)="exportApprovedTestCases(option.format)"
                  [disabled]="isExporting()"
                >
                  <span>{{ option.badge }}</span>
                  <strong>{{ exportingFormat() === option.format ? 'Exporting...' : option.label }}</strong>
                  <small>{{ option.description }}</small>
                </button>
              }
            </div>
            @if (exportFormatDisclaimer()) {
              <div class="inline-note amber-note">{{ exportFormatDisclaimer() }}</div>
            }
          </section>

          @if (testSuitesLoading()) {
            <app-skeleton [rows]="3" [cols]="4" />
          } @else if (testGenerationError()) {
            <app-state-message title="Test generation unavailable" [message]="testGenerationError()" tone="error" />
          } @else if (!hasTestSuites()) {
            <div class="empty-analysis generated-empty">
              <h3>No manual test cases exist yet.</h3>
              <p>Generate mock manual tests from this story. The result will include test objectives, steps, data, BDD text, and requirement links.</p>
              @if (canEdit()) {
                <button class="button generate-button" type="button" (click)="generateTestCases()" [disabled]="generatingTests()">
                  {{ generatingTests() ? 'Generating...' : 'Generate Test Cases' }}
                </button>
              }
            </div>
          } @else {
            <div class="suite-stack">
              @for (suite of testSuites(); track suite.suiteName + suite.generatedAt) {
                <article class="test-suite-card">
                  <div class="suite-summary">
                    <div>
                      <p class="eyebrow generated-eyebrow">Test suite</p>
                      <h4>{{ suite.suiteName }}</h4>
                      <p>{{ story()?.title }} / {{ suite.provider }}</p>
                    </div>
                    <div class="suite-metrics">
                      <span class="badge status-badge">{{ suite.testCases.length }} test cases</span>
                      @if (suite.generatedAt) {
                        <span class="badge">Generated {{ suite.generatedAt | date:'medium' }}</span>
                      }
                    </div>
                  </div>

                  @if (suite.explainabilitySummary) {
                    <div class="inline-note">{{ suite.explainabilitySummary }}</div>
                  }

                  @if (suiteWarnings(suite).length > 0) {
                    <div class="list-stack compact">
                      @for (warning of suiteWarnings(suite); track warning) {
                        <div class="inline-note amber-note">{{ warning }}</div>
                      }
                    </div>
                  }

                  @if (suite.testCases.length === 0) {
                    <app-state-message title="No test cases returned" message="The generation request completed, but this suite does not contain manual tests." />
                  } @else {
                    <div class="test-case-grid">
                      @for (testCase of suite.testCases; track testCase.id) {
                        <article class="test-case-card">
                          <div class="test-case-header">
                            <div>
                              <p class="eyebrow generated-eyebrow">Manual test</p>
                              <h5>{{ testCase.title }}</h5>
                              <p>{{ testObjective(testCase) }}</p>
                            </div>
                            <div class="badge-row">
                              <span class="badge cyan-badge">{{ testCase.type }}</span>
                              @if (testCase.testLayer) {
                                <span class="badge">{{ testCase.testLayer }}</span>
                              }
                              @if (testCase.priority) {
                                <span class="badge status-badge">{{ testCase.priority }}</span>
                              }
                              @if (testCase.riskLevel) {
                                <span class="badge amber-badge">{{ testCase.riskLevel }} risk</span>
                              }
                              <span class="badge" [class.status-badge]="testCase.automationCandidate">
                                {{ testCase.automationCandidate ? 'Automation candidate' : 'Manual priority' }}
                              </span>
                              <span class="badge">{{ formatScore(testCase.confidenceScore) }} confidence</span>
                              @if (testCase.qualityScore != null) {
                                <span class="badge" [style.color]="qualityColor(testCase)">Quality {{ testCase.qualityScore }}/100</span>
                              }
                              @if (testCase.confidenceLevel) {
                                <span class="badge" [style.color]="qualityColor(testCase)">{{ testCase.confidenceLevel }}</span>
                              }
                              <span
                                class="badge review-status-badge"
                                [class.review-approved]="displayReviewStatus(testCase) === 'APPROVED'"
                                [class.review-rejected]="displayReviewStatus(testCase) === 'REJECTED'"
                                [class.review-attention]="displayReviewStatus(testCase) === 'NEEDS_REVIEW' || displayReviewStatus(testCase) === 'NEEDS_CLARIFICATION'"
                                [class.review-draft]="displayReviewStatus(testCase) === 'DRAFT'"
                              >
                                {{ formatLabel(displayReviewStatus(testCase)) }}
                              </span>
                            </div>
                          </div>

                          @if (!testCase.id) {
                            <div class="inline-note amber-note">
                              This generated test case is missing a persisted backend ID, so review actions are disabled.
                            </div>
                          } @else if (canEdit()) {
                            <section class="review-workflow-panel">
                              <div class="review-action-grid">
                                <button class="button approve-button" type="button" (click)="updateReviewStatus(testCase, 'APPROVED')" [disabled]="isReviewBusy(testCase)">
                                  Approve
                                </button>
                                <button class="button danger" type="button" (click)="updateReviewStatus(testCase, 'REJECTED')" [disabled]="isReviewBusy(testCase)">
                                  Reject
                                </button>
                                <button class="button clarification-button" type="button" (click)="updateReviewStatus(testCase, 'NEEDS_CLARIFICATION')" [disabled]="isReviewBusy(testCase)">
                                  Needs clarification
                                </button>
                                <button class="button review-button" type="button" (click)="updateReviewStatus(testCase, 'NEEDS_REVIEW')" [disabled]="isReviewBusy(testCase)">
                                  Needs review
                                </button>
                              </div>

                              <div class="review-field-grid">
                                <label>
                                  <span>Priority</span>
                                  <select [value]="testCase.priority ?? ''" (change)="updatePriority(testCase, $any($event.target).value)" [disabled]="isReviewBusy(testCase)">
                                    <option value="" disabled>Not set</option>
                                    @for (priority of priorityOptions; track priority) {
                                      <option [value]="priority">{{ formatLabel(priority) }}</option>
                                    }
                                  </select>
                                </label>
                                <label>
                                  <span>Risk</span>
                                  <select [value]="testCase.riskLevel ?? ''" (change)="updateRisk(testCase, $any($event.target).value)" [disabled]="isReviewBusy(testCase)">
                                    <option value="" disabled>Not set</option>
                                    @for (risk of riskOptions; track risk) {
                                      <option [value]="risk">{{ formatLabel(risk) }}</option>
                                    }
                                  </select>
                                </label>
                                <label class="checkbox-field">
                                  <input type="checkbox" [checked]="testCase.automationCandidate" (change)="updateAutomationCandidate(testCase, $any($event.target).checked)" [disabled]="isReviewBusy(testCase)" />
                                  <span>Automation candidate</span>
                                </label>
                              </div>

                              <label>
                                <span>Review comment</span>
                                <input [value]="reviewDraft(testCase)?.comment ?? ''" (input)="updateReviewDraft(testCase, 'comment', $any($event.target).value)" placeholder="Optional note for the review history" [disabled]="isReviewBusy(testCase)" />
                              </label>
                            </section>
                          }

                          @if (testCase.linkedRequirementReferences.length > 0) {
                            <div class="evidence-row">
                              <span>Linked requirements</span>
                              <div class="badge-row">
                                @for (reference of testCase.linkedRequirementReferences; track reference) {
                                  <span class="badge cyan-badge">{{ reference }}</span>
                                }
                              </div>
                            </div>
                          }

                          @if (testCase.sourceEvidence) {
                            <div class="inline-note">{{ testCase.sourceEvidence }}</div>
                          }

                          @if (testCase.generationRationale) {
                            <div class="inline-note">Rationale: {{ testCase.generationRationale }}</div>
                          }

                          @if (testCase.linkedAcceptanceCriteriaText) {
                            <div class="inline-note">AC: {{ testCase.linkedAcceptanceCriteriaText }}</div>
                          }

                          @if (testCase.id && canEdit()) {
                            <section class="test-detail-section edit-test-case-panel">
                              <h6>Review edits</h6>
                              <div class="review-edit-grid">
                                <label>
                                  <span>Title</span>
                                  <input [value]="reviewDraft(testCase)?.title ?? testCase.title" (input)="updateReviewDraft(testCase, 'title', $any($event.target).value)" [disabled]="isReviewBusy(testCase)" />
                                </label>
                                <label>
                                  <span>Objective</span>
                                  <textarea rows="3" [value]="reviewDraft(testCase)?.objective ?? testObjective(testCase)" (input)="updateReviewDraft(testCase, 'objective', $any($event.target).value)" [disabled]="isReviewBusy(testCase)"></textarea>
                                </label>
                              </div>
                              <button class="button secondary" type="button" (click)="saveTestCaseEdits(testCase)" [disabled]="isReviewBusy(testCase)">
                                {{ isReviewBusy(testCase) ? 'Saving...' : 'Save test case edits' }}
                              </button>
                            </section>
                          }

                          @if (testCase.preconditions) {
                            <section class="test-detail-section">
                              <h6>Preconditions</h6>
                              <p>{{ testCase.preconditions }}</p>
                            </section>
                          }

                          <section class="test-detail-section">
                            <h6>Test steps</h6>
                            @if (testCase.steps.length === 0) {
                              <app-state-message title="No steps returned" message="This test case does not include detailed steps yet." />
                            } @else {
                              <div class="step-list">
                                @for (step of testCase.steps; track step.order) {
                                  <div class="step-row">
                                    <span>{{ step.order }}</span>
                                    <div>
                                      @if (testCase.id && canEdit()) {
                                        <label class="compact-field">
                                          <span>Action</span>
                                          <input [value]="stepDraft(testCase, step)?.action ?? step.action" (input)="updateReviewStepDraft(testCase, step, 'action', $any($event.target).value)" [disabled]="isReviewBusy(testCase)" />
                                        </label>
                                        <label class="compact-field">
                                          <span>Expected result</span>
                                          <textarea rows="2" [value]="stepDraft(testCase, step)?.expectedResult ?? step.expectedResult ?? ''" (input)="updateReviewStepDraft(testCase, step, 'expectedResult', $any($event.target).value)" [disabled]="isReviewBusy(testCase)"></textarea>
                                        </label>
                                      } @else {
                                        <strong>{{ step.action }}</strong>
                                        <p>{{ step.expectedResult || 'Expected result not specified.' }}</p>
                                      }
                                    </div>
                                  </div>
                                }
                              </div>
                            }
                          </section>

                          @if (testCase.id) {
                            <section class="test-detail-section review-history-section">
                              <div class="history-header">
                                <h6>Review history</h6>
                                <button class="button secondary" type="button" (click)="toggleReviewHistory(testCase)" [disabled]="reviewHistoryLoading() && selectedHistoryTestCaseId() === testCase.id">
                                  {{ selectedHistoryTestCaseId() === testCase.id ? 'Hide history' : 'Show history' }}
                                </button>
                              </div>
                              @if (selectedHistoryTestCaseId() === testCase.id) {
                                @if (reviewHistoryLoading()) {
                                  <app-skeleton [rows]="3" [cols]="2" />
                                } @else if (reviewHistoryError()) {
                                  <app-state-message title="History unavailable" [message]="reviewHistoryError()" tone="error" />
                                } @else if (reviewEvents().length === 0) {
                                  <app-state-message title="No review events" message="No review history has been recorded for this test case yet." />
                                } @else {
                                  <div class="review-event-list">
                                    @for (event of reviewEvents(); track event.id) {
                                      <article class="review-event-row">
                                        <div>
                                          <strong>{{ formatLabel(event.actionType) }}</strong>
                                          <p>{{ event.previousValue || 'None' }} -> {{ event.newValue || 'None' }}</p>
                                          @if (event.comment) {
                                            <small>{{ event.comment }}</small>
                                          }
                                        </div>
                                        <time>{{ event.createdAt | date:'medium' }}</time>
                                      </article>
                                    }
                                  </div>
                                }
                              }
                            </section>
                          }

                          <section class="test-detail-section">
                            <h6>Test data</h6>
                            @if (testCase.testData.length === 0) {
                              <app-state-message title="No test data" message="No structured test data was returned for this case." />
                            } @else {
                              <div class="test-data-grid">
                                @for (data of testCase.testData; track data.name) {
                                  <div class="test-data-card">
                                    <span>{{ data.name }}</span>
                                    @if (data.classification) {
                                      <small>{{ data.classification }}</small>
                                    }
                                    <code>{{ testDataValue(data) }}</code>
                                  </div>
                                }
                              </div>
                            }
                          </section>

                          @if (testCase.bddScenario) {
                            <section class="test-detail-section">
                              <h6>BDD scenario</h6>
                              <pre class="bdd-panel"><code>{{ testCase.bddScenario }}</code></pre>
                            </section>
                          }
                        </article>
                      }
                    </div>
                  }
                </article>
              }
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
  private readonly testGenerationService = inject(TestGenerationService);
  private readonly reviewService = inject(ReviewService);
  private readonly exportService = inject(ExportService);
  private readonly authService = inject(AuthService);

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
  readonly storyStatuses: StoryStatus[] = ['DRAFT', 'ANALYZED', 'TESTS_GENERATED', 'REVIEWED', 'EXPORTED'];
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
  readonly priorityOptions: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  readonly riskOptions: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
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
  readonly exportOptions: { format: ExportFormat; label: string; badge: string; description: string }[] = [
    {
      format: 'markdown',
      label: 'Markdown',
      badge: 'MD',
      description: 'Human-readable review artifact'
    },
    {
      format: 'csv',
      label: 'CSV',
      badge: 'CSV',
      description: 'Spreadsheet-ready test case table'
    },
    {
      format: 'json',
      label: 'JSON',
      badge: 'JSON',
      description: 'Structured integration payload'
    },
    {
      format: 'playwright',
      label: 'Playwright',
      badge: 'TS',
      description: 'Draft automation skeleton'
    },
    {
      format: 'postman',
      label: 'Postman',
      badge: 'API',
      description: 'Approved API-oriented test cases only'
    },
    {
      format: 'xray-csv',
      label: 'Jira/Xray CSV',
      badge: 'XRAY',
      description: 'Draft import mapping CSV'
    },
    {
      format: 'azure-devops-csv',
      label: 'Azure DevOps CSV',
      badge: 'ADO',
      description: 'Draft Azure import mapping'
    }
  ];

  readonly story = signal<Story | null>(null);
  readonly analysis = signal<StoryAnalysisResult | null>(null);
  readonly testSuites = signal<GeneratedTestSuiteResult[]>([]);
  readonly loading = signal(true);
  readonly analysisLoading = signal(false);
  readonly testSuitesLoading = signal(false);
  readonly analyzing = signal(false);
  readonly generatingTests = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly analysisError = signal('');
  readonly testGenerationError = signal('');
  readonly saveError = signal('');
  readonly saveMessage = signal('');
  readonly reviewMessage = signal('');
  readonly reviewError = signal('');
  readonly reviewBusyByTestCaseId = signal<Record<string, string>>({});
  readonly reviewDrafts = signal<Record<string, ReviewDraft>>({});
  readonly selectedHistoryTestCaseId = signal<string | null>(null);
  readonly reviewEvents = signal<ReviewEvent[]>([]);
  readonly reviewHistoryLoading = signal(false);
  readonly reviewHistoryError = signal('');
  readonly exportingFormat = signal<ExportFormat | null>(null);
  readonly exportError = signal('');
  readonly exportMessage = signal('');

  readonly analysisExpanded = signal(false);
  readonly storySummaryExpanded = signal(true);
  readonly editFormExpanded = signal(false);
  readonly lastExportFormat = signal<ExportFormat | null>(null);

  readonly exportFormatDisclaimer = computed(() => {
    const fmt = this.lastExportFormat();
    if (fmt === 'playwright') return 'Playwright export — draft skeleton only. Generated selectors and actions are placeholders; review and complete before execution.';
    if (fmt === 'postman') return 'Postman export — draft API collection only. Endpoints, headers, auth, and payloads are placeholders; review and complete before execution.';
    if (fmt === 'xray-csv') return 'Jira/Xray export — draft import mapping CSV. Review before importing. No Jira/Xray API connection is used.';
    if (fmt === 'azure-devops-csv') return 'Azure DevOps export — draft import mapping CSV. Review before importing. No Azure DevOps API connection is used.';
    return null;
  });

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
        this.loadTestSuites();
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
        this.updateStoryStatus('ANALYZED');
        this.analyzing.set(false);
      },
      error: () => {
        this.analysisError.set('The story could not be analyzed. Confirm the backend is running and try again.');
        this.analyzing.set(false);
      }
    });
  }

  generateTestCases(): void {
    if (!this.storyId || this.generatingTests()) {
      return;
    }
    this.generatingTests.set(true);
    this.testGenerationError.set('');
    this.testGenerationService.generateTestCases(this.storyId).subscribe({
      next: (suite) => {
        this.testSuites.set([suite, ...this.testSuites()]);
        this.updateStoryStatus('TESTS_GENERATED');
        this.generatingTests.set(false);
      },
      error: () => {
        this.testGenerationError.set('The test cases could not be generated. Confirm the backend is running and try again.');
        this.generatingTests.set(false);
      }
    });
  }

  toggleAnalysis(): void { this.analysisExpanded.update(v => !v); }
  toggleStorySummary(): void { this.storySummaryExpanded.update(v => !v); }
  toggleEditForm(): void { this.editFormExpanded.update(v => !v); }

  exportApprovedTestCases(format: ExportFormat): void {
    if (!this.storyId || this.isExporting()) {
      return;
    }
    this.lastExportFormat.set(format);
    this.exportingFormat.set(format);
    this.exportError.set('');
    this.exportMessage.set('');
    this.exportService.exportApprovedTestCases(this.storyId, format).subscribe({
      next: (response) => {
        const blob = response.body;
        if (!blob) {
          this.exportError.set('The export completed without a downloadable file.');
          this.exportingFormat.set(null);
          return;
        }
        const fallbackName = this.fallbackExportFilename(format);
        const filename = this.exportFilename(response.headers.get('Content-Disposition'), fallbackName);
        this.downloadBlob(blob, filename);
        this.exportMessage.set(`${this.exportLabel(format)} export download started.`);
        this.exportingFormat.set(null);
      },
      error: () => {
        this.exportError.set(`The ${this.exportLabel(format)} export could not be downloaded. Confirm the backend is running and try again.`);
        this.exportingFormat.set(null);
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

  hasTestSuites(): boolean {
    return this.testSuites().some((suite) => suite.testCases.length > 0);
  }

  totalTestCases(): number {
    return this.testSuites().reduce((total, suite) => total + suite.testCases.length, 0);
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

  suiteWarnings(suite: GeneratedTestSuiteResult): string[] {
    return suite.qaValidation?.warnings ?? [];
  }

  testObjective(testCase: GeneratedTestCase): string {
    return testCase.objective || testCase.description || 'Objective not provided.';
  }

  testDataValue(data: GeneratedTestData): string {
    if (!data.valueJson) {
      return 'No value provided';
    }
    try {
      return JSON.stringify(JSON.parse(data.valueJson), null, 2);
    } catch {
      return data.valueJson;
    }
  }

  reviewDraft(testCase: GeneratedTestCase): ReviewDraft | null {
    const testCaseId = testCase.id;
    return testCaseId ? this.reviewDrafts()[testCaseId] ?? null : null;
  }

  stepDraft(testCase: GeneratedTestCase, step: GeneratedTestStep): Partial<GeneratedTestStep> | null {
    return this.reviewDraft(testCase)?.steps?.[step.order] ?? null;
  }

  updateReviewDraft(testCase: GeneratedTestCase, field: 'title' | 'objective' | 'comment', value: string): void {
    const testCaseId = testCase.id;
    if (!testCaseId) {
      return;
    }
    this.reviewDrafts.update((drafts) => ({
      ...drafts,
      [testCaseId]: {
        ...drafts[testCaseId],
        [field]: value
      }
    }));
  }

  updateReviewStepDraft(
    testCase: GeneratedTestCase,
    step: GeneratedTestStep,
    field: 'action' | 'expectedResult',
    value: string
  ): void {
    const testCaseId = testCase.id;
    if (!testCaseId) {
      return;
    }
    const currentDraft = this.reviewDrafts()[testCaseId] ?? {};
    const currentSteps = currentDraft.steps ?? {};
    this.reviewDrafts.update((drafts) => ({
      ...drafts,
      [testCaseId]: {
        ...currentDraft,
        steps: {
          ...currentSteps,
          [step.order]: {
            ...currentSteps[step.order],
            [field]: value
          }
        }
      }
    }));
  }

  updateReviewStatus(testCase: GeneratedTestCase, status: ReviewStatus): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId || this.isReviewBusy(testCase)) {
      return;
    }
    this.beginReviewUpdate(testCaseId, 'review-status');
    this.reviewService.updateReviewStatus(testCaseId, {
      status,
      comment: this.reviewDraft(testCase)?.comment || null
    }).subscribe({
      next: (updatedTestCase) => this.completeReviewUpdate(testCase, updatedTestCase, 'Review status was updated.'),
      error: () => this.failReviewUpdate(testCaseId, 'The review status could not be updated.')
    });
  }

  updatePriority(testCase: GeneratedTestCase, priority: Priority | ''): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId || !priority || this.isReviewBusy(testCase)) {
      return;
    }
    this.beginReviewUpdate(testCaseId, 'priority');
    this.reviewService.updatePriority(testCaseId, {
      priority,
      comment: this.reviewDraft(testCase)?.comment || null
    }).subscribe({
      next: (updatedTestCase) => this.completeReviewUpdate(testCase, updatedTestCase, 'Priority was updated.'),
      error: () => this.failReviewUpdate(testCaseId, 'The priority could not be updated.')
    });
  }

  updateRisk(testCase: GeneratedTestCase, riskLevel: RiskLevel | ''): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId || !riskLevel || this.isReviewBusy(testCase)) {
      return;
    }
    this.beginReviewUpdate(testCaseId, 'risk');
    this.reviewService.updateRisk(testCaseId, {
      riskLevel,
      comment: this.reviewDraft(testCase)?.comment || null
    }).subscribe({
      next: (updatedTestCase) => this.completeReviewUpdate(testCase, updatedTestCase, 'Risk was updated.'),
      error: () => this.failReviewUpdate(testCaseId, 'The risk could not be updated.')
    });
  }

  updateAutomationCandidate(testCase: GeneratedTestCase, automationCandidate: boolean): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId || this.isReviewBusy(testCase)) {
      return;
    }
    this.beginReviewUpdate(testCaseId, 'automation');
    this.reviewService.updateAutomationCandidate(testCaseId, {
      automationCandidate,
      comment: this.reviewDraft(testCase)?.comment || null
    }).subscribe({
      next: (updatedTestCase) => this.completeReviewUpdate(testCase, updatedTestCase, 'Automation candidate flag was updated.'),
      error: () => this.failReviewUpdate(testCaseId, 'The automation candidate flag could not be updated.')
    });
  }

  saveTestCaseEdits(testCase: GeneratedTestCase): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId || this.isReviewBusy(testCase)) {
      return;
    }
    const draft = this.reviewDraft(testCase);
    const title = (draft?.title ?? testCase.title).trim();
    if (!title) {
      this.reviewError.set('Test case title is required.');
      return;
    }

    this.beginReviewUpdate(testCaseId, 'content');
    this.reviewService.updateTestCase(testCaseId, {
      title,
      objective: draft?.objective ?? this.testObjective(testCase),
      steps: testCase.steps.map((step) => {
        const stepDraft = draft?.steps?.[step.order];
        return {
          order: step.order,
          action: (stepDraft?.action ?? step.action).trim(),
          expectedResult: stepDraft?.expectedResult ?? step.expectedResult
        };
      }),
      comment: draft?.comment || null
    }).subscribe({
      next: (updatedTestCase) => this.completeReviewUpdate(testCase, updatedTestCase, 'Test case edits were saved.'),
      error: () => this.failReviewUpdate(testCaseId, 'The test case edits could not be saved.')
    });
  }

  toggleReviewHistory(testCase: GeneratedTestCase): void {
    const testCaseId = this.persistedTestCaseId(testCase);
    if (!testCaseId) {
      return;
    }
    if (this.selectedHistoryTestCaseId() === testCaseId) {
      this.selectedHistoryTestCaseId.set(null);
      this.reviewEvents.set([]);
      this.reviewHistoryError.set('');
      return;
    }
    this.selectedHistoryTestCaseId.set(testCaseId);
    this.loadReviewHistory(testCaseId);
  }

  isReviewBusy(testCase: GeneratedTestCase): boolean {
    const testCaseId = testCase.id;
    return !!testCaseId && !!this.reviewBusyByTestCaseId()[testCaseId];
  }

  displayReviewStatus(testCase: GeneratedTestCase): ReviewStatus {
    return testCase.reviewStatus ?? 'DRAFT';
  }

  qualityColor(testCase: GeneratedTestCase): string {
    if (testCase.confidenceLevel === 'HIGH') return 'var(--green)';
    if (testCase.confidenceLevel === 'MEDIUM') return 'var(--amber)';
    return 'var(--red)';
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

  isExporting(): boolean {
    return this.exportingFormat() !== null;
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

  private fallbackExportFilename(format: ExportFormat): string {
    if (format === 'playwright') {
      return `story-${this.storyId}-approved-tests.spec.ts`;
    }
    if (format === 'postman') {
      return `story-${this.storyId}-approved-api-tests.postman_collection.json`;
    }
    if (format === 'xray-csv') {
      return `story-${this.storyId}-approved-tests-xray.csv`;
    }
    if (format === 'azure-devops-csv') {
      return `story-${this.storyId}-approved-tests-azure-devops.csv`;
    }
    const extension = format === 'markdown' ? 'md' : format;
    return `story-${this.storyId}-approved-test-cases.${extension}`;
  }

  private exportFilename(contentDisposition: string | null, fallbackName: string): string {
    if (!contentDisposition) {
      return fallbackName;
    }
    const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
    if (encodedMatch?.[1]) {
      try {
        return decodeURIComponent(encodedMatch[1].trim());
      } catch {
        return fallbackName;
      }
    }
    const quotedMatch = /filename="([^"]+)"/i.exec(contentDisposition);
    if (quotedMatch?.[1]) {
      return quotedMatch[1].trim();
    }
    const plainMatch = /filename=([^;]+)/i.exec(contentDisposition);
    return plainMatch?.[1]?.trim() || fallbackName;
  }

  private exportLabel(format: ExportFormat): string {
    return this.exportOptions.find((option) => option.format === format)?.label ?? format.toUpperCase();
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  private loadTestSuites(): void {
    if (!this.storyId) {
      return;
    }
    this.testSuitesLoading.set(true);
    this.testGenerationError.set('');
    this.testGenerationService.getTestSuites(this.storyId).subscribe({
      next: (testSuites) => {
        this.testSuites.set(testSuites);
        this.testSuitesLoading.set(false);
        if (!testSuites.some(s => s.testCases.length > 0)) {
          this.analysisExpanded.set(true);
        }
      },
      error: () => {
        this.testSuites.set([]);
        this.testSuitesLoading.set(false);
      }
    });
  }

  private updateStoryStatus(status: StoryStatus): void {
    const currentStory = this.story();
    if (!currentStory) {
      return;
    }
    this.story.set({ ...currentStory, status });
    this.form.patchValue({ status });
  }

  private persistedTestCaseId(testCase: GeneratedTestCase): string | null {
    if (!testCase.id) {
      this.reviewError.set('This generated test case does not have a persisted backend ID yet.');
      return null;
    }
    return testCase.id;
  }

  private beginReviewUpdate(testCaseId: string, action: string): void {
    this.reviewMessage.set('');
    this.reviewError.set('');
    this.reviewBusyByTestCaseId.update((busy) => ({ ...busy, [testCaseId]: action }));
  }

  private completeReviewUpdate(
    originalTestCase: GeneratedTestCase,
    updatedTestCase: TestCaseResponse,
    message: string
  ): void {
    this.replaceGeneratedTestCase(updatedTestCase, originalTestCase);
    this.reviewMessage.set(message);
    this.reviewBusyByTestCaseId.update((busy) => {
      const nextBusy = { ...busy };
      delete nextBusy[updatedTestCase.id];
      return nextBusy;
    });
    this.reviewDrafts.update((drafts) => ({
      ...drafts,
      [updatedTestCase.id]: {
        ...drafts[updatedTestCase.id],
        title: updatedTestCase.title,
        objective: updatedTestCase.objective ?? '',
        steps: {},
        comment: ''
      }
    }));
    if (this.selectedHistoryTestCaseId() === updatedTestCase.id) {
      this.loadReviewHistory(updatedTestCase.id);
    }
  }

  private failReviewUpdate(testCaseId: string, message: string): void {
    this.reviewError.set(message);
    this.reviewBusyByTestCaseId.update((busy) => {
      const nextBusy = { ...busy };
      delete nextBusy[testCaseId];
      return nextBusy;
    });
  }

  private replaceGeneratedTestCase(updatedTestCase: TestCaseResponse, originalTestCase: GeneratedTestCase): void {
    this.testSuites.update((suites) => suites.map((suite) => ({
      ...suite,
      testCases: suite.testCases.map((testCase) => (
        testCase.id === updatedTestCase.id
          ? this.mergeUpdatedTestCase(testCase, updatedTestCase)
          : testCase
      ))
    })));

    if (!this.testSuites().some((suite) => suite.testCases.some((testCase) => testCase.id === updatedTestCase.id))) {
      this.replaceGeneratedTestCaseByReference(updatedTestCase, originalTestCase);
    }
  }

  private replaceGeneratedTestCaseByReference(
    updatedTestCase: TestCaseResponse,
    originalTestCase: GeneratedTestCase
  ): void {
    this.testSuites.update((suites) => suites.map((suite) => ({
      ...suite,
      testCases: suite.testCases.map((testCase) => (
        testCase === originalTestCase
          ? this.mergeUpdatedTestCase(testCase, updatedTestCase)
          : testCase
      ))
    })));
  }

  private mergeUpdatedTestCase(
    currentTestCase: GeneratedTestCase,
    updatedTestCase: TestCaseResponse
  ): GeneratedTestCase {
    return {
      ...currentTestCase,
      id: updatedTestCase.id,
      title: updatedTestCase.title,
      description: updatedTestCase.objective,
      objective: updatedTestCase.objective,
      type: updatedTestCase.type,
      testLayer: updatedTestCase.testLayer,
      priority: updatedTestCase.priority,
      riskLevel: updatedTestCase.riskLevel,
      reviewStatus: updatedTestCase.reviewStatus,
      automationCandidate: updatedTestCase.automationCandidate,
      preconditions: updatedTestCase.preconditions,
      bddScenario: updatedTestCase.bddScenario,
      linkedRequirementReferences: updatedTestCase.linkedRequirementReferences,
      steps: updatedTestCase.steps.map((step) => ({
        id: step.id,
        order: step.order,
        action: step.action,
        expectedResult: step.expectedResult
      }))
    };
  }

  private loadReviewHistory(testCaseId: string): void {
    this.reviewHistoryLoading.set(true);
    this.reviewHistoryError.set('');
    this.reviewEvents.set([]);
    this.reviewService.getReviewEvents(testCaseId).subscribe({
      next: (events) => {
        if (this.selectedHistoryTestCaseId() === testCaseId) {
          this.reviewEvents.set(events);
        }
        this.reviewHistoryLoading.set(false);
      },
      error: () => {
        this.reviewHistoryError.set('Review history could not be loaded.');
        this.reviewHistoryLoading.set(false);
      }
    });
  }
}
