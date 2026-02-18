import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdOrThrow } from "@/lib/auth";

export async function GET() {
    const userId = await getUserIdOrThrow();

    const projects = await prisma.project.findMany({
        where: { userId, isArchived: false },
        orderBy: { name: "asc" },
        select: { id: true, name: true, color: true },
    });

    return NextResponse.json({ projects });
}

export async function POST(req: Request) {
    const userId = await getUserIdOrThrow();
    const body = await req.json().catch(() => null);

    const name = (body?.name ?? "").toString().trim();
    const color = body?.color != null ? String(body.color).trim() : null;

    if (!name) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    try {
        const project = await prisma.project.create({
            data: { userId, name, color: color || null },
            select: { id: true, name: true, color: true },
        });

        return NextResponse.json({ project }, { status: 201 });
    } catch (e: any) {
        // unique constraint per userId+name
        return NextResponse.json(
            { error: "Project already exists (same name)" },
            { status: 409 }
        );
    }
}