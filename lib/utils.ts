export function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function pad2(n: number) {
    return String(n).padStart(2, "0");
}

export function randomId() {
    return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}