import z from 'zod';
import { BaseTool } from './base';
import { DESCRIPTION_WRITE } from './todowrite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ToolRegistry } from './registry';

const TodoInfo = z.object({
  content: z.string().describe('Brief description of the task'),
  status: z.string().describe('Current status of the task: pending, in_progress, completed, cancelled'),
  priority: z.string().describe('Priority level of the task: high, medium, low'),
  id: z.string().describe('Unique identifier for the todo item'),
});

type TodoItem = z.infer<typeof TodoInfo>;

let todoList: TodoItem[] = [];
const todoCache = new Map<string, TodoItem[]>();

function resolveTodoPath(sessionId: string, sessionPath?: string): string {
  const basePath = sessionPath && sessionPath.length > 0
    ? sessionPath
    : path.join('.memory', sessionId);
  return path.join(basePath, 'todos.json');
}

async function loadTodos(sessionId: string, sessionPath?: string): Promise<TodoItem[]> {
  if (todoCache.has(sessionId)) {
    return todoCache.get(sessionId) || [];
  }

  const filePath = resolveTodoPath(sessionId, sessionPath);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw.trim() || '[]');
    const list = Array.isArray(parsed) ? parsed : [];
    todoCache.set(sessionId, list);
    return list;
  } catch (_error) {
    todoCache.set(sessionId, []);
    return [];
  }
}

async function saveTodos(sessionId: string, sessionPath: string | undefined, todos: TodoItem[]): Promise<void> {
  const filePath = resolveTodoPath(sessionId, sessionPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(todos, null, 2));
  todoCache.set(sessionId, todos);
}

export class TodoWriteTool extends BaseTool<any> {
  schema = z.object({
    todos: z.array(TodoInfo).describe('The updated todo list'),
  });

  name = 'todo_write';

  description = DESCRIPTION_WRITE;

  async execute({ todos }: { todos: TodoItem[] }): Promise<string> {
    const context = ToolRegistry.getContext();
    if (context.sessionId) {
      await saveTodos(context.sessionId, context.sessionPath, todos);
    } else {
      todoList = todos;
    }

    return `
        todos: ${JSON.stringify(todos, null, 2)}
     `;
  }
}

export class TodoReadTool extends BaseTool<any> {
  schema = z.object({});

  name = 'todo_read';

  description = `Use this tool to read the current to-do list for the session. This tool should be used proactively and frequently to ensure that you are aware of
 the status of the current task list. You should make use of this tool as often as possible, especially in the following situations:
- At the beginning of conversations to see what's pending
- Before starting new tasks to prioritize work
- When the user asks about previous tasks or plans
- Whenever you're uncertain about what to do next
- After completing tasks to update your understanding of remaining work
- After every few messages to ensure you're on track

Usage:
- This tool takes in no parameters. So leave the input blank or empty. DO NOT include a dummy object, placeholder string or a key like "input" or "empty". LEAVE IT BLANK.
- Returns a list of todo items with their status, priority, and content
- Use this information to track progress and plan next steps
- If no todos exist yet, an empty list will be returned`;

  async execute() {
    const context = ToolRegistry.getContext();
    const todos = context.sessionId
      ? await loadTodos(context.sessionId, context.sessionPath)
      : todoList;

    if (todos.length === 0) {
      return 'Your todo list is empty';
    }

    return `
        todos: ${JSON.stringify(todos, null, 2)}
     `;
  }
}
