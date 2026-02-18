"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/lib/api/types";
import { archiveProject, createProject, getProjects, updateProject } from "@/lib/api/endpoints";
import type { ApiError } from "@/lib/api/client";
import { Input } from '@/app/components/ui/Input';

// --- Shared colors (store as semantic keys, not tailwind classes) ---
type ProjectColor =
    | "slate"
    | "blue"
    | "emerald"
    | "violet"
    | "amber"
    | "rose"
    | "cyan"
    | "lime"
    | "fuchsia";

const COLOR_OPTIONS: Array<{
    key: ProjectColor;
    label: string;
    dot: string;
    ring: string;
    chip: string;
}> = [
        { key: "slate", label: "Slate", dot: "bg-slate-500", ring: "ring-slate-200", chip: "bg-slate-50 text-slate-700 border-slate-200" },
        { key: "blue", label: "Blue", dot: "bg-blue-500", ring: "ring-blue-200", chip: "bg-blue-50 text-blue-700 border-blue-200" },
        { key: "emerald", label: "Emerald", dot: "bg-emerald-500", ring: "ring-emerald-200", chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        { key: "violet", label: "Violet", dot: "bg-violet-500", ring: "ring-violet-200", chip: "bg-violet-50 text-violet-700 border-violet-200" },
        { key: "amber", label: "Amber", dot: "bg-amber-500", ring: "ring-amber-200", chip: "bg-amber-50 text-amber-800 border-amber-200" },
        { key: "rose", label: "Rose", dot: "bg-rose-500", ring: "ring-rose-200", chip: "bg-rose-50 text-rose-700 border-rose-200" },
        { key: "cyan", label: "Cyan", dot: "bg-cyan-500", ring: "ring-cyan-200", chip: "bg-cyan-50 text-cyan-700 border-cyan-200" },
        { key: "lime", label: "Lime", dot: "bg-lime-500", ring: "ring-lime-200", chip: "bg-lime-50 text-lime-800 border-lime-200" },
        { key: "fuchsia", label: "Fuchsia", dot: "bg-fuchsia-500", ring: "ring-fuchsia-200", chip: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
    ];

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function getColorMeta(color: string | null | undefined) {
    const key = (color || "slate") as ProjectColor;
    return COLOR_OPTIONS.find((c) => c.key === key) ?? COLOR_OPTIONS[0];
}

function normalizeName(s: string) {
    return s.trim().replace(/\s+/g, " ");
}

// --- UI primitives (keep local or use your shared UI kit) ---
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

// --- Component ---
type EditorDraft = { name: string; color: ProjectColor };

export default function ProjectManagement() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [query, setQuery] = useState("");

    const [loading, setLoading] = useState(true);
    const [mutating, setMutating] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<EditorDraft>({ name: "", color: "slate" });
    const [formError, setFormError] = useState<string | null>(null);

    const firstInputRef = useRef<HTMLInputElement | null>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = [...projects].sort((a, b) => a.name.localeCompare(b.name));
        if (!q) return list;
        return list.filter((p) => p.name.toLowerCase().includes(q));
    }, [projects, query]);

    const title = editingId ? "Edit project" : "Add project";
    const primaryLabel = editingId ? "Save changes" : "Create project";

    const load = async () => {
        try {
            setLoading(true);
            setError(null);
            const p = await getProjects();
            setProjects(p);
        } catch (e: any) {
            const msg = (e as ApiError)?.message ?? "Failed to load projects";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (!open) return;
        const t = window.setTimeout(() => firstInputRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [open]);

    const openAdd = () => {
        setEditingId(null);
        setDraft({ name: "", color: "slate" });
        setFormError(null);
        setOpen(true);
    };

    const openEdit = (p: Project) => {
        setEditingId(p.id);
        setDraft({
            name: p.name,
            color: ((p.color || "slate") as ProjectColor) ?? "slate",
        });
        setFormError(null);
        setOpen(true);
    };

    const close = () => {
        setOpen(false);
        setEditingId(null);
        setFormError(null);
    };

    const save = async () => {
        const name = normalizeName(draft.name);
        if (!name) {
            setFormError("Project name is required.");
            return;
        }

        const duplicate = projects.some(
            (p) => p.name.trim().toLowerCase() === name.toLowerCase() && p.id !== editingId
        );
        if (duplicate) {
            setFormError("A project with this name already exists.");
            return;
        }

        setMutating(true);
        setFormError(null);
        setError(null);

        try {
            if (editingId) {
                const updated = await updateProject(editingId, { name, color: draft.color });
                setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            } else {
                const created = await createProject({ name, color: draft.color });
                setProjects((prev) => [created, ...prev]);
            }
            close();
        } catch (e: any) {
            const msg = (e as ApiError)?.message ?? "Failed to save project";
            // common: 409 duplicate
            setFormError(msg);
        } finally {
            setMutating(false);
        }
    };

    const remove = async (id: string) => {
        // archive on backend; optimistic UI
        setError(null);
        const prev = projects;
        setProjects((p) => p.filter((x) => x.id !== id));

        setMutating(true);
        try {
            await archiveProject(id);
        } catch (e: any) {
            setProjects(prev);
            const msg = (e as ApiError)?.message ?? "Failed to delete project";
            setError(msg);
        } finally {
            setMutating(false);
        }
    };

    const onKey = (ev: React.KeyboardEvent) => {
        if (!open) return;
        if (ev.key === "Escape") close();
        if (ev.key === "Enter") save();
    };

    return (
        <div className="min-h-[60vh] w-full bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6" onKeyDown={onKey}>
            <div className="mx-auto w-full max-w-4xl">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Project Management</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Create and edit projects, assign a color for visual distinction.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="primary" onClick={openAdd} disabled={loading || mutating}>
                            Add project
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        {error}
                    </div>
                )}

                {/* Controls */}
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-600">Search projects</label>
                        <div className="relative mt-1">
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Type to filter…"
                            />
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
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="text-xs text-slate-500">Total projects</div>
                        <div className="mt-1 flex items-center justify-between">
                            <div className="text-lg font-semibold text-slate-900">{projects.length}</div>
                            <Button variant="secondary" onClick={load} disabled={loading || mutating}>
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-4">
                        <div className="text-sm font-semibold text-slate-900">Projects</div>
                        <div className="mt-1 text-xs text-slate-500">
                            Backend: GET/POST/PATCH/DELETE on <span className="font-medium">/api/projects</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-6 text-sm text-slate-600">Loading…</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center">
                            <div className="text-base font-semibold text-slate-900">No projects found</div>
                            <div className="mt-1 text-sm text-slate-600">Try another keyword or add a new project.</div>
                            <Button variant="primary" onClick={openAdd} className="mt-4" disabled={mutating}>
                                Add your first project
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filtered.map((p) => {
                                const meta = getColorMeta(p.color ?? "slate");
                                return (
                                    <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3">
                                                <span className={cx("h-9 w-9 rounded-2xl ring-4", meta.ring, "bg-white border border-slate-200 flex items-center justify-center")}>
                                                    <span className={cx("h-3 w-3 rounded-full", meta.dot)} />
                                                </span>

                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-slate-900">{p.name}</div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                        <span className={cx("inline-flex items-center gap-2 rounded-2xl border px-2.5 py-1 text-xs font-medium", meta.chip)}>
                                                            <span className={cx("h-2.5 w-2.5 rounded-full", meta.dot)} />
                                                            {meta.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 sm:flex-none">
                                            <Button variant="secondary" onClick={() => openEdit(p)} disabled={mutating}>
                                                Edit
                                            </Button>
                                            <Button variant="danger" onClick={() => remove(p.id)} disabled={mutating}>
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Modal */}
                {open && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 sm:items-center">
                        <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-200 p-4">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                                    <div className="mt-1 text-xs text-slate-500">Press Enter to save, Esc to close.</div>
                                </div>
                                <Button variant="ghost" onClick={close} disabled={mutating}>
                                    Close
                                </Button>
                            </div>

                            <div className="p-4 sm:p-5">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
                                    <div className="sm:col-span-7">
                                        <label className="block text-xs font-medium text-slate-600">Project name</label>
                                        <Input
                                            ref={firstInputRef}
                                            value={draft.name}
                                            onChange={(e) => {
                                                setFormError(null);
                                                setDraft((d) => ({ ...d, name: e.target.value }));
                                            }}
                                            placeholder="e.g., Analytics Platform"
                                            error={!!formError}
                                            disabled={mutating}
                                        />
                                    </div>

                                    <div className="sm:col-span-5">
                                        <label className="block text-xs font-medium text-slate-600">Color</label>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {COLOR_OPTIONS.map((opt) => {
                                                const active = opt.key === draft.color;
                                                return (
                                                    <button
                                                        key={opt.key}
                                                        type="button"
                                                        onClick={() => setDraft((d) => ({ ...d, color: opt.key }))}
                                                        disabled={mutating}
                                                        className={cx(
                                                            "group inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium shadow-sm transition",
                                                            active ? "border-slate-300 bg-white ring-4 ring-slate-100" : "border-slate-200 bg-white hover:bg-slate-50",
                                                            mutating && "opacity-60 cursor-not-allowed"
                                                        )}
                                                        aria-pressed={active}
                                                    >
                                                        <span className={cx("h-2.5 w-2.5 rounded-full", opt.dot)} />
                                                        <span className="text-slate-700">{opt.label}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                                    <div className="text-xs text-slate-500">Preview</div>
                                    <div className="mt-2 flex items-center gap-3">
                                        <span className={cx("h-9 w-9 rounded-2xl ring-4", getColorMeta(draft.color).ring, "bg-white border border-slate-200 flex items-center justify-center")}>
                                            <span className={cx("h-3 w-3 rounded-full", getColorMeta(draft.color).dot)} />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-900">
                                                {normalizeName(draft.name) || "Project name"}
                                            </div>
                                            <div className="mt-1">
                                                <span className={cx("inline-flex items-center gap-2 rounded-2xl border px-2.5 py-1 text-xs font-medium", getColorMeta(draft.color).chip)}>
                                                    <span className={cx("h-2.5 w-2.5 rounded-full", getColorMeta(draft.color).dot)} />
                                                    {getColorMeta(draft.color).label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {formError && <div className="mt-3 text-xs text-rose-700">{formError}</div>}

                                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-xs text-slate-500">
                                        {editingId ? "Update the project name or color." : "Create a new project for grouping tasks."}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="secondary" onClick={close} disabled={mutating}>
                                            Cancel
                                        </Button>
                                        <Button variant="primary" onClick={save} disabled={mutating}>
                                            {mutating ? "Saving…" : primaryLabel}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 text-center text-xs text-slate-500">
                    Delete archives the project (backend sets <span className="font-medium">isArchived=true</span>).
                </div>
            </div>
        </div>
    );
}
