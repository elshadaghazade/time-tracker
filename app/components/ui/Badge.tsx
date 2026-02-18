import React from "react";
import { cx } from "@/lib/utils";

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
    return <span className={cx("inline-flex items-center rounded-2xl border px-2.5 py-1 text-xs font-medium", className)}>{children}</span>;
}
