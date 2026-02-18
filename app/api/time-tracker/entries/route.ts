import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdOrThrow } from "@/lib/auth";

function clampName(s: string) {
    return s.trim().replace(/\s+/g, " ");
}

export async function POST(req: Request) {
    const userId = await getUserIdOrThrow();
    const body = await req.json().catch(() => null);

    const taskNameRaw = clampName(String(body?.taskName ?? ""));
    const projectId = body?.projectId != null ? String(body.projectId) : null;
    const startMs = Number(body?.startMs);
    const endMs = Number(body?.endMs);

    if (!taskNameRaw) {
        return NextResponse.json({ error: "taskName is required" }, { status: 400 });
    }
    if (!projectId) {
        return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return NextResponse.json({ error: "Invalid startMs/endMs" }, { status: 400 });
    }

    // verify project belongs to user
    const project = await prisma.project.findFirst({
        where: { id: projectId, userId, isArchived: false },
        select: { id: true },
    });
    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const minutes = Math.max(1, Math.round((endMs - startMs) / 60000));

    // upsert task label (dictionary)
    const task = await prisma.taskName.upsert({
        where: { userId_name: { userId, name: taskNameRaw } },
        update: { updatedAt: new Date() },
        create: { userId, name: taskNameRaw },
        select: { id: true, name: true },
    });

    const note = JSON.stringify({
        startMs,
        endMs,
        source: "timer",
    });

    const created = await prisma.timeEntry.create({
        data: {
            userId,
            projectId,
            taskNameId: task.id,
            minutes,
            occurredAt: new Date(startMs),
            note,
        },
        select: {
            id: true,
            minutes: true,
            occurredAt: true,
            projectId: true,
            taskName: { select: { name: true } },
            note: true,
        },
    });

    // shape response to your TimeTracker.tsx entry format
    return NextResponse.json(
        {
            entry: {
                id: created.id,
                taskName: created.taskName?.name ?? taskNameRaw,
                projectId: created.projectId!,
                startMs,
                endMs,
            },
        },
        { status: 201 }
    );
}
