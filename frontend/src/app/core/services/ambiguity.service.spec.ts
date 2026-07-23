import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AmbiguityService } from './ambiguity.service';

describe('AmbiguityService', () => {
  let service: AmbiguityService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AmbiguityService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads ambiguities for a story', () => {
    service.list('story-1').subscribe((ambiguities) => {
      expect(ambiguities.length).toBe(1);
      expect(ambiguities[0].status).toBe('OPEN');
    });

    const request = http.expectOne('/api/stories/story-1/ambiguities');
    expect(request.request.method).toBe('GET');
    request.flush([ambiguityResponse()]);
  });

  it('resolves an ambiguity with request body', () => {
    service.resolve('story-1', 'ambiguity-1', {
      resolutionNotes: 'Use checkout fields.',
      status: 'ANSWERED'
    }).subscribe((ambiguity) => {
      expect(ambiguity.status).toBe('ANSWERED');
      expect(ambiguity.resolvedBy).toBe('qa@test.com');
    });

    const request = http.expectOne('/api/stories/story-1/ambiguities/ambiguity-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      resolutionNotes: 'Use checkout fields.',
      status: 'ANSWERED'
    });
    request.flush({
      ...ambiguityResponse(),
      status: 'ANSWERED',
      resolutionNotes: 'Use checkout fields.',
      resolvedBy: 'qa@test.com',
      resolvedAt: '2026-06-14T12:00:00Z'
    });
  });

  function ambiguityResponse() {
    return {
      id: 'ambiguity-1',
      question: 'Which fields are required?',
      context: 'The story omits validation details.',
      severity: 'CRITICAL',
      status: 'OPEN',
      resolutionNotes: null,
      resolvedBy: null,
      resolvedAt: null
    };
  }
});
