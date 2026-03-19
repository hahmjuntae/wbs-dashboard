"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { WbsTask, FilterState, hasActiveFilters } from "@/lib/types";
import { parseWbsFile, sortTasks } from "@/lib/parseWbs";
import {
  saveTasks,
  loadTasks,
  clearTasks,
  saveFilters,
  loadFilters,
  saveView,
  loadView,
} from "@/lib/storage";
import FileUploader from "@/components/FileUploader";
import FilterBar from "@/components/FilterBar";
import StatsCards from "@/components/StatsCards";
import TaskTable from "@/components/TaskTable";
import GanttTimeline from "@/components/GanttTimeline";
import CalendarView from "@/components/CalendarView";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RotateCcw,
  Download,
  Moon,
  Sun,
  ExternalLink,
} from "lucide-react";

const DEFAULT_FILTERS: FilterState = {
  assignee: [],
  part: [],
  story: [],
  status: [],
  search: "",
};

export default function Home() {
  const [allTasks, setAllTasks] = useState<WbsTask[]>([]);
  const [fileName, setFileName] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [view, setView] = useState("table");
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = loadTasks();
    if (saved) {
      setAllTasks(saved.tasks);
      setFileName(saved.fileName);
    }
    const savedFilters = loadFilters();
    if (savedFilters) setFilters(savedFilters);
    setView(loadView());

    const savedTheme = localStorage.getItem("wbs-theme");
    if (savedTheme === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
    setHydrated(true);
  }, []);

  // Persist filters
  useEffect(() => {
    if (hydrated) saveFilters(filters);
  }, [filters, hydrated]);

  // Persist view
  useEffect(() => {
    if (hydrated) saveView(view);
  }, [view, hydrated]);

  const toggleDark = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("wbs-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  async function handleFileLoad(data: ArrayBuffer, name: string) {
    try {
      const tasks = await parseWbsFile(data);
      setAllTasks(tasks);
      setFileName(name);
      saveTasks(tasks, name);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일 파싱 실패");
    }
  }

  function handleReset() {
    setAllTasks([]);
    setFileName("");
    setFilters(DEFAULT_FILTERS);
    clearTasks();
  }

  const filtered = useMemo(() => {
    let result = allTasks;

    if (filters.assignee.length > 0)
      result = result.filter((t) => filters.assignee.includes(t.assignee));
    if (filters.part.length > 0)
      result = result.filter((t) => filters.part.includes(t.part));
    if (filters.story.length > 0)
      result = result.filter((t) => filters.story.includes(t.story));
    if (filters.status.length > 0)
      result = result.filter((t) => filters.status.includes(t.status));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.task.toLowerCase().includes(q) ||
          t.jiraKey.toLowerCase().includes(q) ||
          t.story.toLowerCase().includes(q) ||
          t.part.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q),
      );
    }

    return result;
  }, [allTasks, filters]);

  // CSV Export
  function exportCsv() {
    const headers = [
      "Epic",
      "Story",
      "Task",
      "JIRA",
      "Part",
      "Lead",
      "Plan Start",
      "Plan End",
      "Progress",
      "Status",
    ];
    const rows = filtered.map((t) => [
      t.epic,
      t.story,
      t.task,
      t.jiraKey,
      t.part,
      t.assignee,
      t.planStart?.toISOString().split("T")[0] ?? "",
      t.planEnd?.toISOString().split("T")[0] ?? "",
      `${Math.round(t.progress * 100)}%`,
      t.status,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wbs-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Quick filter from stats cards
  function handleStatsFilter(type: string) {
    if (type === "overdue") {
      setFilters({ ...DEFAULT_FILTERS });
    } else if (type === "all") {
      setFilters(DEFAULT_FILTERS);
    } else {
      setFilters({ ...filters, status: [type] });
    }
  }

  if (!hydrated) return null;

  if (allTasks.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center p-8 pt-[20vh]">
        <div className="absolute right-6 top-6">
          <Button variant="ghost" size="icon" onClick={toggleDark}>
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/forbiz-logo.svg" alt="FORBIZ KOREA" className="mb-4 h-20 dark:invert" />
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
          WBS Dashboard
        </h1>
        <p className="mb-8 text-muted-foreground">
          엑셀 파일을 업로드하면 일정을 분석합니다
        </p>
        <FileUploader onFileLoad={handleFileLoad} />
        <a
          href="https://forbizkorea.atlassian.net/wiki/spaces/BBJ/pages/1566048265/B1.+WBS"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground underline decoration-muted-foreground/40 hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          WBS 전체보기 (Confluence)
        </a>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-[1440px] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              WBS Dashboard
            </h1>
            {fileName && (
              <span className="text-sm text-muted-foreground">{fileName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              CSV
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleDark}>
              {dark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              다른 파일
            </Button>
          </div>
        </div>

        {/* Stats - clickable */}
        <StatsCards tasks={filtered} onFilter={handleStatsFilter} activeStatus={filters.status} />

        {/* Filters + View toggle */}
        <div className="sticky top-0 z-[60] -mx-6 bg-background/95 px-6 py-3 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <FilterBar
              tasks={allTasks}
              filters={filters}
              onChange={setFilters}
            />
            <Tabs value={view} onValueChange={setView}>
              <TabsList>
                <TabsTrigger value="table">테이블</TabsTrigger>
                <TabsTrigger value="timeline">타임라인</TabsTrigger>
                <TabsTrigger value="calendar">캘린더</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        {view === "table" && (
          <p className="text-sm text-muted-foreground">
            총 {allTasks.length}개 중{" "}
            <span className="font-medium text-foreground">{filtered.length}</span>개 표시
          </p>
        )}
        {view === "table" ? (
          <TaskTable tasks={sortTasks(filtered)} />
        ) : view === "timeline" ? (
          <GanttTimeline tasks={filtered} totalCount={allTasks.length} filteredCount={filtered.length} />
        ) : (
          <CalendarView tasks={filtered} hasFilter={hasActiveFilters(filters)} />
        )}
      </div>
    </main>
  );
}
