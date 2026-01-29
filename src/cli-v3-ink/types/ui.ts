/**
 * UI Component Type Definitions
 */

import type { Message } from '../../types';

// ============================================================================
// View Types
// ============================================================================

export type ViewState = 'welcome' | 'chat' | 'settings';

export interface ViewConfig {
  state: ViewState;
  params?: Record<string, unknown>;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface MessageListProps {
  messages: Message[];
  currentResponse?: string;
  isStreaming?: boolean;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface ModelSelectorProps {
  open: boolean;
  selectedIndex: number;
  onSelect: (model: string) => void;
  onClose: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  input: string;
  selectedIndex: number;
  onSelect: (command: string) => void;
  onClose: () => void;
}

// ============================================================================
// Modal Types
// ============================================================================

export type ModalType = 'model-selector' | 'command-palette' | 'none';

export interface ModalState {
  open: boolean;
  type: ModalType;
  selectedIndex: number;
}
