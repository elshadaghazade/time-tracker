import React from "react";
import { cx } from "@/lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
    variant = "secondary",
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
    const base =
        "rounded-2xl px-3 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants: Record<Variant, string> = {
        primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-200",
        secondary: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 focus:ring-slate-100",
        danger: "border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 focus:ring-rose-100",
        ghost: "text-slate-600 hover:bg-slate-100 focus:ring-slate-100",
    };

    return <button className={cx(base, variants[variant], className)} {...props} />;
}
