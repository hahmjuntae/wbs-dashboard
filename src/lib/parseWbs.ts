import { WbsTask } from "./types";

function excelDateToJS(serial: number): Date {
  const epoch = new Date(1899, 11, 30);
  return new Date(epoch.getTime() + serial * 86400000);
}

function parseDate(val: unknown): Date | null {
  if (val == null) return null;
  if (val instanceof Date) return val;
  if (typeof val === "number") return excelDateToJS(val);
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function parseWbsFile(file: ArrayBuffer): Promise<WbsTask[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(file, { type: "array", cellDates: true });
  const ws = wb.Sheets["PLAN(WEEKLY)"];
  if (!ws) throw new Error("PLAN(WEEKLY) 시트를 찾을 수 없습니다.");

  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const tasks: WbsTask[] = [];

  let currentEpic = "";
  let currentStory = "";

  for (let r = 3; r <= range.e.r; r++) {
    const cell = (col: number) => {
      const addr = XLSX.utils.encode_cell({ r, c: col });
      return ws[addr]?.v ?? null;
    };

    const taskName = cell(4);
    if (!taskName || typeof taskName !== "string") continue;

    const epicVal = cell(0);
    if (epicVal && typeof epicVal === "string") currentEpic = epicVal;

    const storyVal = cell(3);
    if (storyVal && typeof storyVal === "string") currentStory = storyVal;

    const part = cell(9);
    const assignee = cell(10);
    if (!assignee) continue;

    tasks.push({
      epic: currentEpic,
      story: currentStory,
      task: taskName,
      jiraKey: cell(6)?.toString() || "",
      part: part?.toString() || "",
      assignee: assignee?.toString() || "",
      planStart: parseDate(cell(13)),
      planEnd: parseDate(cell(14)),
      actualStart: parseDate(cell(15)),
      actualEnd: parseDate(cell(16)),
      progress: typeof cell(17) === "number" ? cell(17) : 0,
      status: cell(18)?.toString() || "",
    });
  }

  return tasks;
}

const STATUS_PRIORITY: Record<string, number> = {
  "IN PROGRESS": 0,
  "TO DO": 1,
  DONE: 2,
};

export function sortTasks(tasks: WbsTask[]): WbsTask[] {
  const now = new Date();
  return [...tasks].sort((a, b) => {
    // 1) 지연(overdue) 최상단
    const aOverdue =
      a.status !== "DONE" && a.planEnd && a.planEnd < now ? 1 : 0;
    const bOverdue =
      b.status !== "DONE" && b.planEnd && b.planEnd < now ? 1 : 0;
    if (bOverdue !== aOverdue) return bOverdue - aOverdue;

    // 2) 상태: IN PROGRESS > TO DO > DONE
    const aPri = STATUS_PRIORITY[a.status] ?? 1;
    const bPri = STATUS_PRIORITY[b.status] ?? 1;
    if (aPri !== bPri) return aPri - bPri;

    // 3) 마감일 가까운 순
    const aEnd = a.planEnd?.getTime() ?? Infinity;
    const bEnd = b.planEnd?.getTime() ?? Infinity;
    return aEnd - bEnd;
  });
}
