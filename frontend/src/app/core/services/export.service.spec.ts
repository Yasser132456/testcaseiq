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

  it('downloads approved test cases as Jira Xray csv with response headers', () => {
    let response: HttpResponse<Blob> | undefined;
    service.exportApprovedTestCases('story-1', 'xray-csv').subscribe((exportResponse) => {
      response = exportResponse;
    });

    const request = http.expectOne('/api/stories/story-1/exports/xray-csv');
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    const body = new Blob(['Summary,Action,Data,Expected Result'], { type: 'text/csv' });
    request.flush(body, {
      headers: {
        'Content-Disposition': 'attachment; filename="story-1-approved-tests-xray.csv"'
      }
    });

    expect(response?.body).toBe(body);
    expect(response?.headers.get('Content-Disposition')).toContain('approved-tests-xray.csv');
  });

  it('downloads approved test cases as Azure DevOps csv with response headers', () => {
    let response: HttpResponse<Blob> | undefined;
    service.exportApprovedTestCases('story-1', 'azure-devops-csv').subscribe((exportResponse) => {
      response = exportResponse;
    });

    const request = http.expectOne('/api/stories/story-1/exports/azure-devops-csv');
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    const body = new Blob(['Test Case ID,Title,Export Warning'], { type: 'text/csv' });
    request.flush(body, {
      headers: {
        'Content-Disposition': 'attachment; filename="story-1-approved-tests-azure-devops.csv"'
      }
    });

    expect(response?.body).toBe(body);
    expect(response?.headers.get('Content-Disposition')).toContain('approved-tests-azure-devops.csv');
  });

  it('downloads approved test cases as json with response headers', () => {
    expectExportRequest('json', '/api/stories/story-1/exports/json', 'application/json');
  });

  it('downloads approved test cases as postman collection with response headers', () => {
    let response: HttpResponse<Blob> | undefined;
    service.exportApprovedTestCases('story-1', 'postman').subscribe((exportResponse) => {
      response = exportResponse;
    });

    const request = http.expectOne('/api/stories/story-1/exports/postman');
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    const body = new Blob(['{"info":{"name":"TestCaseIQ"},"item":[]}'], { type: 'application/json' });
    request.flush(body, {
      headers: {
        'Content-Disposition': 'attachment; filename="story-1-approved-api-tests.postman_collection.json"'
      }
    });

    expect(response?.body).toBe(body);
    expect(response?.headers.get('Content-Disposition')).toContain('.postman_collection.json');
  });

  it('downloads approved test cases as playwright spec file with response headers', () => {
    let response: HttpResponse<Blob> | undefined;
    service.exportApprovedTestCases('story-1', 'playwright').subscribe((exportResponse) => {
      response = exportResponse;
    });

    const request = http.expectOne('/api/stories/story-1/exports/playwright');
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    const body = new Blob(["import { test, expect } from '@playwright/test';"], { type: 'text/plain' });
    request.flush(body, {
      headers: {
        'Content-Disposition': 'attachment; filename="story-1-approved-test-cases.spec.ts"'
      }
    });

    expect(response?.body).toBe(body);
    expect(response?.headers.get('Content-Disposition')).toContain('.spec.ts');
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
