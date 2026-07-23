import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CoverageService } from './coverage.service';

describe('CoverageService', () => {
  let service: CoverageService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(CoverageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads a story coverage report', () => {
    service.getReport('story-1').subscribe((report) => {
      expect(report.storyId).toBe('story-1');
      expect(report.requirements[0].covered).toBeFalse();
      expect(report.gaps[0].kind).toBe('REQUIREMENT');
    });

    const request = http.expectOne('/api/stories/story-1/coverage');
    expect(request.request.method).toBe('GET');
    request.flush({
      storyId: 'story-1',
      requirements: [
        {
          reference: 'REQ-1',
          title: 'Payment succeeds',
          riskLevel: 'HIGH',
          linkedCases: [],
          covered: false
        }
      ],
      gaps: [
        {
          key: 'REQ-1',
          description: 'Payment succeeds description',
          riskLevel: 'HIGH',
          kind: 'REQUIREMENT'
        }
      ],
      coveredCount: 0,
      totalRequirements: 1
    });
  });
});
