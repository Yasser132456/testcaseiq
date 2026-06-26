import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('calls the notification endpoints', () => {
    expect(service.unreadCount()).toBe(0);

    service.getNotifications().subscribe();
    const list = http.expectOne('/api/notifications');
    expect(list.request.method).toBe('GET');
    list.flush([{ id: 'n1', message: 'Suite generated', type: 'SUITE_GENERATED', read: false, createdAt: '2026-06-26T00:00:00Z' }]);
    expect(service.unreadCount()).toBe(1);

    service.getUnreadCount().subscribe();
    const count = http.expectOne('/api/notifications/unread-count');
    expect(count.request.method).toBe('GET');
    count.flush({ count: 2 });
    expect(service.unreadCount()).toBe(2);

    service.markAllRead().subscribe();
    const markAll = http.expectOne('/api/notifications/mark-all-read');
    expect(markAll.request.method).toBe('POST');
    markAll.flush(null);
    expect(service.unreadCount()).toBe(0);
  });
});
