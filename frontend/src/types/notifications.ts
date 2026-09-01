export type NotificationCategory = 'progress' | 'skill' | 'gathering' | 'craft' | 'reward' | 'warning';

export interface ImportantNotification {
  id: string;
  category: NotificationCategory;
  icon: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?:
    | { type: 'open_territorial_report'; settlement_id: string }
    | { type: 'open_territorial_intelligence' };
}
