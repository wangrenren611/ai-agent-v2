/**
 * Navigation Domain Types
 *
 * 导航领域类型定义 - 提供类型安全的导航接口
 */

// ============================================================================
// Page Types
// ============================================================================

/**
 * 页面 ID 类型
 */
export type PageId = 'home' | 'help' | 'model-select' | 'settings' | string;

/**
 * 页面定义
 */
export interface Page {
  id: PageId;
  title: string;
  parent?: PageId;
}

// ============================================================================
// Navigation State
// ============================================================================

/**
 * 导航状态
 */
export interface NavigationState {
  currentPage: PageId;
  canGoBack: boolean;
  history: PageId[];
}

// ============================================================================
// Navigation Service Interface
// ============================================================================

/**
 * 导航服务接口 - 提供导航操作方法
 */
export interface INavigationService {
  /**
   * 当前页面 ID
   */
  readonly currentPage: PageId;

  /**
   * 是否可以返回
   */
  readonly canGoBack: boolean;

  /**
   * 导航历史
   */
  readonly history: readonly PageId[];

  /**
   * 导航到指定页面
   */
  navigateTo(pageId: PageId): void;

  /**
   * 返回上一页
   */
  goBack(): void;

  /**
   * 替换当前页面
   */
  replace(pageId: PageId): void;

  /**
   * 重置导航历史
   */
  reset(pageId: PageId): void;
}

// ============================================================================
// Navigation Actions
// ============================================================================

/**
 * 导航动作类型
 */
export type NavigationAction =
  | { type: 'push'; page: PageId }
  | { type: 'pop' }
  | { type: 'replace'; page: PageId }
  | { type: 'reset'; page: PageId };

// ============================================================================
// Navigation Events
// ============================================================================

/**
 * 导航事件类型
 */
export type NavigationEvent =
  | { type: 'page-changed'; page: PageId; from: PageId }
  | { type: 'history-pushed'; page: PageId }
  | { type: 'history-popped' }
  | { type: 'history-reset'; page: PageId };
