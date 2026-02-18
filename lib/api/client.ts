export type ApiError = {
    status: number;
    message: string;
    details?: unknown;
};

async function readError(res: Response): Promise<ApiError> {
    const status = res.status;
    let message = `Request failed: ${status}`;
    let details: unknown = undefined;

    const ct = res.headers.get("content-type") || "";
    try {
        if (ct.includes("application/json")) {
            const json = await res.json();
            details = json;
            if (typeof json?.error === "string") message = json.error;
            else if (typeof json?.message === "string") message = json.message;
            else message = JSON.stringify(json);
        } else {
            const text = await res.text();
            if (text) message = text;
        }
    } catch {
        // ignore parse errors
    }

    return { status, message, details };
}

/**
 * Typed fetch wrapper.
 * - Throws ApiError on non-2xx
 * - Parses JSON automatically
 */
export async function api<TResponse>(
    input: RequestInfo,
    init?: RequestInit
): Promise<TResponse> {
    const res = await fetch(input, {
        ...init,
        headers: {
            ...(init?.headers ?? {}),
            "content-type": "application/json",
        },
        cache: "no-store",
    });

    if (!res.ok) throw await readError(res);

    // handle 204
    if (res.status === 204) return undefined as unknown as TResponse;

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
        // if needed later, you can return text; but for now keep strict
        const text = await res.text();
        return text as unknown as TResponse;
    }

    return (await res.json()) as TResponse;
}
