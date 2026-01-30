/**
 * Input Domain Types
 *
 * 输入领域类型定义 - 提供类型安全的输入状态机
 */

// ============================================================================
// Input State Machine
// ============================================================================

/**
 * 输入状态 - 使用区分联合类型确保类型安全
 */
export type InputState =
  | { status: 'idle' }
  | { status: 'typing'; value: string }
  | { status: 'executing'; value: string }
  | { status: 'selecting-command'; value: string; selectedIndex: number };

/**
 * 输入状态是否可提交
 */
export function canSubmitInput(state: InputState): boolean {
  return state.status === 'typing';
}

/**
 * 输入状态是否正在执行
 */
export function isInputExecuting(state: InputState): boolean {
  return state.status === 'executing';
}

/**
 * 输入状态是否正在选择命令
 */
export function isInputSelectingCommand(state: InputState): boolean {
  return state.status === 'selecting-command';
}

/**
 * 获取输入值
 */
export function getInputValue(state: InputState): string {
  switch (state.status) {
    case 'idle':
      return '';
    case 'typing':
    case 'executing':
    case 'selecting-command':
      return state.value;
  }
}

// ============================================================================
// Input Events
// ============================================================================

/**
 * 输入事件类型
 */
export type InputEvent =
  | { type: 'start-typing'; value: string }
  | { type: 'change'; value: string }
  | { type: 'submit' }
  | { type: 'execute-start' }
  | { type: 'execute-complete' }
  | { type: 'command-select-start'; selectedIndex: number; value?: string }
  | { type: 'command-select-cancel' }
  | { type: 'reset' };

// ============================================================================
// Input Handler Interface
// ============================================================================

/**
 * 输入处理器接口
 */
export interface IInputHandler {
  /**
   * 当前输入状态
   */
  readonly state: InputState;

  /**
   * 开始输入
   */
  startTyping(value: string): void;

  /**
   * 更新输入
   */
  changeInput(value: string): void;

  /**
   * 提交输入
   */
  submit(): Promise<void>;

  /**
   * 开始命令选择
   */
  startCommandSelect(selectedIndex: number): void;

  /**
   * 取消命令选择
   */
  cancelCommandSelect(): void;

  /**
   * 重置输入
   */
  reset(): void;
}
