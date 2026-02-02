/**
 * Keyboard Context
 *
 * 统一导出键盘管理器的所有功能
 */

export {
  KeyboardManager,
  useKeyboard,
  useGlobalKeyboard,
  useGlobalShortcuts,
  useKeyboardLogger,
  isKeyMatch,
  HandlerPriority,
} from './keyboard';

export type {
  AppMode,
  KeyboardEvent,
  KeyboardHandler,
} from './keyboard';
