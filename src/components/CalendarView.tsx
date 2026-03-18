"use client";

import { useMemo, useState } from "react";
import { WbsTask, isTaskOverdue } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  tasks: WbsTask[];
  hasFilter?: boolean;
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
import { JIRA_BASE } from "@/lib/constants";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DONE: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-800 dark:text-green-300" },
  "IN PROGRESS": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300" },
  "TO DO": { bg: "bg-gray-100 dark:bg-gray-800/40", text: "text-gray-600 dark:text-gray-400" },
};
const OVERDUE_COLOR = { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300" };

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildMonthWeeks(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > totalDays) {
      cells.push(null);
    } else {
      cells.push(new Date(year, month, dayNum));
    }
  }

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/** A single segment of a task bar (split around weekends) */
interface CalendarTaskSegment {
  task: WbsTask;
  startCol: number;
  span: number;
  row: number;
  color: { bg: string; text: string };
  showLabel: boolean; // only first segment shows the label
}

/**
 * Layout tasks for a week, splitting bars around weekend columns (0=Sun, 6=Sat).
 * Bars render only on weekday columns (1-5), so a task spanning Fri→Mon
 * produces two segments: one at col 5 and one at col 1.
 */
function layoutTasks(
  week: (Date | null)[],
  tasks: WbsTask[],
  now: Date,
): CalendarTaskSegment[] {
  const weekDates = week.filter(Boolean) as Date[];
  if (weekDates.length === 0) return [];

  const weekStart = startOfDay(weekDates[0]);
  const weekEnd = startOfDay(weekDates[weekDates.length - 1]);
  weekEnd.setHours(23, 59, 59, 999);

  const tasksWithDates = tasks.filter((t) => t.planStart && t.planEnd);
  const overlapping = tasksWithDates.filter((t) => {
    const tStart = startOfDay(t.planStart!);
    const tEnd = startOfDay(t.planEnd!);
    return tStart <= weekEnd && tEnd >= weekStart;
  });

  const lanes: number[] = [];
  const result: CalendarTaskSegment[] = [];

  for (const t of overlapping) {
    const tStart = startOfDay(t.planStart!);
    const tEnd = startOfDay(t.planEnd!);

    // Compute raw column range
    let rawStart = 0;
    for (let i = 0; i < week.length; i++) {
      if (week[i] && tStart <= startOfDay(week[i]!)) {
        rawStart = i;
        break;
      }
      if (week[i]) rawStart = i;
    }
    if (tStart < weekStart) rawStart = 0;

    let rawEnd = 6;
    for (let i = week.length - 1; i >= 0; i--) {
      if (week[i] && tEnd >= startOfDay(week[i]!)) {
        rawEnd = i;
        break;
      }
    }
    if (tEnd > weekEnd) rawEnd = 6;
    if (rawEnd < rawStart) rawEnd = rawStart;

    // Allocate lane based on full raw range (for consistent row assignment)
    let row = 0;
    for (let l = 0; l < lanes.length; l++) {
      if (lanes[l] < rawStart) {
        row = l;
        break;
      }
      row = l + 1;
    }
    lanes[row] = rawEnd;

    const isOverdue = isTaskOverdue(t, now);
    const color = isOverdue
      ? OVERDUE_COLOR
      : STATUS_COLORS[t.status] || STATUS_COLORS["TO DO"];

    // Split into weekday-only segments (skip col 0=Sun and col 6=Sat)
    const segments: [number, number][] = [];
    let segStart = -1;
    for (let c = rawStart; c <= rawEnd; c++) {
      const isWeekend = c === 0 || c === 6;
      if (!isWeekend) {
        if (segStart === -1) segStart = c;
      } else {
        if (segStart !== -1) {
          segments.push([segStart, c - 1]);
          segStart = -1;
        }
      }
    }
    if (segStart !== -1) segments.push([segStart, rawEnd]);

    segments.forEach(([sCol, eCol], idx) => {
      result.push({
        task: t,
        startCol: sCol,
        span: eCol - sCol + 1,
        row,
        color,
        showLabel: idx === 0,
      });
    });
  }

  return result;
}

