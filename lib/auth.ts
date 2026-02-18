import { headers } from "next/headers";
import { prisma } from "./prisma";

export async function getUserIdOrThrow(): Promise<string> {
    const h = await headers();
    const headerUserId = h.get("x-user-id")?.trim();
    const envUserId = process.env.DEFAULT_USER_ID?.trim();

    const userId = headerUserId || envUserId;
    if (!userId) {
        throw new Error(
            "Missing user. Provide x-user-id header or set DEFAULT_USER_ID env var."
        );
    }

    // ensure user exists (dev-friendly)
    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId },
    });

    return userId;
}