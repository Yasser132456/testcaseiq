import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminUserService } from './admin-user.service';
import { AdminUser } from '../models/admin-user.model';

const MOCK_USER: AdminUser = {
  id: '00000000-0000-0000-0000-000000000001',
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'QA_ENGINEER',
  enabled: true,
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z'
};

describe('AdminUserService', () => {
  let service: AdminUserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(AdminUserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should list users', () => {
    service.listUsers().subscribe(users => {
      expect(users.length).toBe(1);
      expect(users[0].email).toBe('ada@example.com');
    });
    const req = http.expectOne('/api/admin/users');
    expect(req.request.method).toBe('GET');
    req.flush([MOCK_USER]);
  });

  it('should update user role', () => {
    const updated = { ...MOCK_USER, role: 'VIEWER' as const };
    service.updateRole(MOCK_USER.id, { role: 'VIEWER' }).subscribe(user => {
      expect(user.role).toBe('VIEWER');
    });
    const req = http.expectOne(`/api/admin/users/${MOCK_USER.id}/role`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ role: 'VIEWER' });
    req.flush(updated);
  });

  it('should update user status', () => {
    const updated = { ...MOCK_USER, enabled: false };
    service.updateStatus(MOCK_USER.id, { enabled: false }).subscribe(user => {
      expect(user.enabled).toBe(false);
    });
    const req = http.expectOne(`/api/admin/users/${MOCK_USER.id}/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ enabled: false });
    req.flush(updated);
  });
});
