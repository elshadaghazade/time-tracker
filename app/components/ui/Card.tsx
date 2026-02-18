import React from "react";
import { cx } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={cx("rounded-3xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={cx("border-b border-slate-200 p-4", className)}>{children}</div>;
}

export function CardBody({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={cx("p-4", className)}>{children}</div>;
}
