import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdOrThrow } from "@/lib/auth";

function safeParseNote(note: string | null): any | null {
    if (!note) return null;
    try {
        return JSON.parse(note);
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    const userId = await getUserIdOrThrow();
    const url = new URL(req.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 12)));

    const rows = await prisma.timeEntry.findMany({
        where: { userId },
        orderBy: { occurredAt: "desc" },
        take: limit,
        select: {
            id: true,
            minutes: true,
            occurredAt: true,
            projectId: true,
            note: true,
            taskName: { select: { name: true } },
        },
    });

    const entries = rows
        .filter((r) => !!r.projectId)
        .map((r) => {
            const note = safeParseNote(r.note);
            const startMs = note?.startMs ?? r.occurredAt.getTime();
            const endMs = note?.endMs ?? startMs + r.minutes * 60_000;

            return {
                id: r.id,
                taskName: r.taskName?.name ?? "(no task)",
                projectId: r.projectId as string,
                startMs,
                endMs,
            };
        });

    return NextResponse.json({ entries });
}
