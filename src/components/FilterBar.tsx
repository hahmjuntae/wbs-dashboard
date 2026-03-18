"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { FilterState, WbsTask, hasActiveFilters } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Search, ChevronDown, RotateCcw } from "lucide-react";

interface Props {
  tasks: WbsTask[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export default function FilterBar({ tasks, filters, onChange }: Props) {
  const [searchLocal, setSearchLocal] = useState(filters.search);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setSearchLocal(filters.search);
  }, [filters.search]);

  function handleSearch(value: string) {
    setSearchLocal(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange({ ...filters, search: value });
    }, 250);
  }

  const { assignees, parts, stories, statuses } = useMemo(() => {
    const unique = (fn: (t: WbsTask) => string) =>
      [...new Set(tasks.map(fn))].filter(Boolean).sort();
    return {
      assignees: unique((t) => t.assignee),
      parts: unique((t) => t.part),
      stories: unique((t) => t.story),
      statuses: unique((t) => t.status),
    };
  }, [tasks]);

  function toggle(key: keyof FilterState, value: string) {
    const current = filters[key] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  }

  function removeChip(key: keyof FilterState, value: string) {
    const current = filters[key] as string[];
    onChange({ ...filters, [key]: current.filter((v) => v !== value) });
  }

  const hasFilter = hasActiveFilters(filters);

  const chips = useMemo(() => {
    const result: { key: keyof FilterState; label: string; value: string }[] = [];
    for (const v of filters.story) result.push({ key: "story", label: "Story", value: v });
    for (const v of filters.part) result.push({ key: "part", label: "Part", value: v });
    for (const v of filters.assignee) result.push({ key: "assignee", label: "Lead", value: v });
    for (const v of filters.status) result.push({ key: "status", label: "상태", value: v });
    return result;
  }, [filters.story, filters.part, filters.assignee, filters.status]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <MultiFilterSelect
          placeholder="Story"
          selected={filters.story}
          options={stories}
          onToggle={(v) => toggle("story", v)}
        />
        <MultiFilterSelect
          placeholder="Part"
          selected={filters.part}
          options={parts}
          onToggle={(v) => toggle("part", v)}
        />
        <MultiFilterSelect
          placeholder="Lead"
          selected={filters.assignee}
          options={assignees}
          onToggle={(v) => toggle("assignee", v)}
        />
        <MultiFilterSelect
          placeholder="상태"
          selected={filters.status}
          options={statuses}
          onToggle={(v) => toggle("status", v)}
        />
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="검색어를 입력하세요."
            value={searchLocal}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 w-52 pl-8"
          />
        </div>
        {hasFilter && (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => {
              setSearchLocal("");
              onChange({
                assignee: [],
                part: [],
                story: [],
                status: [],
                search: "",
              });
            }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            초기화
          </Button>
        )}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <Badge
              key={`${c.key}-${c.value}`}
              variant="secondary"
              className="h-auto gap-1.5 rounded-sm px-3 py-1.5"
            >
              <span className="text-muted-foreground">{c.label}:</span> {c.value}
              <button
                onClick={() => removeChip(c.key, c.value)}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiFilterSelect({
  placeholder,
  selected,
  options,
  onToggle,
}: {
  placeholder: string;
  selected: string[];
  options: string[];
  onToggle: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-[140px] items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm ring-offset-background hover:bg-muted/50"
      >
        {selected.length > 0 ? (
          <span>{placeholder} ({selected.length})</span>
        ) : (
          <span className="text-muted-foreground">{placeholder} 전체</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-10 left-0 z-50 min-w-[180px] rounded-md border bg-card p-1 shadow-md">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => onToggle(o)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
            >
              <span className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                selected.includes(o) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
              }`}>
                {selected.includes(o) && <span className="text-xs leading-none">✓</span>}
              </span>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
