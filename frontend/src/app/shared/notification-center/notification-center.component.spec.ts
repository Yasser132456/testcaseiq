import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Notification } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationCenterComponent } from './notification-center.component';

const firstNotification: Notification = {
  id: 'n1',
  message: 'Suite generated',
  type: 'SUITE_GENERATED',
  read: false,
  createdAt: '2026-07-21T10:00:00Z'
};

const secondNotification: Notification = {
  id: 'n2',
  message: 'Export complete',
  type: 'EXPORT_COMPLETED',
  read: true,
  createdAt: '2026-07-21T11:00:00Z'
};

describe('NotificationCenterComponent', () => {
  let fixture: ComponentFixture<NotificationCenterComponent>;
  let component: NotificationCenterComponent;

  beforeEach(async () => {
    const service = jasmine.createSpyObj<NotificationService>(
      'NotificationService',
      ['getUnreadCount', 'getNotifications', 'markAllRead']
    );
    service.getUnreadCount.and.returnValue(of({ count: 2 }));
    service.getNotifications.and.returnValue(of([firstNotification, secondNotification]));
    service.markAllRead.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [NotificationCenterComponent],
      providers: [{ provide: NotificationService, useValue: service }]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationCenterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('marks the unread badge as a finite ping target', () => {
    component.unreadCount.set(2);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.notification-badge-ping')).not.toBeNull();
  });

  it('assigns stable list indices for the parallax trail', () => {
    component.notifications.set([firstNotification, secondNotification]);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.notification-row') as NodeListOf<HTMLElement>;

    expect(rows[0].style.getPropertyValue('--notification-index')).toBe('0');
    expect(rows[1].style.getPropertyValue('--notification-index')).toBe('1');
  });

  it('preserves the loading announcement', () => {
    component.loading.set(true);
    fixture.detectChanges();
    const status = fixture.nativeElement.querySelector('[role="status"]');

    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toContain('Loading notifications');
  });
});
