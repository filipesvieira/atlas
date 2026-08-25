export type NotificationCategory = 'progress' | 'skill' | 'gathering' | 'craft' | 'reward' | 'warning';

export interface ImportantNotification {
  id: string;
  category: NotificationCategory;
  icon: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
