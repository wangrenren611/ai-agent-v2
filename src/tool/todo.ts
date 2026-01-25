import z from 'zod';
import { BaseTool, ToolOutput } from './base';
import { DESCRIPTION_WRITE } from './todowrite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ToolRegistry } from './registry';
const Status = z.enum(['pending', 'in_progress', 'completed', 'cancelled']);
const Priority = z.enum(['high', 'medium', 'low']);

const TodoInfo = z.object({
  id: z.string().min(1),           
  content: z.string().min(1).max(200),
  status: Status.default('pending'),
  priority: Priority.default('medium'),
}).strict();


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

export class TodoCreateTool extends BaseTool<any> {
  schema =  z.object({
    todos: z.array(TodoInfo).describe('The list of todo operations to perform'),
  }).strict();

  name = 'todo_create';

  description = DESCRIPTION_WRITE;

  async execute({ todos }: { todos: TodoItem[] }): Promise<ToolOutput> {
    const context = ToolRegistry.getContext();

    if (context.sessionId) {
      await saveTodos(context.sessionId, context.sessionPath, todos);
    } else {
      todoList = todos;
    }

    return {
       metadata:{
          count: todos.length,
          ok: true,
       },
       output: JSON.stringify(todos,null,2),
    };
  }
}

export class TodoGetAllTool extends BaseTool<any> {
  schema = z.object({});

  name = 'todo_get_all';

  description = 'List todos (optional filters)';


  async execute() {
    const context = ToolRegistry.getContext();
    const todos = context.sessionId
      ? await loadTodos(context.sessionId, context.sessionPath)
      : todoList;

    if (todos.length === 0) {
      return {
        metadata: {
          todos,
        },
        output: 'Your todo list is empty',
      };
    }

    return {
      metadata: {
         count: todos.length,
         todos,
         ok: true,
      },
      output: JSON.stringify(todos, null, 2),
    };
  }
}


export class TodoGetActiveTool extends BaseTool<any> {
  schema = z.object({
    limit: z.number().int().min(1).max(200).default(50),
    sort_by: z.enum(['priority', 'status', 'none']).default('priority'),
    fields: z.array(z.enum(['id', 'content', 'status', 'priority']))
      .min(1)
      .default(['id', 'content', 'status', 'priority']),
  }).strict();

  name = 'todo_get_active';
  description = 'List active todos (pending/in_progress). Optional limit/sort/fields.';

  async execute({ limit, sort_by, fields }: { limit: number; sort_by: 'priority'|'status'|'none'; fields: string[] }) {
    const context = ToolRegistry.getContext();
    const todos: TodoItem[] = context.sessionId
      ? await loadTodos(context.sessionId, context.sessionPath)
      : todoList;

    const active = todos.filter(t => t.status === 'pending' || t.status === 'in_progress');

    const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const statusRank: Record<string, number> = { in_progress: 0, pending: 1 };

    let resultList = active.slice();
    if (sort_by === 'priority') {
      resultList.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
    } else if (sort_by === 'status') {
      resultList.sort((a, b) => statusRank[a.status] - statusRank[b.status]);
    }

    resultList = resultList.slice(0, limit);

    const trimmed = resultList.map(t => {
      const o: any = {};
      for (const f of fields) o[f] = (t as any)[f];
      return o;
    });

    const result = {
      count_total_active: active.length,
      returned: trimmed.length,
      todos: trimmed,
      ok: true,
    };

    // output 尽量短，避免重复塞 JSON
    return { metadata: result, output: JSON.stringify(result, null, 2) };
  }
}


const NonEmptyPatch = z.object({
  content: z.string().min(1).max(200).optional(),
  status: Status.optional(),
  priority: Priority.optional(),
}).strict().refine(p => Object.keys(p).length > 0, {
  message: 'patch must include at least one field',
});