export default function CalendarView({ tasks, hasFilter = false }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const minDate = new Date(today.getFullYear() - 1, 0, 1);
  const maxDate = new Date(today.getFullYear() + 1, 11, 31);

  const canPrev = new Date(year, month - 1, 1) >= minDate;
  const canNext = new Date(year, month + 1, 1) <= maxDate;

  const prev = () => {
    if (!canPrev) return;
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const next = () => {
    if (!canNext) return;
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const weeks = useMemo(() => buildMonthWeeks(year, month), [year, month]);

  const weekTaskRows = useMemo(() => {
    const now = new Date();
    return weeks.map((week) => layoutTasks(week, tasks, now));
  }, [tasks, weeks]);

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  return (
    <TooltipProvider>
      <Card className="p-5">
        {/* Month navigation */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={prev}
              disabled={!canPrev}
              className="h-9 w-9"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="min-w-[140px] text-center text-lg font-bold">
              {year}년 {month + 1}월
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={next}
              disabled={!canNext}
              className="h-9 w-9"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant={isCurrentMonth ? "secondary" : "outline"}
            size="sm"
            onClick={goToday}
            className="absolute right-0"
          >
            오늘
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAY_NAMES.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center font-semibold ${
                i === 0
                  ? "text-red-400"
                  : i === 6
                    ? "text-blue-400"
                    : "text-muted-foreground"
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="relative">
          {weeks.map((week, wi) => {
            const weekTasks = weekTaskRows[wi];
            const maxRow =
              weekTasks.length > 0
                ? Math.max(...weekTasks.map((ct) => ct.row))
                : -1;

            return (
              <div key={wi} className="border-b border-border/40">
                <div className="relative grid grid-cols-7">
                  {/* Day cells */}
                  {week.map((date, di) => {
                    const isToday = date && isSameDay(date, today);
                    const isCurrentMo = date !== null;
                    const isWeekend = di === 0 || di === 6;
                    return (
                      <div
                        key={di}
                        className={`aspect-square border-r border-border/30 px-1 pt-1 ${
                          !isCurrentMo ? "bg-muted/20" : isWeekend ? "bg-muted/10" : ""
                        }`}
                      >
                        {date && (
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                              isToday
                                ? "bg-destructive font-bold text-white"
                                : di === 0
                                  ? "text-red-400"
                                  : di === 6
                                    ? "text-blue-400"
                                    : "text-muted-foreground"
                            }`}
                          >
                            {date.getDate()}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {/* Task bar segments (weekdays only, skip weekends) */}
                  {weekTasks.map((ct, ti) => (
                    <Tooltip key={ti}>
                      <TooltipTrigger
                        render={<div />}
                        className={`absolute mx-0.5 flex h-[20px] items-center overflow-hidden rounded-sm px-1.5 ${ct.color.bg} cursor-default`}
                        style={{
                          top: `${32 + ct.row * 24}px`,
                          left: `${(ct.startCol / 7) * 100}%`,
                          width: `${(ct.span / 7) * 100}%`,
                        }}
                      >
                        {ct.showLabel && (
                          <span
                            className={`truncate text-sm leading-none font-medium ${ct.color.text}`}
                          >
                            {ct.task.task}
                          </span>
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[360px] p-3">
                        <p className="border-b border-background/20 pb-2 text-sm font-semibold leading-snug text-background">{ct.task.task}</p>
                        <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                          {ct.task.jiraKey && (
                            <>
                              <span className="text-background/50">JIRA</span>
                              <a
                                href={`${JIRA_BASE}/${ct.task.jiraKey}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 underline"
                              >
                                {ct.task.jiraKey}
                              </a>
                            </>
                          )}
                          <span className="text-background/50">Lead</span>
                          <span className="text-background/80">{ct.task.assignee}</span>
                          <span className="text-background/50">Part</span>
                          <span className="text-background/80">{ct.task.part}</span>
                          <span className="text-background/50">기간</span>
                          <span className="text-background/80">
                            {ct.task.planStart &&
                              `${ct.task.planStart.getMonth() + 1}/${ct.task.planStart.getDate()}`}
                            {" ~ "}
                            {ct.task.planEnd &&
                              `${ct.task.planEnd.getMonth() + 1}/${ct.task.planEnd.getDate()}`}
                          </span>
                          <span className="text-background/50">진행률</span>
                          <span className="text-background/80">
                            {Math.round(ct.task.progress * 100)}% · {ct.task.status}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            );
          })}
          {!hasFilter && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-xl bg-background/70 backdrop-blur-[2px]">
              <span className="text-muted-foreground font-medium">필터를 선택하세요</span>
            </div>
          )}
        </div>
      </Card>
    </TooltipProvider>
  );
}
