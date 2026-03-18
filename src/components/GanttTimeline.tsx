"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { WbsTask, isTaskOverdue } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  tasks: WbsTask[];
  totalCount?: number;
  filteredCount?: number;
}

import { JIRA_BASE } from "@/lib/constants";

function formatDate(d: Date | null): string {
  if (!d) return "-";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const STATUS_COLORS: Record<string, string> = {
  DONE: "bg-green-500",
  "IN PROGRESS": "bg-blue-500",
  "TO DO": "bg-muted-foreground/40",
};

interface WeekColumn {
  month: number;
  year: number;
  weekNum: number;
  startDate: Date;
  endDate: Date;
}

function buildWeekColumns(start: Date, end: Date): WeekColumn[] {
  const columns: WeekColumn[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  while (cursor <= end) {
    const m = cursor.getMonth();
    const y = cursor.getFullYear();
    const lastDayOfMonth = new Date(y, m + 1, 0).getDate();

    const weekRanges = [
      [1, 7],
      [8, 14],
      [15, 21],
      [22, 28],
      [29, lastDayOfMonth],
    ];

    for (const [s, e] of weekRanges) {
      if (s > lastDayOfMonth) break;
      const wStart = new Date(y, m, s);
      const wEnd = new Date(y, m, Math.min(e, lastDayOfMonth));
      if (wEnd >= start && wStart <= end) {
        columns.push({
          month: m,
          year: y,
          weekNum:
            columns.filter((c) => c.month === m && c.year === y).length + 1,
          startDate: wStart,
          endDate: wEnd,
        });
      }
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return columns;
}

interface MonthGroup {
  label: string;
  colSpan: number;
}

const ZOOM_LEVELS = [36, 48, 60, 76];
const LEFT_VW = "24vw";
const LEFT_MIN = 300;
const LEFT_COLS = {
  epic: "16%",
  story: "19%",
  part: "10%",
  assignee: "10%",
  task: "45%",
};

export default function GanttTimeline({ tasks, totalCount, filteredCount }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [zoomIdx, setZoomIdx] = useState(1); // default 48px
  const COL_W = ZOOM_LEVELS[zoomIdx];

  const tasksWithDates = tasks.filter((t) => t.planStart && t.planEnd);

  const today = new Date();
  const rangeStart = new Date(today.getFullYear() - 1, 0, 1);
  const rangeEnd = new Date(today.getFullYear() + 1, 11, 31);

  const weekCols = useMemo(
    () => buildWeekColumns(rangeStart, rangeEnd),
    [rangeStart.getTime(), rangeEnd.getTime()],
  );

  const monthGroups = useMemo(() => {
    const groups: MonthGroup[] = [];
    let prevKey = "";
    for (const w of weekCols) {
      const key = `${w.year}-${w.month}`;
      if (key === prevKey) {
        groups[groups.length - 1].colSpan++;
      } else {
        groups.push({
          label: `${w.year}년 ${String(w.month + 1).padStart(2, "0")}월`,
          colSpan: 1,
        });
        prevKey = key;
      }
    }
    return groups;
  }, [weekCols]);

  const todayColIdx = weekCols.findIndex(
    (w) => today >= w.startDate && today <= w.endDate,
  );

  const taskSpans = useMemo(() => {
    return tasksWithDates.map((t) => {
      let startIdx = -1;
      let endIdx = -1;
      for (let i = 0; i < weekCols.length; i++) {
        const w = weekCols[i];
        if (t.planStart! <= w.endDate && t.planEnd! >= w.startDate) {
          if (startIdx === -1) startIdx = i;
          endIdx = i;
        }
      }
      return { startIdx, endIdx };
    });
  }, [tasksWithDates, weekCols]);

  const totalCols = weekCols.length;

  const labelRef = useRef<HTMLDivElement>(null);
  const [labelW, setLabelW] = useState(0);

  // Measure left section width (40vw)
  useEffect(() => {
    function measure() {
      if (labelRef.current) setLabelW(labelRef.current.offsetWidth);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const scrollToToday = useCallback(() => {
    if (scrollRef.current && todayColIdx >= 0 && labelW > 0) {
      const scrollTarget =
        labelW + todayColIdx * COL_W - scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollTo({ left: Math.max(0, scrollTarget), behavior: "smooth" });
    }
  }, [todayColIdx, labelW, COL_W]);

  // Auto-scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && todayColIdx >= 0 && labelW > 0) {
      const scrollTarget =
        labelW + todayColIdx * COL_W - scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollLeft = Math.max(0, scrollTarget);
    }
  }, [todayColIdx, tasksWithDates.length, labelW]);

  // Drag-to-scroll
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, scrollLeft: scrollRef.current.scrollLeft };
    scrollRef.current.style.cursor = "grabbing";
    scrollRef.current.style.userSelect = "none";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    scrollRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = "grab";
      scrollRef.current.style.userSelect = "";
    }
  }, []);

  if (tasksWithDates.length === 0) {
    return (
      <Card className="py-12 text-center text-muted-foreground">
        날짜 정보가 있는 Task가 없습니다.
      </Card>
    );
  }

  const labelCellClass = "flex items-center h-full truncate px-3 border-r border-border/30";

  return (
    <TooltipProvider>
      <div className="mb-2 flex items-center gap-2">
        {totalCount != null && filteredCount != null && (
          <p className="text-sm text-muted-foreground">
            총 {totalCount}개 중{" "}
            <span className="font-medium text-foreground">{filteredCount}</span>개 표시
          </p>
        )}
        <div className="flex-1" />
        <span className="mr-1 text-sm text-muted-foreground">Zoom</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={zoomIdx === 0}
          onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={zoomIdx === ZOOM_LEVELS.length - 1}
          onClick={() => setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7"
          onClick={scrollToToday}
        >
          오늘
        </Button>
      </div>
      <Card
        className="cursor-grab overflow-x-auto gap-0 py-0 scrollbar-hide"
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <div style={{ minWidth: `calc(${LEFT_VW} + ${totalCols * COL_W}px)` }}>
          {/* Sticky headers wrapper */}
          <div className="sticky top-0 z-20 flex border-b border-border bg-card">
            {/* Label header - spans both month & week rows */}
            <div
              ref={labelRef}
              className="shrink-0 flex items-center border-r border-border/50 bg-white dark:bg-zinc-950 sticky left-0"
              style={{ width: LEFT_VW, minWidth: LEFT_MIN, height: 72, zIndex: 60 }}
            >
              <div className={`${labelCellClass} justify-center font-semibold text-muted-foreground`} style={{ width: LEFT_COLS.epic }}>Epic</div>
              <div className={`${labelCellClass} justify-center font-semibold text-muted-foreground`} style={{ width: LEFT_COLS.story }}>Story</div>
              <div className={`${labelCellClass} justify-center font-semibold text-muted-foreground`} style={{ width: LEFT_COLS.part }}>Part</div>
              <div className={`${labelCellClass} justify-center font-semibold text-muted-foreground`} style={{ width: LEFT_COLS.assignee }}>Lead</div>
              <div className={`${labelCellClass} font-semibold text-muted-foreground !border-r-0`} style={{ width: LEFT_COLS.task }}>Task</div>
            </div>
            {/* Month + Week stacked rows */}
            <div className="flex flex-col">
              <div className="flex border-b border-border/30">
                {monthGroups.map((mg, i) => (
                  <div
                    key={i}
                    className="border-r border-border/60 pt-0.5 text-center font-semibold text-foreground/70 leading-9"
                    style={{ width: mg.colSpan * COL_W, height: 36 }}
                  >
                    {mg.label}
                  </div>
                ))}
              </div>
              <div className="flex bg-muted">
                {weekCols.map((w, i) => (
                  <div
                    key={i}
                    className={`text-center font-medium leading-9 ${
                      i === todayColIdx
                        ? "bg-destructive/15 font-bold text-destructive"
                        : "text-muted-foreground"
                    } border-r border-border/30`}
                    style={{ width: COL_W, height: 36 }}
                  >
                    {w.weekNum}W
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Task rows */}
          <div className="relative">
            {tasksWithDates.map((t, i) => {
              const { startIdx, endIdx } = taskSpans[i];
              const isOverdue = isTaskOverdue(t, today);
              const barColor =
                STATUS_COLORS[t.status] || "bg-muted-foreground/40";

              return (
                <div
                  key={i}
                  className="flex h-11 items-center border-b border-border/50 transition-colors hover:bg-muted"
                >
                  {/* Label - sticky left, opaque bg */}
                  <div
                    className="shrink-0 flex items-center h-full border-r border-border/50 sticky left-0 bg-white dark:bg-zinc-950"
                    style={{ width: LEFT_VW, minWidth: LEFT_MIN, zIndex: 50 }}
                  >
                    <div className={`${labelCellClass} text-muted-foreground`} style={{ width: LEFT_COLS.epic }} title={t.epic}>{t.epic}</div>
                    <div className={`${labelCellClass} text-muted-foreground`} style={{ width: LEFT_COLS.story }} title={t.story}>{t.story}</div>
                    <div className={`${labelCellClass} justify-center`} style={{ width: LEFT_COLS.part }}>{t.part}</div>
                    <div className={`${labelCellClass} justify-center font-semibold`} style={{ width: LEFT_COLS.assignee }} title={t.assignee}>{t.assignee}</div>
                    <div className={`${labelCellClass} !border-r-0`} style={{ width: LEFT_COLS.task }} title={t.task}>{t.task}</div>
                  </div>

                  {/* Week cells */}
                  {weekCols.map((_, ci) => {
                    const inRange = ci >= startIdx && ci <= endIdx;
                    const isStart = ci === startIdx;
                    const isEnd = ci === endIdx;
                    const isTodayCol = ci === todayColIdx;

                    return (
                      <div
                        key={ci}
                        className={`relative h-full border-r border-border/30 ${isTodayCol ? "bg-destructive/5" : ""}`}
                        style={{ width: COL_W }}
                      >
                        {inRange && (
                          <Tooltip>
                            <TooltipTrigger
                              render={<div />}
                              className={`absolute top-1.5 bottom-1.5 z-20 cursor-default ${isOverdue ? "bg-destructive/70" : barColor} ${
                                isStart && isEnd
                                  ? "rounded-md left-1 right-1"
                                  : isStart
                                    ? "rounded-l-md left-1 right-0"
                                    : isEnd
                                      ? "rounded-r-md left-0 right-1"
                                      : "left-0 right-0"
                              }`}
                            >
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[360px] p-3">
                              <p className="border-b border-background/20 pb-2 text-sm font-semibold leading-snug text-background">{t.task}</p>
                              <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                                {t.jiraKey && (
                                  <>
                                    <span className="text-background/50">JIRA</span>
                                    <a
                                      href={`${JIRA_BASE}/${t.jiraKey}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 underline"
                                    >
                                      {t.jiraKey}
                                    </a>
                                  </>
                                )}
                                <span className="text-background/50">Lead</span>
                                <span className="text-background/80">{t.assignee}</span>
                                <span className="text-background/50">기간</span>
                                <span className="text-background/80">
                                  {formatDate(t.planStart)} ~ {formatDate(t.planEnd)}
                                </span>
                                <span className="text-background/50">진행률</span>
                                <span className="text-background/80">
                                  {Math.round(t.progress * 100)}% · {t.status}
                                  {isOverdue && <span className="ml-1 text-red-400">지연</span>}
                                </span>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
}
