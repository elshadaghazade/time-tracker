import { cx } from "@/lib/utils";

export function SegmentedTabs<T extends string>({
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
