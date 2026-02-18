import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdOrThrow } from "@/lib/auth";

function startOfDayLocal(date: Date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function endExclusiveOfDayLocal(date: Date) {
    const d = startOfDayLocal(date);
    d.setDate(d.getDate() + 1);
    return d;
}

export async function GET(req: Request) {
    const userId = await getUserIdOrThrow();
    const url = new URL(req.url);

    // date=YYYY-MM-DD (local)
    const dateStr = url.searchParams.get("date");
    const date = dateStr
        ? new Date(`${dateStr}T12:00:00`) // midday avoids DST edge cases
        : new Date();

    const from = startOfDayLocal(date);
    const to = endExclusiveOfDayLocal(date);

    const rows = await prisma.timeEntry.findMany({
        where: { userId, occurredAt: { gte: from, lt: to } },
        orderBy: { occurredAt: "desc" },
        select: {
            id: true,
            minutes: true,
            occurredAt: true,
            projectId: true,
            taskName: { select: { name: true } },
        },
    });

    const entries = rows.map((r) => ({
        id: r.id,
        taskName: r.taskName?.name ?? "",
        projectId: r.projectId ?? "",
        minutes: r.minutes,
        occurredAt: r.occurredAt.getTime(),
    }));

    return NextResponse.json({ entries, date: dateStr ?? null });
}
