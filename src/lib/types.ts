export interface WbsTask {
  epic: string;
  story: string;
  task: string;
  jiraKey: string;
  part: string;
  assignee: string;
  planStart: Date | null;
  planEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  progress: number;
  status: string;
}

export interface FilterState {
  assignee: string[];
  part: string[];
  story: string[];
  status: string[];
  search: string;
}

export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.assignee.length > 0 ||
    filters.part.length > 0 ||
    filters.story.length > 0 ||
    filters.status.length > 0 ||
    filters.search !== ""
  );
}

export function isTaskOverdue(task: WbsTask, now: Date = new Date()): boolean {
  return task.status !== "DONE" && task.planEnd !== null && task.planEnd < now;
}
