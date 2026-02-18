import React from "react";

export function Page({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-[60vh] w-full bg-gradient-to-b from-slate-50 to-white p-4 sm:p-6">
            {children}
        </div>
    );
}

export function Container({ children, size = "lg" }: { children: React.ReactNode; size?: "md" | "lg" }) {
    return <div className={size === "md" ? "mx-auto w-full max-w-4xl" : "mx-auto w-full max-w-5xl"}>{children}</div>;
}

export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
                {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
            </div>
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
    );
}
