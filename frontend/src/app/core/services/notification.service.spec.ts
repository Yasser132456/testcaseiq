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
    service.getNotifications().subscribe();
    const list = http.expectOne('/api/notifications');
    expect(list.request.method).toBe('GET');
    list.flush([]);

    service.getUnreadCount().subscribe();
    const count = http.expectOne('/api/notifications/unread-count');
    expect(count.request.method).toBe('GET');
    count.flush({ count: 2 });

    service.markAllRead().subscribe();
    const markAll = http.expectOne('/api/notifications/mark-all-read');
    expect(markAll.request.method).toBe('POST');
    markAll.flush(null);
  });
});
