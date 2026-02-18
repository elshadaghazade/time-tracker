import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdOrThrow } from "@/lib/auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = await getUserIdOrThrow();
    const { id } = await params;
    const body = await req.json().catch(() => null);

    const name = body?.name != null ? String(body.name).trim() : undefined;
    const color = body?.color != null ? String(body.color).trim() : undefined;

    if (name !== undefined && !name) {
        return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }

    try {
        const project = await prisma.project.update({
            where: { id, userId },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(color !== undefined ? { color: color || null } : {}),
            },
            select: { id: true, name: true, color: true },
        });

        return NextResponse.json({ project });
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const userId = await getUserIdOrThrow();
    const { id } = await params;

    // archive instead of deleting so old entries still keep meaning
    try {
        await prisma.project.update({
            where: { id, userId },
            data: { isArchived: true },
        });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
}
