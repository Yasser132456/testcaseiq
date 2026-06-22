import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(SearchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends a trimmed and capped query to the search endpoint', () => {
    const longQuery = `  ${'x'.repeat(120)}  `;

    service.search(longQuery).subscribe();

    const request = http.expectOne((req) => req.url === '/api/search');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('q')).toBe('x'.repeat(100));
    request.flush({ projects: [], stories: [], testSuites: [], testCases: [] });
  });
});
