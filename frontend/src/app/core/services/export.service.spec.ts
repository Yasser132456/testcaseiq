import { HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ExportFormat, ExportService } from './export.service';

describe('ExportService', () => {
  let service: ExportService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ExportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('downloads approved test cases as markdown with response headers', () => {
    expectExportRequest('markdown', '/api/stories/story-1/exports/markdown', 'text/markdown');
  });

  it('downloads approved test cases as csv with response headers', () => {
    expectExportRequest('csv', '/api/stories/story-1/exports/csv', 'text/csv');
  });

  it('downloads approved test cases as json with response headers', () => {
    expectExportRequest('json', '/api/stories/story-1/exports/json', 'application/json');
  });

  function expectExportRequest(format: ExportFormat, url: string, contentType: string): void {
    let response: HttpResponse<Blob> | undefined;
    service.exportApprovedTestCases('story-1', format).subscribe((exportResponse) => {
      response = exportResponse;
    });

    const request = http.expectOne(url);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    const body = new Blob(['approved test cases'], { type: contentType });
    request.flush(body, {
      headers: {
        'Content-Disposition': `attachment; filename="story-1-approved-test-cases.${format}"`
      }
    });

    expect(response?.body).toBe(body);
    expect(response?.headers.get('Content-Disposition')).toContain(`.${format}`);
  }
});
