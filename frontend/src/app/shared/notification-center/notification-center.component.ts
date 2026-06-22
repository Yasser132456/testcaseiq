import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import {
  LucideBell, LucideCheckCheck, LucideClipboardList, LucideDynamicIcon,
  LucideFileDown, LucideIconInput, LucideMessagesSquare
} from '@lucide/angular';
import { catchError, of } from 'rxjs';
import { Notification, NotificationType } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [LucideDynamicIcon],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.css'
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  @ViewChild('popover') private popover?: ElementRef<HTMLElement & { matches(selector: string): boolean }>;

  private readonly notificationService = inject(NotificationService);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  readonly LucideBell = LucideBell;
  readonly LucideCheckCheck = LucideCheckCheck;
  readonly unreadCount = signal(0);
  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.fetchUnreadCount();
    this.intervalId = setInterval(() => this.fetchUnreadCount(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }
  }

  onBellClick(): void {
    if (!this.popover?.nativeElement.matches(':popover-open')) {
      this.fetchNotifications();
    }
  }

  markAllRead(): void {
    this.notificationService.markAllRead().pipe(
      catchError(() => of(undefined))
    ).subscribe(() => {
      this.unreadCount.set(0);
      this.notifications.update(items => items.map(item => ({ ...item, read: true })));
    });
  }

  iconFor(type: NotificationType): LucideIconInput {
    if (type === 'SUITE_GENERATED') return LucideClipboardList;
    if (type === 'EXPORT_COMPLETED') return LucideFileDown;
    return LucideMessagesSquare;
  }

  relativeTime(value: string): string {
    const timestamp = new Date(value).getTime();
    const diff = Math.max(0, Date.now() - timestamp);
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return 'just now';
    if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    return `${Math.floor(diff / day)}d ago`;
  }

  private fetchUnreadCount(): void {
    this.notificationService.getUnreadCount().pipe(
      catchError(() => of({ count: 0 }))
    ).subscribe(response => this.unreadCount.set(response.count));
  }

  private fetchNotifications(): void {
    this.loading.set(true);
    this.notificationService.getNotifications().pipe(
      catchError(() => of([]))
    ).subscribe(items => {
      this.notifications.set(items);
      this.loading.set(false);
    });
  }
}
