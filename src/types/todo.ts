export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  completedAt: number | null;
  /** The day (YYYY-MM-DD) the task is planned for. */
  date: string;
}
