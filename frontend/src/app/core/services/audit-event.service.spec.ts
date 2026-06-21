import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuditEventService } from './audit-event.service';
import { AuditEvent, AuditEventPage } from '../models/audit-event.model';

const MOCK_EVENT: AuditEvent = {
  id: '00000000-0000-0000-0000-000000000001',
  timestamp: '2026-06-20T10:00:00Z',
  actorUserId: '00000000-0000-0000-0000-000000000002',
  actorEmail: 'admin@example.com',
  actorRole: 'ADMIN',
  action: 'USER_LOGIN_SUCCESS',
  resourceType: 'USER',
  resourceId: '00000000-0000-0000-0000-000000000002',
  outcome: 'SUCCESS',
  summary: 'Login successful',
  requestPath: '/api/auth/login',
  requestMethod: 'POST',
  ipAddress: '127.0.0.1',
  metadata: null
};

const MOCK_PAGE: AuditEventPage = {
  content: [MOCK_EVENT],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 50,
  first: true,
  last: true
};

describe('AuditEventService', () => {
  let service: AuditEventService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AuditEventService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should list events with no filters', () => {
    service.listEvents().subscribe(page => {
      expect(page.content.length).toBe(1);
      expect(page.content[0].action).toBe('USER_LOGIN_SUCCESS');
    });
    const req = http.expectOne(r => r.url === '/api/audit/events');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('50');
    req.flush(MOCK_PAGE);
  });

  it('should list events with action filter', () => {
    service.listEvents({ action: 'USER_LOGIN_FAILED' }).subscribe(page => {
      expect(page.content.length).toBe(1);
    });
    const req = http.expectOne(r => r.url === '/api/audit/events');
    expect(req.request.params.get('action')).toBe('USER_LOGIN_FAILED');
    req.flush(MOCK_PAGE);
  });

  it('should list events with outcome filter', () => {
    service.listEvents({ outcome: 'FAILURE' }).subscribe(page => {
      expect(page.content.length).toBe(1);
    });
    const req = http.expectOne(r => r.url === '/api/audit/events');
    expect(req.request.params.get('outcome')).toBe('FAILURE');
    req.flush(MOCK_PAGE);
  });

  it('should list events with actor filter', () => {
    service.listEvents({ actor: 'qa@example.com' }).subscribe();
    const req = http.expectOne(r => r.url === '/api/audit/events');
    expect(req.request.params.get('actor')).toBe('qa@example.com');
    req.flush(MOCK_PAGE);
  });

  it('should list events with date range filter', () => {
    service.listEvents({ from: '2026-01-01T00:00:00Z', to: '2026-12-31T23:59:59Z' }).subscribe();
    const req = http.expectOne(r => r.url === '/api/audit/events');
    expect(req.request.params.get('from')).toBe('2026-01-01T00:00:00Z');
    expect(req.request.params.get('to')).toBe('2026-12-31T23:59:59Z');
    req.flush(MOCK_PAGE);
  });

  it('should list events with resourceId filter', () => {
    const id = '00000000-0000-0000-0000-000000000099';
    service.listEvents({ resourceId: id }).subscribe();
    const req = http.expectOne(r => r.url === '/api/audit/events');
    expect(req.request.params.get('resourceId')).toBe(id);
    req.flush(MOCK_PAGE);
  });

  it('should omit empty filter params', () => {
    service.listEvents({ action: '', actor: '' }).subscribe();
    const req = http.expectOne(r => r.url === '/api/audit/events');
    expect(req.request.params.has('action')).toBeFalse();
    expect(req.request.params.has('actor')).toBeFalse();
    req.flush(MOCK_PAGE);
  });
});