const TodoOp = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('add'),
    item: TodoInfo.omit({ id: true }).extend({
      id: z.string().min(1).optional(), // 允许模型不填，你后端生成
    }).strict(),
  }).strict(),

  z.object({
    op: z.literal('update'),
    id: z.string().min(1),
    patch: NonEmptyPatch,
  }).strict(),

  z.object({
    op: z.literal('delete'),
    id: z.string().min(1),
  }).strict(),
]);

type TodoOpType = z.infer<typeof TodoOp>;

// 为 TodoOp 的每个变体添加示例
const TODO_OP_EXAMPLES = [
  // add 操作示例
  {
    op: 'add',
    item: {
      id: 't_1',
      content: '完成项目文档',
      status: 'pending',
      priority: 'high'
    }
  },
  // update 操作示例
  {
    op: 'update',
    id: 't_1',
    patch: {
      status: 'in_progress'
    }
  },
  // delete 操作示例
  {
    op: 'delete',
    id: 't_1'
  }
] as const;

export class TodoApplyOpsTool extends BaseTool<any> {
  name = 'todo_apply_ops';
  description = `Apply todo operations (add/update/delete).

Supported operations:
- add: Create a new todo item with optional id, content, status, priority
- update: Modify an existing todo by id using patch object
- delete: Remove a todo by id

Example usage:
{
  "ops": [
    {"op": "add", "item": {"content": "Fix bug", "status": "pending", "priority": "high"}},
    {"op": "update", "id": "t_1", "patch": {"status": "completed"}},
    {"op": "delete", "id": "t_2"}
  ]
}`;

  schema = z.object({
    ops: z.array(TodoOp).describe('Array of todo operations (add/update/delete)'),
  }).strict();

  async execute({ ops }: { ops: TodoOpType[] }) {
    const context = ToolRegistry.getContext();
    const todos: TodoItem[] = context.sessionId
      ? await loadTodos(context.sessionId, context.sessionPath)
      : todoList;

    const byId = new Map(todos.map(t => [t.id, t]));
    const updated_ids: string[] = [];
    const added_ids: string[] = [];
    const deleted_ids: string[] = [];
    const warnings: Array<{ code: string; message?: string; id?: string }> = [];

    for (const op of ops) {
      if (op.op === 'add') {
        const id = op.item.id ?? `t_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        if (byId.has(id)) {
          warnings.push({ code: 'DUPLICATE_ID', id, message: 'id already exists; skipped' });
          continue;
        }
        const item: TodoItem = {
          id,
          content: op.item.content,
          status: op.item.status ?? 'pending',
          priority: op.item.priority ?? 'medium',
        };
        byId.set(id, item);
        added_ids.push(id);
      } else if (op.op === 'update') {
        const item = byId.get(op.id);
        if (!item) {
          warnings.push({ code: 'NOT_FOUND', id: op.id, message: 'todo not found; skipped' });
          continue;
        }
        const next = { ...item, ...op.patch };
        byId.set(op.id, next);
        updated_ids.push(op.id);
      } else if (op.op === 'delete') {
        if (!byId.has(op.id)) {
          warnings.push({ code: 'NOT_FOUND', id: op.id, message: 'todo not found; skipped' });
          continue;
        }
        byId.delete(op.id);
        deleted_ids.push(op.id);
      }
    }

    const nextTodos = Array.from(byId.values());

    if (context.sessionId) {
      await saveTodos(context.sessionId, context.sessionPath, nextTodos);
    } else {
      todoList = nextTodos;
    }

    // tool 返回：短 + 结构化（不要返回整表）
    const result = {
      count: nextTodos.length,
      added_ids,
      updated_ids,
      deleted_ids,
      warnings,
      ok: true,
      message: 'Todo operations applied successfully',
    };

    return {
      metadata: result,
      output: JSON.stringify(result),
    };
  }
}


const TodoTools =()=>{
  return [
    new TodoCreateTool(),
    new TodoGetAllTool(),
    new TodoGetActiveTool(),
    new TodoApplyOpsTool(),
  ]
}

export default TodoTools;
