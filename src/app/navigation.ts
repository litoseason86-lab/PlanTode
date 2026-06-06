export const APP_TABS = [
  {key: 'today', label: '今日执行'},
  {key: 'tasks', label: '任务库'},
  {key: 'categories', label: '分类管理'},
  {key: 'calendar', label: '日历'},
  {key: 'daily', label: '每日记录'},
  {key: 'weekly', label: '周复盘'},
  {key: 'focus', label: '专注中'},
] as const;

export type AppTab = (typeof APP_TABS)[number]['key'];
