import React from "react";
import { cx } from "@/lib/utils";

export function Label({ children }: { children: React.ReactNode }) {
    return <label className="block text-xs font-medium text-slate-600">{children}</label>;
}

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    error?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ error, className, ...props }, ref) => {
        return (
            <input
                ref={ref}
                className={cx(
                    "w-full rounded-2xl border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-4",
                    error
                        ? "border-rose-300 focus:border-rose-300 focus:ring-rose-100"
                        : "border-slate-200 focus:border-slate-300 focus:ring-slate-100",
                    className
                )}
                {...props}
            />
        );
    }
);

Input.displayName = "Input";
