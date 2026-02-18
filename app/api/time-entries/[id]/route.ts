import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdOrThrow } from "@/lib/auth";

function normalizeName(s: string) {
    return s.trim().replace(/\s+/g, " ");
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = await getUserIdOrThrow();
    const { id } = await params;

    const body = await req.json().catch(() => null);

    const taskNameRaw =
        body?.taskName != null ? normalizeName(String(body.taskName)) : undefined;
    const projectId =
        body?.projectId != null ? String(body.projectId) : undefined;
    const minutes =
        body?.minutes != null ? Number(body.minutes) : undefined;

    if (taskNameRaw !== undefined && !taskNameRaw) {
        return NextResponse.json({ error: "taskName cannot be empty" }, { status: 400 });
    }
    if (minutes !== undefined && (!Number.isFinite(minutes) || minutes < 0)) {
        return NextResponse.json({ error: "minutes must be a non-negative number" }, { status: 400 });
    }

    // load entry (ownership + current values)
    const existing = await prisma.timeEntry.findFirst({
        where: { id, userId },
        select: { id: true, projectId: true },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // validate project belongs to user (if changed)
    if (projectId !== undefined) {
        const okProject = await prisma.project.findFirst({
            where: { id: projectId, userId, isArchived: false },
            select: { id: true },
        });
        if (!okProject) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // upsert TaskName if provided
    let taskNameId: string | undefined = undefined;
    if (taskNameRaw !== undefined) {
        const task = await prisma.taskName.upsert({
            where: { userId_name: { userId, name: taskNameRaw } },
            update: { updatedAt: new Date() },
            create: { userId, name: taskNameRaw },
            select: { id: true },
        });
        taskNameId = task.id;
    }

    const updated = await prisma.timeEntry.update({
        where: { id, userId },
        data: {
            ...(projectId !== undefined ? { projectId } : {}),
            ...(minutes !== undefined ? { minutes: Math.round(minutes) } : {}),
            ...(taskNameId !== undefined ? { taskNameId } : {}),
        },
        select: {
            id: true,
            minutes: true,
            occurredAt: true,
            projectId: true,
            taskName: { select: { name: true } },
        },
    });

    return NextResponse.json({
        entry: {
            id: updated.id,
            taskName: updated.taskName?.name ?? "",
            projectId: updated.projectId ?? "",
            minutes: updated.minutes,
            occurredAt: updated.occurredAt.getTime(),
        },
    });
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = await getUserIdOrThrow();
    const { id } = await params;

    try {
        await prisma.timeEntry.delete({ where: { id, userId } });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}
