export type NotificationType = 'SUITE_GENERATED' | 'REVIEW_UPDATED' | 'EXPORT_COMPLETED';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}
