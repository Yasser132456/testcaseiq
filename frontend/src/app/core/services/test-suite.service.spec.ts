import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestSuiteService } from './test-suite.service';
import { TestSuitePage, TestSuiteSummary } from '../models/test-suite.model';

const MOCK_SUITE: TestSuiteSummary = {
  id: '00000000-0000-0000-0000-000000000001',
  storyId: '00000000-0000-0000-0000-000000000002',
  storyTitle: 'Login story',
  projectId: '00000000-0000-0000-0000-000000000003',
  projectName: 'My Project',
  name: 'Suite Alpha',
  description: null,
  testLayer: 'API',
  totalCases: 5,
  approvedCases: 3,
  rejectedCases: 1,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z'
};

const MOCK_PAGE: TestSuitePage = {
  content: [MOCK_SUITE],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 20,
  first: true,
  last: true
};

describe('TestSuiteService', () => {
  let service: TestSuiteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(TestSuiteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should list suites with no filters', () => {
    service.listSuites().subscribe(page => {
      expect(page.content.length).toBe(1);
      expect(page.content[0].name).toBe('Suite Alpha');
    });
    const req = http.expectOne(r => r.url === '/api/test-suites');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush(MOCK_PAGE);
  });

  it('should pass storyId filter', () => {
    service.listSuites({ storyId: '00000000-0000-0000-0000-000000000002' }).subscribe();
    const req = http.expectOne(r => r.url === '/api/test-suites');
    expect(req.request.params.get('storyId')).toBe('00000000-0000-0000-0000-000000000002');
    req.flush(MOCK_PAGE);
  });

  it('should pass projectId filter', () => {
    service.listSuites({ projectId: '00000000-0000-0000-0000-000000000003' }).subscribe();
    const req = http.expectOne(r => r.url === '/api/test-suites');
    expect(req.request.params.get('projectId')).toBe('00000000-0000-0000-0000-000000000003');
    req.flush(MOCK_PAGE);
  });

  it('should pass approvedOnly filter', () => {
    service.listSuites({ approvedOnly: true }).subscribe();
    const req = http.expectOne(r => r.url === '/api/test-suites');
    expect(req.request.params.get('approvedOnly')).toBe('true');
    req.flush(MOCK_PAGE);
  });

  it('should omit approvedOnly when false', () => {
    service.listSuites({ approvedOnly: false }).subscribe();
    const req = http.expectOne(r => r.url === '/api/test-suites');
    expect(req.request.params.has('approvedOnly')).toBeFalse();
    req.flush(MOCK_PAGE);
  });

  it('should get suite detail', () => {
    const id = '00000000-0000-0000-0000-000000000001';
    service.getSuite(id).subscribe(detail => {
      expect(detail.name).toBe('Suite Alpha');
    });
    const req = http.expectOne(`/api/test-suites/${id}`);
    expect(req.request.method).toBe('GET');
    req.flush({ ...MOCK_SUITE, testCases: [] });
  });

  it('should update suite', () => {
    const id = '00000000-0000-0000-0000-000000000001';
    service.updateSuite(id, { description: 'Updated' }).subscribe(suite => {
      expect(suite.name).toBe('Suite Alpha');
    });
    const req = http.expectOne(`/api/test-suites/${id}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ description: 'Updated' });
    req.flush(MOCK_SUITE);
  });

  it('should delete suite', () => {
    const id = '00000000-0000-0000-0000-000000000001';
    service.deleteSuite(id).subscribe();
    const req = http.expectOne(`/api/test-suites/${id}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
