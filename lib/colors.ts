export type ProjectColor =
    | "slate"
    | "blue"
    | "emerald"
    | "violet"
    | "amber"
    | "rose"
    | "cyan"
    | "lime"
    | "fuchsia";

export const PROJECT_COLOR_OPTIONS: Array<{
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

export function getProjectColorMeta(color: ProjectColor) {
    return PROJECT_COLOR_OPTIONS.find((c) => c.key === color) ?? PROJECT_COLOR_OPTIONS[0];
}

// Stable “string → tailwind badge” (used in Task/Reports when you only have a project name string)
export function stableProjectBadgeClasses(project: string) {
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

// Stable “string → dot color” (used in TaskManagement ProjectColorDot)
export function stableDotClassFromString(name: string) {
    const palette = [
        "bg-blue-500",
        "bg-emerald-500",
        "bg-violet-500",
        "bg-amber-500",
        "bg-rose-500",
        "bg-cyan-500",
        "bg-lime-500",
        "bg-fuchsia-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    return palette[hash % palette.length];
}
