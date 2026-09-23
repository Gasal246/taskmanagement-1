import type { Todo } from "@/components/todo/TodoWorkspace";

export const TODO_LOCAL_STORAGE_VERSION = 1;

export const getTodoLocalStorageKey = (userId: string) =>
  `taskmanager:personal-todos:v${TODO_LOCAL_STORAGE_VERSION}:${userId}`;

export const getTodoImportDismissKey = (userId: string) =>
  `taskmanager:personal-todos-import-dismissed:v${TODO_LOCAL_STORAGE_VERSION}:${userId}`;

export const readLocalTodos = (userId: string): Todo[] => {
  if (typeof window === "undefined" || !userId) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(getTodoLocalStorageKey(userId)) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((todo) =>
        Boolean(
          todo &&
            typeof todo._id === "string" &&
            typeof todo.content === "string" &&
            todo.content.trim() &&
            typeof todo.is_completed === "boolean" &&
            typeof todo.createdAt === "string" &&
            !Number.isNaN(new Date(todo.createdAt).getTime())
        )
      )
      .map((todo) => ({
        _id: todo._id,
        content: todo.content.trim().slice(0, 240),
        is_completed: todo.is_completed,
        priority: ["low", "medium", "high"].includes(todo.priority) ? todo.priority : "low",
        due_date:
          todo.due_date && !Number.isNaN(new Date(todo.due_date).getTime())
            ? todo.due_date
            : null,
        completed_at:
          todo.completed_at && !Number.isNaN(new Date(todo.completed_at).getTime())
            ? todo.completed_at
            : undefined,
        createdAt: todo.createdAt,
        updatedAt:
          todo.updatedAt && !Number.isNaN(new Date(todo.updatedAt).getTime())
            ? todo.updatedAt
            : undefined,
      })) as Todo[];
  } catch {
    return [];
  }
};

export const writeLocalTodos = (userId: string, todos: Todo[]) => {
  if (typeof window === "undefined" || !userId) throw new Error("Local storage is unavailable");
  window.localStorage.setItem(getTodoLocalStorageKey(userId), JSON.stringify(todos));
};

export const getLocalTodoSignature = (todos: Todo[]) =>
  todos
    .map((todo) =>
      [todo._id, todo.content, todo.is_completed ? "1" : "0", todo.priority || "low", todo.due_date || ""].join(":"))
    .sort()
    .join("|");
