import { HttpHeaders, HttpResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AnalysisService } from '../../core/services/analysis.service';
import { ExportService } from '../../core/services/export.service';
import { ReviewService } from '../../core/services/review.service';
import { StoryService } from '../../core/services/story.service';
import { TestGenerationService } from '../../core/services/test-generation.service';
import { StoryDetailPageComponent } from './story-detail-page.component';

describe('StoryDetailPageComponent export actions', () => {
  let fixture: ComponentFixture<StoryDetailPageComponent>;
  let component: StoryDetailPageComponent;
  let exportResponse: Subject<HttpResponse<Blob>>;
  let exportService: jasmine.SpyObj<ExportService>;

  beforeEach(async () => {
    exportResponse = new Subject<HttpResponse<Blob>>();
    exportService = jasmine.createSpyObj<ExportService>('ExportService', ['exportApprovedTestCases']);
    exportService.exportApprovedTestCases.and.returnValue(exportResponse.asObservable());

    await TestBed.configureTestingModule({
      imports: [StoryDetailPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'storyId' ? 'story-1' : null
              }
            }
          }
        },
        {
          provide: StoryService,
          useValue: jasmine.createSpyObj<StoryService>('StoryService', {
            get: of({
              id: 'story-1',
              projectId: 'project-1',
              title: 'Checkout story',
              rawText: 'As a shopper, I can checkout.',
              type: 'USER_STORY',
              status: 'TESTS_GENERATED',
              externalReference: null,
              metadataJson: null,
              createdAt: '2026-06-14T00:00:00Z',
              updatedAt: '2026-06-14T00:00:00Z'
            })
          })
        },
        {
          provide: AnalysisService,
          useValue: jasmine.createSpyObj<AnalysisService>('AnalysisService', {
            getAnalysis: throwError(() => new Error('No analysis yet.'))
          })
        },
        {
          provide: TestGenerationService,
          useValue: jasmine.createSpyObj<TestGenerationService>('TestGenerationService', {
            getTestSuites: of([
              {
                id: null,
                storyId: 'story-1',
                suiteName: 'Regression suite',
                testCases: [
                  {
                    id: 'test-case-1',
                    title: 'Checkout happy path',
                    description: 'Validate checkout.',
                    objective: 'Validate checkout.',
                    type: 'FUNCTIONAL',
                    testLayer: 'UI',
                    priority: 'HIGH',
                    riskLevel: 'MEDIUM',
                    automationCandidate: true,
                    confidenceScore: 0.9,
                    reviewStatus: 'APPROVED',
                    linkedRequirementReferences: [],
                    bddScenario: null,
                    steps: [],
                    testData: []
                  }
                ],
                qaValidation: {
                  requirementQualityScore: 0.9,
                  testabilityScore: 0.9,
                  warnings: []
                },
                provider: 'mock-ai-provider',
                generatedAt: '2026-06-14T00:00:00Z'
              }
            ])
          })
        },
        {
          provide: ReviewService,
          useValue: jasmine.createSpyObj<ReviewService>('ReviewService', [
            'updateReviewStatus',
            'updatePriority',
            'updateRisk',
            'updateAutomationCandidate',
            'updateTestCase',
            'getReviewEvents'
          ])
        },
        {
          provide: ExportService,
          useValue: exportService
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StoryDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('calls the markdown export endpoint and disables all export actions while loading', () => {
    const exportButtons = exportActionButtons();

    exportButtons[0].click();
    fixture.detectChanges();

    expect(exportService.exportApprovedTestCases).toHaveBeenCalledOnceWith('story-1', 'markdown');
    expect(exportActionButtons().every((button) => button.disabled)).toBeTrue();
  });

  it('downloads the backend filename when content disposition is provided', () => {
    let clickedDownload = '';
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      clickedDownload = this.download;
    });
    spyOn(URL, 'createObjectURL').and.returnValue('blob:story-export');
    spyOn(URL, 'revokeObjectURL');

    exportActionButtons()[1].click();
    exportResponse.next(new HttpResponse({
      body: new Blob(['id,title'], { type: 'text/csv' }),
      headers: new HttpHeaders({
        'Content-Disposition': 'attachment; filename="backend-approved-tests.csv"'
      })
    }));
    fixture.detectChanges();

    expect(clickedDownload).toBe('backend-approved-tests.csv');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:story-export');
    expect(component.exportMessage()).toBe('CSV export download started.');
  });

  it('calls the postman export endpoint and uses postman_collection.json filename fallback', () => {
    let downloadedFilename = '';
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });
    spyOn(URL, 'createObjectURL').and.returnValue('blob:postman-export');
    spyOn(URL, 'revokeObjectURL');

    exportActionButtons()[4].click();
    fixture.detectChanges();

    expect(exportService.exportApprovedTestCases).toHaveBeenCalledOnceWith('story-1', 'postman');

    exportResponse.next(new HttpResponse({
      body: new Blob(['{"info":{},"item":[]}'], { type: 'application/json' }),
      headers: new HttpHeaders({})
    }));
    fixture.detectChanges();

    expect(downloadedFilename).toContain('.postman_collection.json');
    expect(component.exportMessage()).toContain('Postman');
  });

  it('calls the Jira Xray export endpoint and uses the xray csv filename fallback', () => {
    let downloadedFilename = '';
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });
    spyOn(URL, 'createObjectURL').and.returnValue('blob:xray-export');
    spyOn(URL, 'revokeObjectURL');

    exportButtonByText('Jira/Xray CSV').click();
    fixture.detectChanges();

    expect(exportService.exportApprovedTestCases).toHaveBeenCalledOnceWith('story-1', 'xray-csv');

    exportResponse.next(new HttpResponse({
      body: new Blob(['Summary,Action,Data,Expected Result'], { type: 'text/csv' }),
      headers: new HttpHeaders({})
    }));
    fixture.detectChanges();

    expect(downloadedFilename).toBe('story-story-1-approved-tests-xray.csv');
    expect(component.exportMessage()).toBe('Jira/Xray CSV export download started.');
  });

  it('calls the Azure DevOps export endpoint and uses the azure csv filename fallback', () => {
    let downloadedFilename = '';
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      downloadedFilename = this.download;
    });
    spyOn(URL, 'createObjectURL').and.returnValue('blob:azure-devops-export');
    spyOn(URL, 'revokeObjectURL');

    exportButtonByText('Azure DevOps CSV').click();
    fixture.detectChanges();

    expect(exportService.exportApprovedTestCases).toHaveBeenCalledOnceWith('story-1', 'azure-devops-csv');

    exportResponse.next(new HttpResponse({
      body: new Blob(['Test Case ID,Title,Export Warning'], { type: 'text/csv' }),
      headers: new HttpHeaders({})
    }));
    fixture.detectChanges();

    expect(downloadedFilename).toBe('story-story-1-approved-tests-azure-devops.csv');
    expect(component.exportMessage()).toBe('Azure DevOps CSV export download started.');
  });

  it('shows Azure DevOps export card in the export panel', () => {
    const exportPanelText = (fixture.nativeElement.querySelector('.export-panel') as HTMLElement).textContent ?? '';

    expect(exportPanelText).toContain('Azure DevOps CSV');
    expect(exportPanelText).toContain('Draft Azure import mapping');
    expect(exportPanelText).toContain('Only APPROVED test cases are exported.');
  });

  it('shows Jira Xray export card in the export panel', () => {
    const exportPanelText = (fixture.nativeElement.querySelector('.export-panel') as HTMLElement).textContent ?? '';

    expect(exportPanelText).toContain('Jira/Xray CSV');
    expect(exportPanelText).toContain('Draft import mapping CSV');
    expect(exportPanelText).toContain('Only APPROVED test cases are exported.');
  });

  it('shows the workflow progress indicator at the current analysis step when analysis is missing', () => {
    const steps = workflowSteps();

    expect(steps.length).toBe(3);
    expect(steps[0].textContent).toContain('Analysis');
    expect(steps[0].classList).toContain('is-current');
    expect(steps[1].classList).toContain('is-pending');
    expect(steps[2].classList).toContain('is-pending');
  });

  it('moves the workflow progress indicator to review when analysis and suites exist', () => {
    component.analysis.set({
      storyId: 'story-1',
      actor: 'Shopper',
      goal: 'Checkout',
      businessValue: 'Complete purchase',
      confidenceScore: 0.9,
      requirements: {
        requirements: [],
        acceptanceCriteria: []
      },
      ambiguities: {
        ambiguities: []
      },
      coveragePlan: {
        coverageItems: []
      },
      qaValidation: {
        requirementQualityScore: 0.9,
        testabilityScore: 0.9,
        warnings: []
      },
      provider: 'mock-ai-provider',
      generatedAt: '2026-06-14T00:00:00Z'
    });
    fixture.detectChanges();

    const steps = workflowSteps();

    expect(steps[0].classList).toContain('is-complete');
    expect(steps[1].classList).toContain('is-complete');
    expect(steps[2].classList).toContain('is-current');
  });

  function exportActionButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.export-card')) as HTMLButtonElement[];
  }

  function workflowSteps(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.workflow-step')) as HTMLElement[];
  }

  function exportButtonByText(text: string): HTMLButtonElement {
    const button = exportActionButtons().find((candidate) => candidate.textContent?.includes(text));
    if (!button) {
      throw new Error(`Export button not found: ${text}`);
    }
    return button;
  }
});
