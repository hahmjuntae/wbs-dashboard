"use client";

import { useMemo } from "react";
import { WbsTask, isTaskOverdue } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  tasks: WbsTask[];
  onFilter?: (type: string) => void;
  activeStatus?: string[];
}

export default function StatsCards({ tasks, onFilter, activeStatus }: Props) {
  const { total, done, inProgress, todo, overdue, avgProgress } = useMemo(() => {
    const now = new Date();
    const t = tasks.length;
    return {
      total: t,
      done: tasks.filter((tk) => tk.status === "DONE").length,
      inProgress: tasks.filter((tk) => tk.status === "IN PROGRESS").length,
      todo: tasks.filter((tk) => tk.status === "TO DO").length,
      overdue: tasks.filter((tk) => isTaskOverdue(tk, now)).length,
      avgProgress: t > 0
        ? Math.round((tasks.reduce((sum, tk) => sum + tk.progress, 0) / t) * 100)
        : 0,
    };
  }, [tasks]);

  const cards = [
    {
      label: "전체",
      value: total,
      filterKey: "all",
      dot: "bg-primary",
      active: !activeStatus || activeStatus.length === 0,
    },
    {
      label: "진행중",
      value: inProgress,
      filterKey: "IN PROGRESS",
      dot: "bg-blue-500",
      active: activeStatus?.includes("IN PROGRESS"),
    },
    {
      label: "예정",
      value: todo,
      filterKey: "TO DO",
      dot: "bg-gray-400",
      active: activeStatus?.includes("TO DO"),
    },
    {
      label: "완료",
      value: done,
      filterKey: "DONE",
      dot: "bg-green-500",
      active: activeStatus?.includes("DONE"),
    },
    {
      label: "지연",
      value: overdue,
      filterKey: "overdue",
      dot: "bg-destructive",
      active: false,
    },
    {
      label: "평균 진행률",
      value: `${avgProgress}%`,
      filterKey: "",
      dot: "bg-chart-1",
      active: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <Card
          key={c.label}
          className={`transition-all ${
            c.filterKey
              ? "cursor-pointer hover:shadow-md hover:border-primary/30"
              : ""
          } ${c.active ? "ring-2 ring-primary/40 shadow-md" : ""}`}
          onClick={() => c.filterKey && onFilter?.(c.filterKey)}
        >
          <CardContent className="px-4 py-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                <span className="text-sm text-muted-foreground">{c.label}</span>
              </div>
              <p className="text-xl font-bold">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
