"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Project, DayEntry } from "@/lib/api/types";
import { getProjects } from "@/lib/api/endpoints";
import { deleteDayEntry, getDayEntries, updateDayEntry } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/client";
import { Input } from "./ui/Input";

// ---------- helpers ----------
function cx(...c: Array<string | false | null | undefined>) {
    return c.filter(Boolean).join(" ");
}
function pad2(n: number) {
    return String(n).padStart(2, "0");
}
function minutesToHHMM(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${pad2(h)}:${pad2(m)}`;
}
function parseHHMM(raw: string): { ok: true; minutes: number } | { ok: false; reason: string } {
    const s = raw.trim();
    const m = s.match(/^(\d{1,3}):([0-5]\d)$/);
    if (!m) return { ok: false, reason: "Use hh:mm (e.g., 01:30)" };
    return { ok: true, minutes: Number(m[1]) * 60 + Number(m[2]) };
}
function toISODateLocal(d: Date) {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${y}-${m}-${day}`;
}

// ---------- tiny UI ----------
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

// ---------- component ----------
type EditState =
    | { id: string; field: "task"; value: string }
    | { id: string; field: "project"; value: string }
    | { id: string; field: "time"; value: string }
    | null;

export default function TaskManagement() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [entries, setEntries] = useState<DayEntry[]>([]);
    const [dateISO, setDateISO] = useState<string>(() => toISODateLocal(new Date()));

    const [loading, setLoading] = useState(true);
    const [mutating, setMutating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [edit, setEdit] = useState<EditState>(null);
    const editInputRef = useRef<HTMLInputElement | null>(null);

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const [p, e] = await Promise.all([getProjects(), getDayEntries(dateISO)]);
            setProjects(p);
            setEntries(e);
        } catch (e: any) {
            setError((e as ApiError)?.message ?? "Failed to load");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateISO]);

    useEffect(() => {
        if (!edit) return;
        const t = window.setTimeout(() => editInputRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [edit]);

    const projectsById = useMemo(() => {
        const m = new Map(projects.map((p) => [p.id, p]));
        return m;
    }, [projects]);

    const grouped = useMemo(() => {
        const map = new Map<string, { projectId: string; projectName: string; totalMinutes: number; items: DayEntry[] }>();

        for (const e of entries) {
            const pid = e.projectId || "unassigned";
            const pName = e.projectId ? (projectsById.get(e.projectId)?.name ?? "Unknown project") : "Unassigned";

            const cur = map.get(pid) ?? { projectId: pid, projectName: pName, totalMinutes: 0, items: [] };
            cur.totalMinutes += e.minutes;
            cur.items.push(e);
            map.set(pid, cur);
        }

        return Array.from(map.values())
            .map((g) => ({ ...g, items: g.items.sort((a, b) => b.occurredAt - a.occurredAt) }))
            .sort((a, b) => (b.totalMinutes - a.totalMinutes) || a.projectName.localeCompare(b.projectName));
    }, [entries, projectsById]);

    const startEdit = (id: string, field: EditState extends infer X ? any : never, initial: string) => {
        setEdit({ id, field, value: initial } as any);
    };

    const commitEdit = async () => {
        if (!edit) return;
        setError(null);
        setMutating(true);

        const entry = entries.find((x) => x.id === edit.id);
        if (!entry) {
            setEdit(null);
            setMutating(false);
            return;
        }

        try {
            if (edit.field === "task") {
                const name = edit.value.trim();
                if (!name) throw { message: "Task name cannot be empty" };
                const updated = await updateDayEntry(entry.id, { taskName: name });
                setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            }

            if (edit.field === "project") {
                const pid = edit.value;
                if (!pid) throw { message: "Project is required" };
                const updated = await updateDayEntry(entry.id, { projectId: pid });
                setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            }

            if (edit.field === "time") {
                const parsed = parseHHMM(edit.value);
                if (!parsed.ok) throw { message: parsed.reason };
                const updated = await updateDayEntry(entry.id, { minutes: parsed.minutes });
                setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            }

            setEdit(null);
        } catch (e: any) {
            setError((e as ApiError)?.message ?? e?.message ?? "Failed to update");
        } finally {
            setMutating(false);
        }
    };

    const remove = async (id: string) => {
        setError(null);
        const prev = entries;
        setEntries((p) => p.filter((x) => x.id !== id));
        setMutating(true);
        try {
            await deleteDayEntry(id);
        } catch (e: any) {
            setEntries(prev);
            setError((e as ApiError)?.message ?? "Failed to delete");
        } finally {
            setMutating(false);
        }
    };

    return (
        <div className="min-h-[60vh] w-full bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6">
            <div className="mx-auto w-full max-w-5xl">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Task Management</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Edit today’s entries: task name, project, time (hh:mm). Grouped by projects.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={dateISO}
                            onChange={(e) => setDateISO(e.target.value)}
                            className="w-auto"
                        />
                        <Button onClick={load} disabled={loading || mutating}>
                            Refresh
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {error}
                    </div>
                )}

                <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-4">
                        <div className="text-sm font-semibold text-slate-900">Entries ({dateISO})</div>
                        <div className="mt-1 text-xs text-slate-500">
                            Backend: <span className="font-medium">GET /api/time-entries?date=YYYY-MM-DD</span> •{" "}
                            <span className="font-medium">PATCH/DELETE /api/time-entries/:id</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-6 text-sm text-slate-600">Loading…</div>
                    ) : grouped.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="text-base font-semibold text-slate-900">No entries</div>
                            <div className="mt-1 text-sm text-slate-600">Use the Time Tracker to create records.</div>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {grouped.map((g) => (
                                <div key={g.projectId} className="p-4">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-sm font-semibold text-slate-900">{g.projectName}</div>
                                        <div className="rounded-2xl bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-900">
                                            Total: {minutesToHHMM(g.totalMinutes)}
                                        </div>
                                    </div>

                                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                                        <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                                            <div className="col-span-5">Task</div>
                                            <div className="col-span-3">Project</div>
                                            <div className="col-span-2 text-right">Time</div>
                                            <div className="col-span-2 text-right">Actions</div>
                                        </div>

                                        <div className="divide-y divide-slate-100">
                                            {g.items.map((e) => {
                                                const isEditing = edit?.id === e.id;
                                                const projectName = projectsById.get(e.projectId)?.name ?? "Unknown";

                                                return (
                                                    <div key={e.id} className="grid grid-cols-12 items-center px-3 py-2 text-sm">
                                                        {/* Task */}
                                                        <div className="col-span-5">
                                                            {isEditing && edit?.field === "task" ? (
                                                                <Input
                                                                    ref={editInputRef}
                                                                    value={edit.value}
                                                                    onChange={(ev) => setEdit({ ...edit, value: ev.target.value })}
                                                                    onBlur={commitEdit}
                                                                    onKeyDown={(ev) => {
                                                                        if (ev.key === "Enter") commitEdit();
                                                                        if (ev.key === "Escape") setEdit(null);
                                                                    }}
                                                                />
                                                            ) : (
                                                                <button
                                                                    className="w-full text-left font-medium text-slate-900 hover:underline"
                                                                    onClick={() => startEdit(e.id, "task", e.taskName)}
                                                                    disabled={mutating}
                                                                >
                                                                    {e.taskName || "—"}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Project */}
                                                        <div className="col-span-3">
                                                            {isEditing && edit?.field === "project" ? (
                                                                <Select
                                                                    value={edit.value}
                                                                    onChange={(ev) => setEdit({ ...edit, value: ev.target.value })}
                                                                    onBlur={commitEdit}
                                                                >
                                                                    {projects.map((p) => (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.name}
                                                                        </option>
                                                                    ))}
                                                                </Select>
                                                            ) : (
                                                                <button
                                                                    className="w-full text-left text-slate-700 hover:underline"
                                                                    onClick={() => startEdit(e.id, "project", e.projectId)}
                                                                    disabled={mutating}
                                                                >
                                                                    {projectName}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Time */}
                                                        <div className="col-span-2 text-right">
                                                            {isEditing && edit?.field === "time" ? (
                                                                <Input
                                                                    ref={editInputRef}
                                                                    value={edit.value}
                                                                    onChange={(ev) => setEdit({ ...edit, value: ev.target.value })}
                                                                    onBlur={commitEdit}
                                                                    onKeyDown={(ev) => {
                                                                        if (ev.key === "Enter") commitEdit();
                                                                        if (ev.key === "Escape") setEdit(null);
                                                                    }}
                                                                />
                                                            ) : (
                                                                <button
                                                                    className="font-medium text-slate-900 hover:underline"
                                                                    onClick={() => startEdit(e.id, "time", minutesToHHMM(e.minutes))}
                                                                    disabled={mutating}
                                                                >
                                                                    {minutesToHHMM(e.minutes)}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="col-span-2 flex justify-end gap-2">
                                                            <Button variant="danger" onClick={() => remove(e.id)} disabled={mutating}>
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 text-center text-xs text-slate-500">
                    Click task/project/time to edit. Time must be <span className="font-medium">hh:mm</span>.
                </div>
            </div>
        </div>
    );
}
