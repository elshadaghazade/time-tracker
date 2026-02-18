import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdOrThrow } from "@/lib/auth";

function parseISODateMidday(iso: string) {
    // "YYYY-MM-DD" -> Date at midday local to avoid DST issues
    return new Date(`${iso}T12:00:00`);
}

function startOfDayLocal(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
}

export async function GET(req: Request) {
    const userId = await getUserIdOrThrow();
    const url = new URL(req.url);

    const fromISO = url.searchParams.get("from");
    const toISO = url.searchParams.get("to");

    if (!fromISO || !toISO) {
        return NextResponse.json(
            { error: "from and to are required (YYYY-MM-DD)" },
            { status: 400 }
        );
    }

    const from = startOfDayLocal(parseISODateMidday(fromISO));
    const to = startOfDayLocal(parseISODateMidday(toISO));

    if (!(from.getTime() < to.getTime())) {
        return NextResponse.json({ error: "from must be < to" }, { status: 400 });
    }

    const rows = await prisma.timeEntry.findMany({
        where: { userId, occurredAt: { gte: from, lt: to } },
        orderBy: { occurredAt: "desc" },
        select: {
            id: true,
            minutes: true,
            occurredAt: true,
            projectId: true,
            taskName: { select: { name: true } },
            project: { select: { name: true, color: true } },
        },
    });

    // Return in a report-friendly shape
    const entries = rows.map((r) => ({
        id: r.id,
        occurredAt: r.occurredAt.getTime(),
        minutes: r.minutes,
        projectId: r.projectId ?? "",
        projectName: r.project?.name ?? "Unassigned",
        projectColor: r.project?.color ?? null,
        taskName: r.taskName?.name ?? "",
    }));

    return NextResponse.json({ from: fromISO, to: toISO, entries });
}
