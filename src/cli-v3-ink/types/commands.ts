/**
 * Command Type Definitions
 */

export interface Command {
  id: string;
  name: string;
  description: string;
  action: 'navigate' | 'execute';
  route?: string;
  keywords?: string[];
}

export type CommandAction = Command['action'];

export interface CommandHandler {
  (args?: string[]): void | Promise<void>;
}

export interface CommandContext {
  input: string;
  args: string[];
  execute: () => void;
}

export interface CommandMatch {
  command: Command;
  score: number;
}
