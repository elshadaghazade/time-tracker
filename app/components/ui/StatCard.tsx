import React from "react";
import { Card, CardBody } from "./Card";

export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
    return (
        <Card>
            <CardBody className="p-4">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
                {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
            </CardBody>
        </Card>
    );
}
