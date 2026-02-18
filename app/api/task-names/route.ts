import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdOrThrow } from "@/lib/auth";

export async function GET(req: Request) {
    const userId = await getUserIdOrThrow();
    const url = new URL(req.url);
    const query = (url.searchParams.get("query") ?? "").trim();
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 6)));

    const tasks = await prisma.taskName.findMany({
        where: {
            userId,
            isArchived: false,
            ...(query
                ? { name: { contains: query, mode: "insensitive" } }
                : {}),
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: { id: true, name: true },
    });

    return NextResponse.json({ tasks });
}
