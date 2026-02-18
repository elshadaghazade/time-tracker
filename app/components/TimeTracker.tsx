"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Project, TrackerEntry, TaskSuggestion } from "@/lib/api/types";
import {
    createTrackerEntry,
    deleteTrackerEntry,
    getProjects,
    getRecentTrackerEntries,
    getTaskSuggestions,
} from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/client";

// ===== helpers =====
function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}
function pad2(n: number) {
    return String(n).padStart(2, "0");
}
function msToHHMMSS(ms: number) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
function formatTime(ms: number) {
    return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(ms: number) {
    return new Date(ms).toLocaleDateString();
}
function minutesToHHMM(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${pad2(h)}:${pad2(m)}`;
}
function durationMinutes(startMs: number, endMs: number) {
    return Math.max(1, Math.round((endMs - startMs) / 60000));
}

// ===== UI =====
function Button({
    variant = "secondary",
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
    const base =
        "rounded-2xl px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-200",
        secondary: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-100",
        danger: "border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 focus:ring-rose-100",
        ghost: "text-slate-600 hover:bg-slate-100 focus:ring-slate-100 shadow-none",
    } as const;
    return <button className={cx(base, variants[variant], className)} {...props} />;
}

function Input({
    error,
    className,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
    return (
        <input
            className={cx(
                "w-full rounded-2xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-4",
                error
                    ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100"
                    : "border-slate-200 focus:border-slate-300 focus:ring-slate-100",
                className
            )}
            {...props}
        />
    );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={cx(
                "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100",
                props.className
            )}
        />
    );
}

export default function TimeTracker() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [entries, setEntries] = useState<TrackerEntry[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ✅ nowMs drives the timer UI
    const [nowMs, setNowMs] = useState<number>(() => Date.now());

    const [active, setActive] = useState<{
        startMs: number;
        taskName: string;
        projectId: string;
    } | null>(null);

    const [taskName, setTaskName] = useState("");
    const [projectId, setProjectId] = useState("");

    const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([]);
    const [suggestOpen, setSuggestOpen] = useState(false);
    const suggestBoxRef = useRef<HTMLDivElement | null>(null);

    // initial load
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError(null);

                const [p, e] = await Promise.all([getProjects(), getRecentTrackerEntries(25)]);
                setProjects(p);
                setEntries(e);

                if (!projectId && p.length) setProjectId(p[0].id);
            } catch (e: any) {
                const msg = (e as ApiError)?.message ?? "Failed to load data";
                setError(msg);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ✅ timer tick that updates nowMs every second ONLY when active
    useEffect(() => {
        if (!active) return;
        setNowMs(Date.now()); // immediate refresh when started
        const t = window.setInterval(() => setNowMs(Date.now()), 1000);
        return () => window.clearInterval(t);
    }, [active]);

    // suggestions (debounced)
    useEffect(() => {
        const q = taskName.trim();
        if (!q) {
            setSuggestions([]);
            return;
        }
        const t = window.setTimeout(async () => {
            try {
                const tasks = await getTaskSuggestions(q, 6);
                setSuggestions(tasks);
            } catch {
                // ignore suggestions errors
            }
        }, 200);
        return () => window.clearTimeout(t);
    }, [taskName]);

    // close suggestions on outside click
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            const el = suggestBoxRef.current;
            if (!el) return;
            if (!el.contains(e.target as Node)) setSuggestOpen(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    // ✅ elapsed depends on nowMs, so it updates every second
    const activeElapsedMs = useMemo(() => {
        if (!active) return 0;
        return Math.max(0, nowMs - active.startMs);
    }, [active, nowMs]);

    const selectedProject = useMemo(
        () => projects.find((p) => p.id === projectId) ?? null,
        [projects, projectId]
    );

    const totalTodayMinutes = useMemo(() => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const startMs = todayStart.getTime();
        return entries
            .filter((e) => e.startMs >= startMs)
            .reduce((sum, e) => sum + durationMinutes(e.startMs, e.endMs), 0);
    }, [entries]);

    const start = () => {
        setError(null);
        const t = taskName.trim();
        if (!t) return setError("Task name is required.");
        if (!projectId) return setError("Select a project.");

        setActive({ startMs: Date.now(), taskName: t, projectId });
        setSuggestOpen(false);
    };

    const stop = async () => {
        if (!active) return;
        setError(null);
        setSaving(true);

        try {
            const endMs = Date.now();
            const created = await createTrackerEntry({
                taskName: active.taskName,
                projectId: active.projectId,
                startMs: active.startMs,
                endMs,
            });

            setEntries((prev) => [created, ...prev]);
            setActive(null);
            setTaskName("");
        } catch (e: any) {
            const msg = (e as ApiError)?.message ?? "Failed to save entry";
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: string) => {
        setError(null);
        const prev = entries;
        setEntries((p) => p.filter((x) => x.id !== id));
        try {
            await deleteTrackerEntry(id);
        } catch (e: any) {
            setEntries(prev);
            const msg = (e as ApiError)?.message ?? "Failed to delete";
            setError(msg);
        }
    };

    const refresh = async () => {
        try {
            setLoading(true);
            setError(null);
            const e = await getRecentTrackerEntries(25);
            setEntries(e);
        } catch (e: any) {
            const msg = (e as ApiError)?.message ?? "Failed to refresh";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[60vh] w-full bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6">
            <div className="mx-auto w-full max-w-5xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Time Tracker</h1>
                        <p className="mt-1 text-sm text-slate-600">Start a timer, stop to save. Synced via REST API.</p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                        <div className="text-xs text-slate-500">Today total</div>
                        <div className="text-lg font-semibold text-slate-900">{minutesToHHMM(totalTodayMinutes)}</div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {error}
                    </div>
                )}

                <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
                    {/* Timer */}
                    <div className="lg:col-span-5">
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="text-sm font-semibold text-slate-900">New timer</div>
                            <div className="mt-1 text-xs text-slate-500">Pick project, set task name, start.</div>

                            <div className="mt-4 space-y-3">
                                <div>
                                    <div className="text-xs font-medium text-slate-600">Project</div>
                                    <div className="mt-1">
                                        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={loading || !!active}>
                                            <option value="" disabled>
                                                {loading ? "Loading…" : "Select project"}
                                            </option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>

                                <div ref={suggestBoxRef} className="relative">
                                    <div className="text-xs font-medium text-slate-600">Task</div>
                                    <Input
                                        value={taskName}
                                        onChange={(e) => {
                                            setTaskName(e.target.value);
                                            setSuggestOpen(true);
                                        }}
                                        onFocus={() => setSuggestOpen(true)}
                                        placeholder="e.g., Fix retry logic"
                                        disabled={!!active}
                                    />

                                    {suggestOpen && !active && suggestions.length > 0 && (
                                        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                                            {suggestions.map((s) => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setTaskName(s.name);
                                                        setSuggestOpen(false);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-50"
                                                >
                                                    {s.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-3xl bg-slate-50 p-4">
                                    <div className="text-xs text-slate-500">Status</div>

                                    <div className="mt-1 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-900">{active ? active.taskName : "Not running"}</div>
                                            <div className="mt-1 text-xs text-slate-600">
                                                {active ? `Project: ${selectedProject?.name ?? "—"}` : "Start a timer to track work."}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm">
                                            {active ? msToHHMMSS(activeElapsedMs) : "00:00:00"}
                                        </div>
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        {!active ? (
                                            <Button variant="primary" onClick={start} disabled={loading || !projectId || !taskName.trim()} className="flex-1">
                                                Start
                                            </Button>
                                        ) : (
                                            <Button variant="primary" onClick={stop} disabled={saving} className="flex-1">
                                                {saving ? "Saving…" : "Stop & Save"}
                                            </Button>
                                        )}

                                        {active ? (
                                            <Button variant="secondary" onClick={() => setActive(null)} disabled={saving} className="flex-1" title="Cancel without saving">
                                                Cancel
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="text-xs text-slate-500">
                                    Saved on stop: <span className="font-medium">POST /api/time-tracker/entries</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    <div className="lg:col-span-7">
                        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">Recent entries</div>
                                        <div className="mt-1 text-xs text-slate-500">Loaded from REST API</div>
                                    </div>
                                    <Button variant="secondary" onClick={refresh} disabled={loading}>
                                        Refresh
                                    </Button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="p-6 text-sm text-slate-600">Loading…</div>
                            ) : entries.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="text-base font-semibold text-slate-900">No entries yet</div>
                                    <div className="mt-1 text-sm text-slate-600">Start a timer and stop it to create your first record.</div>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {entries.map((e) => {
                                        const p = projects.find((x) => x.id === e.projectId);
                                        const mins = durationMinutes(e.startMs, e.endMs);
                                        return (
                                            <div key={e.id} className="p-4">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-semibold text-slate-900">{e.taskName}</div>
                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                            <span className="rounded-xl bg-slate-50 px-2 py-1">{p?.name ?? "Unknown project"}</span>
                                                            <span>•</span>
                                                            <span className="rounded-xl bg-slate-50 px-2 py-1">
                                                                {formatDate(e.startMs)} {formatTime(e.startMs)} – {formatTime(e.endMs)}
                                                            </span>
                                                            <span>•</span>
                                                            <span className="rounded-xl bg-slate-50 px-2 py-1">
                                                                {minutesToHHMM(mins)} ({mins}m)
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 sm:flex-none">
                                                        <Button variant="danger" onClick={() => remove(e.id)}>
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-center text-xs text-slate-500">
                            Delete uses: <span className="font-medium">DELETE /api/time-tracker/entries/:id</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}