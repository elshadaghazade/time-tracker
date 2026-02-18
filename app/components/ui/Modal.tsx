import React, { useEffect } from "react";
import { Button } from "./Button";
import { cx } from "@/lib/utils";

export function Modal({
    open,
    title,
    subtitle,
    onClose,
    children,
    maxWidth = "max-w-xl",
}: {
    open: boolean;
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 p-4 sm:items-center" role="dialog" aria-modal="true">
            <div className={cx("w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl", maxWidth)}>
                <div className="flex items-center justify-between border-b border-slate-200 p-4">
                    <div>
                        <div className="text-sm font-semibold text-slate-900">{title}</div>
                        {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
                    </div>
                    <Button variant="ghost" onClick={onClose} className="rounded-2xl">
                        Close
                    </Button>
                </div>
                <div className="p-4 sm:p-5">{children}</div>
            </div>
        </div>
    );
}
