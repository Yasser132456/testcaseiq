import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AnalysisService } from './analysis.service';

describe('AnalysisService', () => {
  let service: AnalysisService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AnalysisService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads existing story analysis', () => {
    service.getAnalysis('story-1').subscribe((analysis) => {
      expect(analysis.actor).toBe('QA lead');
      expect(analysis.requirements.requirements.length).toBe(1);
    });

    const request = http.expectOne('/api/stories/story-1/analysis');
    expect(request.request.method).toBe('GET');
    request.flush(analysisResponse());
  });

  it('runs story analysis', () => {
    expect(service.operationState().phase).toBe('idle');

    service.analyzeStory('story-1').subscribe((analysis) => {
      expect(analysis.provider).toBe('mock-ai-provider');
    });

    expect(service.operationState()).toEqual(jasmine.objectContaining({
      phase: 'running',
      storyId: 'story-1'
    }));

    const request = http.expectOne('/api/stories/story-1/analyze');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush(analysisResponse());

    expect(service.operationState()).toEqual(jasmine.objectContaining({
      phase: 'success',
      storyId: 'story-1'
    }));
  });

  it('exposes a settled error state when analysis fails', () => {
    service.analyzeStory('story-2').subscribe({ error: () => undefined });

    const request = http.expectOne('/api/stories/story-2/analyze');
    request.flush({ message: 'failed' }, { status: 500, statusText: 'Server Error' });

    expect(service.operationState()).toEqual(jasmine.objectContaining({
      phase: 'error',
      storyId: 'story-2'
    }));
  });

  function analysisResponse() {
    return {
      storyId: 'story-1',
      actor: 'QA lead',
      goal: 'create a project',
      requirements: {
        requirements: [
          {
            reference: 'REQ-1',
            title: 'Primary user goal',
            description: 'QA lead can create a project.',
            type: 'FUNCTIONAL',
            priority: 'HIGH',
            riskLevel: 'MEDIUM'
          }
        ],
        acceptanceCriteria: []
      },
      ambiguities: { ambiguities: [] },
      coveragePlan: { coverageItems: [] },
      qaValidation: {
        requirementQualityScore: 0.82,
        testabilityScore: 0.9,
        warnings: []
      },
      provider: 'mock-ai-provider',
      generatedAt: '2026-06-14T00:00:00Z'
    };
  }
});
