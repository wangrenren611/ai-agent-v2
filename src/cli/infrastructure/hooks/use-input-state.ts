/**
 * Input State Machine Hook
 *
 * 使用状态机模式管理输入状态，替代 operationLockRef 补丁
 * 确保类型安全且防止重复提交
 */

import { useState, useCallback, useRef } from 'react';
import type {
  InputState,
  InputEvent,
  IInputHandler,
} from '../../core/input/types';
import {
  canSubmitInput,
  isInputExecuting,
  isInputSelectingCommand,
  getInputValue,
} from '../../core/input/types';

// ============================================================================
// Input State Hook Result
// ============================================================================

export interface UseInputStateResult {
  /** 当前输入状态 */
  state: InputState;

  /** 输入值（便捷访问） */
  value: string;

  /** 是否正在执行 */
  isExecuting: boolean;

  /** 是否正在选择命令 */
  isSelectingCommand: boolean;

  /** 是否可以提交 */
  canSubmit: boolean;

  /** 开始输入 */
  startTyping: (value: string) => void;

  /** 更新输入 */
  changeInput: (value: string) => void;

  /** 提交输入 - 返回是否接受提交 */
  submit: () => boolean;

  /** 开始命令选择 */
  startCommandSelect: (selectedIndex: number) => void;

  /** 取消命令选择 */
  cancelCommandSelect: () => void;

  /** 重置输入 */
  reset: () => void;
}

// ============================================================================
// State Machine Reducer
// ============================================================================

function inputStateReducer(state: InputState, event: InputEvent): InputState {
  switch (state.status) {
    case 'idle':
      switch (event.type) {
        case 'start-typing':
          return { status: 'typing', value: event.value };
        case 'command-select-start':
          return {
            status: 'selecting-command',
            value: event.value || '',
            selectedIndex: event.selectedIndex,
          };
        default:
          return state;
      }

    case 'typing':
      switch (event.type) {
        case 'change':
          return { status: 'typing', value: event.value };
        case 'execute-start':
          return { status: 'executing', value: state.value };
        case 'command-select-start':
          return {
            status: 'selecting-command',
            value: state.value,
            selectedIndex: event.selectedIndex,
          };
        case 'reset':
          return { status: 'idle' };
        default:
          return state;
      }

    case 'executing':
      switch (event.type) {
        case 'execute-complete':
        case 'reset':
          return { status: 'idle' };
        default:
          // 执行中忽略所有其他事件
          return state;
      }

    case 'selecting-command':
      switch (event.type) {
        case 'change':
          return {
            status: 'selecting-command',
            value: event.value,
            selectedIndex: state.selectedIndex,
          };
        case 'command-select-cancel':
        case 'reset':
          return { status: 'typing', value: state.value };
        case 'execute-start':
          return { status: 'executing', value: state.value };
        default:
          return state;
      }

    default:
      // TypeScript exhaustive check
      const _exhaustive: never = state;
      return _exhaustive;
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * 输入状态机 Hook
 *
 * 使用状态机模式确保状态转换的类型安全，防止：
 * - 重复提交（executing 状态不接受 submit 事件）
 * - 命令选择时的重复触发（selecting-command 状态独立处理）
 */
export const useInputState = (): UseInputStateResult => {
  const [state, setState] = useState<InputState>({ status: 'idle' });

  // 使用 ref 追踪正在执行的 Promise，确保异步操作完成后才释放
  const executingPromiseRef = useRef<Promise<void> | null>(null);

  const startTyping = useCallback((value: string) => {
    setState((prev) => inputStateReducer(prev, { type: 'start-typing', value }));
  }, []);

  const changeInput = useCallback((value: string) => {
    setState((prev) => inputStateReducer(prev, { type: 'change', value }));
  }, []);

  const submit = useCallback((): boolean => {
    setState((prev) => {
      if (!canSubmitInput(prev)) {
        return prev; // 状态机防止重复提交
      }
      return inputStateReducer(prev, { type: 'execute-start' });
    });
    return canSubmitInput(state);
  }, [state]);

  const completeExecution = useCallback(() => {
    setState((prev) => inputStateReducer(prev, { type: 'execute-complete' }));
  }, []);

  const startCommandSelect = useCallback((selectedIndex: number) => {
    setState((prev) =>
      inputStateReducer(prev, {
        type: 'command-select-start',
        value: getInputValue(prev),
        selectedIndex,
      })
    );
  }, []);

  const cancelCommandSelect = useCallback(() => {
    setState((prev) => inputStateReducer(prev, { type: 'command-select-cancel' }));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => inputStateReducer(prev, { type: 'reset' }));
  }, []);

  return {
    state,
    value: getInputValue(state),
    isExecuting: isInputExecuting(state),
    isSelectingCommand: isInputSelectingCommand(state),
    canSubmit: canSubmitInput(state),
    startTyping,
    changeInput,
    submit,
    startCommandSelect,
    cancelCommandSelect,
    reset,
  };
};

// ============================================================================
// Command Executor Hook
// ============================================================================

/**
 * 命令执行器 Hook
 *
 * 结合输入状态机，确保命令执行的原子性
 */
export interface UseCommandExecutorOptions {
  /** 命令执行函数 */
  execute: (value: string) => Promise<void>;
}

export interface UseCommandExecutorResult extends UseInputStateResult {
  /** 提交并执行命令 */
  submitAndExecute: () => Promise<void>;
}

export const useCommandExecutor = (
  options: UseCommandExecutorOptions
): UseCommandExecutorResult => {
  const inputState = useInputState();
  const isExecutingRef = useRef(false);

  const submitAndExecute = useCallback(async () => {
    // 状态机防止重复提交
    if (!inputState.canSubmit || isExecutingRef.current) {
      return;
    }

    const accepted = inputState.submit();
    if (!accepted) {
      return;
    }

    isExecutingRef.current = true;
    const value = inputState.value;

    try {
      await options.execute(value);
    } finally {
      isExecutingRef.current = false;
      inputState.reset();
    }
  }, [inputState, options]);

  return {
    ...inputState,
    submitAndExecute,
  };
};
