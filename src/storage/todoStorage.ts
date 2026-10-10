import { LIMITS, STORAGE_KEYS } from '../constants';
import { addDays, dateKey, isDateKey } from '../utils/date';
import { asString, isRecord } from '../utils/guards';
import type { Todo } from '../types/todo';
import { readValue, withStorageLock, writeValue } from './storage';

function sanitizeTodos(raw: unknown): Todo[] {
  if (!Array.isArray(raw)) return [];
  const todos: Todo[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = asString(item.id);
    const title = asString(item.title).trim().slice(0, LIMITS.todoTitleLength);
    if (!id || !title) continue;
    const createdAt = typeof item.createdAt === 'number' ? item.createdAt : Date.now();
    const completed = item.completed === true;
    todos.push({
      id, title, completed, createdAt,
      completedAt: completed && typeof item.completedAt === 'number' ? item.completedAt : completed ? createdAt : null,
      date: isDateKey(item.date) ? item.date : dateKey(createdAt)
    });
  }
  return todos;
}

export const getTodos = (): Promise<Todo[]> => readValue(STORAGE_KEYS.todos, sanitizeTodos);

const mutate = (change: (todos: Todo[]) => Todo[]): Promise<boolean> =>
  withStorageLock(async () => writeValue(STORAGE_KEYS.todos, change(await getTodos())));

export const createTodo = (title: string, date: string = dateKey()): Todo => ({
  id: crypto.randomUUID(),
  title: title.trim().slice(0, LIMITS.todoTitleLength),
  completed: false,
  createdAt: Date.now(),
  completedAt: null,
  date
});

/** Inserts a new todo or replaces one with the same id. */
export const saveTodo = (todo: Todo): Promise<boolean> =>
  mutate((todos) => (todos.some((t) => t.id === todo.id) ? todos.map((t) => (t.id === todo.id ? todo : t)) : [...todos, todo]));

export const updateTodo = (id: string, patch: Partial<Pick<Todo, 'title' | 'date' | 'completed'>>): Promise<boolean> =>
  mutate((todos) =>
    todos.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      if (typeof patch.title === 'string') next.title = patch.title.trim().slice(0, LIMITS.todoTitleLength) || t.title;
      if (patch.completed !== undefined && patch.completed !== t.completed) {
        next.completedAt = patch.completed ? Date.now() : null;
      }
      return next;
    })
  );

export const deleteTodo = (id: string): Promise<boolean> => mutate((todos) => todos.filter((t) => t.id !== id));

export const pruneCompletedTodos = (keepDays: number): Promise<boolean> => {
  const cutoff = addDays(dateKey(), -keepDays);
  return mutate((todos) => todos.filter((t) => !(t.completed && t.completedAt !== null && dateKey(t.completedAt) < cutoff)));
};
