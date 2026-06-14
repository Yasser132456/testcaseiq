import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TestGenerationService } from './test-generation.service';

describe('TestGenerationService', () => {
  let service: TestGenerationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(TestGenerationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads generated test suites', () => {
    service.getTestSuites('story-1').subscribe((suites) => {
      expect(suites.length).toBe(1);
      expect(suites[0].testCases.length).toBe(1);
    });

    const request = http.expectOne('/api/stories/story-1/test-suites');
    expect(request.request.method).toBe('GET');
    request.flush([suiteResponse()]);
  });

  it('generates test cases for a story', () => {
    service.generateTestCases('story-1').subscribe((suite) => {
      expect(suite.suiteName).toBe('Mock AI Regression Suite');
      expect(suite.testCases[0].automationCandidate).toBeTrue();
    });

    const request = http.expectOne('/api/stories/story-1/generate-tests');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush(suiteResponse());
  });

  function suiteResponse() {
    return {
      storyId: 'story-1',
      suiteName: 'Mock AI Regression Suite',
      testCases: [
        {
          title: 'Complete primary workflow successfully',
          description: 'Manual functional test covering the core story outcome.',
          type: 'FUNCTIONAL',
          testLayer: 'UI',
          priority: 'HIGH',
          riskLevel: 'MEDIUM',
          automationCandidate: true,
          confidenceScore: 0.91,
          bddScenario: 'Given a valid user context\\nWhen the user completes the workflow\\nThen the expected outcome is shown',
          linkedRequirementReferences: ['REQ-1'],
          steps: [
            {
              order: 1,
              action: 'Open the feature workspace.',
              expectedResult: 'The workspace loads without errors.'
            }
          ],
          testData: [
            {
              name: 'validUserInput',
              valueJson: '{"state":"valid"}'
            }
          ]
        }
      ],
      qaValidation: {
        requirementQualityScore: 0.84,
        testabilityScore: 0.87,
        warnings: []
      },
      provider: 'mock-ai-provider',
      generatedAt: '2026-06-14T00:00:00Z'
    };
  }
});
