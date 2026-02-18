import { pad2 } from "./utils";

export function minutesToHHMM(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${pad2(h)}:${pad2(m)}`;
}

export function summarizeMinutes(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

export function parseHHMMToMinutes(
    raw: string
): { ok: true; minutes: number } | { ok: false; reason: string } {
    const s = raw.trim();
    const m = s.match(/^(\d{1,3}):([0-5]\d)$/);
    if (!m) return { ok: false, reason: "Use format hh:mm (e.g., 01:30)" };
    const hours = Number(m[1]);
    const mins = Number(m[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(mins)) return { ok: false, reason: "Invalid time" };
    return { ok: true, minutes: hours * 60 + mins };
}
