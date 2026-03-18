import { WbsTask, FilterState } from "./types";
import { STORAGE_KEYS } from "./constants";

export function saveTasks(tasks: WbsTask[], fileName: string) {
  try {
    const serialized = tasks.map((t) => ({
      ...t,
      planStart: t.planStart?.toISOString() ?? null,
      planEnd: t.planEnd?.toISOString() ?? null,
      actualStart: t.actualStart?.toISOString() ?? null,
      actualEnd: t.actualEnd?.toISOString() ?? null,
    }));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(serialized));
    localStorage.setItem(STORAGE_KEYS.FILE_NAME, fileName);
  } catch {
    // localStorage full or unavailable
  }
}

export function loadTasks(): { tasks: WbsTask[]; fileName: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    const fileName = localStorage.getItem(STORAGE_KEYS.FILE_NAME);
    if (!raw || !fileName) return null;

    const parsed = JSON.parse(raw);
    const tasks: WbsTask[] = parsed.map(
      (t: Record<string, unknown>) => ({
        ...t,
        planStart: t.planStart ? new Date(t.planStart as string) : null,
        planEnd: t.planEnd ? new Date(t.planEnd as string) : null,
        actualStart: t.actualStart ? new Date(t.actualStart as string) : null,
        actualEnd: t.actualEnd ? new Date(t.actualEnd as string) : null,
      }),
    );
    return { tasks, fileName };
  } catch {
    return null;
  }
}

export function clearTasks() {
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.FILE_NAME);
}

export function saveFilters(filters: FilterState) {
  try {
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filters));
  } catch {}
}

export function loadFilters(): FilterState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FILTERS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveView(view: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.VIEW, view);
  } catch {}
}

export function loadView(): string {
  return localStorage.getItem(STORAGE_KEYS.VIEW) || "table";
}
