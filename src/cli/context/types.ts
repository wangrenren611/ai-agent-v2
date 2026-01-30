/**
 * Page System Types
 *
 * 页面系统相关类型定义
 */

export type PageId =
  | 'home'
  | 'help'
  | 'model-select'
  | 'settings'
  | string;

export interface Page {
  id: PageId;
  title: string;
  parent?: PageId;
}

export type NavigationAction =
  | { type: 'push'; page: Page }
  | { type: 'pop' }
  | { type: 'replace'; page: Page }
  | { type: 'reset' };
