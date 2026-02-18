"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { ReportEntry } from "@/lib/api/types";
import { getReportEntries } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/client";

// ---------- helpers ----------
type Period = "day" | "week" | "month";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODateLocal(d: Date) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endExclusiveOfDay(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

// Monday week start
function startOfWeekMonday(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun .. 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function startOfMonth(d: Date) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function endExclusiveOfMonth(d: Date) {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + 1);
  return x;
}

function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function summarizeMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatRangeLabel(period: Period, anchor: Date, start: Date, endExcl: Date) {
  const endIncl = new Date(endExcl);
  endIncl.setDate(endIncl.getDate() - 1);

  const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "2-digit" };
  const fmt = (dd: Date) => dd.toLocaleDateString(undefined, opts);

  if (period === "day") return fmt(anchor);
  if (period === "week") return `${fmt(start)} – ${fmt(endIncl)}`;
  return `${anchor.toLocaleDateString(undefined, { year: "numeric", month: "long" })}`;
}

function escapeCSV(value: string) {
  const needs = /[",\n\r]/.test(value);
  const v = value.replace(/"/g, '""');
  return needs ? `"${v}"` : v;
}

function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function stableProjectBadgeClasses(project: string) {
  const palette = [
    "bg-blue-50 text-blue-700 border-blue-200",
    "bg-emerald-50 text-emerald-700 border-emerald-200",
    "bg-violet-50 text-violet-700 border-violet-200",
    "bg-amber-50 text-amber-800 border-amber-200",
    "bg-rose-50 text-rose-700 border-rose-200",
    "bg-cyan-50 text-cyan-700 border-cyan-200",
    "bg-lime-50 text-lime-800 border-lime-200",
    "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
    "bg-slate-50 text-slate-700 border-slate-200",
  ];
  let hash = 0;
  for (let i = 0; i < project.length; i++) hash = (hash * 31 + project.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

// ---------- UI primitives ----------
function Button({
  variant = "secondary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const base =
    "rounded-2xl px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-200",
    secondary: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-100",
    ghost: "text-slate-600 hover:bg-slate-100 focus:ring-slate-100 shadow-none",
  } as const;
  return <button className={cx(base, variants[variant], className)} {...props} />;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100",
        props.className
      )}
    />
  );
}

function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex w-full rounded-2xl bg-slate-50 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={cx(
              "flex-1 rounded-2xl px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-4",
              active ? "bg-white text-slate-900 shadow-sm ring-slate-100" : "text-slate-600 hover:text-slate-900 focus:ring-slate-100"
            )}
            aria-pressed={active}
            type="button"
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------- component ----------
export default function Reports() {
  const [period, setPeriod] = useState<Period>("week");
  const [anchorISO, setAnchorISO] = useState<string>(() => toISODateLocal(new Date()));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entries, setEntries] = useState<ReportEntry[]>([]);

  const anchorDate = useMemo(() => {
    const [y, m, d] = anchorISO.split("-").map(Number);
    const dt = new Date();
    dt.setFullYear(y, (m ?? 1) - 1, d ?? 1);
    dt.setHours(12, 0, 0, 0);
    return dt;
  }, [anchorISO]);

  const range = useMemo(() => {
    const a = anchorDate;
    if (period === "day") {
      const start = startOfDay(a);
      const endExcl = endExclusiveOfDay(a);
      return { start, endExcl };
    }
    if (period === "week") {
      const start = startOfWeekMonday(a);
      const endExcl = new Date(start);
      endExcl.setDate(endExcl.getDate() + 7);
      return { start, endExcl };
    }
    const start = startOfMonth(a);
    const endExcl = endExclusiveOfMonth(a);
    return { start, endExcl };
  }, [anchorDate, period]);

  const fromISO = useMemo(() => toISODateLocal(range.start), [range.start]);
  const toISO = useMemo(() => toISODateLocal(range.endExcl), [range.endExcl]);

  const rangeLabel = useMemo(
    () => formatRangeLabel(period, anchorDate, range.start, range.endExcl),
    [period, anchorDate, range.start, range.endExcl]
  );

  // ✅ Fetch entries from backend whenever period/anchor changes
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getReportEntries(fromISO, toISO);
        setEntries(data);
      } catch (e: any) {
        setError((e as ApiError)?.message ?? "Failed to load report");
      } finally {
        setLoading(false);
      }
    })();
  }, [fromISO, toISO]);

  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => (e.taskName + " " + e.projectName).toLowerCase().includes(q));
  }, [entries, query]);

  const groupedByProject = useMemo(() => {
    const map = new Map<
      string,
      { projectName: string; totalMinutes: number; entries: ReportEntry[]; count: number }
    >();

    for (const e of filteredEntries) {
      const key = e.projectName || "Unassigned";
      const cur = map.get(key) ?? { projectName: key, totalMinutes: 0, entries: [], count: 0 };
      cur.totalMinutes += e.minutes;
      cur.entries.push(e);
      cur.count += 1;
      map.set(key, cur);
    }

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        entries: [...g.entries].sort((a, b) => b.occurredAt - a.occurredAt),
      }))
      .sort((a, b) => (b.totalMinutes - a.totalMinutes) || a.projectName.localeCompare(b.projectName));
  }, [filteredEntries]);

  const totals = useMemo(() => {
    const totalMinutes = filteredEntries.reduce((s, e) => s + e.minutes, 0);
    const uniqueProjects = new Set(filteredEntries.map((e) => e.projectName || "Unassigned")).size;
    return { totalMinutes, entryCount: filteredEntries.length, uniqueProjects };
  }, [filteredEntries]);

  const exportCSV = () => {
    const rows = filteredEntries
      .slice()
      .sort((a, b) => a.occurredAt - b.occurredAt)
      .map((e) => {
        const d = new Date(e.occurredAt);
        const date = d.toLocaleDateString();
        const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return {
          date,
          time,
          project: e.projectName || "Unassigned",
          task: e.taskName,
          minutes: String(e.minutes),
          hhmm: minutesToHHMM(e.minutes),
        };
      });

    const header = ["Date", "Time", "Project", "Task", "Minutes", "HH:MM"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          escapeCSV(r.date),
          escapeCSV(r.time),
          escapeCSV(r.project),
          escapeCSV(r.task),
          r.minutes,
          r.hhmm,
        ].join(",")
      ),
    ];

    const filename = `report_${period}_${anchorISO}.csv`;
    downloadTextFile(filename, lines.join("\n"), "text/csv;charset=utf-8");
  };

  return (
    <div className="min-h-[60vh] w-full bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reports</h1>
            <p className="mt-1 text-sm text-slate-600">
              View reports by day/week/month and export to CSV.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={exportCSV}
            disabled={filteredEntries.length === 0}
            title={filteredEntries.length === 0 ? "No data to export" : "Export CSV"}
          >
            Export CSV
          </Button>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-xs font-medium text-slate-600">Period</div>
              <div className="mt-2">
                <SegmentedTabs<Period>
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: "day", label: "Day" },
                    { value: "week", label: "Week" },
                    { value: "month", label: "Month" },
                  ]}
                />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Range: <span className="font-medium text-slate-700">{rangeLabel}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                Backend: /api/reports/entries?from={fromISO}&to={toISO}
              </div>
            </div>
          </div>

          <div className="sm:col-span-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <label className="block text-xs font-medium text-slate-600">Anchor date</label>
              <Input type="date" value={anchorISO} onChange={(e) => setAnchorISO(e.target.value)} className="mt-2" />
              <div className="mt-2 text-xs text-slate-500">Day/week/month is computed from this date.</div>
            </div>
          </div>

          <div className="sm:col-span-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <label className="block text-xs font-medium text-slate-600">Filter</label>
              <div className="relative mt-2">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search task or project…" />
                {query && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{filteredEntries.length}</span> entries
              </div>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Total time</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{summarizeMinutes(totals.totalMinutes)}</div>
            <div className="mt-1 text-xs text-slate-500">{minutesToHHMM(totals.totalMinutes)} (hh:mm)</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Projects</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{totals.uniqueProjects}</div>
            <div className="mt-1 text-xs text-slate-500">Distinct projects in this range</div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-slate-500">Entries</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{totals.entryCount}</div>
            <div className="mt-1 text-xs text-slate-500">{loading ? "Loading…" : "Time records included"}</div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-900">Breakdown by project</div>
            <div className="mt-1 text-xs text-slate-500">Totals are based on filtered entries.</div>
          </div>

          {loading ? (
            <div className="p-6 text-sm text-slate-600">Loading…</div>
          ) : groupedByProject.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-base font-semibold text-slate-900">No data for this period</div>
              <div className="mt-1 text-sm text-slate-600">Try another date, period, or remove filters.</div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {groupedByProject.map((g) => (
                <details key={g.projectName} className="group">
                  <summary className="cursor-pointer list-none p-4 hover:bg-slate-50">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={cx("inline-flex items-center rounded-2xl border px-2.5 py-1 text-xs font-medium", stableProjectBadgeClasses(g.projectName))}>
                          {g.projectName}
                        </span>
                        <span className="text-xs text-slate-500">• {g.count} entr{g.count === 1 ? "y" : "ies"}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="rounded-2xl bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900">
                          {summarizeMinutes(g.totalMinutes)}
                        </div>
                        <div className="text-xs text-slate-500">{minutesToHHMM(g.totalMinutes)}</div>
                        <span className="ml-2 rounded-xl px-2 py-1 text-xs text-slate-600 group-open:bg-slate-100">
                          <span className="inline-block transition group-open:rotate-180">▾</span>
                        </span>
                      </div>
                    </div>
                  </summary>

                  <div className="px-4 pb-4">
                    <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
                      <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                        <div className="col-span-5">Task</div>
                        <div className="col-span-4">Date/Time</div>
                        <div className="col-span-3 text-right">Time</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {g.entries.map((e) => {
                          const d = new Date(e.occurredAt);
                          return (
                            <div key={e.id} className="grid grid-cols-12 px-3 py-2 text-sm">
                              <div className="col-span-5 truncate text-slate-900">{e.taskName || "—"}</div>
                              <div className="col-span-4 text-slate-600">
                                {d.toLocaleDateString()}{" "}
                                <span className="text-slate-400">•</span>{" "}
                                {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </div>
                              <div className="col-span-3 text-right font-medium text-slate-900">
                                {minutesToHHMM(e.minutes)} <span className="text-slate-400">({e.minutes}m)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          CSV export includes: Date, Time, Project, Task, Minutes, HH:MM.
        </div>
      </div>
    </div>
  );
}
