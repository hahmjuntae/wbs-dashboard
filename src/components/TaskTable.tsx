"use client";

import { useState, useMemo } from "react";
import { WbsTask, isTaskOverdue } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface Props {
  tasks: WbsTask[];
}

import { JIRA_BASE } from "@/lib/constants";

function formatDate(d: Date | null): string {
  if (!d) return "-";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS_STYLE: Record<string, string> = {
  DONE: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20",
  "IN PROGRESS": "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  "TO DO": "bg-muted text-muted-foreground border-border",
};

type SortKey =
  | "epic"
  | "story"
  | "task"
  | "jiraKey"
  | "part"
  | "assignee"
  | "planStart"
  | "planEnd"
  | "actualStart"
  | "actualEnd"
  | "progress"
  | "status";

type SortDir = "asc" | "desc";

function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const mul = dir === "asc" ? 1 : -1;
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a instanceof Date && b instanceof Date)
    return (a.getTime() - b.getTime()) * mul;
  if (typeof a === "number" && typeof b === "number") return (a - b) * mul;
  const sa = String(a);
  const sb = String(b);
  // Natural sort: extract trailing number for keys like "BBJ-108"
  const na = sa.match(/^(.+?)(\d+)$/);
  const nb = sb.match(/^(.+?)(\d+)$/);
  if (na && nb && na[1] === nb[1]) return (Number(na[2]) - Number(nb[2])) * mul;
  return sa.localeCompare(sb, "ko") * mul;
}

function SortIcon({
  active,
  dir,
}: {
  active: boolean;
  dir: SortDir;
}) {
  if (!active)
    return <ArrowUpDown className="ml-1 inline h-3.5 w-3.5 text-muted-foreground/40" />;
  return dir === "asc" ? (
    <ArrowUp className="ml-1 inline h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="ml-1 inline h-3.5 w-3.5" />
  );
}

export default function TaskTable({ tasks }: Props) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return tasks;
    return [...tasks].sort((a, b) =>
      compareValues(
        a[sortKey as keyof WbsTask],
        b[sortKey as keyof WbsTask],
        sortDir,
      ),
    );
  }, [tasks, sortKey, sortDir]);

  if (tasks.length === 0) {
    return (
      <Card className="py-12 text-center text-muted-foreground">
        조건에 맞는 Task가 없습니다.
      </Card>
    );
  }

  const cols: { key: SortKey; label: string; w: string; center?: boolean }[] = [
    { key: "epic", label: "Epic", w: "w-[120px]" },
    { key: "story", label: "Story", w: "w-[180px]" },
    { key: "task", label: "Task", w: "" },
    { key: "jiraKey", label: "JIRA", w: "w-[100px]", center: true },
    { key: "part", label: "Part", w: "w-[70px]", center: true },
    { key: "assignee", label: "Lead", w: "w-[90px]", center: true },
    { key: "planStart", label: "계획 시작", w: "w-[100px]", center: true },
    { key: "planEnd", label: "계획 완료", w: "w-[100px]", center: true },
    { key: "actualStart", label: "실행 시작", w: "w-[100px]", center: true },
    { key: "actualEnd", label: "실행 완료", w: "w-[100px]", center: true },
    { key: "progress", label: "진행률", w: "w-[140px]", center: true },
    { key: "status", label: "상태", w: "w-[120px]", center: true },
  ];

  return (
    <Card className="overflow-x-auto px-4">
      <Table>
        <TableHeader>
          <TableRow>
            {cols.map((col) => (
              <TableHead
                key={col.key}
                className={`${col.w} cursor-pointer select-none hover:bg-muted/50 ${col.center ? "text-center" : ""}`}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                <SortIcon active={sortKey === col.key} dir={sortDir} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((t, i) => {
            const isOverdue = isTaskOverdue(t);
            return (
              <TableRow
                key={i}
                className={isOverdue ? "bg-destructive/5" : undefined}
              >
                <TableCell className="max-w-[120px] truncate text-muted-foreground">
                  {t.epic}
                </TableCell>
                <TableCell className="max-w-[180px] truncate">
                  {t.story}
                </TableCell>
                <TableCell className="font-medium">{t.task}</TableCell>
                <TableCell className="text-center">
                  {t.jiraKey ? (
                    <a
                      href={`${JIRA_BASE}/${t.jiraKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-600 underline decoration-blue-300 hover:text-blue-800"
                    >
                      {t.jiraKey}
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-center">{t.part}</TableCell>
                <TableCell className="text-center font-medium">{t.assignee}</TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {formatDate(t.planStart)}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {formatDate(t.planEnd)}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {formatDate(t.actualStart)}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {formatDate(t.actualEnd)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    <Progress
                      value={t.progress * 100}
                      className="w-16 [&_[data-slot=progress-track]]:h-2"
                    />
                    <span className="text-muted-foreground">
                      {Math.round(t.progress * 100)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={`px-2 py-0 text-xs ${STATUS_STYLE[t.status] || ""}`}>
                    {t.status || "-"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
