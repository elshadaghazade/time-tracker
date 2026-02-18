export type Project = { id: string; name: string; color?: string | null };

export type TrackerEntry = {
    id: string;
    taskName: string;
    projectId: string;
    startMs: number;
    endMs: number;
};

export type TaskSuggestion = { id: string; name: string };

export type DayEntry = {
    id: string;
    taskName: string;
    projectId: string;
    minutes: number;
    occurredAt: number; // epoch ms
};

export type ReportEntry = {
    id: string;
    occurredAt: number;      // epoch ms
    minutes: number;
    projectId: string;
    projectName: string;
    projectColor?: string | null;
    taskName: string;
};