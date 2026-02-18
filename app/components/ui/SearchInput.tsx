import React from "react";
import { Button } from "./Button";
import { Input } from "./Input";

export function SearchInput({
    value,
    onChange,
    placeholder = "Search…",
    onClear,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    onClear?: () => void;
}) {
    return (
        <div className="relative">
            <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
            {value && (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => (onClear ? onClear() : onChange(""))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1 text-xs"
                >
                    Clear
                </Button>
            )}
        </div>
    );
}
