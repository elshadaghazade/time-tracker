import { api } from "./client";
import type { Project, TrackerEntry, TaskSuggestion, DayEntry, ReportEntry } from "./types";

// Projects
export async function getProjects(): Promise<Project[]> {
    const data = await api<{ projects: Project[] }>("/api/projects");
    return data.projects;
}

// TimeTracker entries
export async function getRecentTrackerEntries(limit = 25): Promise<TrackerEntry[]> {
    const data = await api<{ entries: TrackerEntry[] }>(
        `/api/time-tracker/entries/recent?limit=${limit}`
    );
    return data.entries;
}

export async function createTrackerEntry(payload: {
    taskName: string;
    projectId: string;
    startMs: number;
    endMs: number;
}): Promise<TrackerEntry> {
    const data = await api<{ entry: TrackerEntry }>("/api/time-tracker/entries", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return data.entry;
}

export async function deleteTrackerEntry(id: string): Promise<void> {
    await api<{ ok: boolean }>(`/api/time-tracker/entries/${id}`, { method: "DELETE" });
}

// Task name suggestions
export async function getTaskSuggestions(query: string, limit = 6): Promise<TaskSuggestion[]> {
    const q = query.trim();
    if (!q) return [];
    const data = await api<{ tasks: TaskSuggestion[] }>(
        `/api/task-names?query=${encodeURIComponent(q)}&limit=${limit}`
    );
    return data.tasks;
}

export async function createProject(payload: {
    name: string;
    color?: string | null;
}): Promise<Project> {
    const data = await api<{ project: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return data.project;
}

export async function updateProject(
    id: string,
    payload: { name?: string; color?: string | null }
): Promise<Project> {
    const data = await api<{ project: Project }>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
    return data.project;
}

export async function archiveProject(id: string): Promise<void> {
    await api<{ ok: boolean }>(`/api/projects/${id}`, { method: "DELETE" });
}

export async function getDayEntries(dateISO?: string): Promise<DayEntry[]> {
    const qs = dateISO ? `?date=${encodeURIComponent(dateISO)}` : "";
    const data = await api<{ entries: DayEntry[] }>(`/api/time-entries${qs}`);
    return data.entries;
}

export async function updateDayEntry(
    id: string,
    payload: { taskName?: string; projectId?: string; minutes?: number }
): Promise<DayEntry> {
    const data = await api<{ entry: DayEntry }>(`/api/time-entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
    return data.entry;
}

export async function deleteDayEntry(id: string): Promise<void> {
    await api<{ ok: boolean }>(`/api/time-entries/${id}`, { method: "DELETE" });
}

export async function getReportEntries(fromISO: string, toISO: string): Promise<ReportEntry[]> {
    const data = await api<{ entries: ReportEntry[] }>(
        `/api/reports/entries?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`
    );
    return data.entries;
}