import { pad2 } from "./utils";

export function toISODateLocal(d: Date) {
    const y = d.getFullYear();
    const m = pad2(d.getMonth() + 1);
    const day = pad2(d.getDate());
    return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function endExclusiveOfDay(d: Date) {
    const x = startOfDay(d);
    x.setDate(x.getDate() + 1);
    return x;
}

// Monday week start
export function startOfWeekMonday(d: Date) {
    const x = startOfDay(d);
    const day = x.getDay(); // 0 Sun .. 6 Sat
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
}

export function startOfMonth(d: Date) {
    const x = startOfDay(d);
    x.setDate(1);
    return x;
}

export function endExclusiveOfMonth(d: Date) {
    const x = startOfMonth(d);
    x.setMonth(x.getMonth() + 1);
    return x;
}

export function formatRangeLabel(period: "day" | "week" | "month", anchor: Date, start: Date, endExcl: Date) {
    const endIncl = new Date(endExcl);
    endIncl.setDate(endIncl.getDate() - 1);

    const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "2-digit" };
    const fmt = (dd: Date) => dd.toLocaleDateString(undefined, opts);

    if (period === "day") return fmt(anchor);
    if (period === "week") return `${fmt(start)} – ${fmt(endIncl)}`;
    return `${anchor.toLocaleDateString(undefined, { year: "numeric", month: "long" })}`;
}
